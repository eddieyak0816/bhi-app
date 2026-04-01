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
  if (Math.abs(diff) < 1) return 'Org-average BHAS score remained stable over the past 12 weeks.'
  if (diff > 0) return `Org-average BHAS score improved by ${diff}pp over the past 12 weeks (${first}% → ${last}%).`
  return `Org-average BHAS score declined by ${Math.abs(diff)}pp over the past 12 weeks (${first}% → ${last}%).`
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

  const cell: React.CSSProperties = {
    padding: '8px 12px',
    border: `1px solid ${theme.borderColor}`,
    color: theme.text,
    fontSize: 13,
  }
  const th: React.CSSProperties = { ...cell, fontWeight: 600, background: theme.bgSecondary }

  return (
    <div>
      <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textMuted }}>Report generated {today} · De-identified — no PHI included</p>
      <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>Organizational Health Summary</h3>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Total Members', value: kpis.total_members },
          { label: 'Members with Lab Data', value: kpis.members_with_data },
          { label: 'Average BHAS Score', value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
          { label: '% Members at Optimal', value: kpis.pct_at_optimal !== null ? `${kpis.pct_at_optimal}%` : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: theme.text }}>{value}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Score distribution table */}
      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: theme.text }}>BHAS Score Distribution</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={th}>Score Range</th>
            <th style={th}>Members</th>
            <th style={th}>% of Population</th>
          </tr>
        </thead>
        <tbody>
          {score_distribution.map(({ label, count }) => (
            <tr key={label}>
              <td style={cell}>{label}</td>
              <td style={cell}>{count}</td>
              <td style={cell}>
                {kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Per-metric table */}
      {metric_breakdown.length > 0 && (<>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: theme.text }}>Per-Metric % at Optimal</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Metric</th>
              <th style={th}>% at Optimal</th>
              <th style={th}>Members Measured</th>
            </tr>
          </thead>
          <tbody>
            {[...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct).map(({ metric, optimal_pct, member_count }) => (
              <tr key={metric}>
                <td style={cell}>{metric}</td>
                <td style={{ ...cell, color: optimal_pct >= 70 ? '#15803d' : optimal_pct >= 40 ? '#b45309' : '#b91c1c', fontWeight: 600 }}>{optimal_pct}%</td>
                <td style={cell}>{member_count}</td>
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

  const cell: React.CSSProperties = {
    padding: '8px 12px',
    border: `1px solid ${theme.borderColor}`,
    color: theme.text,
    fontSize: 13,
  }
  const th: React.CSSProperties = { ...cell, fontWeight: 600, background: theme.bgSecondary }

  const highRisk = label_distribution.find(l => l.label === 'High Risk')?.count ?? 0
  const needsImprovement = label_distribution.find(l => l.label === 'Needs Improvement')?.count ?? 0
  const elevated = highRisk + needsImprovement
  const elevatedPct = kpis.members_with_data > 0 ? Math.round((elevated / kpis.members_with_data) * 100) : 0

  return (
    <div>
      <p style={{ margin: '0 0 4px 0', fontSize: 12, color: theme.textMuted }}>Report generated {today} · De-identified — no PHI included</p>
      <h3 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>Population Risk Profile</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: 13, color: theme.textMuted }}>
        For use in insurance premium negotiations. All data is de-identified aggregate statistics — no individual health information is disclosed.
      </p>

      {/* Risk summary callout */}
      <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Population at Elevated or High Risk</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309' }}>{elevated} <span style={{ fontSize: 16 }}>members ({elevatedPct}%)</span></div>
        <div style={{ fontSize: 12, color: '#92400e', marginTop: 4 }}>
          Members categorized as Needs Improvement or High Risk — primary targets for wellness interventions.
        </div>
      </div>

      {/* Risk tier table */}
      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: theme.text }}>Health Risk Tier Breakdown</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <thead>
          <tr>
            <th style={th}>Health Category</th>
            <th style={th}>Insurance Risk Tier</th>
            <th style={th}>Members</th>
            <th style={th}>% of Population</th>
          </tr>
        </thead>
        <tbody>
          {label_distribution.map(({ label, count }) => (
            <tr key={label}>
              <td style={cell}>{label}</td>
              <td style={{ ...cell, color: riskColor(label), fontWeight: 600 }}>{riskLabel(label)}</td>
              <td style={cell}>{count}</td>
              <td style={cell}>
                {kpis.members_with_data > 0 ? `${Math.round((count / kpis.members_with_data) * 100)}%` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Trend narrative */}
      <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: theme.text }}>12-Week Trend</h4>
      <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: theme.text }}>
        {narrative}
      </div>

      {/* Top / bottom metrics */}
      {metric_breakdown.length >= 3 && (<>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#15803d' }}>Strongest Metrics</h4>
            {top.map(({ metric, optimal_pct }) => (
              <div key={metric} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce7', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: '#166534' }}>{metric}</span>
                <strong style={{ color: '#15803d' }}>{optimal_pct}%</strong>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 13, fontWeight: 600, color: '#b91c1c' }}>Improvement Areas</h4>
            {bottom.map(({ metric, optimal_pct }) => (
              <div key={metric} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fee2e2', borderRadius: 6, marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: '#991b1b' }}>{metric}</span>
                <strong style={{ color: '#b91c1c' }}>{optimal_pct}%</strong>
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
      [`NHL Insurance Negotiation Report — ${org.name}`],
      [`Generated: ${date}`],
      [`De-identified aggregate data — no PHI included`],
      [],
      // KPIs
      ['--- Organization KPIs ---'],
      ['Metric', 'Value'],
      ['Total Members', kpis.total_members],
      ['Members with Lab Data', kpis.members_with_data],
      ['Average BHAS Score (%)', kpis.avg_bhas_pct ?? ''],
      ['% Members at Optimal', kpis.pct_at_optimal ?? ''],
      [],
      // Score distribution
      ['--- BHAS Score Distribution ---'],
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
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>Aggregate CSV Export</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: 13, color: theme.textMuted }}>
        Downloads a structured CSV with all aggregate metrics: KPIs, score distribution, risk tier breakdown, and per-metric % at optimal.
        Contains no individual member data or PHI.
      </p>

      <div style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 8, padding: '16px 20px', marginBottom: 20, fontSize: 13, color: theme.text }}>
        <strong>File contents:</strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, lineHeight: 1.8, color: theme.textMuted }}>
          <li>Organization KPIs (total members, members with data, avg BHAS %, % at optimal)</li>
          <li>BHAS score distribution (by percentage range)</li>
          <li>Health risk tier breakdown (Optimal → High Risk)</li>
          <li>Per-metric % at optimal (sorted highest to lowest)</li>
        </ul>
      </div>

      <button
        onClick={handleDownload}
        style={{
          background: downloaded ? '#15803d' : '#3B82F6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 22px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
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
        <title>NHL Insurance Negotiation Report — ${org.name}</title>
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
        <h1>NHL Insurance Negotiation Report</h1>
        <p style="font-size:13px;color:#374151;margin-bottom:4px"><strong>Organization:</strong> ${org.name}</p>
        <p style="margin-bottom:4px">Report Date: ${today} &nbsp;·&nbsp; De-identified aggregate data — no PHI included</p>

        <h2>Organization KPIs</h2>
        <div class="kpi-grid">
          <div class="kpi-tile"><div class="kpi-value">${kpis.total_members}</div><div class="kpi-label">Total Members</div></div>
          <div class="kpi-tile"><div class="kpi-value">${kpis.members_with_data}</div><div class="kpi-label">Members with Data</div></div>
          <div class="kpi-tile"><div class="kpi-value">${kpis.avg_bhas_pct !== null ? kpis.avg_bhas_pct + '%' : '—'}</div><div class="kpi-label">Avg BHAS Score</div></div>
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

        <h2>BHAS Score Distribution</h2>
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
          <thead><tr><th>Week</th><th>Avg BHAS Score</th><th>Members Tracked</th></tr></thead>
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
          This report was generated by the National Health League (NHL) platform. All data is de-identified aggregate statistics. No individually identifiable health information (PHI) is included. For questions, contact your NHL administrator.
        </p>
      </body>
      </html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 400)
  }

  const cell: React.CSSProperties = {
    padding: '6px 10px',
    border: `1px solid ${theme.borderColor}`,
    color: theme.text,
    fontSize: 12,
  }
  const th: React.CSSProperties = { ...cell, fontWeight: 600, background: theme.bgSecondary }

  return (
    <div>
      <h3 style={{ margin: '0 0 8px 0', fontSize: 15, fontWeight: 700, color: theme.text }}>Print / Save as PDF</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: 13, color: theme.textMuted }}>
        Opens a print-ready version in a new tab. Use your browser's "Save as PDF" option to export a PDF file.
        The report includes all KPIs, risk tiers, score distribution, trend data, metric bars, and highlights.
      </p>

      <button
        onClick={handlePrint}
        style={{
          background: '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '10px 22px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 24,
        }}
      >
        Open Print View
      </button>

      {/* Preview of what will print */}
      <div id="nhl-insurance-print-content" style={{ background: theme.bgSecondary, border: `1px solid ${theme.borderColor}`, borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12, fontStyle: 'italic' }}>Preview (simplified)</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            { label: 'Total Members', value: kpis.total_members },
            { label: 'With Data', value: kpis.members_with_data },
            { label: 'Avg BHAS', value: kpis.avg_bhas_pct !== null ? `${kpis.avg_bhas_pct}%` : '—' },
            { label: '% Optimal', value: kpis.pct_at_optimal !== null ? `${kpis.pct_at_optimal}%` : '—' },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 10px' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: theme.text }}>{value}</div>
              <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12 }}>
          <thead><tr><th style={th}>Category</th><th style={th}>Risk Tier</th><th style={th}>Members</th></tr></thead>
          <tbody>
            {label_distribution.map(({ label, count }) => (
              <tr key={label}>
                <td style={cell}>{label}</td>
                <td style={{ ...cell, color: riskColor(label), fontWeight: 600 }}>{riskLabel(label)}</td>
                <td style={cell}>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ fontSize: 12, color: theme.text, background: theme.card, border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>
          {narrative}
        </div>

        {metric_breakdown.length > 0 && (
          <div>
            {[...metric_breakdown].sort((a, b) => b.optimal_pct - a.optimal_pct).map(({ metric, optimal_pct }) => {
              const color = optimal_pct >= 70 ? '#15803d' : optimal_pct >= 40 ? '#b45309' : '#b91c1c'
              return (
                <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ width: 160, fontSize: 11, color: theme.text, flexShrink: 0 }}>{metric}</span>
                  <div style={{ flex: 1, height: 8, background: theme.borderColor, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${optimal_pct}%`, height: '100%', background: color, borderRadius: 4 }} />
                  </div>
                  <span style={{ width: 36, fontSize: 11, color, fontWeight: 700, textAlign: 'right' }}>{optimal_pct}%</span>
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

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 20px',
    overflowY: 'auto',
  }

  const modal: React.CSSProperties = {
    background: theme.bg,
    border: `1px solid ${theme.borderColor}`,
    borderRadius: 12,
    width: '100%',
    maxWidth: 780,
    boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  }

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modal}>
        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: `1px solid ${theme.borderColor}` }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: theme.text }}>Insurance Negotiation Report</h2>
            <p style={{ margin: '2px 0 0 0', fontSize: 13, color: theme.textMuted }}>{data.org.name} · Choose a format below</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: theme.textMuted, lineHeight: 1, padding: '2px 6px' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${theme.borderColor}`, padding: '0 24px', overflowX: 'auto' }}>
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '12px 16px',
                fontSize: 13,
                fontWeight: 600,
                color: activeTab === id ? (theme.blue ?? '#3B82F6') : theme.textMuted,
                borderBottom: activeTab === id ? `2px solid ${theme.blue ?? '#3B82F6'}` : '2px solid transparent',
                marginBottom: -1,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab description */}
        <div style={{ padding: '8px 24px', background: theme.bgSecondary, borderBottom: `1px solid ${theme.borderColor}`, fontSize: 12, color: theme.textMuted }}>
          {tabs.find(t => t.id === activeTab)?.description}
        </div>

        {/* Tab content */}
        <div style={{ padding: 24, maxHeight: '65vh', overflowY: 'auto' }}>
          {activeTab === 'summary' && <SummaryView data={data} theme={theme} />}
          {activeTab === 'risk'    && <RiskView    data={data} theme={theme} />}
          {activeTab === 'csv'    && <CsvView     data={data} theme={theme} />}
          {activeTab === 'print'  && <PrintView   data={data} theme={theme} />}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: `1px solid ${theme.borderColor}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ background: 'none', border: `1px solid ${theme.borderColor}`, borderRadius: 6, padding: '8px 20px', fontSize: 13, color: theme.text, cursor: 'pointer' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
