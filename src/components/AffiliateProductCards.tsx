/**
 * F25 — Affiliate Product Display (User-facing)
 *
 * Fetches active affiliate products whose tags overlap with the user's
 * fired result tags, then renders recommendation cards.
 *
 * PHI rule: matching is tag-based only — no raw lab values are used or exposed.
 */

import { useState, useEffect } from 'react'
import { getStoredJwt } from '../lib/supabase'

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
        const jwt = getStoredJwt()
        if (!jwt) { setProducts([]); return }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        const headers = {
          'apikey': anonKey,
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        }

        const [prodsResp, ptResp] = await Promise.all([
          fetch(`${supabaseUrl}/rest/v1/affiliate_products?select=id,name,description,image_url,affiliate_url&is_active=eq.true`, { headers }),
          fetch(`${supabaseUrl}/rest/v1/product_tags?select=product_id,tag`, { headers }),
        ])

        const prods = prodsResp.ok ? await prodsResp.json() : []
        const ptRows = ptResp.ok ? await ptResp.json() : []

        const tagMap: Record<string, string[]> = {}
        for (const row of ptRows ?? []) {
          if (!tagMap[row.product_id]) tagMap[row.product_id] = []
          tagMap[row.product_id].push(row.tag)
        }

        const tagSet = new Set(applicableTags)
        const matched = (prods ?? [])
          .map((p: any) => ({ ...p, tags: tagMap[p.id] ?? [] }))
          .filter((p: any) => p.tags.length === 0 || p.tags.some((t: string) => tagSet.has(t)))

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
    <div className="home-sec">
      <div className="home-sec-h"><h3 className="home-h3">Recommended Products</h3></div>
      <p className="home-sec-p">
        Products matched to your health profile. These are affiliate links — National Health League may earn a commission.
      </p>
      <div className="home-cards two">
        {products.map(p => (
          <div key={p.id} className="home-rc">
            {p.image_url && (
              <img className="home-rc-img" src={p.image_url} alt={p.name} loading="lazy" />
            )}
            <div className="home-rc-b">
              <div className="home-rc-t">{p.name}</div>
              {p.description && <div className="home-rc-d">{p.description}</div>}
              <a className="home-btn" href={p.affiliate_url} target="_blank" rel="noopener noreferrer">
                Learn More
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
