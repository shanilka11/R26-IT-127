export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const RAINFALL_CATEGORIES = ['No rain', 'Light rain', 'Moderate rain', 'Heavy rain'];

const WEATHER_CODE_LABELS = {
  0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle',
  53: 'Moderate drizzle', 55: 'Dense drizzle', 61: 'Slight rain',
  63: 'Moderate rain', 65: 'Heavy rain', 80: 'Slight rain showers',
  81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
};

export const toFiniteNumber = (value) => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const buildAnalysisRows = (records, categories, selectedCategory, selectedPrediction, capacity) => {
  const recordsByCategory = new Map((records || []).map((record) => [record.category, record]));
  const prediction = toFiniteNumber(selectedPrediction);
  const trainCapacity = toFiniteNumber(capacity);
  return categories.map((category) => {
    const record = recordsByCategory.get(category);
    const isSelected = category === selectedCategory;
    const historicalAverage = toFiniteNumber(record?.average_demand);
    return {
      category,
      historical_average: historicalAverage !== null && historicalAverage >= 0 ? historicalAverage : null,
      selected_prediction: isSelected && prediction !== null && prediction >= 0 ? prediction : null,
      capacity: trainCapacity !== null && trainCapacity > 0 ? trainCapacity : null,
      sample_count: toFiniteNumber(record?.sample_count),
      is_selected_category: isSelected,
    };
  });
};

export const normalizeWeatherConditionLabel = (condition) => (
  typeof condition === 'string'
    ? condition.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
    : ''
);

export const buildWeatherConditionRows = (records, selectedCondition) => {
  const historicalRows = (records || []).map((record) => ({
    category: record.category,
    historical_average: toFiniteNumber(record.average_demand),
    sample_count: toFiniteNumber(record.sample_count),
    is_selected_category: false,
  }));
  const selectedKey = normalizeWeatherConditionLabel(selectedCondition);
  if (!selectedKey) return historicalRows;

  const matchingIndex = historicalRows.findIndex(
    (record) => normalizeWeatherConditionLabel(record.category) === selectedKey
  );
  if (matchingIndex >= 0) {
    return historicalRows.map((record, index) => ({
      ...record,
      is_selected_category: index === matchingIndex,
    }));
  }

  return [
    ...historicalRows,
    {
      category: selectedCondition,
      historical_average: null,
      sample_count: null,
      is_selected_category: true,
    },
  ];
};

export const getSelectedDay = (dateValue) => {
  if (typeof dateValue !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const [year, month, day] = dateValue.split('-').map(Number);
  const selectedDate = new Date(Date.UTC(year, month - 1, day));
  if (selectedDate.getUTCFullYear() !== year || selectedDate.getUTCMonth() !== month - 1 || selectedDate.getUTCDate() !== day) return null;
  return DAYS_OF_WEEK[(selectedDate.getUTCDay() + 6) % 7];
};

export const getSelectedDayType = (dateValue) => {
  const day = getSelectedDay(dateValue);
  return day ? (day === 'Saturday' || day === 'Sunday' ? 'Weekend' : 'Weekday') : null;
};

export const getSelectedWeatherCategories = (weather) => {
  if (!weather || ![
    'historical',
    'current',
    'forecast',
    'cached_forecast',
    'climate_estimate',
    'mixed',
  ].includes(weather.weather_data_type)) {
    return { rainfall: null, rainfallAmount: null, condition: null };
  }
  const rainfall = toFiniteNumber(weather.total_route_rain);
  const rainfallCategory = rainfall === null ? null
    : rainfall <= 0 ? 'No rain'
      : rainfall <= 5 ? 'Light rain'
        : rainfall <= 20 ? 'Moderate rain' : 'Heavy rain';
  const originCode = toFiniteNumber(weather.origin_weather_code);
  const destinationCode = toFiniteNumber(weather.destination_weather_code);
  const routeWeatherCodes = [originCode, destinationCode].filter((code) => code !== null);
  const routeWeatherCode = routeWeatherCodes.length ? Math.max(...routeWeatherCodes) : null;
  return {
    rainfall: rainfallCategory,
    rainfallAmount: rainfall,
    condition: routeWeatherCode === null ? null : WEATHER_CODE_LABELS[routeWeatherCode] || 'Other',
  };
};

export const formatMetric = (value) => {
  const numericValue = toFiniteNumber(value);
  if (numericValue === null) return 'N/A';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(numericValue);
};

export const hasDemandValue = (data) => data.some((item) => (
  toFiniteNumber(item.historical_average) !== null
  || toFiniteNumber(item.selected_prediction) !== null
));
