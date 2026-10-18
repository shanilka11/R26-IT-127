import { useEffect, useState } from 'react';
import axios from 'axios';

const useSriLankanHolidays = (apiBase, startDate, days = 1) => {
  const [holidayDates, setHolidayDates] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setHolidayDates({});
    setError('');

    if (!startDate) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    axios.get(`${apiBase}/public_holidays`, { params: { start_date: startDate, days } })
      .then((response) => {
        if (!response.data?.success || !Array.isArray(response.data.dates)) {
          throw new Error(response.data?.error || 'The public holiday calendar returned an invalid response.');
        }
        if (active) {
          setHolidayDates(Object.fromEntries(
            response.data.dates.map((item) => [item.date, Boolean(item.is_public_holiday)])
          ));
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.error || requestError.message || 'Public holiday lookup failed.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiBase, startDate, days]);

  return { holidayDates, loading, error };
};

export default useSriLankanHolidays;
