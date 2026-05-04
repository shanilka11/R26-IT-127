import React, { useEffect, useMemo, useState } from 'react'
import MetricCard from '../components/MetricCard'
import ApiDebugPanel from '../components/ApiDebugPanel'
import { Line } from 'react-chartjs-2'
import {
  fetchDashboard,
  fetchMetrics,
  fetchODMatrix,
  fetchEvaluationSummary,
} from '../services/api'
import { compareSeries, formatTimestamp, hasConstantSeries, hasMissingPredictions, hasZeroSeries, isEmptyResponse, toNumericSeries } from '../utils/validation'

export default function DashboardPage({ lineOptions, refreshTick }) {
  const [cards, setCards] = useState([])
  const [labels, setLabels] = useState([])
  const [actualSeries, setActualSeries] = useState([])
  const [forecastSeries, setForecastSeries] = useState([])
  const [summaryCards, setSummaryCards] = useState([])
  const [statusMsg, setStatusMsg] = useState('Loading live dashboard data...')
  const [errorMsg, setErrorMsg] = useState('')
  const [rawResponse, setRawResponse] = useState(null)
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setStatusMsg('Loading live dashboard data...')
      setErrorMsg('')
      setVerificationStatus(null)
      try {
        const dashboardResponse = await fetchDashboard('lstm', 7)

        if (isEmptyResponse(dashboardResponse)) {
          throw new Error('No data received from backend')
        }

        if (!mounted) {
          return
        }

        const chart = dashboardResponse.chart || {}
        const kpis = dashboardResponse.kpis || {}
        const actual = toNumericSeries(chart.actual)
        const predictions = toNumericSeries(chart.forecast)

        setLabels(Array.isArray(chart.labels) ? chart.labels : [])
        setActualSeries(actual)
        setForecastSeries(predictions)
        setRawResponse(dashboardResponse)
        setLastFetchAt(new Date().toISOString())

        if (hasMissingPredictions(predictions)) {
          setErrorMsg('Predictions missing from backend response')
          setStatusMsg('Backend response missing predictions')
          setIsLoading(false)
          return
        }

        if (hasConstantSeries(actual) || hasZeroSeries(actual)) {
          console.warn('WARNING: actual demand series is constant or zero', actual)
        }

        if (hasConstantSeries(predictions) || hasZeroSeries(predictions)) {
          console.warn('WARNING: prediction series is constant or zero', predictions)
        }

        const totalPassengers = Number(kpis.total_passengers || 0)
        const accuracyValue = kpis.forecast_accuracy == null ? null : Number(kpis.forecast_accuracy)
        const utilizationValue = kpis.seat_utilization == null ? null : Number(kpis.seat_utilization)
        const unmetValue = kpis.unmet_demand == null ? null : Number(kpis.unmet_demand)

        setCards([
          { title: 'Total Passengers', value: String(Math.round(totalPassengers)), delta: 'Backend /dashboard', tone: 'positive' },
          { title: 'Forecast Accuracy', value: accuracyValue == null ? 'N/A' : `${accuracyValue.toFixed(1)}%`, delta: 'Backend KPI', tone: 'positive' },
          { title: 'Seat Utilization', value: utilizationValue == null ? 'N/A' : `${utilizationValue.toFixed(1)}%`, delta: 'Backend KPI', tone: 'positive' },
          { title: 'Unmet Demand', value: unmetValue == null ? 'N/A' : String(Math.round(unmetValue)), delta: 'Backend KPI', tone: 'negative' }
        ])
        setRawResponse(dashboardResponse)
        setStatusMsg('Live data connected')
        setIsLoading(false)

        fetchEvaluationSummary()
          .then((evaluation) => {
            if (!mounted) {
              return
            }

            const bestModel = evaluation?.best_model || 'LSTM'
            const hybridImprovement = Number(evaluation?.improvements?.hybrid_mae_improvement_pct || 0).toFixed(2)
            const seatIncrease = Number(evaluation?.improvements?.seat_utilization_increase_pct || 0).toFixed(2)

            setSummaryCards([
              {
                title: 'Hybrid MAE Improvement',
                value: `${hybridImprovement}%`,
                delta: 'vs baseline',
                tone: 'positive'
              },
              {
                title: 'Seat Utilization Gain',
                value: `${seatIncrease}%`,
                delta: 'optimized vs static',
                tone: 'positive'
              },
              {
                title: 'Best Model',
                value: bestModel,
                delta: evaluation?.summary_report?.[0] || 'Based on MAE',
                tone: 'positive'
              }
            ])
          })
          .catch((error) => {
            console.warn('Evaluation summary failed, continuing without it:', error)
          })

      } catch (error) {
        if (!mounted) {
          return
        }
        console.error('Dashboard load error:', error)
        setErrorMsg(error?.message || 'Unable to load live dashboard data')
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

  const verifyData = async () => {
    setVerifying(true)
    try {
      const [forecastResponse, metricsResponse, odMatrixResponse] = await Promise.all([
        fetchDashboard('lstm', 7),
        fetchMetrics('lstm'),
        fetchODMatrix({ top_k: 6 })
      ])

      const forecastMatches =
        compareSeries(actualSeries, forecastResponse.chart?.actual) && compareSeries(forecastSeries, forecastResponse.chart?.forecast)
      const metricsValid = typeof metricsResponse?.MAE === 'number' || typeof metricsResponse?.RMSE === 'number'
      const odMatrixValid = Number(odMatrixResponse?.route_count || 0) > 0

      setVerificationStatus({
        ok: forecastMatches && metricsValid && odMatrixValid,
        message: forecastMatches && metricsValid && odMatrixValid ? 'REAL DATA' : 'MISMATCH'
      })
    } catch (error) {
      setVerificationStatus({ ok: false, message: 'MISMATCH' })
      setErrorMsg(error?.message || 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  const lineData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: 'Actual Demand',
          data: actualSeries,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.22)',
          borderWidth: 2,
          tension: 0.35,
          fill: true
        },
        {
          label: 'Forecast',
          data: forecastSeries,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.18)',
          borderDash: [6, 4],
          borderWidth: 2,
          tension: 0.35,
          fill: false
        }
      ]
    }),
    [labels, actualSeries, forecastSeries]
  )

  const warnings = [
    hasConstantSeries(actualSeries) ? 'Actual series is constant.' : null,
    hasZeroSeries(actualSeries) ? 'Actual series is all zeros.' : null,
    hasConstantSeries(forecastSeries) ? 'Predictions are constant.' : null,
    hasZeroSeries(forecastSeries) ? 'Predictions are all zeros.' : null,
    hasMissingPredictions(forecastSeries) ? 'Predictions missing.' : null
  ].filter(Boolean)

  return (
    <section className="fade-in space-y-4">
      <p className="text-xs" style={{ color: 'var(--text-1)' }}>{statusMsg}</p>
      {errorMsg ? <div className="rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{errorMsg}</div> : null}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-4" style={{ color: 'var(--text-1)' }}>Loading...</div>
        ) : cards.length > 0 ? (
          cards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))
        ) : (
          <div className="col-span-full text-center py-4" style={{ color: 'var(--text-1)' }}>No data available</div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-4" style={{ color: 'var(--text-1)' }}>Loading...</div>
        ) : summaryCards.length > 0 ? (
          summaryCards.map((card) => (
            <MetricCard key={card.title} {...card} />
          ))
        ) : null}
      </div>

      <div className="card slide-up p-4">
        <h3 className="text-lg font-semibold mb-3">Realtime Demand Snapshot</h3>
        {isLoading ? (
          <div className="text-sm" style={{ color: 'var(--text-1)' }}>Loading chart data...</div>
        ) : (
          <>
            {warnings.length > 0 ? (
              <div className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-1)' }}>
                {warnings.join(' ')}
              </div>
            ) : null}
            <div className="h-80">
              {actualSeries.length > 0 && forecastSeries.length > 0 ? <Line data={lineData} options={lineOptions} /> : <div className="text-sm" style={{ color: 'var(--text-1)' }}>No live chart data available.</div>}
            </div>
          </>
        )}
      </div>

      <ApiDebugPanel
        title="Dashboard Debug Panel"
        timestamp={formatTimestamp(lastFetchAt)}
        modelType="lstm"
        rawResponse={rawResponse}
        verificationStatus={verificationStatus}
        onVerify={verifyData}
        loading={verifying}
      />
    </section>
  )
}
