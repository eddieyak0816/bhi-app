/**
 * F25 — Affiliate Product Display (User-facing)
 *
 * Fetches active affiliate products whose tags overlap with the user's
 * fired result tags, then renders recommendation cards.
 *
 * PHI rule: matching is tag-based only — no raw lab values are used or exposed.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface Product {
  id: string
  name: string
  description: string
  image_url: string | null
  affiliate_url: string
  tags: string[]
}

interface Props {
  /** Tags fired from the user's lab results (from EvaluationContext.applicableTags) */
  applicableTags: string[]
  theme: any
}

export default function AffiliateProductCards({ applicableTags, theme }: Props) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { data: prods } = await supabase
          .from('affiliate_products')
          .select('id, name, description, image_url, affiliate_url')
          .eq('is_active', true)

        const { data: ptRows } = await supabase
          .from('product_tags')
          .select('product_id, tag')

        if (!prods) { setProducts([]); return }

        const tagMap: Record<string, string[]> = {}
        for (const row of ptRows ?? []) {
          if (!tagMap[row.product_id]) tagMap[row.product_id] = []
          tagMap[row.product_id].push(row.tag)
        }

        // A product matches if:
        //  (a) it has no tags (show to everyone), OR
        //  (b) at least one of its tags is in the user's applicableTags
        const tagSet = new Set(applicableTags)
        const matched = prods
          .map(p => ({ ...p, tags: tagMap[p.id] ?? [] }))
          .filter(p => p.tags.length === 0 || p.tags.some(t => tagSet.has(t)))

        setProducts(matched)
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [applicableTags.join(',')])

  if (loading || products.length === 0) return null

  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ marginBottom: 4, fontSize: 20, fontWeight: 600, color: theme.text }}>Recommended Products</h3>
      <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>
        Products matched to your health profile. These are affiliate links — NHL may earn a commission.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {products.map(p => (
          <div
            key={p.id}
            style={{
              background: theme.card,
              border: `1.5px solid ${theme.borderColor}`,
              borderRadius: 10,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {p.image_url && (
              <img
                src={p.image_url}
                alt={p.name}
                style={{ width: '100%', height: 140, objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: theme.text, marginBottom: 6 }}>{p.name}</div>
              {p.description && (
                <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12, flex: 1 }}>{p.description}</div>
              )}
              <a
                href={p.affiliate_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  background: '#3B82F6',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '9px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                  marginTop: 'auto',
                }}
              >
                Learn More
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
