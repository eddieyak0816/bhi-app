import { useState } from 'react'
import { buildCsvString, downloadCsv, todayIso } from '../utils/csvExport'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  org: { name: string; slug: string }
  kpis: {
    total_members: number
    members_with_data: number
    avg_bhas_pct: number | null
    pct_at_optimal: number | null
  }
  score_distribution: Array<{ label: string; count: number }>
  label_distribution: Array<{ label: string; count: number }>
  trend: Array<{ week: string; avg_score: number; member_count: number }>
  metric_breakdown: Array<{ metric: string; optimal_pct: number; member_count: number }>
}

interface Props {
  data: AnalyticsData
  onClose: () => void
  theme: any
}

type TabId = 'summary' | 'risk' | 'csv' | 'print'

// ── Helpers ───────────────────────────────────────────────────────────────────

function riskLabel(label: string): string {
  if (label === 'Optimal') return 'Low Risk'
  if (label === 'Healthy') return 'Moderate Risk'
  if (label === 'Needs Improvement') return 'Elevated Risk'
  if (label === 'High Risk') return 'High Risk'
  return label
}

function riskColor(label: string): string {
  if (label === 'Optimal') return '#15803d'
  if (label === 'Healthy') return '#1d4ed8'
  if (label === 'Needs Improvement') return '#b45309'
  if (label === 'High Risk') return '#b91c1c'
  return '#374151'
}

function trendNarrative(
  trend: Array<{ week: string; avg_score: number; member_count: number }>
): string {
  if (trend.length < 2) return 'Insufficient trend data.'
  const first = trend[0].avg_score
  const last = trend[trend.length - 1].avg_score
  const diff = +(last - first).toFixed(1)
  if (Math.abs(diff) < 1) return 'Org-average NHLS score remained stable over the past 12 weeks.'
  if (diff > 0) return `Org-average NHLS score improved by ${diff}pp over the past 12 weeks (${first}% → ${last}%).`
  return `Org-average NHLS score declined by ${Math.abs(diff)}pp over the past 12 weeks (${first}% → ${last}%).`
}

function topBottom(
  metric_breakdown: Array<{ metric: string; optimal_pct: number; member_count: number }>
): { top: typeof metric_breakdown; bottom: typeof metric_breakdown } {
  const sorted = [...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct)
  return {
    top: sorted.slice(0, 3),
    bottom: sorted.slice(-3).reverse(),
  }
}

// ── Sub-views ─────────────────────────────────────────────────────────────────

function SummaryView({ data, theme }: { data: AnalyticsData; theme: any }) {
  const { kpis, score_distribution, metric_breakdown } = data
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div>
      <p className="ir-meta">Report generated {today} · De-identified — no PHI included</p>
      <h3 className="ir-h">Organizational Health Summary</h3>

      {/* KPI grid */}
      <div className="ir-kpis">
        {[
          { label: 'Total Members', value: kpis.total_members },
          { label: 'Members with Lab Data', value: kpis.members_with_data },
          { label: 'Average NHLS Score', value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
          { label: '% Members at Optimal', value: kpis.pct_at_optimal !== null ? `${kpis.pct_at_optimal}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="ir-kpi">
            <div className="ir-kpi-v">{value}</div>
            <div className="ir-kpi-k">{label}</div>
          </div>
        ))}
      </div>

      {/* Score distribution table */}
      <h4 className="ir-h4">NHLS Score Distribution</h4>
      <table className="ir-table">
        <thead>
          <tr>
            <th>Score Range</th>
            <th>Members</th>
            <th>% of Population</th>
          </tr>
        </thead>
        <tbody>
          {score_distribution.map(({ label, count }) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{count}</td>
              <td>
                {kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Per-metric table */}
      {metric_breakdown.length > 0 && (<>
        <h4 className="ir-h4">Per-Metric % at Optimal</h4>
        <table className="ir-table last">
          <thead>
            <tr>
              <th>Metric</th>
              <th>% at Optimal</th>
              <th>Members Measured</th>
            </tr>
          </thead>
          <tbody>
            {[...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct).map(({ metric, optimal_pct, member_count }) => (
              <tr key={metric}>
                <td>{metric}</td>
                <td className={`ir-pct ${optimal_pct >= 70 ? 'hi' : optimal_pct >= 40 ? 'mid' : 'lo'}`}>{optimal_pct}%</td>
                <td>{member_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>)}
    </div>
  )
}

function RiskView({ data, theme }: { data: AnalyticsData; theme: any }) {
  const { kpis, label_distribution, trend, metric_breakdown } = data
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const narrative = trendNarrative(trend)
  const { top, bottom } = topBottom(metric_breakdown)

  const highRisk = label_distribution.find(l => l.label === 'High Risk')?.count ?? 0
  const needsImprovement = label_distribution.find(l => l.label === 'Needs Improvement')?.count ?? 0
  const elevated = highRisk + needsImprovement
  const elevatedPct = kpis.members_with_data > 0 ? Math.round((elevated / kpis.members_with_data) * 100) : 0

  return (
    <div>
      <p className="ir-meta">Report generated {today} · De-identified — no PHI included</p>
      <h3 className="ir-h" style={{ marginBottom: 6 }}>Population Risk Profile</h3>
      <p className="ir-sub">
        For use in insurance premium negotiations. All data is de-identified aggregate statistics — no individual health information is disclosed.
      </p>

      {/* Risk summary callout */}
      <div className="ir-callout">
        <div className="ir-callout-t">Population at Elevated or High Risk</div>
        <div className="ir-callout-v">{elevated} <span style={{ fontSize: 16 }}>members ({elevatedPct}%)</span></div>
        <div className="ir-callout-s">
          Members categorized as Needs Improvement or High Risk — primary targets for wellness interventions.
        </div>
      </div>

      {/* Risk tier table */}
      <h4 className="ir-h4">Health Risk Tier Breakdown</h4>
      <table className="ir-table">
        <thead>
          <tr>
            <th>Health Category</th>
            <th>Insurance Risk Tier</th>
            <th>Members</th>
            <th>% of Population</th>
          </tr>
        </thead>
        <tbody>
          {label_distribution.map(({ label, count }) => (
            <tr key={label}>
              <td>{label}</td>
              <td className={`ir-tier ${label === 'Optimal' ? 'hi' : label === 'Healthy' ? 'info' : label === 'Needs Improvement' ? 'mid' : 'lo'}`}>{riskLabel(label)}</td>
              <td>{count}</td>
              <td>
                {kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Trend narrative */}
      <h4 className="ir-h4">12-Week Trend</h4>
      <div className="ir-note">
        {narrative}
      </div>

      {/* Top / bottom metrics */}
      {metric_breakdown.length >= 3 && (<>
        <div className="ir-two">
          <div>
            <h4 className="ir-h4 hi">Strongest Metrics</h4>
            {top.map(({ metric, optimal_pct }) => (
              <div key={metric} className="ir-row hi">
                <span>{metric}</span>
                <strong>{optimal_pct}%</strong>
              </div>
            ))}
          </div>
          <div>
            <h4 className="ir-h4 lo">Improvement Areas</h4>
            {bottom.map(({ metric, optimal_pct }) => (
              <div key={metric} className="ir-row lo">
                <span>{metric}</span>
                <strong>{optimal_pct}%</strong>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  )
}

function CsvView({ data, theme }: { data: AnalyticsData; theme: any }) {
  const [downloaded, setDownloaded] = useState(false)

  function handleDownload() {
    const { org, kpis, score_distribution, label_distribution, metric_breakdown } = data
    const date = todayIso()

    const sections: Array<Array<string | number | null>> = [
      // Header
      [`National Health League Insurance Negotiation Report — ${org.name}`],
      [`Generated: ${date}`],
      [`De-identified aggregate data — no PHI included`],
      [],
      // KPIs
      ['--- Organization KPIs ---'],
      ['Metric', 'Value'],
      ['Total Members', kpis.total_members],
      ['Members with Lab Data', kpis.members_with_data],
      ['Average NHLS Score (%)', kpis.avg_bhas_pct ?? ''],
      ['% Members at Optimal', kpis.pct_at_optimal ?? ''],
      [],
      // Score distribution
      ['--- NHLS Score Distribution ---'],
      ['Score Range', 'Member Count', '% of Population'],
      ...score_distribution.map(({ label, count }) => [
        label,
        count,
        kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '',
      ]),
      [],
      // Label / risk distribution
      ['--- Health Risk Tier Breakdown ---'],
      ['Health Category', 'Insurance Risk Tier', 'Member Count', '% of Population'],
      ...label_distribution.map(({ label, count }) => [
        label,
        riskLabel(label),
        count,
        kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '',
      ]),
      [],
      // Per-metric
      ['--- Per-Metric % at Optimal ---'],
      ['Metric', '% at Optimal', 'Members Measured'],
      ...[...metric_breakdown]
        .sort((a, b) => b.optimal_pct - a.optimal_pct)
        .map(({ metric, optimal_pct, member_count }) => [metric, `${optimal_pct}%`, member_count]),
    ]

    // Build as a flat CSV (no header/row distinction — all rows are just cells)
    const csvLines = sections.map(row =>
      row.map(cell => {
        const s = String(cell ?? '')
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
      }).join(',')
    )

    downloadCsv(csvLines.join('\r\n'), `nhl-insurance-report-${org.slug}-${date}.csv`)
    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2500)
  }

  return (
    <div>
      <h3 className="ir-h" style={{ marginBottom: 10 }}>Aggregate CSV Export</h3>
      <p className="ir-sub">
        Downloads a structured CSV with all aggregate metrics: KPIs, score distribution, risk tier breakdown, and per-metric % at optimal.
        Contains no individual member data or PHI.
      </p>

      <div className="ir-note">
        <strong>File contents:</strong>
        <ul className="ir-ul">
          <li>Organization KPIs (total members, members with data, avg NHLS %, % at optimal)</li>
          <li>NHLS score distribution (by percentage range)</li>
          <li>Health risk tier breakdown (Optimal → High Risk)</li>
          <li>Per-metric % at optimal (sorted highest to lowest)</li>
        </ul>
      </div>

      <button
        onClick={handleDownload}
        className={`ir-btn${downloaded ? ' done' : ''}`}
      >
        {downloaded ? 'Downloaded!' : 'Download CSV'}
      </button>
    </div>
  )
}

function PrintView({ data, theme }: { data: AnalyticsData; theme: any }) {
  const { org, kpis, score_distribution, label_distribution, trend, metric_breakdown } = data
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const narrative = trendNarrative(trend)
  const { top, bottom } = topBottom(metric_breakdown)

  function handlePrint() {
    const printContent = document.getElementById('nhl-insurance-print-content')
    if (!printContent) return
    const w = window.open('', '_blank', 'width=900,height=700')
    if (!w) return
    w.document.write(`
      <html>
      <head>
        <title>National Health League Insurance Negotiation Report — ${org.name}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 40px; color: #111; font-size: 13px; }
          h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; }
          h2 { font-size: 15px; font-weight: 700; margin: 20px 0 8px 0; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
          h3 { font-size: 13px; font-weight: 600; margin: 16px 0 6px 0; }
          p { margin: 0 0 8px 0; color: #6b7280; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #f9fafb; border: 1px solid #e5e7eb; padding: 7px 10px; font-weight: 600; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 7px 10px; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-tile { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
          .kpi-value { font-size: 24px; font-weight: 800; }
          .kpi-label { font-size: 11px; color: #6b7280; margin-top: 2px; }
          .row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
          .metric-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
          .metric-bar-label { width: 180px; font-size: 12px; flex-shrink: 0; }
          .metric-bar-track { flex: 1; height: 12px; background: #f3f4f6; border-radius: 6px; overflow: hidden; }
          .metric-bar-fill { height: 100%; border-radius: 6px; }
          .metric-bar-pct { width: 40px; text-align: right; font-size: 12px; font-weight: 600; }
          .callout { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; }
          .narrative { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; font-size: 13px; margin-bottom: 16px; }
          .green { color: #15803d; } .red { color: #b91c1c; } .amber { color: #b45309; } .blue { color: #1d4ed8; }
          @media print { body { margin: 20px; } }
        </style>
      </head>
      <body>
        <h1>National Health League Insurance Negotiation Report</h1>
        <p style="font-size:13px;color:#374151;margin-bottom:4px"><strong>Organization:</strong> ${org.name}</p>
        <p style="margin-bottom:4px">Report Date: ${today} &nbsp;·&nbsp; De-identified aggregate data — no PHI included</p>

        <h2>Organization KPIs</h2>
        <div class="kpi-grid">
          <div class="kpi-tile"><div class="kpi-value">${kpis.total_members}</div><div class="kpi-label">Total Members</div></div>
          <div class="kpi-tile"><div class="kpi-value">${kpis.members_with_data}</div><div class="kpi-label">Members with Data</div></div>
          <div class="kpi-tile"><div class="kpi-value">${kpis.avg_bhas_pct !== null ? kpis.avg_bhas_pct + '%' : '—'}</div><div class="kpi-label">Avg NHLS Score</div></div>
          <div class="kpi-tile"><div class="kpi-value">${kpis.pct_at_optimal !== null ? kpis.pct_at_optimal + '%' : '—'}</div><div class="kpi-label">% at Optimal</div></div>
        </div>

        <h2>Health Risk Tier Breakdown</h2>
        <table>
          <thead><tr><th>Health Category</th><th>Insurance Risk Tier</th><th>Members</th><th>% of Population</th></tr></thead>
          <tbody>
            ${label_distribution.map(({ label, count }) => `
              <tr>
                <td>${label}</td>
                <td><strong>${riskLabel(label)}</strong></td>
                <td>${count}</td>
                <td>${kpis.members_with_data > 0 ? Math.round((count / kpis.members_with_data) * 100) + '%' : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>NHLS Score Distribution</h2>
        <table>
          <thead><tr><th>Score Range</th><th>Members</th><th>% of Population</th></tr></thead>
          <tbody>
            ${score_distribution.map(({ label, count }) => `
              <tr>
                <td>${label}</td>
                <td>${count}</td>
                <td>${kpis.members_with_data > 0 ? Math.round((count / kpis.members_with_data) * 100) + '%' : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>12-Week Health Trend</h2>
        <div class="narrative">${narrative}</div>
        ${trend.length > 0 ? `
        <table>
          <thead><tr><th>Week</th><th>Avg NHLS Score</th><th>Members Tracked</th></tr></thead>
          <tbody>${trend.map(({ week, avg_score, member_count }) => `<tr><td>${week}</td><td>${avg_score}%</td><td>${member_count}</td></tr>`).join('')}</tbody>
        </table>` : ''}

        <h2>Per-Metric % at Optimal</h2>
        ${metric_breakdown.length > 0 ? `
          ${[...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct).map(({ metric, optimal_pct, member_count }) => {
            const color = optimal_pct >= 70 ? '#15803d' : optimal_pct >= 40 ? '#b45309' : '#b91c1c'
            return `<div class="metric-bar-row">
              <div class="metric-bar-label">${metric}</div>
              <div class="metric-bar-track"><div class="metric-bar-fill" style="width:${optimal_pct}%;background:${color}"></div></div>
              <div class="metric-bar-pct" style="color:${color}">${optimal_pct}%</div>
            </div>`
          }).join('')}
          <p style="margin-top:8px">Members measured per metric: ${metric_breakdown.map(m => `${m.metric} (${m.member_count})`).join(', ')}</p>
        ` : '<p>No metric data available.</p>'}

        ${metric_breakdown.length >= 3 ? `
        <h2>Metric Highlights</h2>
        <div class="row-grid">
          <div>
            <h3 class="green">Strongest Metrics</h3>
            ${top.map(({ metric, optimal_pct }) => `<div style="padding:6px 10px;background:#dcfce7;border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between"><span>${metric}</span><strong class="green">${optimal_pct}%</strong></div>`).join('')}
          </div>
          <div>
            <h3 class="red">Improvement Areas</h3>
            ${bottom.map(({ metric, optimal_pct }) => `<div style="padding:6px 10px;background:#fee2e2;border-radius:4px;margin-bottom:4px;display:flex;justify-content:space-between"><span>${metric}</span><strong class="red">${optimal_pct}%</strong></div>`).join('')}
          </div>
        </div>` : ''}

        <p style="margin-top:40px;font-size:11px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px">
          This report was generated by the National Health League platform. All data is de-identified aggregate statistics. No individually identifiable health information (PHI) is included. For questions, contact your National Health League administrator.
        </p>
      </body>
      </html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  return (
    <div>
      <h3 className="ir-h" style={{ marginBottom: 10 }}>Print / Save as PDF</h3>
      <p className="ir-sub">
        Opens a print-ready version in a new tab. Use your browser's "Save as PDF" option to export a PDF file.
        The report includes all KPIs, risk tiers, score distribution, trend data, metric bars, and highlights.
      </p>

      <button
        onClick={handlePrint}
        className="ir-btn" style={{ marginBottom: 24 }}
      >
        Open Print View
      </button>

      {/* Preview of what will print */}
      <div id="nhl-insurance-print-content" className="ir-preview">
        <div className="ir-meta" style={{ marginBottom: 12, fontStyle: 'italic' }}>Preview (simplified)</div>

        <div className="ir-kpis four">
          {[
            { label: 'Total Members', value: kpis.total_members },
            { label: 'With Data', value: kpis.members_with_data },
            { label: 'Avg NHLS', value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
            { label: '% Optimal', value: kpis.pct_at_optimal !== null ? `${kpis.pct_at_optimal}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="ir-kpi">
              <div className="ir-kpi-v" style={{ fontSize: 20 }}>{value}</div>
              <div className="ir-kpi-k">{label}</div>
            </div>
          ))}
        </div>

        <table className="ir-table sm">
          <thead><tr><th>Category</th><th>Risk Tier</th><th>Members</th></tr></thead>
          <tbody>
            {label_distribution.map(({ label, count }) => (
              <tr key={label}>
                <td>{label}</td>
                <td className={`ir-tier ${label === 'Optimal' ? 'hi' : label === 'Healthy' ? 'info' : label === 'Needs Improvement' ? 'mid' : 'lo'}`}>{riskLabel(label)}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ir-note" style={{ marginBottom: 14 }}>
          {narrative}
        </div>

        {metric_breakdown.length > 0 && (
          <div>
            {[...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct).map(({ metric, optimal_pct }) => {
              const color = optimal_pct >= 70 ? '#15803d' : optimal_pct >= 40 ? '#b45309' : '#b91c1c'
              return (
                <div key={metric} className="ir-bar">
                  <span className="ir-bar-l">{metric}</span>
                  <div className="ir-bar-t">
                    <div className="ir-bar-f" style={{ width: `${optimal_pct}%`, background: color }} />
                  </div>
                  <span className="ir-bar-p" style={{ color }}>{optimal_pct}%</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export default function InsuranceReportModal({ data, onClose, theme }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('summary')

  const tabs: Array<{ id: TabId; label: string; description: string }> = [
    { id: 'summary', label: 'Org Summary', description: 'KPIs + score distribution + per-metric table' },
    { id: 'risk', label: 'Risk Profile', description: 'Risk tiers + trend narrative + metric highlights' },
    { id: 'csv', label: 'CSV Export', description: 'Aggregate data as downloadable CSV' },
    { id: 'print', label: 'Print / PDF', description: 'Full report in a print-optimized new tab' },
  ]

  return (
    <div className="ir-bg" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="ir-modal" role="dialog" aria-modal="true" aria-label="Insurance Negotiation Report">
        {/* Modal header */}
        <div className="ir-head">
          <div>
            <h2 className="ir-title">Insurance Negotiation Report</h2>
            <p className="ir-sub">{data.org.name} · Choose a format below</p>
          </div>
          <button
            onClick={onClose}
            className="ir-x"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div className="ir-tabs" role="tablist">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`ir-tab${activeTab === id ? ' on' : ''}`} role="tab" aria-selected={activeTab === id}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div className="ir-desc">
          {tabs.find(t => t.id === activeTab)?.description}
        </div>

        {/* Tab content */}
        <div className="ir-body">
          {activeTab === 'summary' && <SummaryView data={data} theme={theme} />}
          {activeTab === 'risk'    && <RiskView    data={data} theme={theme} />}
          {activeTab === 'csv'    && <CsvView     data={data} theme={theme} />}
          {activeTab === 'print'  && <PrintView   data={data} theme={theme} />}
        </div>

        {/* Footer */}
        <div className="ir-foot">
          <button
            onClick={onClose}
            className="ir-btn ghost"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
