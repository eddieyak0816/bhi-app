/**
 * F24 — Affiliate Product Catalog (Admin)
 *
 * Admin CRUD UI for managing affiliate products.
 * Products have a name, description, image_url, affiliate_url, and health tags.
 * Health tags are matched against user result tags to power F25 recommendations.
 */

import { useState, useEffect, useRef } from 'react'
import { supabase, getStoredJwt } from '../lib/supabase'

const BACKEND_URL = (import.meta as any).env.VITE_BACKEND_URL as string || ''
const BACKEND_KEY = (import.meta as any).env.VITE_BACKEND_API_KEY as string || ''
function adminFetch(path: string, options: RequestInit = {}) {
  const url = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${path}` : path
  return fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-backend-api-key': BACKEND_KEY, ...(options.headers || {}) },
  })
}

const PRODUCT_IMAGE_BUCKET = 'resource-thumbnails'
const PRODUCT_IMAGE_PREFIX = 'product-images'

interface Product {
  id: string
  name: string
  description: string
  image_url: string | null
  affiliate_url: string
  is_active: boolean
  created_at: string
  tags: string[]
}

const EMPTY_FORM = { name: '', description: '', image_url: '', affiliate_url: '', is_active: true, tags: [] as string[] }

interface Props {
  theme: any
  allowedTags: string[]
}

export default function AffiliateProductsTab({ theme, allowedTags }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [tagInput, setTagInput] = useState('')
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false)
  const tagContainerRef = useRef<HTMLDivElement>(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (tagContainerRef.current && !tagContainerRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredTagOptions = allowedTags
    .filter(t => !form.tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()))
    .sort()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Bypass the Supabase JS client entirely — read JWT directly from localStorage.
      // This avoids auth deadlocks caused by concurrent getSession() calls in Admin.tsx
      // when the component mounts/remounts.
      const jwt = getStoredJwt()
      if (!jwt) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const headers = {
        'apikey': anonKey,
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      }

      const [prodsResp, ptResp] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/affiliate_products?select=*&order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/product_tags?select=product_id,tag`, { headers }),
      ])

      if (!prodsResp.ok) throw new Error(`Products fetch failed: ${prodsResp.status}`)
      if (!ptResp.ok) throw new Error(`Tags fetch failed: ${ptResp.status}`)

      const prods = await prodsResp.json()
      const ptRows = await ptResp.json()

      const tagMap: Record<string, string[]> = {}
      for (const row of ptRows ?? []) {
        if (!tagMap[row.product_id]) tagMap[row.product_id] = []
        tagMap[row.product_id].push(row.tag)
      }

      setProducts((prods ?? []).map((p: any) => ({ ...p, tags: tagMap[p.id] ?? [] })))
    } catch (e: any) {
      setError(e.message ?? 'Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openCreate() {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setTagInput('')
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditingId(p.id)
    setForm({ name: p.name, description: p.description, image_url: p.image_url ?? '', affiliate_url: p.affiliate_url, is_active: p.is_active, tags: [...p.tags] })
    setTagInput('')
    setShowForm(true)
  }

  function addTag(tag: string) {
    if (!form.tags.includes(tag)) setForm(f => ({ ...f, tags: [...f.tags, tag] }))
    setTagInput('')
    setTagDropdownOpen(false)
    // Prevent the input's onFocus from immediately reopening the dropdown
    setTimeout(() => setTagDropdownOpen(false), 0)
  }

  function removeTag(tag: string) {
    setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))
  }

  // If a URL is missing "http://" or "https://", the browser treats it as a path inside
  // this app instead of an outside link (e.g. clicking it 404s on our own domain).
  // Auto-add https:// so admins don't have to remember to type it themselves.
  function ensureProtocol(url: string): string {
    const trimmed = url.trim()
    if (!trimmed) return trimmed
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  }

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.affiliate_url.trim()) { setError('Affiliate URL is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() ? ensureProtocol(form.image_url) : null,
        affiliate_url: ensureProtocol(form.affiliate_url),
        is_active: form.is_active,
        tags: form.tags,
      }
      const res = editingId
        ? await adminFetch(`/api/admin/products/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
        : await adminFetch('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || body.error || `Save failed (${res.status})`)
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: Product) {
    await adminFetch(`/api/admin/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: !p.is_active }) })
    await load()
  }

  async function deleteProduct(id: string) {
    if (!confirm('Delete this product?')) return
    await adminFetch(`/api/admin/products/${id}`, { method: 'DELETE' })
    await load()
  }

  // Presentation lives in CSS classes (styles.css → Admin Products); logic above is unchanged.
  return (
    <div>
      <div className="adm-bar">
        <div>
          <h3 className="adm-panel-h" style={{ margin: 0 }}>Affiliate Products</h3>
          <p className="adm-hint" style={{ margin: '4px 0 0' }}>
            Products are matched to users based on their health tags. Shown on the user's Dashboard.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>+ Add Product</button>
      </div>

      {error && (
        <div className="adm-err">
          {error}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div className="adm-panel">
          <h4 className="adm-panel-h">
            {editingId ? 'Edit Product' : 'New Product'}
          </h4>
          <div className="adm-two">
            <div>
              <label className="adm-lbl">Name *</label>
              <input className="adm-in adm-in-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Omega-3 Fish Oil" />
            </div>
            <div>
              <label className="adm-lbl">Affiliate URL *</label>
              <input className="adm-in adm-in-full" value={form.affiliate_url} onChange={e => setForm(f => ({ ...f, affiliate_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-lbl">Description</label>
            <textarea
              className="adm-in adm-in-full adm-ta"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief product description shown to users"
            />
          </div>

          <div className="adm-field">
            <label className="adm-lbl">Product Image (optional)</label>

            {/* Preview */}
            {form.image_url && (
              <div className="adm-thumbbox" style={{ display: 'inline-block' }}>
                <img src={form.image_url} alt="Preview" className="adm-pimg" />
                <button
                  onClick={() => { setForm(f => ({ ...f, image_url: '' })); setImageError(null) }}
                  className="adm-img-x"
                >×</button>
              </div>
            )}

            {/* Upload button */}
            <div className="adm-uprow">
              <label style={{ cursor: imageUploading ? 'wait' : 'pointer' }}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  disabled={imageUploading}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) { setImageError('Image must be under 5 MB'); return }
                    setImageUploading(true)
                    setImageError(null)
                    try {
                      const ext = file.name.split('.').pop() || 'jpg'
                      // Use product id if editing, otherwise a timestamp for new products
                      const name = editingId ?? `new-${Date.now()}`
                      const path = `${PRODUCT_IMAGE_PREFIX}/${name}.${ext}`
                      const { error: upErr } = await supabase.storage
                        .from(PRODUCT_IMAGE_BUCKET)
                        .upload(path, file, { upsert: true, contentType: file.type })
                      if (upErr) throw upErr
                      const { data: urlData } = supabase.storage
                        .from(PRODUCT_IMAGE_BUCKET)
                        .getPublicUrl(path)
                      setForm(f => ({ ...f, image_url: urlData.publicUrl }))
                    } catch (err: any) {
                      setImageError(err.message || 'Upload failed')
                    } finally {
                      setImageUploading(false)
                      e.target.value = ''
                    }
                  }}
                />
                <span className="adm-upload">
                  {imageUploading ? 'Uploading…' : form.image_url ? 'Replace Image' : 'Upload Image'}
                </span>
              </label>
              <span className="adm-hint">or paste a URL:</span>
              <input
                className="adm-in adm-in-grow"
                value={form.image_url ?? ''}
                onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImageError(null) }}
                placeholder="https://..."
              />
            </div>
            {imageError && <div className="adm-errtxt">{imageError}</div>}
          </div>

          {/* Tag picker */}
          <div className="adm-field">
            <label className="adm-lbl">Health Tags (match user result tags)</label>
            <div className="adm-wrap" style={{ marginBottom: 8 }}>
              {form.tags.map(tag => (
                <span key={tag} className="adm-chip tag">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="adm-chip-x">×</button>
                </span>
              ))}
              {form.tags.length === 0 && <span className="adm-hint">No tags selected — product shows to all users</span>}
            </div>
            <div ref={tagContainerRef} style={{ position: 'relative', maxWidth: 320 }}>
              <input
                className="adm-in adm-in-full"
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setTagDropdownOpen(true) }}
                onFocus={() => setTagDropdownOpen(true)}
                placeholder="Search tags..."
              />
              {tagDropdownOpen && filteredTagOptions.length > 0 && (
                <div className="adm-dd">
                  {filteredTagOptions.map(t => (
                    <div
                      key={t}
                      onClick={() => addTag(t)}
                      className="adm-dd-i"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="adm-field">
            <label className="adm-toggle-l">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active (visible to users)
            </label>
          </div>

          <div className="adm-urlrow">
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Product list ── */}
      {loading ? (
        <div className="adm-hint" style={{ textAlign: 'center', padding: 40 }}>Loading products…</div>
      ) : products.length === 0 ? (
        <div className="adm-empty">
          No products yet. Click "+ Add Product" to create the first one.
        </div>
      ) : (
        <div className="adm-orglist">
          {products.map(p => (
            <div key={p.id} className="admin-item-card-row adm-item">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="adm-item-img" />
              )}
              <div className="adm-item-main">
                <div className="adm-item-top">
                  <span className="adm-item-n">{p.name}</span>
                  <span className={`adm-pill${p.is_active ? ' on' : ''}`}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {p.description && <p className="adm-hint" style={{ margin: '0 0 10px' }}>{p.description}</p>}
                <div className="adm-wrap" style={{ marginBottom: 8 }}>
                  {p.tags.length > 0
                    ? p.tags.map(tag => (
                        <span key={tag} className="adm-chip tag" style={{ padding: '4px 12px' }}>{tag}</span>
                      ))
                    : <span className="adm-hint">No tags — shows to all users</span>
                  }
                </div>
                <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer" className="adm-link" style={{ fontSize: 12, display: 'block', wordBreak: 'break-all', overflowWrap: 'anywhere', maxWidth: '100%' }}>{p.affiliate_url}</a>
              </div>
              <div className="admin-item-card-buttons adm-item-btns">
                <button className="adm-cbtn" onClick={() => openEdit(p)}>Edit</button>
                <button className="adm-cbtn" onClick={() => toggleActive(p)}>
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button className="adm-cbtn del" onClick={() => deleteProduct(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
