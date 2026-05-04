import React, { useEffect, useMemo, useState } from 'react'
import { Bar } from 'react-chartjs-2'
import ApiDebugPanel from '../components/ApiDebugPanel'
import { fetchModelComparison, fetchModelComparisonRaw } from '../services/api'
import { formatTimestamp, hasConstantSeries, hasZeroSeries, isEmptyResponse } from '../utils/validation'

export default function ModelComparisonPage({ barOptions, refreshTick }) {
  const [rows, setRows] = useState([])
  const [statusMsg, setStatusMsg] = useState('Loading live model comparison...')
  const [errorMsg, setErrorMsg] = useState('')
  const [rawResponse, setRawResponse] = useState(null)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setStatusMsg('Loading live model comparison...')
      setErrorMsg('')
      try {
        const [data, raw] = await Promise.all([
          fetchModelComparison(),
          fetchModelComparisonRaw()
        ])
        console.log('Model Comparison API Response:', { data, raw })

        if (isEmptyResponse(data) || isEmptyResponse(raw)) {
          throw new Error('No data received from backend')
        }
        
        const normalized = Array.isArray(data)
          ? data
              .filter((row) => typeof row.mae === 'number' && typeof row.rmse === 'number' && typeof row.mape === 'number')
              .map((row) => ({
                model: row.model,
                mae: Number(row.mae),
                rmse: Number(row.rmse),
                mape: Number(row.mape)
              }))
          : []

        if (!mounted) {
          return
        }

        if (normalized.length > 0) {
          setRows(normalized)
          setRawResponse(raw)
          setLastFetchAt(new Date().toISOString())
          if (hasConstantSeries(normalized.map((row) => row.mae)) || hasZeroSeries(normalized.map((row) => row.mae))) {
            console.warn('WARNING: comparison MAE series is constant or zero', normalized)
          }
          setStatusMsg('Live comparison loaded')
        } else {
          setErrorMsg('No valid live metrics available')
          setStatusMsg('No live comparison data available')
        }
      } catch (error) {
        if (!mounted) {
          return
        }
        console.error('Model comparison load error:', error)
        setErrorMsg(error?.message || 'Unable to load live model comparison')
        setStatusMsg('Live API error')
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
  }, [refreshTick])

  const barData = useMemo(
    () => ({
      labels: rows.map((m) => m.model),
      datasets: [
        {
          label: 'MAE',
          data: rows.map((m) => m.mae),
          backgroundColor: 'rgba(20, 184, 166, 0.8)',
          borderRadius: 6
        },
        {
          label: 'RMSE',
          data: rows.map((m) => m.rmse),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderRadius: 6
        },
        {
          label: 'MAPE',
          data: rows.map((m) => m.mape),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderRadius: 6
        }
      ]
    }),
    [rows]
  )

  return (
    <section className="fade-in space-y-4">
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-3">Model Comparison</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--text-1)' }}>{statusMsg}</p>
        {errorMsg ? <div className="mb-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{errorMsg}</div> : null}
        <div className="h-80">
          {isLoading ? (
            <div className="flex items-center justify-center h-full" style={{ color: 'var(--text-1)' }}>
              <div>Loading comparison data...</div>
            </div>
          ) : rows.length > 0 ? (
            <Bar data={barData} options={barOptions} />
          ) : (
            <div className="text-sm" style={{ color: 'var(--text-1)' }}>No live model comparison data available.</div>
          )}
        </div>
      </div>

      <div className="card p-4 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ color: 'var(--text-1)' }}>
              <th className="text-left py-2">Model</th>
              <th className="text-right py-2">MAE</th>
              <th className="text-right py-2">RMSE</th>
              <th className="text-right py-2">MAPE (%)</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="4" className="text-center py-4" style={{ color: 'var(--text-1)' }}>
                  Loading...
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <tr key={row.model} className="border-t" style={{ borderColor: 'var(--line)' }}>
                  <td className="py-2 font-medium">{row.model}</td>
                  <td className="text-right">{row.mae}</td>
                  <td className="text-right">{row.rmse}</td>
                  <td className="text-right">{row.mape}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4" style={{ color: 'var(--text-1)' }}>
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ApiDebugPanel
        title="Comparison Debug Panel"
        timestamp={formatTimestamp(lastFetchAt)}
        modelType="comparison"
        rawResponse={rawResponse}
      />
    </section>
  )
}
