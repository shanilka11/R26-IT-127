import {
  buildAnalysisRows,
  buildWeatherConditionRows,
  DAYS_OF_WEEK,
  formatMetric,
  getSelectedDay,
  getSelectedDayType,
  getSelectedWeatherCategories,
  RAINFALL_CATEGORIES,
} from './DemandForecastChartUtils';

describe('demand analysis chart values', () => {
  test('formats passenger values as whole numbers and rejects missing values', () => {
    expect(formatMetric(694.87)).toBe('695');
    expect(formatMetric(653.053)).toBe('653');
    expect(formatMetric(705.655)).toBe('706');
    expect(formatMetric(null)).toBe('N/A');
    expect(formatMetric(undefined)).toBe('N/A');
    expect(formatMetric(Number.NaN)).toBe('N/A');
    expect(formatMetric(Number.POSITIVE_INFINITY)).toBe('N/A');
  });

  test('maps ISO calendar dates to the correct day and day type without timezone shifts', () => {
    expect(DAYS_OF_WEEK).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(getSelectedDay('2026-10-20')).toBe('Tuesday');
    expect(getSelectedDayType('2026-10-20')).toBe('Weekday');
    expect(getSelectedDayType('2026-10-24')).toBe('Weekend');
    expect(getSelectedDayType('2026-10-25')).toBe('Weekend');
    expect(getSelectedDay('2026-02-30')).toBeNull();
  });

  test('maps selected rainfall using the backend /demand_analysis boundaries', () => {
    const categorize = (rainfall) => getSelectedWeatherCategories({
      weather_data_type: 'forecast',
      total_route_rain: rainfall,
      origin_weather_code: 0,
      destination_weather_code: 61,
    }).rainfall;
    expect(categorize(0)).toBe('No rain');
    expect(categorize(0.1)).toBe('Light rain');
    expect(categorize(5)).toBe('Light rain');
    expect(categorize(5.1)).toBe('Moderate rain');
    expect(categorize(6.9)).toBe('Moderate rain');
    expect(categorize(20)).toBe('Moderate rain');
    expect(categorize(20.1)).toBe('Heavy rain');
    expect(getSelectedWeatherCategories({
      weather_data_type: 'forecast',
      total_route_rain: null,
      origin_weather_code: 0,
      destination_weather_code: 61,
    }).rainfall).toBeNull();
    expect(getSelectedWeatherCategories({
      weather_data_type: 'climate_estimate',
      total_route_rain: 2,
      origin_weather_code: 0,
      destination_weather_code: 61,
    })).toEqual({ rainfall: 'Light rain', rainfallAmount: 2, condition: 'Slight rain' });
  });

  test('keeps all rainfall categories ordered and moves a prediction with the selected calendar day', () => {
    expect(RAINFALL_CATEGORIES).toEqual(['No rain', 'Light rain', 'Moderate rain', 'Heavy rain']);
    const records = [
      { category: 'Weekday', average_demand: 650 },
      { category: 'Weekend', average_demand: 700 },
    ];
    const tuesdayRows = buildAnalysisRows(
      records, ['Weekday', 'Weekend'], getSelectedDayType('2026-10-20'), 710, 900
    );
    const saturdayRows = buildAnalysisRows(
      records, ['Weekday', 'Weekend'], getSelectedDayType('2026-10-24'), 720, 900
    );
    expect(tuesdayRows.filter((row) => row.selected_prediction).map((row) => row.category)).toEqual(['Weekday']);
    expect(saturdayRows.filter((row) => row.selected_prediction).map((row) => row.category)).toEqual(['Weekend']);
    expect(tuesdayRows.find((row) => row.category === 'Weekend').selected_prediction).toBeNull();
  });

  test('matches the selected condition to the backend maximum WMO weather code', () => {
    expect(getSelectedWeatherCategories({
      weather_data_type: 'historical',
      total_route_rain: 1,
      origin_weather_code: 0,
      destination_weather_code: 61,
    }).condition).toBe('Slight rain');
    expect(getSelectedWeatherCategories({
      weather_data_type: 'forecast',
      total_route_rain: 1,
      origin_weather_code: null,
      destination_weather_code: 61,
    }).condition).toBe('Slight rain');
    expect(getSelectedWeatherCategories({
      weather_data_type: 'forecast',
      total_route_rain: 1,
      origin_weather_code: null,
      destination_weather_code: null,
    }).condition).toBeNull();
  });

  test('preserves unavailable historical values and adds a prediction only to the selected category', () => {
    const rows = buildAnalysisRows(
      [
        { category: 'Weekday', average_demand: 694.87 },
        { category: 'Weekend', average_demand: null },
      ],
      ['Weekday', 'Weekend'],
      'Weekday',
      725,
      900,
    );
    expect(rows.map(({ category, historical_average, selected_prediction, capacity }) => ({
      category, historical_average, selected_prediction, capacity,
    }))).toEqual([
      { category: 'Weekday', historical_average: 694.87, selected_prediction: 725, capacity: 900 },
      { category: 'Weekend', historical_average: null, selected_prediction: null, capacity: 900 },
    ]);
  });

  test('does not invent a weather category or prediction when rainfall cannot be established', () => {
    const selectedWeather = getSelectedWeatherCategories({
      weather_data_type: 'forecast',
      total_route_rain: null,
      origin_weather_code: 61,
      destination_weather_code: 80,
    });
    const rows = buildAnalysisRows(
      [{ category: 'Light rain', average_demand: 653.053 }],
      ['No rain', 'Light rain', 'Moderate rain', 'Heavy rain'],
      selectedWeather.rainfall,
      700,
      null,
    );
    expect(selectedWeather.rainfall).toBeNull();
    expect(rows.every((row) => row.selected_prediction === null)).toBe(true);
    expect(rows.every((row) => row.capacity === null)).toBe(true);
  });

  test('normalizes an exact historical weather-condition match and highlights only that row', () => {
    const rows = buildWeatherConditionRows([
      { category: 'Overcast', average_demand: 583.3636 },
      { category: 'Slight rain', average_demand: 592.2963 },
      { category: 'Heavy rain', average_demand: 802.5 },
    ], '  SLIGHT   RAIN ');
    expect(rows.filter((row) => row.is_selected_category)).toHaveLength(1);
    expect(rows.find((row) => row.is_selected_category)).toEqual({
      category: 'Slight rain',
      historical_average: 592.2963,
      sample_count: null,
      is_selected_category: true,
    });
    expect(formatMetric(rows.find((row) => row.is_selected_category).historical_average)).toBe('592');
    expect(rows.filter((row) => !row.is_selected_category).every((row) => row.historical_average !== null)).toBe(true);
  });

  test('adds an unmatched selected condition without inventing a historical average', () => {
    const rows = buildWeatherConditionRows([
      { category: 'Slight rain', average_demand: 592.2963 },
      { category: 'Heavy rain', average_demand: 802.5 },
    ], 'Slight rain showers');
    expect(rows).toHaveLength(3);
    expect(rows.filter((row) => row.is_selected_category)).toHaveLength(1);
    expect(rows[2]).toEqual({
      category: 'Slight rain showers',
      historical_average: null,
      sample_count: null,
      is_selected_category: true,
    });
    expect(rows[2].historical_average).toBeNull();
    expect(formatMetric(rows[2].historical_average)).toBe('N/A');
  });

  test('does not highlight any historical condition when selected weather cannot be determined', () => {
    const rows = buildWeatherConditionRows([
      { category: 'Slight rain', average_demand: 592.2963 },
    ], null);
    expect(rows).toHaveLength(1);
    expect(rows[0].is_selected_category).toBe(false);
  });
});
