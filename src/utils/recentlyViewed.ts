/**
 * Tracks which resources a user has actually opened, so the Dashboard's "Recently Viewed"
 * section can show real personal history instead of a hardcoded "first 3 resources in the
 * library" placeholder. Stored in localStorage, same approach already used for bookmarks
 * (src/pages/ResourcesPage.tsx) — per-browser, not per-account, matching that existing pattern
 * rather than introducing a new architecture for this.
 */

const STORAGE_KEY = 'nhl-recently-viewed'
const MAX_ENTRIES = 20 // keep a little history even though the Dashboard only shows 3

export interface ViewedResource {
  title: string
  type: string
  viewedAt: string
}

export function recordView(resource: { title?: string; type?: string }): void {
  if (!resource?.title) return
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const existing: ViewedResource[] = raw ? JSON.parse(raw) : []
    // Remove any previous entry for this same resource so re-viewing moves it to the front
    // instead of showing the same title twice.
    const withoutThis = existing.filter(r => r.title !== resource.title)
    const updated = [{ title: resource.title, type: resource.type || '', viewedAt: new Date().toISOString() }, ...withoutThis].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // localStorage can throw (private browsing, storage full, etc.) — never let tracking a
    // view break the actual navigation the user is trying to do.
  }
}

export function getRecentlyViewed(limit = 3): Array<{ title: string; type: string }> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const existing: ViewedResource[] = raw ? JSON.parse(raw) : []
    return existing.slice(0, limit).map(({ title, type }) => ({ title, type }))
  } catch {
    return []
  }
}

export function getBookmarkedCount(): number {
  try {
    const raw = localStorage.getItem('nhl-bookmarks') ?? localStorage.getItem('bhi-bookmarks')
    if (!raw) return 0
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.length : 0
  } catch {
    return 0
  }
}
