import axios from 'axios'

export const API_BASE = 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE
})

const logApiResponse = (label, response) => {
  console.log(`${label} API RESPONSE:`, response.data)
  return response
}

const toNumericArray = (payload) => {
  if (!payload) {
    return []
  }
  if (Array.isArray(payload.pred)) {
    return payload.pred.map((v) => Number(v))
  }
  if (Array.isArray(payload.values)) {
    return payload.values.map((v) => Number(v))
  }
  if (typeof payload === 'object') {
    return Object.values(payload).map((v) => Number(v)).filter((v) => !Number.isNaN(v))
  }
  return []
}

export async function fetchDashboard(modelType = 'lstm', periods = 7) {
  const response = await api.get('/dashboard', { params: { model_type: modelType, periods } })
  logApiResponse('/dashboard', response)
  return response.data
}

export async function fetchForecastBundle(modelType = 'lstm', periods = 10) {
  const response = await api.get('/predict-demand', { params: { model_type: modelType, periods } })
  logApiResponse('/predict-demand', response)
  return response.data
}

export async function fetchMetrics(modelType = 'lstm') {
  const response = await api.get('/metrics', { params: { model_type: modelType } })
  logApiResponse('/metrics', response)
  const { data } = response
  
  // Normalize metrics keys - backend returns uppercase (MAE, RMSE, MAPE)
  return {
    MAE: Number(data.MAE || data.mae || 0),
    RMSE: Number(data.RMSE || data.rmse || 0),
    MAPE: Number(data.MAPE || data.mape || 0),
    mae: Number(data.MAE || data.mae || 0),
    rmse: Number(data.RMSE || data.rmse || 0),
    mape: Number(data.MAPE || data.mape || 0)
  }
}

export async function trainModel(modelType = 'lstm') {
  const response = await api.post('/train-model', null, { params: { model_type: modelType } })
  logApiResponse('/train-model', response)
  return response.data
}

export async function fetchDemandPrediction(modelType = 'lstm', periods = 10) {
  const response = await api.get('/predict-demand', { params: { model_type: modelType, periods } })
  logApiResponse('/predict-demand', response)
  return toNumericArray(response.data)
}

export async function fetchHistoricalDemand(periods = 10) {
  const response = await api.get('/historical-demand', { params: { periods } })
  logApiResponse('/historical-demand', response)
  const { data } = response
  return {
    labels: Array.isArray(data.labels) ? data.labels : [],
    values: toNumericArray(data),
    od: data.od || 'Unknown OD'
  }
}

export async function fetchRouteDemand(topK = 8) {
  const response = await api.get('/route-demand', { params: { top_k: topK } })
  logApiResponse('/route-demand', response)
  const { data } = response
  return Array.isArray(data.routes) ? data.routes : []
}

export async function runSeatAllocation(routeRows = []) {
  const capacities = {}
  const demand = {}

  routeRows.forEach((row) => {
    capacities[row.route] = Number(row.capacity || 0)
  logApiResponse('/allocate-seats', response)
  })

  const response = await api.post('/allocate-seats', { capacities, demand })
  logApiResponse(response)
  const { data } = response

  return routeRows.map((row) => {
    const allocated = Number((data.allocation || {})[row.route] || 0)
    const unmet = Number((data.unmet || {})[row.route] || 0)
    const capacity = Number(row.capacity || 0)
    const utilization = capacity > 0 ? `${((allocated / capacity) * 100).toFixed(1)}%` : '0.0%'
    return {
      route: row.route,
      demand: Number(row.demand || 0),
      allocated,
      unmet,
      capacity,
      utilization
    }
  })
}

export async function fetchSeatAllocation(modelType = 'lstm', periods = 7, payload = null) {
  const response = await api.post('/seat-allocation', payload, { params: { model_type: modelType, periods } })
  logApiResponse('/seat-allocation', response)
  return response.data
}

export async function fetchModelComparison() {
  const response = await api.get('/model-comparison')
  logApiResponse('/model-comparison', response)
  const { data } = response
  
  if (Array.isArray(data)) {
    return data.map(row => ({
      model: row.model || row.name || '',
      mae: Number(row.MAE || row.mae || 0),
      rmse: Number(row.RMSE || row.rmse || 0),
      mape: Number(row.MAPE || row.mape || 0)
    }))
  }

  // Backend returns table array with metrics, normalize to lowercase keys
  if (Array.isArray(data.table)) {
    return data.table.map(row => ({
      model: row.model || row.name || '',
      mae: Number(row.MAE || row.mae || 0),
      rmse: Number(row.RMSE || row.rmse || 0),
      mape: Number(row.MAPE || row.mape || 0)
    }))
  }
  if (Array.isArray(data.models)) {
    return data.models.map(row => ({
      model: row.model || row.name || '',
      mae: Number(row.MAE || row.mae || 0),
      rmse: Number(row.RMSE || row.rmse || 0),
      mape: Number(row.MAPE || row.mape || 0)
    }))
  }
  return []
}

export async function fetchModelComparisonRaw() {
  const response = await api.get('/model-comparison')
  logApiResponse('/model-comparison', response)
  return response.data
}

export async function fetchEvaluationSummary() {
  const response = await api.get('/evaluation-summary')
  logApiResponse('/evaluation-summary', response)
  const { data } = response
  return data
}

export async function fetchODMatrix(params = {}) {
  const response = await api.get('/od-matrix', { params })
  logApiResponse('/od-matrix', response)
  const { data } = response
  
  // Backend returns { matrix, top_routes, route_count, ... }
  // Ensure all expected keys exist with fallbacks
  return {
    matrix: Array.isArray(data.matrix) ? data.matrix : [],
    top_routes: Array.isArray(data.top_routes) ? data.top_routes : [],
    route_count: Number(data.route_count || 0),
    period: data.period || 'all',
    labels: Array.isArray(data.labels) ? data.labels : [],
    ...data
  }
}
