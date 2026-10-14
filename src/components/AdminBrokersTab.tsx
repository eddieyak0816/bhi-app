import React, { useState, useEffect } from 'react'

interface Org { id: string; name: string; slug: string }
interface BrokerUser { id: string; email: string; username: string | null; role: string }
interface BrokerAssignment { broker_id: string; org_id: string }

interface Props { theme: any }

export default function AdminBrokersTab({ theme }: Props) {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [brokers, setBrokers] = useState<BrokerUser[]>([])
  const [assignments, setAssignments] = useState<BrokerAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const DEV_BACKEND_URL = ((import.meta as any).env.VITE_BACKEND_URL as string) || ''
  const DEV_BACKEND_KEY = ((import.meta as any).env.VITE_BACKEND_API_KEY as string) || ''
  function apiUrl(path: string) {
    return DEV_BACKEND_URL ? `${DEV_BACKEND_URL.replace(/\/$/, '')}${path}` : path
  }

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (DEV_BACKEND_KEY) h['x-backend-api-key'] = DEV_BACKEND_KEY
    return h
  }

  async function load() {
    setLoading(true); setError(null)
    const headers = DEV_BACKEND_KEY ? { 'x-backend-api-key': DEV_BACKEND_KEY } : {}
    try {
      const [orgsRes, brokersRes] = await Promise.all([
        fetch(apiUrl('/api/admin/organizations'), { headers }),
        fetch(apiUrl('/api/admin/users?role=broker'), { headers }),
      ])
      // /api/admin/organizations returns a plain array
      const orgsRaw = orgsRes.ok ? await orgsRes.json() : []
      const brokersData = brokersRes.ok ? await brokersRes.json() : { users: [] }
      setOrgs(Array.isArray(orgsRaw) ? orgsRaw : (orgsRaw.organizations || []))
      setBrokers(brokersData.users || [])

      // Load broker_orgs for each broker
      const allAssignments: BrokerAssignment[] = []
      for (const b of brokersData.users || []) {
        const aRes = await fetch(apiUrl(`/api/admin/brokers/${b.id}/orgs`), { headers })
        if (aRes.ok) {
          const aData = await aRes.json()
          for (const org of aData.orgs || []) {
            allAssignments.push({ broker_id: b.id, org_id: org.id })
          }
        }
      }
      setAssignments(allAssignments)
    } catch {
      setError('Failed to load broker data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleAssignment(brokerId: string, orgId: string, currently: boolean) {
    setSaving(true)
    const h = authHeaders()
    try {
      if (currently) {
        await fetch(apiUrl(`/api/admin/brokers/${brokerId}/orgs/${orgId}`), { method: 'DELETE', headers: h })
        setAssignments(a => a.filter(x => !(x.broker_id === brokerId && x.org_id === orgId)))
      } else {
        const res = await fetch(apiUrl(`/api/admin/brokers/${brokerId}/orgs`), {
          method: 'POST', headers: h, body: JSON.stringify({ org_id: orgId }),
        })
        if (res.ok) setAssignments(a => [...a, { broker_id: brokerId, org_id: orgId }])
        else {
          const d = await res.json()
          setError(d.error === 'user_not_broker' ? 'User does not have broker role. Set role=broker in Organizations → Users first.' : d.error)
        }
      }
    } catch {
      setError('Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="adm-hint" style={{ padding: 32 }}>Loading…</div>

  return (
    <div>
      <h3 className="adm-panel-h" style={{ margin: '0 0 6px' }}>Broker Management</h3>
      <p className="adm-hint" style={{ margin: '0 0 20px' }}>
        Brokers can view aggregate reports for multiple organizations. To make a user a broker, set their role to <code>broker</code> in the Organizations tab first.
      </p>

      {error && (
        <div className="adm-err">
          {error} <button onClick={() => setError(null)} className="adm-err-x">✕</button>
        </div>
      )}

      {brokers.length === 0 ? (
        <div className="adm-empty">
          No broker accounts yet. Set a user's role to <code>broker</code> in the Organizations tab.
        </div>
      ) : (
        <div className="adm-orglist">
          {brokers.map(broker => {
            const brokerOrgIds = assignments.filter(a => a.broker_id === broker.id).map(a => a.org_id)
            return (
              <div key={broker.id} className="adm-broker">
                <div className="adm-item-n" style={{ marginBottom: 4 }}>
                  {broker.username || broker.email}
                </div>
                <div className="adm-hint" style={{ marginBottom: 14 }}>{broker.email}</div>
                <div className="adm-k" style={{ marginBottom: 10 }}>
                  Assigned Organizations
                </div>
                <div className="adm-wrap" style={{ marginBottom: 0 }}>
                  {orgs.map(org => {
                    const assigned = brokerOrgIds.includes(org.id)
                    return (
                      <button
                        key={org.id}
                        disabled={saving}
                        onClick={() => toggleAssignment(broker.id, org.id, assigned)}
                        className={`adm-orgbtn${assigned ? ' on' : ''}`} style={{ opacity: saving ? 0.6 : 1 }}
                      >
                        {org.name} {assigned ? '✓' : '+'}
                      </button>
                    )
                  })}
                  {orgs.length === 0 && <span className="adm-hint">No organizations yet.</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
