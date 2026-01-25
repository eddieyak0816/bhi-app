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
const { v4: uuidv4 } = require('uuid');

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
    const returnedId = Array.isArray(data) ? data[0].id : data
    console.info('admin-insert-resource', { id: returnedId, type, title })

    try {
      // log admin action via DB function
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_resource', p_target_table: 'resources', p_target_id: returnedId, p_details: { type, title } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
      else console.info('admin-audit-logged', { id: returnedId })
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ id: returnedId });
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

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_resource', p_target_table: 'resources', p_target_id: id, p_details: '{}' });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
      else console.info('admin-audit-logged-delete', { id })
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('admin-delete-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: bulk-delete resources (server-only)
app.post('/api/admin/resources/bulk-delete', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids : null;
  if (!ids || ids.length === 0) return res.status(400).json({ error: 'missing-ids' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('resources').delete().in('id', ids);
    if (error) {
      console.error('admin-bulk-delete-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'bulk_delete_resources', p_target_table: 'resources', p_target_id: null, p_details: { ids } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
      else console.info('admin-audit-logged-bulk-delete', { count: ids.length })
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ deleted: ids });
  } catch (err) {
    console.error('admin-bulk-delete-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// --- Logic-rules (criteria) CRUD for Admin UI ---
// Create
app.post('/api/admin/logic-rules', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { marker_id, min_value, max_value, tag_to_apply } = req.body || {};
  if (!marker_id || typeof min_value === 'undefined' || typeof max_value === 'undefined' || !tag_to_apply) return res.status(400).json({ error: 'missing-params' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const payload = { marker_id, min_value: Number(min_value), max_value: Number(max_value), tag_to_apply };
    const { data, error } = await sb.from('logic_rules').insert([payload]).select('marker_id,min_value,max_value,tag_to_apply,id');
    if (error) {
      console.error('admin-insert-logic-rule-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    const returned = Array.isArray(data) ? data[0] : data;
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_logic_rule', p_target_table: 'logic_rules', p_target_id: returned.id || null, p_details: returned });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json(returned);
  } catch (err) {
    console.error('admin-insert-logic-rule-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Update
app.patch('/api/admin/logic-rules/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  const { marker_id, min_value, max_value, tag_to_apply } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const updates = {};
    if (marker_id) updates.marker_id = marker_id;
    if (typeof min_value !== 'undefined') updates.min_value = Number(min_value);
    if (typeof max_value !== 'undefined') updates.max_value = Number(max_value);
    if (typeof tag_to_apply !== 'undefined') updates.tag_to_apply = tag_to_apply;
    const { data, error } = await sb.from('logic_rules').update(updates).eq('id', id).select('id,marker_id,min_value,max_value,tag_to_apply');
    if (error) {
      console.error('admin-update-logic-rule-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    const returned = Array.isArray(data) ? data[0] : data;
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'update_logic_rule', p_target_table: 'logic_rules', p_target_id: id, p_details: returned });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json(returned);
  } catch (err) {
    console.error('admin-update-logic-rule-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Delete
app.delete('/api/admin/logic-rules/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('logic_rules').delete().eq('id', id);
    if (error) {
      console.error('admin-delete-logic-rule-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_logic_rule', p_target_table: 'logic_rules', p_target_id: id, p_details: '{}' });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('admin-delete-logic-rule-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Admin-only audit listing (server-only; requires BACKEND_API_KEY)
app.get('/api/admin/audit', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('admin_audit').select('id,admin_text,action,target_table,target_id,details,created_at').order('created_at', { ascending: false }).limit(50);
    if (error) {
      console.error('admin-audit-list-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('admin-audit-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: list known tags (preferred: persistent `tags` table; fallback: derive from resources & logic_rules)
app.get('/api/admin/tags', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // try persistent tags table first
    const { data: tagsData, error: tagsErr } = await sb.from('tags').select('name');
    if (!tagsErr && Array.isArray(tagsData) && tagsData.length > 0) {
      return res.status(200).json(Array.from(new Set(tagsData.map(t => t.name))).sort());
    }

    // fallback: derive tags from resources and logic_rules
    const [{ data: resources }, { data: logic_rules }] = await Promise.all([
      sb.from('resources').select('tags'),
      sb.from('logic_rules').select('tag_to_apply')
    ]);
    const fromResources = (resources || []).flatMap(r => Array.isArray(r.tags) ? r.tags : typeof r.tags === 'string' ? r.tags.replace(/^[{]|[}]$/g,'').split(',') : []).map(String);
    const fromRules = (logic_rules || []).map(r => r.tag_to_apply).filter(Boolean).map(String);
    const combined = Array.from(new Set(fromResources.concat(fromRules))).sort();
    return res.status(200).json(combined);
  } catch (err) {
    console.error('admin-tags-server-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: create a tag (server-side persistent when possible; always logs an audit entry)
app.post('/api/admin/tags', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const name = (req.body && req.body.name || '').toString().trim();
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // attempt to insert into tags table; if missing, fall back to logging an audit row so tag is discoverable
    let inserted = false
    try {
      const { error: insErr } = await sb.from('tags').insert([{ name }]);
      if (!insErr) inserted = true
    } catch (err) {
      // tags table may not exist; ignore and continue
      console.warn('tags-insert-fallback', err)
    }

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_tag', p_target_table: 'tags', p_target_id: null, p_details: { name, persisted: inserted } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ name, persisted: inserted });
  } catch (err) {
    console.error('admin-create-tag-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: rename a tag (update catalog + propagate to resources and logic_rules)
app.patch('/api/admin/tags/:name', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const oldName = req.params.name;
  const newName = (req.body && req.body.new_name || '').toString().trim();
  if (!oldName || !newName) return res.status(400).json({ error: 'missing-params' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    await sb.rpc('pg_sleep', { seconds: 0 }).catch(() => {}) // guard for older PGs
    // Try to update tags table if present
    try {
      const { error: upErr } = await sb.from('tags').upsert([{ name: newName }]);
      if (upErr) console.warn('tags-upsert-warn', upErr)
      await sb.from('tags').delete().eq('name', oldName);
    } catch (err) {
      console.warn('tags-propagation-fallback', err)
    }

    // Propagate to resources: replace array element oldName -> newName
    const { error: resErr } = await sb.rpc('replace_resource_tag', { p_old: oldName, p_new: newName }).catch(() => ({ error: null }));
    if (resErr) console.warn('replace_resource_tag failed', resErr);

    // Propagate to logic_rules
    const { error: lrErr } = await sb.from('logic_rules').update({ tag_to_apply: newName }).eq('tag_to_apply', oldName);
    if (lrErr) console.warn('logic_rules-propagate-failed', lrErr);

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'rename_tag', p_target_table: 'tags', p_target_id: null, p_details: { oldName, newName } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }

    return res.status(200).json({ oldName, newName });
  } catch (err) {
    console.error('admin-rename-tag-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: delete a tag (remove from catalog, resources.tags arrays, and logic_rules)
app.delete('/api/admin/tags/:name', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const name = req.params.name;
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // remove from resources.tags using array_remove
    const { error: remErr } = await sb.rpc('array_remove_from_resources', { p_tag_name: name }).catch(() => ({ error: null }));
    if (remErr) {
      // Fallback: if RPC doesn't exist, just proceed (tags can be removed manually)
      console.warn('resources-tag-remove-failed', remErr);
    }
    // delete any logic_rules that reference this tag
    const { error: lrErr } = await sb.from('logic_rules').delete().eq('tag_to_apply', name);
    if (lrErr) console.warn('logic_rules-delete-failed', lrErr);
    // delete from tags table if present
    await sb.from('tags').delete().eq('name', name).catch(() => {});

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_tag', p_target_table: 'tags', p_target_id: null, p_details: { name } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }

    return res.status(200).json({ deleted: name });
  } catch (err) {
    console.error('admin-delete-tag-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: resource_types CRUD
app.get('/api/admin/resource-types', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('resource_types').select('name').order('name');
    if (error) {
      console.error('admin-get-resource-types-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('admin-get-resource-types-exception', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

app.post('/api/admin/resource-types', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('resource_types').insert([{ name: name.trim() }]).select('*');
    if (error) {
      console.error('admin-insert-resource-type-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(201).json(data?.[0] || { name: name.trim() });
  } catch (err) {
    console.error('admin-insert-resource-type-exception', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

app.delete('/api/admin/resource-types/:name', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const name = req.params.name;
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('resource_types').delete().eq('name', name);
    if (error) {
      console.error('admin-delete-resource-type-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json({ deleted: name });
  } catch (err) {
    console.error('admin-delete-resource-type-exception', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: lab_markers CRUD (for creating markers from Admin UI)
app.post('/api/admin/lab-markers', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { id, name, unit } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const payload = { id: id || uuidv4(), name, unit: unit || null };
    const { data, error } = await sb.from('lab_markers').insert([payload]).select('*');
    if (error) {
      console.error('admin-insert-lab-marker-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    const returned = Array.isArray(data) ? data[0] : data;
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_lab_marker', p_target_table: 'lab_markers', p_target_id: returned.id || null, p_details: returned });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json(returned);
  } catch (err) {
    console.error('admin-insert-lab-marker-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.delete('/api/admin/lab-markers/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('lab_markers').delete().eq('id', id);
    if (error) {
      console.error('admin-delete-lab-marker-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_lab_marker', p_target_table: 'lab_markers', p_target_id: id, p_details: '{}' });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('admin-delete-lab-marker-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: delete logic_rules by attribute (fallback when there is no id column or UI lacks id)
app.post('/api/admin/logic-rules/delete-by-attrs', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { marker_id, min_value, max_value, tag_to_apply } = req.body || {};
  if (!marker_id || typeof min_value === 'undefined' || typeof max_value === 'undefined' || !tag_to_apply) return res.status(400).json({ error: 'missing-params' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('logic_rules').delete().match({ marker_id, min_value: Number(min_value), max_value: Number(max_value), tag_to_apply });
    if (error) {
      console.error('admin-delete-logic-rule-by-attrs-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_logic_rule_by_attrs', p_target_table: 'logic_rules', p_target_id: null, p_details: { marker_id, min_value, max_value, tag_to_apply } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ deleted: { marker_id, min_value, max_value, tag_to_apply } });
  } catch (err) {
    console.error('admin-delete-logic-rule-by-attrs-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
