// Load server env from .env.server when present (safe local dev)
try {
  const path = require('path');
  const envPath = path.resolve(__dirname, '..', '.env.server');
  const result = require('dotenv').config({ path: envPath });
  console.info('[env] loaded from:', envPath, result.error ? 'FAILED: ' + result.error.message : 'OK');
  console.info('[env] GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);
} catch (err) {
  console.error('[env] dotenv failed:', err.message);
}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Multer: store uploaded PDFs in memory (max 10 MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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
  
  const { title, description, type, tags, categories, link_url, thumbnail_url } = req.body || {};
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (type !== undefined) updateData.type = type;
  if (tags !== undefined) updateData.tags = tags;
  if (categories !== undefined) updateData.categories = categories;
  if (link_url !== undefined) updateData.link_url = link_url;
  if (thumbnail_url !== undefined) updateData.thumbnail_url = thumbnail_url;
  
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

// ── New Marker Wizard ─────────────────────────────────────────────────────────
// POST /api/admin/new-marker-wizard
// Atomically creates: 1 lab marker + N logic rules + N tags in one request.
// Body: { name, unit, rules: [{ label, min_value, max_value, tag_name }] }
// Rules with empty min/max or tag are skipped. At least one rule required.
app.post('/api/admin/new-marker-wizard', async (req, res) => {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) return res.status(501).json({ error: 'backend-disabled' });
  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) return res.status(403).json({ error: 'forbidden' });

  const { name, unit, rules } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'missing-name' });
  if (!Array.isArray(rules) || rules.length === 0) return res.status(400).json({ error: 'missing-rules' });

  const validRules = rules.filter(r =>
    r && r.tag_name && r.tag_name.trim() &&
    typeof r.min_value !== 'undefined' && r.min_value !== '' &&
    typeof r.max_value !== 'undefined' && r.max_value !== ''
  );
  if (validRules.length === 0) return res.status(400).json({ error: 'no-valid-rules', message: 'At least one rule with min, max, and tag is required.' });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const markerName = name.trim();
  const markerUnit = (unit || '').trim() || null;
  let markerId;
  let createdMarker;

  try {
    // 1. Create marker (duplicate name → 409)
    const { data: mData, error: mErr } = await sb.from('lab_markers')
      .insert([{ id: uuidv4(), name: markerName, unit: markerUnit }])
      .select('*');
    if (mErr) {
      if (mErr.code === '23505') return res.status(409).json({ error: 'duplicate-marker', message: `A marker named "${markerName}" already exists.` });
      console.error('wizard-marker-insert-error', mErr);
      return res.status(500).json({ error: 'db_error', detail: mErr });
    }
    createdMarker = Array.isArray(mData) ? mData[0] : mData;
    markerId = createdMarker.id;

    // 2. Create tags with scoring_tier (skip duplicates silently)
    // label values from the Wizard: 'Optimal' | 'Improvement' | 'Out of Range'
    const labelToTier = { 'Optimal': 'optimal', 'Improvement': 'improvement', 'Out of Range': 'out_of_range' };
    const tagNames = [...new Set(validRules.map(r => r.tag_name.trim()))];
    for (const tagName of tagNames) {
      const rule = validRules.find(r => r.tag_name.trim() === tagName);
      const scoring_tier = labelToTier[rule?.label] || 'out_of_range';
      const { error: tErr } = await sb.from('tags').insert([{ name: tagName, scoring_tier }]);
      if (tErr && tErr.code === '23505') {
        // Tag exists — update its tier in case it was previously unset
        await sb.from('tags').update({ scoring_tier }).eq('name', tagName).is('scoring_tier', null);
      } else if (tErr) {
        console.warn('wizard-tag-insert-warn', tagName, tErr);
      }
    }

    // 3. Create logic rules
    const rulePayloads = validRules.map(r => ({
      marker_id: markerId,
      min_value: Number(r.min_value),
      max_value: Number(r.max_value),
      tag_to_apply: r.tag_name.trim(),
      operator: 'between'
    }));
    const { data: rulesData, error: rulesErr } = await sb.from('logic_rules')
      .insert(rulePayloads)
      .select('id,marker_id,min_value,max_value,tag_to_apply');
    if (rulesErr) {
      console.error('wizard-rules-insert-error', rulesErr);
      // Roll back marker
      await sb.from('lab_markers').delete().eq('id', markerId);
      return res.status(500).json({ error: 'db_error', detail: rulesErr });
    }

    // 4. Audit log
    try {
      await sb.rpc('log_admin_action', { p_admin_text: 'dev', p_action: 'new_marker_wizard', p_target_table: 'lab_markers', p_target_id: markerId, p_details: { marker: createdMarker, rules: rulesData } });
    } catch (auditErr) { console.warn('wizard-audit-exception', auditErr); }

    console.info('new-marker-wizard: created marker', markerId, 'with', rulesData.length, 'rules');
    return res.status(200).json({ marker: createdMarker, rules: rulesData, tags: tagNames });
  } catch (err) {
    console.error('new-marker-wizard-exception', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── DEV: PDF text extraction preview (no AI) ─────────────────────────────────
// POST /api/dev/extract-pdf-text — returns raw pdf-parse text only, no AI call
app.post('/api/dev/extract-pdf-text', upload.single('pdf'), async (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_ENDPOINT !== 'true') {
    return res.status(404).json({ error: 'not_found' });
  }
  if (!req.file) return res.status(400).json({ error: 'no-file' });
  try {
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(req.file.buffer);
    return res.status(200).json({ chars: parsed.text.length, text: parsed.text });
  } catch (err) {
    return res.status(422).json({ error: 'pdf-parse-failed', message: err.message });
  }
});

// ── PDF Lab Extraction ───────────────────────────────────────────────────────
// POST /api/extract-labs
// Extracts text from the PDF with pdf-parse, then tries providers in order:
//   1. Gemini keys (native PDF via inline data)
//   2. OpenRouter (text-based, any free model)
//   3. Groq (text-based, llama free tier)
// Auth: same x-backend-api-key header as other protected endpoints.
app.post('/api/extract-labs', upload.single('pdf'), async (req, res) => {
  if (!BACKEND_API_KEY || !SUPABASE_URL) {
    return res.status(501).json({ error: 'backend-disabled' });
  }

  const incomingKey = req.header('x-backend-api-key') || '';
  if (!incomingKey || incomingKey !== BACKEND_API_KEY) {
    return res.status(403).json({ error: 'forbidden' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'no-file', message: 'Upload a PDF file with field name "pdf".' });
  }

  if (req.file.mimetype !== 'application/pdf') {
    return res.status(400).json({ error: 'invalid-file-type', message: 'Only PDF files are accepted.' });
  }

  console.info('POST /api/extract-labs', { filename: req.file.originalname, size: req.file.size });

  // ── Step 1: Compute SHA-256 hash for duplicate detection ──────────────────
  const crypto = require('crypto');
  const fileHash = crypto.createHash('sha256').update(req.file.buffer).digest('hex');

  // ── Step 2: Check for hash duplicate (store warning, proceed with extraction) ──
  // user_id is passed as a header from the frontend (non-sensitive — just the Supabase UUID)
  const userId = req.header('x-user-id') || '';
  let earlyDuplicateWarning = null;
  if (userId && SERVICE_ROLE) {
    const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: existing } = await supaAdmin
      .from('lab_pdf_uploads')
      .select('id, accession_num, collection_date, filename, uploaded_at')
      .eq('user_id', userId)
      .eq('file_hash', fileHash)
      .maybeSingle();

    if (existing) {
      const uploadedDate = new Date(existing.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      console.info('extract-labs: hash duplicate detected, will still extract results', existing.id);
      earlyDuplicateWarning = {
        duplicate: true,
        duplicate_reason: 'file',
        duplicate_detail: `This exact file was already uploaded on ${uploadedDate}${existing.filename ? ' as "' + existing.filename + '"' : ''}.`,
      };
    }
  }

  // ── Step 3: Extract text from PDF ─────────────────────────────────────────
  let pdfText = '';
  try {
    const pdfParse = require('pdf-parse');
    const parsed = await pdfParse(req.file.buffer);
    pdfText = parsed.text || '';
    console.info(`extract-labs: extracted ${pdfText.length} chars of text from PDF`);
    console.info('extract-labs: PDF text sample:\n' + pdfText.slice(0, 4000));
  } catch (pdfErr) {
    console.error('extract-labs: pdf-parse failed', pdfErr.message);
    return res.status(422).json({ error: 'pdf-parse-failed', message: 'Could not extract text from this PDF.' });
  }

  if (!pdfText.trim()) {
    return res.status(422).json({ error: 'empty-pdf', message: 'No text found in this PDF. It may be a scanned image — please upload a text-based PDF.' });
  }

  const prompt = `You are a medical lab report parser. Extract all lab test results from the following lab report text.

The report columns are: TEST NAME | CURRENT RESULT | [FLAG] | [PREVIOUS RESULT] | [DATE] | UNITS | REFERENCE RANGE
- The CURRENT RESULT is the first number after the test name.
- FLAG words like "High", "Low", "H", "L" may appear immediately after the current result — they are NOT part of the value.
- A PREVIOUS RESULT (older number) and DATE (e.g. "08/18/2021") may follow the flag — ignore them, use only the current result.

CRITICAL: This PDF was extracted by a text parser that concatenates columns with NO spaces. The current result and previous result run together as one string. You MUST split them correctly.
- Pattern: CURRENT_RESULT + PREVIOUS_RESULT + DATE, with NO spaces between them.
- To find where the current result ends: the current result is the SHORTER leading number. The previous result follows immediately after, then an 8-digit date like "08182021".
- Examples from this EXACT report (showing the raw concatenated text and the correct parse):
    Raw: "Vitamin D, 25-Hydroxy\n 01\n82.056.108/18/2021ng/mL30.0-100.0"  → value_str="82.0" (NOT "82.05"; "56.1" is previous result starting right after)
    Raw: "RBC\n 01\n4.314.6808/18/2021x10E6/uL4.14-5.80"  → value_str="4.31" (NOT "4.3"; "4.68" is previous result starting right after)
    Raw: "TSH\n 01\n0.9881.31008/18/2021uIU/mL0.450-4.500"  → value_str="0.988" ("1.310" is previous result)
    Raw: "Oxidized LDL\n 01\n390Highng/mL10-170"  → value_str="390", flag="H"
    Raw: "LDL Chol Calc (NIH)107High10408/18/2021mg/dL0-99"  → value_str="107", flag="H" (104 is previous result)
    Raw: "Vitamin B12\n 01\n764pg/mL232-1245"  → value_str="764" (no previous result here)
    Raw: "T4,Free(Direct)\n 01\n1.59ng/dL0.82-1.77"  → value_str="1.59"
    Raw: "Neutrophils\n 01\n525408/18/2021%Not Estab."  → value_str="52", min_normal=null, max_normal=null (54 is previous result; "Not Estab." → still include)
    Raw: "Lipoprotein (a)\n A, 01\n<8.4nmol/L<75.0"  → value_str="<8.4"
    Raw: "Thyroglobulin Antibody\n 01\n<1.0IU/mL0.0-0.9"  → value_str="<1.0"
    Raw: "eGFR82mL/min/1.73>59"  → value_str="82", max_normal=null (">59" reference means only a lower bound)
    Raw: "Immature Granulocytes\n 01\n0008/18/2021%Not Estab."  → value_str="0", min_normal=null, max_normal=null (INCLUDE — zero is a valid result)
    Raw: "Immature Grans (Abs)\n 01\n0.00.008/18/2021x10E3/uL0.0-0.1"  → value_str="0.0", min_normal=0, max_normal=0.1 (INCLUDE — zero is valid)
    Raw: "C-Reactive Protein, Cardiac\n 01\n0.34mg/L0.00-3.00"  → value_str="0.34" (NOT "0.3"; unit "mg/L" starts right after — do not confuse the "4" in "0.34" with the unit)

Also extract these report metadata fields if present (return null if not found):
- "accession_num": the specimen/accession ID (e.g. "262-174-6271-0")
- "collection_date": the collection date in ISO format YYYY-MM-DD

Return a single JSON object with two keys:
1. "meta": an object with "accession_num" and "collection_date"
2. "results": an array of objects, each with:
   - "name": test name (string)
   - "value_str": the current result EXACTLY as it appears, including any < or > prefix (string, e.g. "390", "0.988", "4.31", "<8.4", ">59", "1.59")
   - "unit": unit of measurement (string)
   - "min_normal": lower bound of reference range (number or null)
   - "max_normal": upper bound of reference range (number or null)
   - "flag": "H", "L", "HH", "LL", or null

Rules for "value_str":
- Copy the result character-by-character exactly as printed — preserve ALL digits and the decimal point. "4.31" not "4.3", "1.59" not "1.5", "0.988" not "0.98", "390" not "39", "764" not "76", "0.34" not "0.3".
- UNITS run directly into values with no space (e.g. "0.34mg/L" → value is "0.34", unit is "mg/L"). Do not truncate the value when the unit starts with a letter that could be confused with a digit.
- If the result has a < or > qualifier, include it: "<8.4", "<1.0", ">59".
- FLAG WORDS: "High", "Low", "H", "L" after the number are flags — do NOT include them in value_str.
- PREVIOUS RESULTS: a second number followed by a date like "08/18/2021" is the previous result — ignore it, use only the first (current) result.
- FOOTNOTES: markers like "01" after test names are footnote numbers — ignore them.
- ZERO VALUES: "0" and "0.0" are valid results — INCLUDE them. Do not skip rows just because the value is zero.
- SKIP: non-numeric results ("Positive", "Detected"), patient demographics, and disclaimer/note text.
- "Not Estab." as a reference range means min_normal=null, max_normal=null — still INCLUDE the result row.
- A reference like ">59" means min_normal=59, max_normal=null. A reference like "<90" means min_normal=null, max_normal=90.

If no lab values are found, return an empty results array.

IMPORTANT: Return ONLY raw JSON — no markdown fences, no explanation. Response must start with { and end with }.

Lab report text:
${pdfText}`;

  // Helper: parse AI response — expects { meta, results } object
  // Handles: plain JSON, markdown code fences, and prose preamble ("Here is the data: {...}")
  function parseAIResponse(raw) {
    // 1. Strip markdown code fences
    let cleaned = raw.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    function normalizeResults(parsed) {
      // Support both new { meta, results } shape and legacy plain array
      let obj;
      if (Array.isArray(parsed)) obj = { meta: {}, results: parsed };
      else if (parsed && Array.isArray(parsed.results)) obj = parsed;
      else throw new Error('Unexpected response shape');

      // Normalize value_str → value: strip < > qualifiers and parse to float
      obj.results = obj.results.map(r => {
        if (typeof r.value_str === 'string') {
          const stripped = r.value_str.replace(/^[<>]=?\s*/, '').trim();
          const num = parseFloat(stripped);
          return { ...r, value: isNaN(num) ? null : num };
        }
        // Legacy: model returned numeric value directly
        return r;
      }).filter(r => r.value !== null && r.value !== undefined);

      return obj;
    }

    // 2. Try direct parse first
    try {
      return normalizeResults(JSON.parse(cleaned));
    } catch (_) {
      // 3. Extract first { ... } or [ ... ] block from prose response
      const objMatch = cleaned.match(/\{[\s\S]*\}/);
      const arrMatch = cleaned.match(/\[[\s\S]*\]/);
      const match = objMatch && arrMatch
        ? (cleaned.indexOf(objMatch[0]) < cleaned.indexOf(arrMatch[0]) ? objMatch[0] : arrMatch[0])
        : (objMatch?.[0] || arrMatch?.[0]);
      if (match) return normalizeResults(JSON.parse(match));
      throw new Error('Could not extract JSON from AI response');
    }
  }

  // Helper: record a successful upload in lab_pdf_uploads (best-effort, non-blocking)
  async function recordUpload(userId, fileHash, meta, filename) {
    if (!userId || !SERVICE_ROLE) return;
    try {
      const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);

      // Accession-number duplicate check (same report, different file/scan)
      if (meta.accession_num) {
        const { data: existing } = await supaAdmin
          .from('lab_pdf_uploads')
          .select('id, uploaded_at, filename')
          .eq('user_id', userId)
          .eq('accession_num', meta.accession_num)
          .maybeSingle();
        if (existing) {
          console.info('extract-labs: accession duplicate found but proceeding (user was not pre-warned — hash was different)');
        }
      }

      await supaAdmin.from('lab_pdf_uploads').insert({
        user_id: userId,
        file_hash: fileHash,
        accession_num: meta.accession_num || null,
        collection_date: meta.collection_date || null,
        filename: filename || null,
      });
      console.info('extract-labs: upload recorded in lab_pdf_uploads');
    } catch (err) {
      console.warn('extract-labs: failed to record upload (non-fatal):', err.message);
    }
  }

  // Helper: POST JSON to any OpenAI-compatible endpoint, returns { status, body }
  function postJSON(hostname, path, headers, bodyObj) {
    return new Promise((resolve, reject) => {
      const https = require('https');
      const bodyStr = JSON.stringify(bodyObj);
      const req = https.request({ hostname, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr), ...headers } }, (resp) => {
        let data = '';
        resp.on('data', (chunk) => { data += chunk; });
        resp.on('end', () => resolve({ status: resp.statusCode, body: data }));
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  // ── Step 4: Try Gemini keys ────────────────────────────────────────────────
  const geminiKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter(Boolean);

  for (let i = 0; i < geminiKeys.length; i++) {
    try {
      console.info(`extract-labs: trying Gemini key ${i + 1} of ${geminiKeys.length}`);
      const genAI = new GoogleGenerativeAI(geminiKeys[i]);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await model.generateContent(prompt);
      const { meta, results } = parseAIResponse(result.response.text());

      // Check accession-number duplicate before returning
      if (userId && meta.accession_num && SERVICE_ROLE) {
        const supaAdmin = createClient(SUPABASE_URL, SERVICE_ROLE);
        const { data: existing } = await supaAdmin
          .from('lab_pdf_uploads')
          .select('id, uploaded_at, filename')
          .eq('user_id', userId)
          .eq('accession_num', meta.accession_num)
          .maybeSingle();
        if (existing) {
          const uploadedDate = new Date(existing.uploaded_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
          console.info('extract-labs: duplicate detected (accession match)', meta.accession_num);
          return res.status(200).json({
            duplicate: true,
            duplicate_reason: 'accession',
            duplicate_detail: `Accession #${meta.accession_num} was already uploaded on ${uploadedDate}${existing.filename ? ' as "' + existing.filename + '"' : ''}.`,
            results,
            meta,
          });
        }
      }

      console.info(`extract-labs: ${results.length} markers via Gemini key ${i + 1}`);
      await recordUpload(userId, fileHash, meta, req.file.originalname);
      return res.status(200).json({ results, meta, ...earlyDuplicateWarning });
    } catch (err) {
      const is429 = err.message && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED'));
      console.warn(`extract-labs: Gemini key ${i + 1} failed${is429 ? ' (quota)' : ' (error)'}:`, err.message);
      // Always continue to next key regardless of error type
    }
  }

  // ── Step 5: OpenRouter fallback (text → any free model) ───────────────────
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
  if (OPENROUTER_API_KEY) {
    const orModels = [
      'meta-llama/llama-3.3-70b-instruct:free',  // confirmed working
      'google/gemini-2.0-flash-exp:free',         // Gemini via OpenRouter (free experimental)
      'mistralai/mistral-7b-instruct:free',
      'qwen/qwen2.5-72b-instruct:free',
    ];
    for (const orModel of orModels) {
      try {
        console.info(`extract-labs: trying OpenRouter model ${orModel}`);
        const orResult = await postJSON(
          'openrouter.ai',
          '/api/v1/chat/completions',
          { 'Authorization': `Bearer ${OPENROUTER_API_KEY}`, 'HTTP-Referer': 'https://national-health-league.com', 'X-Title': 'NHL Lab Extractor' },
          { model: orModel, messages: [{ role: 'user', content: prompt }] }
        );
        if (orResult.status === 404 || orResult.status === 400) {
          console.warn(`extract-labs: OpenRouter model ${orModel} not available (${orResult.status})`);
          continue;
        }
        if (orResult.status !== 200) {
          console.warn(`extract-labs: OpenRouter model ${orModel} error ${orResult.status}:`, orResult.body);
          continue;
        }
        const orJson = JSON.parse(orResult.body);
        const orText = orJson.choices?.[0]?.message?.content || '';
        const { meta, results } = parseAIResponse(orText);
        console.info(`extract-labs: ${results.length} markers via OpenRouter (${orModel})`);
        await recordUpload(userId, fileHash, meta, req.file.originalname);
        return res.status(200).json({ results, meta, ...earlyDuplicateWarning });
      } catch (orErr) {
        console.warn(`extract-labs: OpenRouter model ${orModel} threw:`, orErr.message);
      }
    }
  }

  // ── Step 6: Groq fallback (text → llama free tier) ────────────────────────
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  if (GROQ_API_KEY) {
    try {
      console.info('extract-labs: trying Groq');
      const groqResult = await postJSON(
        'api.groq.com',
        '/openai/v1/chat/completions',
        { 'Authorization': `Bearer ${GROQ_API_KEY}` },
        { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.1 }
      );
      if (groqResult.status === 200) {
        const groqJson = JSON.parse(groqResult.body);
        const groqText = groqJson.choices?.[0]?.message?.content || '';
        const { meta, results } = parseAIResponse(groqText);
        console.info(`extract-labs: ${results.length} markers via Groq`);
        await recordUpload(userId, fileHash, meta, req.file.originalname);
        return res.status(200).json({ results, meta, ...earlyDuplicateWarning });
      }
      console.warn('extract-labs: Groq error', groqResult.status, groqResult.body);
    } catch (groqErr) {
      console.error('extract-labs: Groq threw:', groqErr.message);
    }
  }

  console.error('extract-labs: all providers exhausted');
  return res.status(429).json({ error: 'quota-exhausted', message: 'All AI providers are unavailable. Try again later or add a GROQ_API_KEY to .env.server.' });
});

// ── Feature 16: De-identified Employer View ──────────────────────────────────

// Server-side BHAS scoring — reads scoring_tier from tags table (F47)
// tagTierMap: Map<tagName, 'optimal' | 'improvement' | 'out_of_range'>
// Falls back to 0 for any tag not in the map (unknown/legacy).

function evalRule(value, rule) {
  const op = rule.operator || 'between';
  switch (op) {
    case 'between': return value >= rule.min_value && value <= rule.max_value;
    case '<':  return value < rule.min_value;
    case '>':  return value > rule.max_value;
    case '=':  return value === rule.min_value;
    case '<=': return value <= rule.min_value;
    case '>=': return value >= rule.max_value;
    default: return false;
  }
}

function tagToScore(tag, tagTierMap) {
  const tier = tagTierMap.get(tag);
  if (tier === 'optimal') return 1;
  if (tier === 'improvement') return 0.5;
  return 0;
}

function computeBhasPct(latestResults, logicRules, tagTierMap) {
  // latestResults: [{ marker_name, value }]
  // logicRules: [{ marker_name, min_value, max_value, operator, tag_to_apply }]
  // tagTierMap: Map<tagName, tier>
  if (!latestResults.length) return null;
  let total = 0;
  for (const r of latestResults) {
    const rules = logicRules.filter(lr => lr.marker_name.toLowerCase() === r.marker_name.toLowerCase());
    const fired = rules.find(lr => evalRule(r.value, lr));
    total += fired ? tagToScore(fired.tag_to_apply, tagTierMap) : 0;
  }
  return Math.round((total / latestResults.length) * 100);
}

// GET /api/employer/:orgSlug — de-identified member list with BHAS scores
// Accessible by: org admins (role='admin' in org_memberships) and app admins.
// PHI guarantee: returns username + public_id only — no name, email, or raw lab values.
app.get('/api/employer/:orgSlug', async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(501).json({ error: 'backend-disabled' });
  const requestingUserId = req.header('x-user-id') || '';
  if (!requestingUserId) return res.status(401).json({ error: 'unauthenticated' });

  const { orgSlug } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Resolve org
    const { data: org, error: orgErr } = await sb
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (orgErr) return res.status(500).json({ error: 'db_error', step: 'org_lookup', detail: orgErr.message });
    if (!org) return res.status(404).json({ error: 'org_not_found' });

    // Auth check: requesting user must be an org admin or app admin
    const { data: requesterProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .maybeSingle();
    const isAppAdmin = requesterProfile?.role === 'admin' || requesterProfile?.role === 'super_admin';

    if (!isAppAdmin) {
      const { data: membership } = await sb
        .from('org_memberships')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', requestingUserId)
        .maybeSingle();
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'not_org_admin' });
      }
    }

    // Fetch members
    const { data: members, error: mErr } = await sb
      .from('org_memberships')
      .select('user_id, role, team, joined_at')
      .eq('org_id', org.id);
    if (mErr) return res.status(500).json({ error: 'db_error', step: 'members_fetch', detail: mErr.message });

    // Fetch profiles separately (avoid PostgREST join — schema cache issue)
    const memberIds = (members || []).map(m => m.user_id);
    let profileMap = {};
    if (memberIds.length > 0) {
      const { data: profileRows } = await sb
        .from('profiles')
        .select('id, username, public_id')
        .in('id', memberIds);
      for (const p of profileRows || []) profileMap[p.id] = p;
    }

    // Fetch logic rules for BHAS computation
    const { data: logicRules } = await sb
      .from('logic_rules')
      .select('min_value, max_value, operator, tag_to_apply, lab_markers(name)')
      .order('id');
    const rulesWithNames = (logicRules || []).map(r => ({
      ...r, marker_name: r.lab_markers?.name || '',
    }));

    // Fetch tag scoring tiers (F47 — replaces hardcoded OPTIMAL_TAGS / IMPROVEMENT_TAGS)
    const { data: tagRows } = await sb.from('tags').select('name, scoring_tier');
    const tagTierMap = new Map((tagRows || []).map(t => [t.name, t.scoring_tier]));

    // For each member, fetch their latest result per marker and compute BHAS %
    let latestByUser = {};
    if (memberIds.length > 0) {
      // Get latest lab result per (user_id, marker_id) — subquery via RPC not available,
      // so fetch all and reduce in JS (service role has full access)
      const { data: allResults } = await sb
        .from('user_lab_results')
        .select('user_id, marker_name, value, date')
        .in('user_id', memberIds)
        .order('date', { ascending: false });

      // Build map: user_id → marker_name → latest { value, marker_name }
      for (const row of allResults || []) {
        if (!latestByUser[row.user_id]) latestByUser[row.user_id] = {};
        if (!latestByUser[row.user_id][row.marker_name]) {
          latestByUser[row.user_id][row.marker_name] = {
            value: row.value,
            marker_name: row.marker_name,
          };
        }
      }
    }

    // Feature 18: fetch org teams for per-team breakdown
    const { data: orgTeamsData } = await sb
      .from('org_teams')
      .select('name')
      .eq('org_id', org.id)
      .order('created_at');
    const orgTeamNames = (orgTeamsData || []).map(t => t.name);

    // Build response — no PHI (raw values never included)
    const result = (members || []).map(m => {
      const userLatest = Object.values(latestByUser[m.user_id] || {});
      const bhasPct = computeBhasPct(userLatest, rulesWithNames, tagTierMap);
      return {
        username: profileMap[m.user_id]?.username || null,
        public_id: profileMap[m.user_id]?.public_id || null,
        role: m.role,
        team: m.team,
        joined_at: m.joined_at,
        bhas_pct: bhasPct,          // null = no results yet
        result_count: userLatest.length,
      };
    });

    // Feature 18: per-team breakdown (team name, member count, avg BHAS, % at optimal)
    // Include all org teams (even empty ones) plus any team names in memberships not in org_teams
    const allTeamNames = new Set([
      ...orgTeamNames,
      ...result.filter(m => m.team).map(m => m.team),
    ]);
    const teamBreakdown = [...allTeamNames].map(teamName => {
      const tm = result.filter(m => m.team === teamName);
      const withScores = tm.filter(m => m.bhas_pct !== null);
      const avgBhas = withScores.length > 0
        ? Math.round(withScores.reduce((s, m) => s + m.bhas_pct, 0) / withScores.length)
        : null;
      const optimalCount = withScores.filter(m => m.bhas_pct === 100).length;
      const optimalPct = tm.length > 0 ? Math.round((optimalCount / tm.length) * 100) : null;
      return {
        team: teamName,
        member_count: tm.length,
        avg_bhas_pct: avgBhas,
        optimal_pct: optimalPct,  // % of members at 100% BHAS
      };
    }).sort((a, b) => (b.avg_bhas_pct ?? -1) - (a.avg_bhas_pct ?? -1));

    return res.status(200).json({
      org: { name: org.name, slug: org.slug },
      members: result,
      team_breakdown: teamBreakdown,  // Feature 18
    });
  } catch (err) {
    console.error('GET /api/employer/:orgSlug error:', err.message, err.stack);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// ── F45: Leaderboard ─────────────────────────────────────────────────────────

// GET /api/leaderboard/:orgSlug
// Returns de-identified BHAS v2.3 leaderboard for an org, ranked by score with
// tie-breaker logic. Accessible by org admins and app admins only.
// PHI guarantee: returns username + public_id only — no name, email, or raw lab values.
app.get('/api/leaderboard/:orgSlug', async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(501).json({ error: 'backend-disabled' });
  const requestingUserId = req.header('x-user-id') || '';
  if (!requestingUserId) return res.status(401).json({ error: 'unauthenticated' });

  const { orgSlug } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Resolve org
    const { data: org, error: orgErr } = await sb
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (orgErr) return res.status(500).json({ error: 'db_error' });
    if (!org) return res.status(404).json({ error: 'org_not_found' });

    // Auth check: org admin or app admin only
    const { data: requesterProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .maybeSingle();
    const isAppAdmin = requesterProfile?.role === 'admin' || requesterProfile?.role === 'super_admin';

    if (!isAppAdmin) {
      const { data: membership } = await sb
        .from('org_memberships')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', requestingUserId)
        .maybeSingle();
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'not_org_admin' });
      }
    }

    // Fetch org members
    const { data: members, error: mErr } = await sb
      .from('org_memberships')
      .select('user_id, team')
      .eq('org_id', org.id);
    if (mErr) return res.status(500).json({ error: 'db_error', step: 'members_fetch', detail: mErr.message });

    const memberIds = (members || []).map(m => m.user_id);
    if (memberIds.length === 0) {
      return res.status(200).json({ org: { name: org.name, slug: org.slug }, entries: [] });
    }

    // Fetch profiles separately (avoid PostgREST schema cache join issue)
    const { data: profiles, error: pErr } = await sb
      .from('profiles')
      .select('id, username, public_id')
      .in('id', memberIds);
    if (pErr) return res.status(500).json({ error: 'db_error', step: 'profiles_fetch', detail: pErr.message });
    const profileMap = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    // Fetch latest bhas_v2_scores row per member (most recent score_date)
    const { data: scores, error: sErr } = await sb
      .from('bhas_v2_scores')
      .select('user_id, score_date, total_score, label, vo2_max_percentile, wthr, hs_crp, acute_visits')
      .in('user_id', memberIds)
      .order('score_date', { ascending: false });
    if (sErr) return res.status(500).json({ error: 'db_error' });

    // Keep only the most recent score per user
    const latestScore = {};
    for (const row of scores || []) {
      if (!latestScore[row.user_id]) latestScore[row.user_id] = row;
    }

    // Build member lookup for de-identified profile fields
    const memberMap = {};
    for (const m of members || []) {
      const p = profileMap[m.user_id] || {};
      memberMap[m.user_id] = { team: m.team, username: p.username || null, public_id: p.public_id || null };
    }

    // Assemble entries (only members who have a score)
    const entries = Object.entries(latestScore).map(([userId, s]) => ({
      username:          memberMap[userId]?.username || null,
      public_id:         memberMap[userId]?.public_id || null,
      team:              memberMap[userId]?.team || null,
      total_score:       Number(s.total_score),
      label:             s.label,
      // Tie-breaker fields exposed for display only — no raw lab values
      vo2_max_percentile: s.vo2_max_percentile != null ? Number(s.vo2_max_percentile) : null,
      wthr:              s.wthr != null ? Number(s.wthr) : null,
      hs_crp:            s.hs_crp != null ? Number(s.hs_crp) : null,
      acute_visits:      s.acute_visits != null ? Number(s.acute_visits) : null,
      score_date:        s.score_date,
    }));

    // Sort by tie-breaker rules (spec Section 6b):
    // 1. Higher total_score
    // 2. Higher vo2_max_percentile
    // 3. Lower wthr
    // 4. Lower hs_crp
    // 5. Fewer acute_visits
    entries.sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      const vo2A = a.vo2_max_percentile ?? -Infinity;
      const vo2B = b.vo2_max_percentile ?? -Infinity;
      if (vo2B !== vo2A) return vo2B - vo2A;
      const wthrA = a.wthr ?? Infinity;
      const wthrB = b.wthr ?? Infinity;
      if (wthrA !== wthrB) return wthrA - wthrB;
      const crpA = a.hs_crp ?? Infinity;
      const crpB = b.hs_crp ?? Infinity;
      if (crpA !== crpB) return crpA - crpB;
      const avA = a.acute_visits ?? Infinity;
      const avB = b.acute_visits ?? Infinity;
      return avA - avB;
    });

    return res.status(200).json({
      org: { name: org.name, slug: org.slug },
      entries,
    });
  } catch (err) {
    console.error('GET /api/leaderboard/:orgSlug error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── F20: Corporate Analytics Dashboard ───────────────────────────────────────

// GET /api/analytics/:orgSlug
// Returns de-identified aggregate analytics for an org: KPIs, score distribution,
// BHAS v2 label distribution, 12-week trend, and per-metric % optimal.
// Auth: org admin or app admin only (same guard as employer endpoint).
// PHI guarantee: no names, emails, or raw lab values — aggregates only.
app.get('/api/analytics/:orgSlug', async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(501).json({ error: 'backend-disabled' });
  const requestingUserId = req.header('x-user-id') || '';
  if (!requestingUserId) return res.status(401).json({ error: 'unauthenticated' });

  const { orgSlug } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Resolve org
    const { data: org, error: orgErr } = await sb
      .from('organizations')
      .select('id, name, slug')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (orgErr) return res.status(500).json({ error: 'db_error', step: 'org_lookup', detail: orgErr.message });
    if (!org) return res.status(404).json({ error: 'org_not_found' });

    // Auth check: requesting user must be an org admin or app admin
    const { data: requesterProfile } = await sb
      .from('profiles')
      .select('role')
      .eq('id', requestingUserId)
      .maybeSingle();
    const isAppAdmin = requesterProfile?.role === 'admin' || requesterProfile?.role === 'super_admin';

    if (!isAppAdmin) {
      const { data: membership } = await sb
        .from('org_memberships')
        .select('role')
        .eq('org_id', org.id)
        .eq('user_id', requestingUserId)
        .maybeSingle();
      if (!membership || membership.role !== 'admin') {
        return res.status(403).json({ error: 'not_org_admin' });
      }
    }

    // Fetch org member IDs
    const { data: members, error: mErr } = await sb
      .from('org_memberships')
      .select('user_id')
      .eq('org_id', org.id);
    if (mErr) return res.status(500).json({ error: 'db_error', step: 'members_fetch', detail: mErr.message });

    const memberIds = (members || []).map(m => m.user_id);
    if (memberIds.length === 0) {
      return res.status(200).json({
        org: { name: org.name, slug: org.slug },
        kpis: { total_members: 0, members_with_data: 0, avg_bhas_pct: null, pct_at_optimal: null },
        score_distribution: [],
        label_distribution: [],
        trend: [],
        metric_breakdown: [],
      });
    }

    // Fetch all bhas_v2_scores rows for org members (last 12 weeks + latest per user)
    const twelveWeeksAgo = new Date();
    twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84); // 12 * 7
    const twelveWeeksAgoStr = twelveWeeksAgo.toISOString().slice(0, 10);

    const { data: allScores, error: sErr } = await sb
      .from('bhas_v2_scores')
      .select('user_id, score_date, total_score, label, metric_scores')
      .in('user_id', memberIds)
      .gte('score_date', twelveWeeksAgoStr)
      .order('score_date', { ascending: true });
    if (sErr) return res.status(500).json({ error: 'db_error', step: 'scores_fetch', detail: sErr.message });

    // Also fetch the latest score per user regardless of date (for snapshot analytics)
    const { data: latestScoresAll, error: lsErr } = await sb
      .from('bhas_v2_scores')
      .select('user_id, score_date, total_score, label, metric_scores')
      .in('user_id', memberIds)
      .order('score_date', { ascending: false });
    if (lsErr) return res.status(500).json({ error: 'db_error', step: 'latest_scores_fetch', detail: lsErr.message });

    // Keep only the most recent score per user (snapshot)
    const latestByUser = {};
    for (const row of latestScoresAll || []) {
      if (!latestByUser[row.user_id]) latestByUser[row.user_id] = row;
    }
    const latestSnapshots = Object.values(latestByUser);

    // ── KPIs ─────────────────────────────────────────────────────────────────
    const membersWithData = latestSnapshots.length;
    const totalMembers = memberIds.length;

    // Convert total_score (0–9) to percentage (0–100) for display
    const MAX_SCORE = 9.0;
    const pctValues = latestSnapshots.map(s => Math.round((Number(s.total_score) / MAX_SCORE) * 100));
    const avgBhasPct = pctValues.length > 0
      ? Math.round(pctValues.reduce((a, b) => a + b, 0) / pctValues.length)
      : null;
    const optimalCount = latestSnapshots.filter(s => s.label === 'Optimal').length;
    const pctAtOptimal = membersWithData > 0 ? Math.round((optimalCount / membersWithData) * 100) : null;

    // ── Score distribution (buckets based on bhas_pct 0–100) ─────────────────
    const buckets = [
      { label: '0–24%',   min: 0,   max: 24,  count: 0 },
      { label: '25–49%',  min: 25,  max: 49,  count: 0 },
      { label: '50–74%',  min: 50,  max: 74,  count: 0 },
      { label: '75–99%',  min: 75,  max: 99,  count: 0 },
      { label: '100%',    min: 100, max: 100, count: 0 },
    ];
    for (const pct of pctValues) {
      const bucket = buckets.find(b => pct >= b.min && pct <= b.max);
      if (bucket) bucket.count++;
    }
    const score_distribution = buckets.map(({ label, count }) => ({ label, count }));

    // ── Label distribution ────────────────────────────────────────────────────
    const labelCounts = { 'Optimal': 0, 'Healthy': 0, 'Needs Improvement': 0, 'High Risk': 0 };
    for (const s of latestSnapshots) {
      if (s.label in labelCounts) labelCounts[s.label]++;
    }
    const label_distribution = Object.entries(labelCounts).map(([label, count]) => ({ label, count }));

    // ── 12-week trend (weekly org-average total_score → converted to pct) ─────
    // Group bhas_v2_scores rows by ISO week (YYYY-WXX)
    function isoWeek(dateStr) {
      const d = new Date(dateStr + 'T12:00:00Z');
      const dayOfWeek = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    }

    // One row per user per week — keep only latest per (user, week)
    const weekUserMap = {}; // week → { userId → score }
    for (const row of allScores || []) {
      const week = isoWeek(row.score_date);
      if (!weekUserMap[week]) weekUserMap[week] = {};
      // later rows (ascending order) overwrite earlier — keeps latest per user per week
      weekUserMap[week][row.user_id] = Number(row.total_score);
    }

    const trend = Object.entries(weekUserMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, userScores]) => {
        const scores = Object.values(userScores);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        return {
          week,
          avg_score: Math.round((avgScore / MAX_SCORE) * 100 * 10) / 10, // % with 1 decimal
          member_count: scores.length,
        };
      });

    // ── Per-metric % optimal ──────────────────────────────────────────────────
    // Aggregate metric_scores JSONB from each user's latest snapshot
    const metricMap = {}; // metric name → { optimal: n, total: n }
    for (const s of latestSnapshots) {
      const metrics = Array.isArray(s.metric_scores) ? s.metric_scores : [];
      for (const m of metrics) {
        if (!m.included) continue; // skip excluded metrics (e.g. HOMA-IR for Type 1)
        if (!metricMap[m.metric]) metricMap[m.metric] = { optimal: 0, total: 0 };
        metricMap[m.metric].total++;
        if (m.label === 'Optimal') metricMap[m.metric].optimal++;
      }
    }
    const metric_breakdown = Object.entries(metricMap)
      .map(([metric, { optimal, total }]) => ({
        metric,
        optimal_pct: Math.round((optimal / total) * 100),
        member_count: total,
      }))
      .sort((a, b) => a.metric.localeCompare(b.metric));

    return res.status(200).json({
      org: { name: org.name, slug: org.slug },
      kpis: {
        total_members: totalMembers,
        members_with_data: membersWithData,
        avg_bhas_pct: avgBhasPct,
        pct_at_optimal: pctAtOptimal,
      },
      score_distribution,
      label_distribution,
      trend,
      metric_breakdown,
    });
  } catch (err) {
    console.error('GET /api/analytics/:orgSlug error:', err.message, err.stack);
    return res.status(500).json({ error: 'server_error', detail: err.message });
  }
});

// ── Feature 15: Username System ──────────────────────────────────────────────

// GET /api/username/check?username=foo — public availability check (used by ProfilePage)
app.get('/api/username/check', async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(501).json({ error: 'backend-disabled' });
  const { username } = req.query;
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'missing-username' });
  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return res.status(400).json({ error: 'too-short', message: 'Username must be at least 3 characters' });
  if (clean.length > 30) return res.status(400).json({ error: 'too-long', message: 'Username must be 30 characters or fewer' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data } = await sb.from('profiles').select('id').eq('username', clean).maybeSingle();
    return res.status(200).json({ available: !data, username: clean });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// PATCH /api/username — user sets their own username (x-user-id header = auth.users UUID)
app.patch('/api/username', async (req, res) => {
  if (!SUPABASE_URL || !SERVICE_ROLE) return res.status(501).json({ error: 'backend-disabled' });
  const userId = req.header('x-user-id') || '';
  if (!userId) return res.status(400).json({ error: 'missing-user-id' });
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'missing-username' });
  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return res.status(400).json({ error: 'too-short' });
  if (clean.length > 30) return res.status(400).json({ error: 'too-long' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('profiles').update({ username: clean }).eq('id', userId);
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'taken', message: 'Username already taken' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json({ username: clean });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/admin/users — admin-only: full identity mapping (name, email, username, public_id, role)
// PHI WARNING: intentionally privileged — must NEVER be used in employer-facing views.
app.get('/api/admin/users', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('profiles')
      .select('id, name, email, username, public_id, role, created_at')
      .order('created_at');
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// PATCH /api/admin/users/:id/username — admin override any user's username
app.patch('/api/admin/users/:id/username', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'missing-username' });
  const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (clean.length < 3) return res.status(400).json({ error: 'too-short' });
  if (clean.length > 30) return res.status(400).json({ error: 'too-long' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('profiles').update({ username: clean }).eq('id', id);
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'taken' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json({ username: clean });
  } catch (err) {
    return res.status(500).json({ error: 'server_error' });
  }
});

// ── Feature 14: Corporate Org Structure ──────────────────────────────────────

function requireAdmin(req, res) {
  if (!BACKEND_API_KEY || !SERVICE_ROLE || !SUPABASE_URL) {
    res.status(501).json({ error: 'backend-disabled' });
    return false;
  }
  const key = req.header('x-backend-api-key') || '';
  if (!key || key !== BACKEND_API_KEY) {
    res.status(403).json({ error: 'forbidden' });
    return false;
  }
  return true;
}

// GET /api/admin/organizations — list all orgs with member counts
app.get('/api/admin/organizations', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: orgs, error } = await sb
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('name');
    if (error) return res.status(500).json({ error: 'db_error', detail: error });

    // Fetch member counts separately
    const { data: counts, error: cErr } = await sb
      .from('org_memberships')
      .select('org_id')
      .in('org_id', (orgs || []).map(o => o.id));
    if (cErr) return res.status(500).json({ error: 'db_error', detail: cErr });

    const countMap = {};
    for (const row of counts || []) {
      countMap[row.org_id] = (countMap[row.org_id] || 0) + 1;
    }
    const result = (orgs || []).map(o => ({ ...o, member_count: countMap[o.id] || 0 }));
    return res.status(200).json(result);
  } catch (err) {
    console.error('GET /api/admin/organizations error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/admin/organizations — create org
app.post('/api/admin/organizations', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { name, slug } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: 'missing-params', required: ['name', 'slug'] });
  const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('organizations')
      .insert({ name, slug: slugClean })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'slug_conflict', message: 'Slug already in use' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/admin/organizations error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/admin/organizations/:id/members — list members (de-identified: username/public_id, role, team, joined_at; no email/name/lab values)
app.get('/api/admin/organizations/:id/members', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // Fetch memberships first (org_memberships → auth.users, not profiles, so no direct join)
    const { data: memberships, error: mErr } = await sb
      .from('org_memberships')
      .select('id, user_id, role, team, joined_at')
      .eq('org_id', id)
      .order('joined_at');
    if (mErr) return res.status(500).json({ error: 'db_error', detail: mErr });
    if (!memberships || memberships.length === 0) return res.status(200).json([]);

    // Fetch profiles for those user_ids to get username + public_id
    const userIds = memberships.map(m => m.user_id);
    const { data: profiles, error: pErr } = await sb
      .from('profiles')
      .select('id, username, public_id')
      .in('id', userIds);
    if (pErr) return res.status(500).json({ error: 'db_error', detail: pErr });

    const profileMap = {};
    for (const p of profiles || []) profileMap[p.id] = p;

    // PHI rule: only expose username and public_id — no real name, email, or raw lab values
    const safe = memberships.map(m => ({
      id: m.id,
      user_id: m.user_id,
      role: m.role,
      team: m.team,
      joined_at: m.joined_at,
      username: profileMap[m.user_id]?.username || null,
      public_id: profileMap[m.user_id]?.public_id || null,
    }));
    return res.status(200).json(safe);
  } catch (err) {
    console.error('GET /api/admin/organizations/:id/members error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/admin/public-ids — list all known public IDs (BHI-XXXX-XXXX) with no other identifying info
// Used to populate the Add Member dropdown — admin sees only tokens, never names/emails/usernames
app.get('/api/admin/public-ids', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('profiles')
      .select('public_id')
      .not('public_id', 'is', null)
      .order('public_id');
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json((data || []).map(r => r.public_id));
  } catch (err) {
    console.error('GET /api/admin/public-ids error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/admin/organizations/:id/members — add user to org
// Accepts public_id (BHI-XXXX-XXXX) — resolves to user_id internally so admins never handle raw UUIDs
app.post('/api/admin/organizations/:id/members', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { public_id, role = 'member', team } = req.body || {};
  if (!public_id) return res.status(400).json({ error: 'missing-params', required: ['public_id'] });
  const validRoles = ['member', 'admin'];
  const validTeams = ['fire', 'water', 'wind', 'earth', null, undefined];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'invalid-role' });
  if (!validTeams.includes(team)) return res.status(400).json({ error: 'invalid-team' });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    // Resolve public_id → user_id (UUID never exposed to admin UI)
    const { data: profile, error: pErr } = await sb
      .from('profiles')
      .select('id')
      .eq('public_id', public_id)
      .single();
    if (pErr || !profile) return res.status(404).json({ error: 'user_not_found' });
    const user_id = profile.id;
    const { data, error } = await sb
      .from('org_memberships')
      .insert({ org_id: id, user_id, role, team: team || null })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'already_member' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/admin/organizations/:id/members error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /api/admin/organizations/:id/members/:userId — remove user from org
app.delete('/api/admin/organizations/:id/members/:userId', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id, userId } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb
      .from('org_memberships')
      .delete()
      .eq('org_id', id)
      .eq('user_id', userId);
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/organizations/:id/members/:userId error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// GET /api/admin/organizations/:id/teams — list teams for an org
app.get('/api/admin/organizations/:id/teams', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('org_teams')
      .select('id, name, created_at')
      .eq('org_id', id)
      .order('created_at');
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json(data || []);
  } catch (err) {
    console.error('GET /api/admin/organizations/:id/teams error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/admin/organizations/:id/teams — create a team
app.post('/api/admin/organizations/:id/teams', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'missing-params', required: ['name'] });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('org_teams')
      .insert({ org_id: id, name: name.trim() })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'team_name_conflict' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(201).json(data);
  } catch (err) {
    console.error('POST /api/admin/organizations/:id/teams error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// PATCH /api/admin/organizations/:id/teams/:teamId — rename a team
app.patch('/api/admin/organizations/:id/teams/:teamId', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id, teamId } = req.params;
  const { name } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'missing-params', required: ['name'] });
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data, error } = await sb
      .from('org_teams')
      .update({ name: name.trim() })
      .eq('id', teamId)
      .eq('org_id', id)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'team_name_conflict' });
      return res.status(500).json({ error: 'db_error', detail: error });
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('PATCH /api/admin/organizations/:id/teams/:teamId error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /api/admin/organizations/:id/teams/:teamId — delete a team
app.delete('/api/admin/organizations/:id/teams/:teamId', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id, teamId } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb
      .from('org_teams')
      .delete()
      .eq('id', teamId)
      .eq('org_id', id);
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/organizations/:id/teams/:teamId error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// POST /api/admin/organizations/:id/assign-teams — auto-assign unassigned members to teams (balanced by count)
// Uses dynamic org_teams for this org. Only affects members where team IS NULL.
app.post('/api/admin/organizations/:id/assign-teams', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

    // Fetch this org's teams
    const { data: orgTeams, error: tErr } = await sb
      .from('org_teams')
      .select('name')
      .eq('org_id', id)
      .order('created_at');
    if (tErr) return res.status(500).json({ error: 'db_error', detail: tErr });
    if (!orgTeams || orgTeams.length === 0) {
      return res.status(400).json({ error: 'no_teams', message: 'No teams defined for this org. Add teams first.' });
    }
    const TEAMS = orgTeams.map(t => t.name);

    // Fetch all members for this org
    const { data: members, error: fetchErr } = await sb
      .from('org_memberships')
      .select('id, user_id, team')
      .eq('org_id', id);
    if (fetchErr) return res.status(500).json({ error: 'db_error', detail: fetchErr });

    const unassigned = members.filter(m => !m.team);
    if (unassigned.length === 0) {
      return res.status(200).json({ assigned: 0, message: 'No unassigned members.' });
    }

    // Count current members per team to seed the balance
    const counts = {};
    TEAMS.forEach(t => { counts[t] = 0; });
    members.filter(m => m.team).forEach(m => { if (counts[m.team] !== undefined) counts[m.team]++; });

    // Assign each unassigned member to the team with the lowest count (greedy balance)
    const updates = unassigned.map(m => {
      const minTeam = TEAMS.reduce((a, b) => counts[a] <= counts[b] ? a : b);
      counts[minTeam]++;
      return { id: m.id, team: minTeam };
    });

    const updateResults = await Promise.all(
      updates.map(u => sb.from('org_memberships').update({ team: u.team }).eq('id', u.id))
    );
    const failed = updateResults.filter(r => r.error);
    if (failed.length > 0) {
      return res.status(500).json({ error: 'partial_failure', failed: failed.map(r => r.error) });
    }

    return res.status(200).json({ assigned: updates.length, distribution: counts });
  } catch (err) {
    console.error('POST /api/admin/organizations/:id/assign-teams error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /api/admin/organizations/:id — delete org (cascades memberships)
app.delete('/api/admin/organizations/:id', async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  try {
    const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error } = await sb.from('organizations').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'db_error', detail: error });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/admin/organizations/:id error:', err.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
