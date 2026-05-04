import React from 'react'

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'forecast', label: 'Demand Forecast' },
  { key: 'allocation', label: 'Seat Allocation' },
  { key: 'comparison', label: 'Model Comparison' },
  { key: 'odmatrix', label: 'OD Matrix' }
]

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <aside className="card float-in w-full md:w-72 p-4 md:min-h-[calc(100vh-2rem)]">
      <div className="mb-6 px-2">
        <h2 className="text-lg font-bold tracking-tight">CeylonRail AI</h2>
        <p className="text-xs" style={{ color: 'var(--text-1)' }}>Spatio-Temporal Analytics</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = activePage === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActivePage(item.key)}
              className="sidebar-item w-full text-left px-3 py-2 rounded-xl border"
              style={{
                borderColor: isActive ? 'var(--brand)' : 'var(--line)',
                background: isActive ? 'color-mix(in srgb, var(--brand) 14%, transparent)' : 'transparent',
                color: isActive ? 'var(--text-0)' : 'var(--text-1)'
              }}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
