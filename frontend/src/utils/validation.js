export function toNumericSeries(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return values.map((value) => Number(value)).filter((value) => Number.isFinite(value))
}

export function hasConstantSeries(values) {
  const series = toNumericSeries(values)
  if (series.length === 0) {
    return true
  }
  return series.every((value) => value === series[0])
}

export function hasZeroSeries(values) {
  const series = toNumericSeries(values)
  return series.length > 0 && series.every((value) => value === 0)
}

export function hasMissingPredictions(values) {
  return toNumericSeries(values).length === 0
}

export function compareSeries(actualValues, predictedValues, tolerance = 0.001) {
  const actual = toNumericSeries(actualValues)
  const predicted = toNumericSeries(predictedValues)

  if (actual.length === 0 || predicted.length === 0) {
    return false
  }

  if (actual.length !== predicted.length) {
    return false
  }

  return actual.every((value, index) => Math.abs(value - predicted[index]) <= tolerance)
}

export function isEmptyResponse(payload) {
  if (!payload) {
    return true
  }

  if (Array.isArray(payload)) {
    return payload.length === 0
  }

  if (typeof payload === 'object') {
    return Object.keys(payload).length === 0
  }

  return false
}

export function formatTimestamp(dateValue) {
  if (!dateValue) {
    return 'Not fetched yet'
  }

  return new Date(dateValue).toLocaleString()
}