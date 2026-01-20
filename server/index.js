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

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
