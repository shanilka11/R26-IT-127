import React, { useEffect, useMemo, useState } from 'react'
import ApiDebugPanel from '../components/ApiDebugPanel'
import { fetchODMatrix } from '../services/api'
import { formatTimestamp, isEmptyResponse } from '../utils/validation'

const periodOptions = [
  { label: 'All', value: 'all' },
  { label: 'Peak', value: 'peak' },
  { label: 'Off-Peak', value: 'off-peak' }
]

export default function ODMatrixPage({ refreshTick }) {
  const [period, setPeriod] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [matrixData, setMatrixData] = useState(null)
  const [statusMsg, setStatusMsg] = useState('Loading OD matrix...')
  const [errorMsg, setErrorMsg] = useState('')
  const [rawResponse, setRawResponse] = useState(null)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setStatusMsg('Loading OD matrix...')
      setErrorMsg('')
      try {
        const data = await fetchODMatrix({
          period,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          top_k: 10
        })
        // explicit raw log for debugging as requested
        console.log('OD Matrix API Response:', data)
        console.log(data)

        if (isEmptyResponse(data)) {
          throw new Error('No data received from backend')
        }
        if (!mounted) return

        // normalize matrix to 2D numeric array to make chart/table rendering predictable
        const normalizedMatrix = Array.isArray(data.matrix)
          ? data.matrix.map((row) => Array.isArray(row) ? row.map((v) => Number(v) || 0) : [])
          : []

        setMatrixData({
          ...data,
          matrix: normalizedMatrix,
          origins: Array.isArray(data.origins) ? data.origins : [],
          destinations: Array.isArray(data.destinations) ? data.destinations : [],
          top_routes: Array.isArray(data.top_routes) ? data.top_routes : []
        })
        setRawResponse(data)
        setLastFetchAt(new Date().toISOString())
        setStatusMsg('OD matrix loaded')
      } catch (error) {
        if (!mounted) return
        console.error('OD matrix load error:', error)
        setErrorMsg(error?.message || 'Unable to load OD matrix')
        setStatusMsg('Live API error')
        setMatrixData(null)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [period, startDate, endDate, refreshTick])

  // chart-ready 2D numeric matrix derived from response.matrix
  const chartMatrix = useMemo(() => {
    if (!Array.isArray(matrixData?.matrix)) return []
    return matrixData.matrix.map((row) => (Array.isArray(row) ? row.map((v) => Number(v) || 0) : []))
  }, [matrixData])

  const hasMatrix = Array.isArray(chartMatrix) && chartMatrix.length > 0

  const maxValue = useMemo(() => {
    const values = hasMatrix ? chartMatrix.flat() : []
    return values.length > 0 ? Math.max(...values) : 1
  }, [chartMatrix, hasMatrix])

  const heatColor = (value) => {
    const ratio = Math.min(1, (Number(value) || 0) / maxValue)
    const lightness = 96 - ratio * 54
    return `hsl(18 92% ${lightness}%)`
  }

  return (
    <section className="fade-in space-y-4">
      <div className="card p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-1)' }}>Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--text-0)' }}
            >
              {periodOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-1)' }}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--text-0)' }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-1)' }}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 rounded-xl border bg-transparent"
              style={{ borderColor: 'var(--line)', color: 'var(--text-0)' }}
            />
          </div>
        </div>

        <p className="text-xs" style={{ color: 'var(--text-1)' }}>{statusMsg}</p>
        {errorMsg ? <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{errorMsg}</div> : null}
        <p className="text-sm" style={{ color: 'var(--text-1)' }}>
          Useful for spotting busy OD corridors and seasonal demand shifts for railway planning.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-4 xl:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">OD Heatmap</h3>
              <p className="text-xs" style={{ color: 'var(--text-1)' }}>
                Rows = Origins, Columns = Destinations, intensity = passenger count
              </p>
            </div>
            {matrixData?.heatmap_base64 ? (
              <a
                className="text-xs underline"
                href={`data:image/png;base64,${matrixData.heatmap_base64}`}
                download="od_heatmap.png"
                style={{ color: 'var(--brand)' }}
              >
                Download PNG
              </a>
            ) : null}
          </div>

          {isLoading ? (
            <div className="rounded-2xl p-6 border text-center" style={{ borderColor: 'var(--line)', color: 'var(--text-1)' }}>
              Loading heatmap...
            </div>
          ) : matrixData?.heatmap_base64 ? (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--line)' }}>
              <img
                src={`data:image/png;base64,${matrixData.heatmap_base64}`}
                alt="OD matrix heatmap"
                className="w-full h-auto"
              />
            </div>
          ) : (
            <div className="rounded-2xl p-6 border text-center text-sm" style={{ borderColor: 'var(--line)', color: 'var(--text-1)' }}>
              No heatmap available.
            </div>
          )}

          <div className="overflow-auto rounded-2xl border" style={{ borderColor: 'var(--line)' }}>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: 'var(--bg-1)' }}>
                  <th className="sticky left-0 z-10 text-left p-2" style={{ background: 'var(--bg-1)' }}>Origin / Destination</th>
                  {(matrixData?.destinations || []).map((dest) => (
                    <th key={dest} className="text-center p-2 whitespace-nowrap">{dest}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="100%" className="text-center p-4" style={{ color: 'var(--text-1)' }}>
                      Loading table data...
                    </td>
                  </tr>
                ) : hasMatrix ? (
                  (matrixData?.origins || []).map((origin, rowIndex) => (
                    <tr key={origin}>
                      <th className="sticky left-0 z-10 text-left p-2 whitespace-nowrap" style={{ background: 'var(--bg-0)' }}>{origin}</th>
                      {(chartMatrix[rowIndex] || []).map((value, colIndex) => (
                        <td
                          key={`${origin}-${colIndex}`}
                          className="text-center p-2"
                          style={{ background: heatColor(value), color: 'rgba(15, 23, 42, 0.88)' }}
                          title={String(value)}
                        >
                          {Number(value).toLocaleString()}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="100%" className="text-center p-4" style={{ color: 'var(--text-1)' }}>
                      No matrix data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <h3 className="text-lg font-semibold">Top 10 Busiest Routes</h3>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm" style={{ color: 'var(--text-1)' }}>Loading routes...</div>
            ) : (Array.isArray(matrixData?.top_routes) && matrixData.top_routes.length > 0) ? (
              (matrixData?.top_routes || []).map((route, index) => (
                <div key={route.route || `${index}`} className="rounded-2xl p-3 border" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex items-center justify-between gap-3 text-sm font-medium">
                    <span>{index + 1}. {route.route || `${route.origin} → ${route.destination}`}</span>
                    <span>{Number(route.passenger_count || route.count || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-1)' }}>
                    {route.origin} → {route.destination}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-1)' }}>No route data available</div>
            )}
          </div>

          <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--line)' }}>
            <div className="text-xs" style={{ color: 'var(--text-1)' }}>Total passengers</div>
            <div className="text-xl font-semibold">{isLoading ? '-' : Number(matrixData?.total_passengers || 0).toLocaleString()}</div>
          </div>

          <div className="rounded-2xl p-3 border" style={{ borderColor: 'var(--line)' }}>
            <div className="text-xs" style={{ color: 'var(--text-1)' }}>Routes considered</div>
            <div className="text-xl font-semibold">{isLoading ? '-' : Number(matrixData?.route_count || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      <ApiDebugPanel
        title="OD Matrix Debug Panel"
        timestamp={formatTimestamp(lastFetchAt)}
        modelType="od-matrix"
        rawResponse={rawResponse}
      />
    </section>
  )
}
