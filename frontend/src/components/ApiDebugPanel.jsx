import React from 'react'
import { isEmptyResponse } from '../utils/validation'

export default function ApiDebugPanel({
  title,
  timestamp,
  modelType,
  rawResponse,
  verificationStatus,
  onVerify,
  verifyLabel = 'Verify Data',
  loading = false
}) {
  const emptyResponse = isEmptyResponse(rawResponse)

  return (
    <div className="card p-4 space-y-3 border" style={{ borderColor: 'var(--line)' }}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-base font-semibold">{title}</h4>
          <p className="text-xs" style={{ color: 'var(--text-1)' }}>
            Model type: {modelType || 'unknown'} | Last fetch: {timestamp || 'Not fetched yet'}
          </p>
        </div>
        {typeof onVerify === 'function' ? (
          <button
            type="button"
            onClick={onVerify}
            disabled={loading}
            className="px-3 py-2 rounded-xl border text-sm"
            style={{
              borderColor: 'var(--line)',
              background: 'var(--bg-1)',
              color: 'var(--text-0)',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Verifying...' : verifyLabel}
          </button>
        ) : null}
      </div>

      {verificationStatus ? (
        <div
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{
            background: verificationStatus.ok ? 'rgba(20, 184, 166, 0.16)' : 'rgba(239, 68, 68, 0.12)',
            color: verificationStatus.ok ? 'var(--brand-2)' : 'var(--danger)'
          }}
        >
          {verificationStatus.message}
        </div>
      ) : null}

      <div>
        <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-1)' }}>
          Raw API Response
        </p>
        {emptyResponse ? (
          <div className="rounded-2xl p-3 text-sm" style={{ background: 'var(--bg-1)', color: 'var(--text-1)' }}>
            No data received from backend
          </div>
        ) : (
          <pre className="text-xs overflow-auto rounded-2xl p-3" style={{ background: 'var(--bg-1)', color: 'var(--text-0)' }}>
            {JSON.stringify(rawResponse, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}