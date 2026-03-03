export const STALE_DAYS = 180

export function isLabDataStale(latestDateStr: string | null): boolean {
  if (!latestDateStr) return false
  const diffMs = Date.now() - new Date(latestDateStr).getTime()
  return diffMs > STALE_DAYS * 24 * 60 * 60 * 1000
}

export function daysSinceLastLab(latestDateStr: string | null): number | null {
  if (!latestDateStr) return null
  return Math.floor((Date.now() - new Date(latestDateStr).getTime()) / (24 * 60 * 60 * 1000))
}
