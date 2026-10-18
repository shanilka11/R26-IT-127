const getApiErrorMessage = (error, operation) => {
  const response = error?.response;
  const responseData = response?.data;
  const backendMessage = responseData?.error || responseData?.message;

  if (response) {
    const status = response.status;
    if (backendMessage) return `${operation} failed (HTTP ${status}): ${backendMessage}`;
    if (status === 400) return `${operation} request is invalid (HTTP 400). Check the selected train and date.`;
    if (status >= 500) return `${operation} service failed (HTTP ${status}). Try again later.`;
    return `${operation} request failed (HTTP ${status}).`;
  }

  if (error?.request || error?.code === 'ERR_NETWORK' || error?.code === 'ECONNREFUSED') {
    return `Cannot connect to the ${operation.toLowerCase()} service. Check that the backend is running and reachable.`;
  }
  return error?.message || `${operation} failed unexpectedly.`;
};

export default getApiErrorMessage;
