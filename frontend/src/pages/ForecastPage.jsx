import React, { useEffect, useMemo, useState } from 'react'
import { Line } from 'react-chartjs-2'
import ApiDebugPanel from '../components/ApiDebugPanel'
import { fetchForecastBundle, fetchMetrics, fetchODMatrix } from '../services/api'
import { compareSeries, hasConstantSeries, hasMissingPredictions, hasZeroSeries, formatTimestamp, isEmptyResponse, toNumericSeries } from '../utils/validation'

export default function ForecastPage({ lineOptions, refreshTick }) {
  const [modelType, setModelType] = useState('lstm')
  const [labels, setLabels] = useState([])
  const [actual, setActual] = useState([])
  const [predicted, setPredicted] = useState([])
  const [rawResponse, setRawResponse] = useState(null)
  const [statusMsg, setStatusMsg] = useState('Loading live forecast...')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastFetchAt, setLastFetchAt] = useState(null)
  const [verificationStatus, setVerificationStatus] = useState(null)
  const [verifying, setVerifying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const backendModelType = modelType === 'baseline' ? 'arima' : modelType

  useEffect(() => {
    let mounted = true

    async function load() {
      setIsLoading(true)
      setStatusMsg('Loading live forecast...')
      setErrorMsg('')
      setVerificationStatus(null)
      try {
        const response = await fetchForecastBundle(backendModelType, 10)
        console.log('Forecast Bundle API Response:', response)

        if (isEmptyResponse(response)) {
          throw new Error('No data received from backend')
        }

        const nextLabels = Array.isArray(response.labels) ? response.labels : []
        const nextActual = toNumericSeries(response.actual)
        const nextPredicted = toNumericSeries(response.predicted)

        if (!mounted) {
          return
        }

        setLabels(nextLabels)
        setActual(nextActual)
        setPredicted(nextPredicted)
        setRawResponse(response)
        setLastFetchAt(new Date().toISOString())

        if (hasMissingPredictions(nextPredicted)) {
          setErrorMsg('Predictions missing from backend response')
          setStatusMsg('Backend response missing predictions')
          setIsLoading(false)
          return
        }

        if (hasConstantSeries(nextActual) || hasZeroSeries(nextActual)) {
          console.warn('WARNING: actual demand series is constant or zero', nextActual)
        }

        if (hasConstantSeries(nextPredicted) || hasZeroSeries(nextPredicted)) {
          console.warn('WARNING: prediction series is constant or zero', nextPredicted)
        }

        setStatusMsg(`Live forecast loaded (${backendModelType.toUpperCase()})`)
      } catch (error) {
        if (!mounted) {
          return
        }
        console.error('Forecast load error:', error)
        setErrorMsg(error?.message || 'Unable to load live forecast data')
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
  }, [modelType, refreshTick])

  const verifyData = async () => {
    setVerifying(true)
    try {
      const [forecastResponse, metricsResponse, odMatrixResponse] = await Promise.all([
        fetchForecastBundle(backendModelType, 10),
        fetchMetrics(backendModelType),
        fetchODMatrix({ top_k: 10 })
      ])

      const forecastMatches =
        compareSeries(actual, forecastResponse.actual) && compareSeries(predicted, forecastResponse.predicted)
      const metricsValid =
        typeof metricsResponse?.MAE === 'number' || typeof metricsResponse?.mae === 'number' ||
        typeof metricsResponse?.RMSE === 'number' || typeof metricsResponse?.rmse === 'number'
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
          data: actual,
          borderColor: '#14b8a6',
          backgroundColor: 'rgba(20, 184, 166, 0.22)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Predicted Demand',
          data: predicted,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.18)',
          borderWidth: 2,
          tension: 0.4,
          fill: false
        }
      ]
    }),
    [labels, actual, predicted]
  )

  const warnings = [
    hasConstantSeries(actual) ? 'Actual series is constant.' : null,
    hasZeroSeries(actual) ? 'Actual series is all zeros.' : null,
    hasConstantSeries(predicted) ? 'Predictions are constant.' : null,
    hasZeroSeries(predicted) ? 'Predictions are all zeros.' : null,
    hasMissingPredictions(predicted) ? 'Predictions missing.' : null
  ].filter(Boolean)

  return (
    <section className="fade-in space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-semibold">Demand Forecast Graph</h3>
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value)}
            className="rounded-lg px-3 py-2 border"
            style={{ borderColor: 'var(--line)', background: 'var(--bg-1)' }}
          >
            <option value="lstm">LSTM</option>
            <option value="baseline">ARIMA/Prophet</option>
          </select>
        </div>
        <p className="text-sm mb-3" style={{ color: 'var(--text-1)' }}>
          Temporal predictions generated from trained backend models.
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-1)' }}>{statusMsg}</p>
        {errorMsg ? <div className="mb-3 rounded-xl border px-3 py-2 text-sm" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{errorMsg}</div> : null}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center" style={{ color: 'var(--text-1)' }}>
            <div>Loading forecast data...</div>
          </div>
        ) : (
          <>
            {warnings.length > 0 ? (
              <div className="mb-3 rounded-xl border px-3 py-2 text-xs" style={{ borderColor: 'var(--line)', color: 'var(--text-1)' }}>
                {warnings.join(' ')}
              </div>
            ) : null}
            <div className="h-96">
              {actual.length > 0 && predicted.length > 0 ? <Line data={lineData} options={lineOptions} /> : <div className="text-sm" style={{ color: 'var(--text-1)' }}>No live chart data available.</div>}
            </div>
          </>
        )}
      </div>

      <ApiDebugPanel
        title="Forecast Debug Panel"
        timestamp={formatTimestamp(lastFetchAt)}
        modelType={modelType}
        rawResponse={rawResponse}
        verificationStatus={verificationStatus}
        onVerify={verifyData}
        loading={verifying}
      />
    </section>
  )
}
