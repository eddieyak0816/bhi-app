// ARL Labs / Celesta DataDrive — inbound lab results.
//
// Celesta POSTs finished results to an endpoint we give them (see
// https://portal.arllabs.com/api-lab-results). This route:
//   1. checks the shared secret (Bearer token or X-API-Key),
//   2. validates the payload,
//   3. finds the user by patient_mrn = our profiles.public_id (a random NHL-XXXX-XXXX id —
//      never a name or email, per Eddie),
//   4. matches each test to our lab_markers (canonical name, then lab_marker_aliases),
//   5. saves matched values to user_lab_results — the same rows a PDF upload creates, so the
//      score, Home and analytics pick them up with no other change.
//
// Safety switches (all env vars on the backend):
//   ARL_WEBHOOK_TOKEN         required; route is off (501) without it.
//   ARL_SAVE_ENABLED=true     required to write anything. Otherwise it is a dry run that only
//                             reports what WOULD be saved.
//   ARL_ALLOWED_PUBLIC_IDS    optional comma list; when set, only these users are accepted
//                             (used to keep testing on a test account).
//
// The payload contains PHI (names, DOB, values): never log it.

const { createClient } = require('@supabase/supabase-js')

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

function hasValidToken(req, expected) {
  const bearer = (req.header('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  const apiKey = (req.header('x-api-key') || '').trim()
  return (bearer && bearer === expected) || (apiKey && apiKey === expected)
}

function validatePayload(body) {
  const problems = []
  if (!body || typeof body !== 'object') return ['body must be a JSON object']
  if (!body.lab_order && !body.emr_incoming_order_id) problems.push('missing lab_order / emr_incoming_order_id')
  if (!body.patient_mrn) problems.push('missing patient_mrn')
  if (!Array.isArray(body.results_array)) {
    problems.push('results_array must be an array')
  } else {
    body.results_array.forEach((r, i) => {
      if (!r || !r.test_name) problems.push(`results_array[${i}]: missing test_name`)
      if (r && (r.result_value === undefined || r.result_value === null)) problems.push(`results_array[${i}]: missing result_value`)
    })
  }
  return problems
}

// Same idea as the PDF matcher: compare names ignoring case, spaces and punctuation.
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

// "4.6" -> 4.6, "<0.5" -> 0.5, "Negative" -> null (not saved, reported instead)
function parseValue(v) {
  const n = parseFloat(String(v).replace(/[<>=\s]/g, ''))
  return Number.isFinite(n) ? n : null
}

// "3.5 - 5.2" -> {min:3.5,max:5.2}; anything else -> null
function parseRange(s) {
  const m = String(s || '').match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  return m ? { min: parseFloat(m[1]), max: parseFloat(m[2]) } : null
}

module.exports = function registerArlResults(app) {
  app.post('/api/arl/results', async (req, res) => {
    const token = process.env.ARL_WEBHOOK_TOKEN || ''
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || ''
    if (!token || !SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(501).json({ status: 'error', message: 'ARL integration is not enabled.' })
    }
    if (!hasValidToken(req, token)) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized.' })
    }

    const problems = validatePayload(req.body)
    if (problems.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid data format.', problems })
    }

    const body = req.body
    const saveEnabled = process.env.ARL_SAVE_ENABLED === 'true'
    const allowed = (process.env.ARL_ALLOWED_PUBLIC_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
    const publicId = String(body.patient_mrn).trim()

    if (allowed.length > 0 && !allowed.includes(publicId)) {
      return res.status(403).json({ status: 'error', message: 'Patient not enabled for ARL results.' })
    }

    try {
      const sb = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })

      // 3. user
      const { data: profile, error: pErr } = await sb.from('profiles').select('id').eq('public_id', publicId).maybeSingle()
      if (pErr) throw pErr
      if (!profile) {
        return res.status(404).json({ status: 'error', message: 'Unknown patient_mrn.' })
      }

      // 4. markers + aliases
      const [{ data: markers, error: mErr }, { data: aliases, error: aErr }] = await Promise.all([
        sb.from('lab_markers').select('id, name, unit, min_normal, max_normal, is_active'),
        sb.from('lab_marker_aliases').select('alias, marker_id'),
      ])
      if (mErr) throw mErr
      if (aErr) throw aErr
      const byName = new Map((markers || []).map(m => [norm(m.name), m]))
      const byId = new Map((markers || []).map(m => [m.id, m]))
      for (const a of aliases || []) {
        const m = byId.get(a.marker_id)
        if (m && !byName.has(norm(a.alias))) byName.set(norm(a.alias), m)
      }

      const date = String(body.collection_date_time || body.reported_date_time || timestamp()).slice(0, 10)
      const toSave = []
      const unmatched = []
      const skipped = []
      for (const r of body.results_array) {
        const marker = byName.get(norm(r.test_name))
        if (!marker) { unmatched.push(r.test_name); continue }
        if (marker.is_active === false) { skipped.push({ test: r.test_name, reason: 'marker inactive' }); continue }
        const value = parseValue(r.result_value)
        if (value === null) { skipped.push({ test: r.test_name, reason: 'non-numeric value' }); continue }
        const range = parseRange(r.reference_range)
        toSave.push({
          user_id: profile.id,
          marker_name: marker.name,
          value,
          unit: r.units || marker.unit || '',
          date,
          min_normal: range ? range.min : (marker.min_normal ?? 0),
          max_normal: range ? range.max : (marker.max_normal ?? 100),
          // Existing check constraint allows self/provider/pdf only. 'pdf' = "from a lab
          // document"; a dedicated 'lab' value needs a small migration later.
          verification_type: 'pdf',
        })
      }

      // Don't save the same marker/date/value twice if ARL resends an order.
      let saved = 0
      let duplicates = 0
      if (saveEnabled && toSave.length > 0) {
        const { data: existing, error: eErr } = await sb
          .from('user_lab_results')
          .select('marker_name, value, date')
          .eq('user_id', profile.id)
          .eq('date', date)
        if (eErr) throw eErr
        const seen = new Set((existing || []).map(e => `${e.marker_name}|${Number(e.value)}`))
        const fresh = toSave.filter(row => !seen.has(`${row.marker_name}|${row.value}`))
        duplicates = toSave.length - fresh.length
        if (fresh.length > 0) {
          const { error: iErr } = await sb.from('user_lab_results').insert(fresh)
          if (iErr) throw iErr
        }
        saved = fresh.length
      }

      // Counts only — no names, values or IDs in the log.
      console.info('POST /api/arl/results', {
        mode: saveEnabled ? 'save' : 'dry-run',
        results: body.results_array.length, matched: toSave.length,
        unmatched: unmatched.length, skipped: skipped.length, saved, duplicates,
      })

      return res.status(200).json({
        status: 'success',
        message: 'Results received successfully.',
        timestamp: timestamp(),
        mode: saveEnabled ? 'save' : 'dry-run',
        received: body.results_array.length,
        matched: toSave.map(t => t.marker_name),
        unmatched,
        skipped,
        saved,
        duplicates,
      })
    } catch (err) {
      console.error('POST /api/arl/results failed:', err && err.message ? err.message : 'unknown')
      return res.status(500).json({ status: 'error', message: 'Server error.' })
    }
  })
}
