import React, {useState} from 'react'
import axios from 'axios'
import { API_BASE } from '../services/api'

export default function Train(){
  const [type, setType] = useState('lstm')
  const [msg, setMsg] = useState('')

  const train = async ()=>{
    const res = await axios.post(`${API_BASE}/train-model?model_type=` + type)
    setMsg(JSON.stringify(res.data))
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="font-semibold mb-2">Train Model</h2>
      <select value={type} onChange={e=>setType(e.target.value)} className="border p-1">
        <option value="lstm">LSTM</option>
        <option value="gnn">GNN</option>
        <option value="baseline">Baseline</option>
      </select>
      <button onClick={train} className="ml-2 px-3 py-1 bg-green-600 text-white rounded">Train</button>
      <div className="mt-2 text-sm">{msg}</div>
    </div>
  )
}
