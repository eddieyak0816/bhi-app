/**
 * Generates a random HIPAA-safe public identifier for a user.
 * Format: NHL-XXXX-XXXX (8 uppercase alphanumeric characters, no PII).
 * This token is the ONLY identifier ever shown alongside health data publicly.
 */
export function generatePublicId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no O/0/I/1 to avoid confusion
  const segment = (len: number) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `NHL-${segment(4)}-${segment(4)}`
}
