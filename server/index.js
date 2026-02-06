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
  const { type, title, description, tags, categories, link_url } = req.body || {};
  if (!type || !title || !Array.isArray(tags)) return res.status(400).json({ error: 'missing-params' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('resources').insert([{ type, title, description: description || null, tags, categories: categories || [], link_url: link_url || null }]).select('id');
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

// ADMIN: Update resource
app.patch('/api/admin/resources/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  
  const { title, description, type, tags, categories, link_url } = req.body || {};
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (tags !== undefined) updateData.tags = tags;
  if (categories !== undefined) updateData.categories = categories;
  if (link_url !== undefined) updateData.link_url = link_url;
  
  if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'no-fields-to-update' });
  
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('resources').update(updateData).eq('id', id);
    if (error) {
      console.error('admin-update-resource-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'update_resource', p_target_table: 'resources', p_target_id: id, p_details: updateData });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
      else console.info('admin-audit-logged-update-resource', { id })
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ updated: id, ...updateData });
  } catch (err) {
    console.error('admin-update-resource-server-error', err);
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
  const { marker_id, min_value, max_value, tag_to_apply, operator } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const updates = {};
    if (marker_id) updates.marker_id = marker_id;
    if (typeof min_value !== 'undefined') updates.min_value = Number(min_value);
    if (typeof max_value !== 'undefined') updates.max_value = Number(max_value);
    if (typeof tag_to_apply !== 'undefined') updates.tag_to_apply = tag_to_apply;
    if (operator) updates.operator = operator;
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

// ADMIN: list known tags (preferred: persistent `tags` table with optional categories via join table; fallback: derive from resources & logic_rules)
app.get('/api/admin/tags', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // try persistent tags table first
    let tagsData = null
    try {
      tagsData = await sb.from('tags').select('name,category_id');
    } catch (err) {
      tagsData = null
    }

    if (tagsData && Array.isArray(tagsData.data) && tagsData.data.length > 0) {
      const raw = tagsData.data;
      const names = raw.map(r => r.name).filter(Boolean);

      // attempt to resolve many-to-many associations from tag_categories
      let tagToCatIds = {};
      try {
        const { data: tcs, error: tcErr } = await sb.from('tag_categories').select('tag_name,category_id').in('tag_name', names);
        if (!tcErr && Array.isArray(tcs)) {
          tcs.forEach(row => {
            if (!row) return;
            const t = row.tag_name;
            tagToCatIds[t] = tagToCatIds[t] || [];
            if (row.category_id && !tagToCatIds[t].includes(row.category_id)) tagToCatIds[t].push(row.category_id);
          })
        }
      } catch (err) {
        // tag_categories may not exist yet; ignore
        tagToCatIds = {};
      }

      // collect all category ids we need to map to names
      const allCatIds = Array.from(new Set(Object.values(tagToCatIds).flat().filter(Boolean)));
      let catMap = {};
      if (allCatIds.length > 0) {
        try {
          const { data: cats } = await sb.from('categories').select('id,name').in('id', allCatIds);
          catMap = (cats || []).reduce((acc, c) => (acc[c.id] = c.name, acc), {});
        } catch (err) {
          catMap = {};
        }
      }

      // Build output: prefer many-to-many categories if available, else fall back to single category_id
      const out = raw.map(r => {
        const tagName = r.name;
        const catIds = tagToCatIds[tagName] || [];
        if (catIds.length > 0) {
          return { name: tagName, categories: catIds.map(id => catMap[id] || null).filter(Boolean) };
        }
        // fall back to legacy category_id column
        if (r.category_id) {
          return { name: tagName, categories: [(catMap[r.category_id] || null)].filter(Boolean) };
        }
        return { name: tagName, categories: [] };
      });
      return res.status(200).json(out);
    }

    // fallback: derive tags from resources and logic_rules (legacy behaviour)
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

// ADMIN: Categories CRUD (server-only)
app.get('/api/admin/categories', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('categories').select('*').order('name', { ascending: true });
    if (error) {
      console.error('admin-list-categories-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('admin-categories-list-error', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post('/api/admin/categories', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const { name, description, is_active } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb.from('categories').insert([{ name, description: description || '', is_active: typeof is_active === 'boolean' ? is_active : true }]).select('id');
    if (error) {
      console.error('admin-insert-category-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    const returnedId = Array.isArray(data) ? data[0].id : data;
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_category', p_target_table: 'categories', p_target_id: returnedId, p_details: { name } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ id: returnedId });
  } catch (err) {
    console.error('admin-insert-category-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.patch('/api/admin/categories/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  const { name, description, is_active } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (is_active !== undefined) updates.is_active = is_active;
    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'no-fields-to-update' });
    const { error } = await sb.from('categories').update(updates).eq('id', id);
    if (error) {
      console.error('admin-update-category-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'update_category', p_target_table: 'categories', p_target_id: id, p_details: updates });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ updated: id });
  } catch (err) {
    console.error('admin-update-category-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.delete('/api/admin/categories/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('categories').delete().eq('id', id);
    if (error) {
      console.error('admin-delete-category-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'delete_category', p_target_table: 'categories', p_target_id: id, p_details: '{}' });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }
    return res.status(200).json({ deleted: id });
  } catch (err) {
    console.error('admin-delete-category-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ADMIN: create a tag (server-side persistent when possible; accepts optional category_name or categories[])
app.post('/api/admin/tags', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const name = (req.body && req.body.name || '').toString().trim();
  const category_name = (req.body && (req.body.category_name || req.body.category) || '').toString().trim();
  const categoriesArr = Array.isArray(req.body && req.body.categories) ? req.body.categories.map(String).filter(Boolean) : [];
  if (!name) return res.status(400).json({ error: 'missing-name' });
  const allCategoryNames = categoriesArr.length > 0 ? categoriesArr : (category_name ? [category_name] : []);
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    let inserted = false;
    
    // insert tag in tags table (no upsert to enforce unique constraint on duplicates)
    const payload = { name };
    if (category_name) {
      const { data: cats } = await sb.from('categories').select('id').ilike('name', category_name).limit(1);
      if (cats && cats.length > 0) payload.category_id = cats[0].id;
    }
    const { error: insErr } = await sb.from('tags').insert([payload]);
    if (insErr) {
      console.warn('tags-insert-error', insErr);
      if (insErr.code === '23505') {
        return res.status(409).json({ error: 'db_error', detail: insErr });
      }
      throw insErr;
    }
    inserted = true;

    // handle many-to-many categories when provided
    if (allCategoryNames.length > 0) {
      const orClause = allCategoryNames.map(n => `name.ilike.${n}`).join(',');
      try {
        const { data: resolvedCats } = await sb.from('categories').select('id,name').or(orClause).limit(100);
        const nameToId = (resolvedCats || []).reduce((acc, c) => (acc[c.name] = c.id, acc), {});
        const inserts = [];
        allCategoryNames.forEach(catName => {
          const id = nameToId[catName] || nameToId[Object.keys(nameToId).find(k => k.toLowerCase() === (catName || '').toLowerCase())];
          if (id) inserts.push({ tag_name: name, category_id: id });
        });
        if (inserts.length > 0) {
          try {
            const { error: tcErr } = await sb.from('tag_categories').insert(inserts);
            if (tcErr) console.warn('tag_categories-insert-warn', tcErr);
          } catch (err) { console.warn('tag_categories-insert-ex', err) }
        }
      } catch (err) { console.warn('resolve-cats-ex', err) }
    }

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'create_tag', p_target_table: 'tags', p_target_id: null, p_details: { name, categories: allCategoryNames, persisted: inserted } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) {
      console.warn('admin-audit-exception', err)
    }

    return res.status(200).json({ name, categories: allCategoryNames, persisted: inserted });
  } catch (err) {
    console.error('admin-create-tag-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: rename or update a tag (update catalog + propagate to resources and logic_rules). Accepts new_name and/or category_name
app.patch('/api/admin/tags/:name', async (req, res) => {
  console.log('PATCH /api/admin/tags/:name called');
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  console.log('Auth check:', { hasKey: !!incomingKey, matches: incomingKey === BACKEND_API_KEY });
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const oldName = req.params.name;
  const newName = (req.body && req.body.new_name || '').toString().trim();
  const category_name = (req.body && (req.body.category_name || req.body.category) || '').toString().trim();
  const categoriesArr = Array.isArray(req.body && req.body.categories) ? req.body.categories.map(String).filter(Boolean) : (req.body && req.body.categories && typeof req.body.categories === 'string' ? [req.body.categories] : []);
  console.log('PATCH tags:', { oldName, newName, bodyReceived: !!req.body, bodyContent: req.body, categoriesArr });
  if (!oldName || !newName) {
    console.log('Missing params - returning 400');
    return res.status(400).json({ error: 'missing-params' });
  }
  
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    try {
      await sb.rpc('pg_sleep', { seconds: 0 });
    } catch (err) {
      // guard for older PGs
      console.warn('pg_sleep-not-available', err);
    }
    
    const nameChanged = oldName !== newName;
    
    // Try to update tags table if present and replace tag_categories entries
    try {
      if (nameChanged) {
        // Rename: insert new name into tags table (fail if duplicate, like POST)
        const insertPayload = { name: newName };
        // if a single category_name provided, set legacy category_id for compatibility
        if (category_name) {
          const { data: cats } = await sb.from('categories').select('id').ilike('name', category_name).limit(1);
          if (cats && cats.length > 0) insertPayload.category_id = cats[0].id;
        } else if (categoriesArr.length === 1) {
          const { data: cats } = await sb.from('categories').select('id').ilike('name', categoriesArr[0]).limit(1);
          if (cats && cats.length > 0) insertPayload.category_id = cats[0].id;
        }
        const { error: insErr } = await sb.from('tags').insert([insertPayload]);
        if (insErr) {
          console.warn('tags-insert-error', insErr);
          if (insErr.code === '23505') {
            return res.status(409).json({ error: 'db_error', detail: insErr });
          }
          throw insErr;
        }
        await sb.from('tags').delete().eq('name', oldName);
      }

      // replace tag_categories entries for this tag: delete old and new, then insert based on provided categories
      try { await sb.from('tag_categories').delete().eq('tag_name', oldName); } catch (err) { /* ignore if table missing */ }
      if (nameChanged) {
        try { await sb.from('tag_categories').delete().eq('tag_name', newName); } catch (err) { /* ignore if table missing */ }
      }
      
      const allCategoryNames = categoriesArr.length > 0 ? categoriesArr : (category_name ? [category_name] : []);
      if (allCategoryNames.length > 0) {
        const orClause = allCategoryNames.map(n => `name.ilike.${n}`).join(',')
        try {
          const { data: resolvedCats } = await sb.from('categories').select('id,name').or(orClause).limit(100);
          const nameToId = (resolvedCats || []).reduce((acc, c) => (acc[c.name] = c.id, acc), {});
          const inserts = [];
          allCategoryNames.forEach(catName => {
            const id = nameToId[catName] || nameToId[Object.keys(nameToId).find(k => k.toLowerCase() === (catName || '').toLowerCase())];
            if (id) inserts.push({ tag_name: newName, category_id: id });
          });
          if (inserts.length > 0) {
            try { const { error: tcErr } = await sb.from('tag_categories').insert(inserts); if (tcErr) console.warn('tag_categories-insert-warn', tcErr); } catch (err) { console.warn('tag_categories-insert-ex', err) }
          }
        } catch (err) { console.warn('resolve-cats-ex', err) }
      }
    } catch (err) {
      console.warn('tags-propagation-fallback', err)
    }

    // Propagate to resources and logic_rules only if name changed
    if (nameChanged) {
      // Propagate to resources: replace array element oldName -> newName
      try {
        const { error: resErr } = await sb.rpc('replace_resource_tag', { p_old: oldName, p_new: newName });
        if (resErr) console.warn('replace_resource_tag failed', resErr);
      } catch (err) {
        console.warn('replace_resource_tag exception', err);
      }

      // Propagate to logic_rules
      const { error: lrErr } = await sb.from('logic_rules').update({ tag_to_apply: newName }).eq('tag_to_apply', oldName);
      if (lrErr) console.warn('logic_rules-propagate-failed', lrErr);
    }

    try {
      const action = nameChanged ? 'rename_tag' : 'update_tag_categories';
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: action, p_target_table: 'tags', p_target_id: null, p_details: { oldName, newName, categories: categoriesArr } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr)
    } catch (err) { console.warn('admin-audit-exception', err) }

    return res.status(200).json({ oldName, newName, category: category_name || null });
  } catch (err) {
    console.error('admin-rename-tag-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: update resource-type name
app.patch('/api/admin/resource-types/:name', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const oldName = decodeURIComponent(req.params.name);
  const newName = (req.body && req.body.new_name || '').toString().trim();
  if (!oldName || !newName) return res.status(400).json({ error: 'missing-params' });
  try {
    console.log('PATCH resource-type', { oldName, newName });
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const normalizedNew = (newName || '').toString().trim().toLowerCase();

    // 1) Ensure new resource type exists (upsert)
    try {
      const { error: upsertErr } = await sb.from('resource_types').upsert([{ name: normalizedNew }]);
      if (upsertErr) {
        console.error('resource-type-upsert-error', upsertErr);
        return res.status(500).json({ error: 'db_error', detail: upsertErr });
      }
    } catch (err) {
      console.error('resource-type-upsert-ex', err);
      return res.status(500).json({ error: 'server_error', detail: String(err) });
    }

    // 2) Propagate to resources.type field (update resources to reference new name)
    try {
      const { error: resErr } = await sb.from('resources').update({ type: normalizedNew }).ilike('type', oldName);
      if (resErr) console.warn('resources-type-propagate-failed', resErr);
    } catch (err) {
      console.error('resources-type-propagate-ex', err);
      return res.status(500).json({ error: 'server_error', detail: String(err) });
    }

    // 3) Remove old resource_type entry (if exists)
    try {
      const { error: delErr } = await sb.from('resource_types').delete().ilike('name', oldName);
      if (delErr) console.warn('resource-types-delete-old-failed', delErr);
    } catch (err) {
      console.error('resource-types-delete-old-ex', err);
    }

    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'update_resource_type', p_target_table: 'resource_types', p_target_id: null, p_details: { oldName, newName: normalizedNew } });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr);
    } catch (err) { console.warn('admin-audit-exception', err); }

    return res.status(200).json({ oldName, newName: normalizedNew });
  } catch (err) {
    console.error('admin-update-resource-type-error', err);
    return res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// ADMIN: update lab-marker name and unit
app.patch('/api/admin/lab-markers/:id', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });
  const id = req.params.id;
  if (!id) return res.status(400).json({ error: 'missing-id' });
  
  const { name, unit, min_normal, max_normal } = req.body || {};
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (unit !== undefined) updateData.unit = unit;
  if (min_normal !== undefined) updateData.min_normal = min_normal;
  if (max_normal !== undefined) updateData.max_normal = max_normal;
  
  if (Object.keys(updateData).length === 0) return res.status(400).json({ error: 'no-fields-to-update' });
  
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('lab_markers').update(updateData).eq('id', id);
    if (error) {
      console.error('lab-marker-update-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    
    try {
      const { error: auditErr } = await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'update_lab_marker', p_target_table: 'lab_markers', p_target_id: id, p_details: updateData });
      if (auditErr) console.warn('admin-audit-rpc-error', auditErr);
      else console.info('admin-audit-logged-update-lab-marker', { id });
    } catch (err) { console.warn('admin-audit-exception', err); }
    
    return res.status(200).json({ updated: id, ...updateData });
  } catch (err) {
    console.error('admin-update-lab-marker-error', err);
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
    try {
      const { error: remErr } = await sb.rpc('array_remove_from_resources', { p_tag_name: name });
      if (remErr) {
        console.warn('resources-tag-remove-failed', remErr);
      }
    } catch (err) {
      console.warn('resources-tag-remove-exception', err);
    }
    // delete any logic_rules that reference this tag
    const { error: lrErr } = await sb.from('logic_rules').delete().eq('tag_to_apply', name);
    if (lrErr) console.warn('logic_rules-delete-failed', lrErr);
    // delete tag_categories entries
    try {
      await sb.from('tag_categories').delete().eq('tag_name', name);
    } catch (err) {
      // ignore if table missing
    }
    // delete from tags table if present
    try {
      await sb.from('tags').delete().eq('name', name);
    } catch (err) {
      console.warn('tags-delete-exception', err);
    }

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
    const normalizedName = name.trim().toLowerCase();
    const { data, error } = await sb.from('resource_types').insert([{ name: normalizedName }]).select('*');
    if (error) {
      console.error('admin-insert-resource-type-error', error);
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(201).json(data?.[0] || { name: normalizedName });
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
  const { id, name, unit, min_normal, max_normal } = req.body || {};
  if (!name) return res.status(400).json({ error: 'missing-name' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const payload = { id: id || uuidv4(), name, unit: unit || null, min_normal: min_normal || null, max_normal: max_normal || null };
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
