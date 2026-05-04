import React, {useState} from 'react'
import axios from 'axios'
import { API_BASE } from '../services/api'

export default function Predict(){
  const [type, setType] = useState('lstm')
  const [pred, setPred] = useState(null)
  const [error, setError] = useState('')
  const backendType = type === 'baseline' ? 'arima' : type

  const get = async ()=>{
    setError('')
    try {
      const res = await axios.get(`${API_BASE}/predict-demand?model_type=` + backendType + '&periods=7')
      console.log('API RESPONSE:', res.data)
      setPred(res.data)
    } catch (e) {
      setError(e?.message || 'Failed to fetch prediction')
      setPred(null)
    }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="font-semibold mb-2">Predict Demand</h2>
      <select value={type} onChange={e=>setType(e.target.value)} className="border p-1">
        <option value="lstm">LSTM</option>
        <option value="gnn">GNN</option>
        <option value="baseline">Baseline</option>
      </select>
      <button onClick={get} className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded">Predict</button>
      {error ? <div className="mt-2 text-sm text-red-600">{error}</div> : null}
      <pre className="mt-2 text-sm">{JSON.stringify(pred, null, 2)}</pre>
    </div>
  )
}
