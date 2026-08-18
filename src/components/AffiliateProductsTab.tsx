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

  async function save() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (!form.affiliate_url.trim()) { setError('Affiliate URL is required.'); return }
    setSaving(true)
    setError(null)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim() || null,
        affiliate_url: form.affiliate_url.trim(),
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

  const input: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 6,
    border: `1px solid ${theme.borderColor}`, background: theme.bgInput ?? theme.bg,
    color: theme.text, fontSize: 13,
  }
  const btn = (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, color, border: 'none', borderRadius: 6,
    padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: theme.text }}>Affiliate Products</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: theme.textMuted }}>
            Products are matched to users based on their health tags. Shown on the user's Dashboard.
          </p>
        </div>
        <button style={btn('#3B82F6')} onClick={openCreate}>+ Add Product</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #FCA5A5', borderRadius: 6, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Form ── */}
      {showForm && (
        <div style={{ background: theme.card, border: `1.5px solid ${theme.borderColor}`, borderRadius: 10, padding: 24, marginBottom: 24 }}>
          <h4 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>
            {editingId ? 'Edit Product' : 'New Product'}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Name *</label>
              <input style={input} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Omega-3 Fish Oil" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Affiliate URL *</label>
              <input style={input} value={form.affiliate_url} onChange={e => setForm(f => ({ ...f, affiliate_url: e.target.value }))} placeholder="https://..." />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Description</label>
            <textarea
              style={{ ...input, minHeight: 72, resize: 'vertical' }}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief product description shown to users"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Product Image (optional)</label>

            {/* Preview */}
            {form.image_url && (
              <div style={{ marginBottom: 8, position: 'relative', display: 'inline-block' }}>
                <img src={form.image_url} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: `1px solid ${theme.borderColor}`, display: 'block' }} />
                <button
                  onClick={() => { setForm(f => ({ ...f, image_url: '' })); setImageError(null) }}
                  style={{ position: 'absolute', top: -6, right: -6, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 13, lineHeight: '20px', textAlign: 'center', padding: 0 }}
                >×</button>
              </div>
            )}

            {/* Upload button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
                <span style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: theme.text, pointerEvents: 'none', display: 'inline-block' }}>
                  {imageUploading ? 'Uploading…' : form.image_url ? 'Replace Image' : 'Upload Image'}
                </span>
              </label>
              <span style={{ fontSize: 12, color: theme.textMuted }}>or paste a URL:</span>
              <input
                style={{ ...input, flex: 1, minWidth: 180 }}
                value={form.image_url ?? ''}
                onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImageError(null) }}
                placeholder="https://..."
              />
            </div>
            {imageError && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 4 }}>{imageError}</div>}
          </div>

          {/* Tag picker */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>Health Tags (match user result tags)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {form.tags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(59,130,246,0.12)', color: theme.blue ?? '#3B82F6', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                  {tag}
                  <button onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              {form.tags.length === 0 && <span style={{ fontSize: 12, color: theme.textMuted }}>No tags selected — product shows to all users</span>}
            </div>
            <div ref={tagContainerRef} style={{ position: 'relative', maxWidth: 320 }}>
              <input
                style={input}
                value={tagInput}
                onChange={e => { setTagInput(e.target.value); setTagDropdownOpen(true) }}
                onFocus={() => setTagDropdownOpen(true)}
                placeholder="Search tags..."
              />
              {tagDropdownOpen && filteredTagOptions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, zIndex: 10, maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}>
                  {filteredTagOptions.map(t => (
                    <div
                      key={t}
                      onClick={() => addTag(t)}
                      style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 13, color: theme.text }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = theme.bgSecondary}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      {t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: theme.text }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              Active (visible to users)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={btn('#3B82F6')} onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Product'}
            </button>
            <button style={btn(theme.bgSecondary, theme.text)} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Product list ── */}
      {loading ? (
        <div style={{ textAlign: 'center', color: theme.textMuted, padding: 40 }}>Loading products…</div>
      ) : products.length === 0 ? (
        <div style={{ background: theme.card, border: `1.5px solid ${theme.borderColor}`, borderRadius: 10, padding: 40, textAlign: 'center', color: theme.textMuted }}>
          No products yet. Click "+ Add Product" to create the first one.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {products.map(p => (
            <div key={p.id} className="admin-item-card-row" style={{ background: theme.card, border: `1.5px solid ${theme.borderColor}`, borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              {p.image_url && (
                <img src={p.image_url} alt={p.name} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>{p.name}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                    background: p.is_active ? 'rgba(16,185,129,0.12)' : 'rgba(156,163,175,0.2)',
                    color: p.is_active ? '#10B981' : theme.textMuted,
                  }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {p.description && <p style={{ margin: '0 0 8px 0', fontSize: 13, color: theme.textMuted }}>{p.description}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 6 }}>
                  {p.tags.length > 0
                    ? p.tags.map(tag => (
                        <span key={tag} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: theme.blue ?? '#3B82F6' }}>{tag}</span>
                      ))
                    : <span style={{ fontSize: 11, color: theme.textMuted }}>No tags — shows to all users</span>
                  }
                </div>
                <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: theme.blue ?? '#3B82F6' }}>{p.affiliate_url}</a>
              </div>
              <div className="admin-item-card-buttons" style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                <button style={btn('#3B82F6')} onClick={() => openEdit(p)}>Edit</button>
                <button style={btn(p.is_active ? '#6b7280' : '#10B981')} onClick={() => toggleActive(p)}>
                  {p.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button style={btn('#dc2626')} onClick={() => deleteProduct(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
