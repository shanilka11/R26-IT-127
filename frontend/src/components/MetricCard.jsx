import React from 'react'

export default function MetricCard({ title, value, delta, tone }) {
  const positive = tone === 'positive'

  return (
    <div className="card slide-up p-4">
      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-1)' }}>{title}</p>
      <h3 className="mt-2 text-2xl font-bold">{value}</h3>
      <p className="mt-2 text-sm" style={{ color: positive ? 'var(--brand-2)' : 'var(--danger)' }}>
        {delta} vs last week
      </p>
    </div>
  )
}
