import React, {useState} from 'react'
import axios from 'axios'
import { API_BASE } from '../services/api'

export default function Upload(){
  const [file, setFile] = useState(null)
  const [msg, setMsg] = useState('')

  const submit = async ()=>{
    if(!file) return setMsg('Select file')
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post(`${API_BASE}/upload-data`, fd, {headers: {'Content-Type':'multipart/form-data'}})
    setMsg('Uploaded: ' + JSON.stringify(res.data))
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="font-semibold mb-2">Upload Dataset</h2>
      <input type="file" onChange={e=>setFile(e.target.files[0])} />
      <button onClick={submit} className="ml-2 px-3 py-1 bg-blue-600 text-white rounded">Upload</button>
      <div className="mt-2 text-sm">{msg}</div>
    </div>
  )
}
