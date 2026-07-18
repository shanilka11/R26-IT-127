import axios from "axios";

export const predictDelay = async (payload) => {
  const base = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";
  const res = await axios.post(`${base}/predict`, payload);
  return res.data;
};
