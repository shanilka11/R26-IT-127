import React, { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import ApiDebugPanel from '../components/ApiDebugPanel'
import { fetchSeatAllocation } from '../services/api'
import { formatTimestamp, hasConstantSeries, hasZeroSeries, isEmptyResponse } from '../utils/validation'

export default function SeatAllocationPage({ barOptions, refreshTick }) {
  const [rows, setRows] = useState([])
  const [statusMsg, setStatusMsg] = useState('Running live seat allocation...')
  const [errorMsg, setErrorMsg] = useState('')
  const [rawResponse, setRawResponse] = useState(null)
  const [lastFetchAt, setLastFetchAt] = useState(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      setStatusMsg('Running live seat allocation...')
      setErrorMsg('')
      try {
        const response = await fetchSeatAllocation('lstm', 7)
        if (isEmptyResponse(response)) {
          throw new Error('No data received from backend')
        }
        if (!mounted) {
          return
        }
        const allocRows = Array.isArray(response.routes) ? response.routes : []
        setRows(allocRows)
        setRawResponse(response)
        setLastFetchAt(new Date().toISOString())
        if (hasConstantSeries(allocRows.map((row) => row.allocated)) || hasZeroSeries(allocRows.map((row) => row.allocated))) {
          console.warn('WARNING: allocation series is constant or zero', allocRows)
        }
        setStatusMsg('Live allocation loaded from MILP endpoint')
      } catch (error) {
        if (!mounted) {
          return
        }
        setErrorMsg(error?.message || 'Unable to load live allocation data')
        setStatusMsg('Live API error')
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [refreshTick])

  const barData = useMemo(
    () => ({
      labels: rows.map((r) => r.route),
      datasets: [
        {
          label: 'Demand',
          data: rows.map((r) => r.demand),
          backgroundColor: 'rgba(15, 118, 110, 0.7)',
          borderRadius: 8
        },
        {
          label: 'Allocated Seats',
          data: rows.map((r) => r.allocated),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderRadius: 8
        }
      ]
    }),
    [rows]
  )

  return (
    <section className="fade-in space-y-4">
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-3">Seat Allocation Results</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-1)' }}>{statusMsg}</p>
        {errorMsg ? <div className="mb-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{errorMsg}</div> : null}
        <div className="h-80">
          {rows.length > 0 ? <Bar data={barData} options={barOptions} /> : <div className="text-sm" style={{ color: 'var(--text-1)' }}>No live seat allocation data available.</div>}
        </div>
      </div>

      <div className="card p-4 overflow-auto">
        <h4 className="font-semibold mb-2">Route Allocation Table</h4>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-1)' }}>
              <th className="text-left py-2">Route</th>
              <th className="text-right py-2">Demand</th>
              <th className="text-right py-2">Allocated</th>
              <th className="text-right py-2">Capacity</th>
              <th className="text-right py-2">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.route} className="border-t" style={{ borderColor: 'var(--line)' }}>
                <td className="py-2">{row.route}</td>
                <td className="text-right">{row.demand}</td>
                <td className="text-right">{row.allocated}</td>
                <td className="text-right">{row.capacity}</td>
                <td className="text-right">{row.utilization}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ApiDebugPanel
        title="Seat Allocation Debug Panel"
        timestamp={formatTimestamp(lastFetchAt)}
        modelType="allocation"
        rawResponse={rawResponse}
      />
    </section>
  )
}
