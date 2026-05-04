import React, { useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import ThemeToggle from './components/ThemeToggle'
import DashboardPage from './pages/DashboardPage'
import ForecastPage from './pages/ForecastPage'
import SeatAllocationPage from './pages/SeatAllocationPage'
import ModelComparisonPage from './pages/ModelComparisonPage'
import ODMatrixPage from './pages/ODMatrixPage'

export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [isDark, setIsDark] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: 'rgb(148, 163, 184)'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgb(148, 163, 184)' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' }
        },
        y: {
          ticks: { color: 'rgb(148, 163, 184)' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' }
        }
      },
      animation: {
        duration: 650,
        easing: 'easeOutQuart'
      }
    }),
    []
  )

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: 'rgb(148, 163, 184)'
          }
        }
      },
      scales: {
        x: {
          ticks: { color: 'rgb(148, 163, 184)' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' }
        },
        y: {
          ticks: { color: 'rgb(148, 163, 184)' },
          grid: { color: 'rgba(148, 163, 184, 0.15)' }
        }
      },
      animation: {
        duration: 650,
        easing: 'easeOutQuart'
      }
    }),
    []
  )

  const toggleTheme = () => {
    const root = document.documentElement
    root.classList.toggle('dark')
    setIsDark((prev) => !prev)
  }

  const handleRefreshAll = () => {
    setRefreshTick((prev) => prev + 1)
  }

  const titleMap = {
    dashboard: 'Metrics Overview',
    forecast: 'Demand Forecast Graph',
    allocation: 'Seat Allocation Results',
    comparison: 'Model Comparison',
    odmatrix: 'OD Matrix Heatmap'
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row gap-4">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />

        <main className="flex-1 space-y-4">
          <header className="card fade-in p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Railway AI Analytics</h1>
              <p className="text-sm" style={{ color: 'var(--text-1)' }}>
                {titleMap[activePage]} | Dataset: sri_lanka_railway_dataset.csv
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAll}
                className="px-3 py-2 rounded-xl border text-sm"
                style={{
                  borderColor: 'var(--line)',
                  background: 'var(--bg-1)',
                  color: 'var(--text-0)'
                }}
              >
                Refresh All
              </button>
              <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
            </div>
          </header>

          {activePage === 'dashboard' && <DashboardPage lineOptions={lineOptions} refreshTick={refreshTick} />}
          {activePage === 'forecast' && <ForecastPage lineOptions={lineOptions} refreshTick={refreshTick} />}
          {activePage === 'allocation' && <SeatAllocationPage barOptions={barOptions} refreshTick={refreshTick} />}
          {activePage === 'comparison' && <ModelComparisonPage barOptions={barOptions} refreshTick={refreshTick} />}
          {activePage === 'odmatrix' && <ODMatrixPage refreshTick={refreshTick} />}
        </main>
      </div>
    </div>
  )
}
