import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { parseVenmoCSV } from '../../lib/parsers/venmo'
import type { StagingRow } from '../../lib/parsers/shared'
import type { PaymentInsert } from '../../lib/types'
import ReviewTable from './ReviewTable'

function expandRows(rows: StagingRow[]): PaymentInsert[] {
  const result: PaymentInsert[] = []
  for (const row of rows) {
    if (!row.included || row.type === 'unknown') continue
    for (let i = 0; i < row.count; i++) {
      const periodDate = new Date(row.period_start + 'T12:00:00Z')
      periodDate.setMonth(periodDate.getMonth() + i)
      const y = periodDate.getFullYear()
      const m = String(periodDate.getMonth() + 1).padStart(2, '0')
      const periodStart = `${y}-${m}-21`
      const baseId = row.split_suffix
        ? `${row.venmo_transaction_id}_${row.split_suffix}`
        : row.venmo_transaction_id
      const txKey = baseId ? `${baseId}::${i}` : undefined
      result.push({
        player_name: row.player_name,
        amount: row.unit_amount,
        type: row.type as 'monthly' | 'on_demand',
        period_start: row.type === 'monthly' ? periodStart : undefined,
        payment_date: row.payment_date,
        source: 'venmo',
        venmo_transaction_id: txKey,
        notes: row.note || undefined,
      })
    }
  }
  return result
}

export default function VenmoImport() {
  const [rows, setRows] = useState<StagingRow[]>([])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'reviewing' | 'done' | 'error'>('idle')
  const [stats, setStats] = useState<{ imported: number; skipped: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleFiles(files: FileList) {
    const allRows: StagingRow[] = []
    for (const file of Array.from(files)) {
      const text = await file.text()
      allRows.push(...parseVenmoCSV(text))
    }
    // Deduplicate by transaction ID in case monthly files overlap
    const seen = new Set<string>()
    const dedupedRows = allRows.filter(row => {
      const key = row.venmo_transaction_id ?? row.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    if (dedupedRows.length === 0) {
      setErrorMsg('No matching transactions found in the selected files.')
      setStatus('error')
      return
    }
    setRows(dedupedRows)
    setStatus('reviewing')
    setErrorMsg('')
  }

  async function handleConfirm() {
    setLoading(true)
    setErrorMsg('')
    const toInsert = expandRows(rows)

    if (toInsert.length === 0) {
      setStats({ imported: 0, skipped: rows.filter(r => r.included).length })
      setStatus('done')
      setLoading(false)
      return
    }

    const keys = toInsert.map(r => r.venmo_transaction_id).filter(Boolean) as string[]
    const { data: existing } = await supabase.from('payments').select('venmo_transaction_id').in('venmo_transaction_id', keys)
    const existingKeys = new Set((existing ?? []).map((r: { venmo_transaction_id: string }) => r.venmo_transaction_id))
    const newRows = toInsert.filter(r => !existingKeys.has(r.venmo_transaction_id ?? ''))

    let imported = 0
    if (newRows.length > 0) {
      const { error } = await supabase.from('payments').insert(newRows)
      if (error) { setErrorMsg(error.message); setStatus('error'); setLoading(false); return }
      imported = newRows.length
    }
    setStats({ imported, skipped: toInsert.length - imported })
    setStatus('done')
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {status === 'idle' || status === 'error' ? (
        <>
          <p className="text-sm text-gray-600">
            Upload a Venmo account statement CSV. Review and adjust classifications before importing.
          </p>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <span className="text-2xl mb-2">💸</span>
            <span className="text-sm font-medium text-gray-600">Click to select one or more CSV files</span>
            <span className="text-xs text-gray-400 mt-1">Venmo account statements (one per month)</span>
            <input type="file" accept=".csv" multiple className="hidden" onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }} />
          </label>
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        </>
      ) : status === 'reviewing' ? (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Review Venmo Transactions</h3>
            <button onClick={() => { setStatus('idle'); setRows([]) }} className="text-xs text-gray-400 hover:text-gray-600 underline">Cancel</button>
          </div>
          <ReviewTable rows={rows} onChange={setRows} onConfirm={handleConfirm} loading={loading} />
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Import complete — <strong>{stats?.imported} new records</strong> added, {stats?.skipped} duplicate(s) skipped.
          <button onClick={() => { setStatus('idle'); setRows([]); setStats(null) }} className="ml-3 underline text-green-700">Import another</button>
        </div>
      )}
    </div>
  )
}
