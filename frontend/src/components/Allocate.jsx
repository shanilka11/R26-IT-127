import React, {useState} from 'react'
import axios from 'axios'
import { API_BASE } from '../services/api'

export default function Allocate(){
  const [result, setResult] = useState(null)

  const run = async ()=>{
    // demo payload: capacities and demand must be supplied by user in a real app
    const payload = {
      capacities: { 'A->B': 100, 'B->C': 80 },
      demand: { 'A->B': 120, 'B->C': 60 }
    }
    const res = await axios.post(`${API_BASE}/allocate-seats`, payload)
    setResult(res.data)
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="font-semibold mb-2">Seat Allocation</h2>
      <button onClick={run} className="px-3 py-1 bg-yellow-600 text-white rounded">Run Allocation (demo)</button>
      <pre className="mt-2">{JSON.stringify(result, null, 2)}</pre>
    </div>
  )
}
