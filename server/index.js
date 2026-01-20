// Load server env from .env.server when present (safe local dev)
try {
  require('dotenv').config({ path: '.env.server' });
} catch (err) {
  // dotenv not installed or file missing; proceed with process.env
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const BACKEND_API_KEY = process.env.BACKEND_API_KEY || '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';

// Health endpoint for frontend probes (non-destructive)
app.get('/api/health', (req, res) => {
  console.info('GET /api/health called')
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) {
    return res.status(501).json({ status: 'disabled' });
  }
  return res.status(200).json({ status: 'ok' });
});

// Safe-by-default: reject if service role or backend key not configured
app.post('/api/save-lab', async (req, res) => {
  // server disabled unless configured
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) {
    console.info('POST /api/save-lab rejected: backend-disabled')
    return res.status(501).json({ error: 'backend-disabled' });
  }

  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) {
    console.info('POST /api/save-lab forbidden: bad-key')
    return res.status(403).json({ error: 'forbidden' });
  }

  const { user_id, marker_id, value } = req.body || {};
  console.info('POST /api/save-lab', { user_id: user_id ? '[redacted]' : null, marker_id, hasValue: typeof value !== 'undefined' })
  if (!user_id || !marker_id || typeof value === 'undefined') {
    return res.status(400).json({ error: 'missing-params' });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // call the secure DB function created in the scaffold
    // Call the public RPC function created in the DB (PostgREST/Supabase expects the function name without schema)
    const { data, error } = await sb.rpc('insert_user_lab_value', { p_user_id: user_id, p_marker_id: marker_id, p_reported_value: value });
    if (error) {
      console.error('supabase rpc error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }

    // normalize RPC return (could be uuid string or array/object)
    let returnedId = null
    if (!data) returnedId = null
    else if (typeof data === 'string') returnedId = data
    else if (Array.isArray(data) && data.length > 0) returnedId = data[0].id || data[0]
    else if (data.id) returnedId = data.id
    else returnedId = data

    console.info('insert_user_lab_value created', { id: returnedId })
    return res.status(200).json({ id: returnedId });
  } catch (err) {
    console.error('save-lab-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// DEV-ONLY: list recent opt-in saves for local debugging. Must be explicitly enabled.
app.get('/api/dev/user-lab-values', async (req, res) => {
  // never enable in production
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ENDPOINT !== 'true') {
    return res.status(404).json({ error: 'not_found' });
  }

  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('user_lab_values')
      .select('id,user_id,marker_id,reported_value,created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('dev-list-db-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }

    const showUserId = process.env.ENABLE_DEV_USER_ID === 'true';
    const out = (data || []).map(r => ({
      id: r.id,
      user_id: showUserId ? r.user_id : '[redacted]',
      marker_id: r.marker_id,
      reported_value: r.reported_value,
      created_at: r.created_at
    }));

    console.info('GET /api/dev/user-lab-values', { count: out.length, showUserId });
    return res.status(200).json(out);
  } catch (err) {
    console.error('dev-list-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: content management endpoints (server-only, protected by BACKEND_API_KEY)
app.get('/api/admin/content', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const [{ data: lab_markers }, { data: logic_rules }, { data: resources }] = await Promise.all([
      sb.from('lab_markers').select('*'),
      sb.from('logic_rules').select('*'),
      sb.from('resources').select('*')
    ]);
    return res.status(200).json({ lab_markers: lab_markers || [], logic_rules: logic_rules || [], resources: resources || [] });
  } catch (err) {
    console.error('admin-content-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/admin/resources', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { type, title, description, tags } = req.body || {};
  if (!type || !title || !Array.isArray(tags)) return res.status(400).json({ error: 'missing-params' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('resources').insert([{ type, title, description: description || null, tags }]).select('id');
    if (error) {
      console.error('admin-insert-resource-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json({ id: Array.isArray(data) ? data[0].id : data });
  } catch (err) {
    console.error('admin-insert-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.delete('/api/admin/resources/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('resources').delete().eq('id', id);
    if (error) {
      console.error('admin-delete-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('admin-delete-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
