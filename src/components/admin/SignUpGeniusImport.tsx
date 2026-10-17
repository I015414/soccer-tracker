import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { parseSignUpGeniusCSV } from '../../lib/parsers/signupgenius'

interface SgRow {
  id: string
  included: boolean
  is_duplicate: boolean
  player_name: string
  player_email: string
  amount: number
  period_start: string
  payment_date: string
  signupgenius_key: string
}

function periodLabel(iso: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function dateLabel(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function addMonths(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setMonth(d.getMonth() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-21`
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function SignUpGeniusImport() {
  const [rows, setRows] = useState<SgRow[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'reviewing' | 'done' | 'error'>('idle')
  const [stats, setStats] = useState<{ imported: number; skipped: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastImported, setLastImported] = useState<Date | null>(null)

  useEffect(() => {
    supabase
      .from('payments')
      .select('created_at')
      .eq('source', 'signupgenius')
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setLastImported(new Date(data[0].created_at))
      })
  }, [])

  async function handleFile(file: File) {
    setStatus('loading')
    setErrorMsg('')
    setStats(null)

    const text = await file.text()
    let parsed
    try {
      parsed = parseSignUpGeniusCSV(text)
    } catch {
      setErrorMsg('Could not parse this file. Make sure it is a SignUpGenius CSV export.')
      setStatus('error')
      return
    }

    if (parsed.length === 0) {
      setErrorMsg('No paid rows found in this file.')
      setStatus('error')
      return
    }

    // Check which keys already exist in the DB
    const keys = parsed.map(r => r.signupgenius_key).filter(Boolean) as string[]
    const { data: existing } = await supabase
      .from('payments')
      .select('signupgenius_key')
      .in('signupgenius_key', keys)
    const existingKeys = new Set((existing ?? []).map((r: { signupgenius_key: string }) => r.signupgenius_key))

    const stagingRows: SgRow[] = parsed.map(r => ({
      id: crypto.randomUUID(),
      included: !existingKeys.has(r.signupgenius_key ?? ''),
      is_duplicate: existingKeys.has(r.signupgenius_key ?? ''),
      player_name: r.player_name,
      player_email: r.player_email ?? '',
      amount: Number(r.amount),
      period_start: r.period_start ?? '',
      payment_date: r.payment_date,
      signupgenius_key: r.signupgenius_key ?? '',
    }))

    setRows(stagingRows)
    setStatus('reviewing')
  }

  function update(id: string, patch: Partial<SgRow>) {
    setRows(rs => rs.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  async function handleConfirm() {
    setLoading(true)
    setErrorMsg('')

    const toInsert = rows
      .filter(r => r.included && !r.is_duplicate)
      .map(r => ({
        player_name: r.player_name,
        player_email: r.player_email || undefined,
        amount: r.amount,
        type: 'monthly' as const,
        period_start: r.period_start || undefined,
        payment_date: r.payment_date,
        source: 'signupgenius' as const,
        signupgenius_key: r.signupgenius_key || undefined,
      }))

    let imported = 0
    if (toInsert.length > 0) {
      const { error } = await supabase.from('payments').insert(toInsert)
      if (error) {
        setErrorMsg(error.message)
        setLoading(false)
        return
      }
      imported = toInsert.length
    }

    setStats({ imported, skipped: rows.length - imported })
    setStatus('done')
    setLastImported(new Date())
    setLoading(false)
  }

  const newCount = rows.filter(r => !r.is_duplicate).length
  const dupCount = rows.filter(r => r.is_duplicate).length
  const includedCount = rows.filter(r => r.included && !r.is_duplicate).length

  return (
    <div className="space-y-4">
      {(status === 'idle' || status === 'error') && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Upload a SignUpGenius CSV export. Review rows before importing.
            </p>
            {lastImported && (
              <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                Last import: {fmtDate(lastImported)}
              </span>
            )}
          </div>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <span className="text-2xl mb-2">📄</span>
            <span className="text-sm font-medium text-gray-600">Click to select a CSV file</span>
            <span className="text-xs text-gray-400 mt-1">SignUpGenius export format</span>
            <input type="file" accept=".csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          </label>
          {status === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}
        </>
      )}

      {status === 'loading' && (
        <p className="text-sm text-blue-600">Parsing file and checking duplicates…</p>
      )}

      {status === 'reviewing' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-3 text-xs">
              <span className="text-gray-600"><strong>{newCount}</strong> new</span>
              {dupCount > 0 && <span className="text-gray-400"><strong>{dupCount}</strong> already imported (shown for reference)</span>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Amounts shown net of $3.15 CC fee</span>
              {lastImported && (
                <span className="text-xs text-gray-400">Last import: {fmtDate(lastImported)}</span>
              )}
              <button onClick={() => { setStatus('idle'); setRows([]) }}
                className="text-xs text-gray-400 hover:text-gray-600 underline">Cancel</button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <tr>
                  <th className="px-3 py-2 text-left w-10">Include</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Player Name</th>
                  <th className="px-3 py-2 text-left w-40">Email</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Period</th>
                  <th className="px-3 py-2 text-left w-28">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(row => (
                  <tr key={row.id}
                    className={`${row.is_duplicate ? 'opacity-40 bg-gray-50' : row.included ? 'bg-white' : 'opacity-50 bg-white'}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox"
                        checked={row.included}
                        disabled={row.is_duplicate}
                        onChange={e => update(row.id, { included: e.target.checked })} />
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                      {dateLabel(row.payment_date)}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.player_name}
                        disabled={row.is_duplicate}
                        onChange={e => update(row.id, { player_name: e.target.value })}
                        className="w-40 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-transparent disabled:border-transparent"
                      />
                    </td>
                    <td className="px-3 py-2 w-40">
                      <span className="block max-w-[9rem] truncate text-xs text-gray-400" title={row.player_email}>
                        {row.player_email}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                      ${Number(row.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      {row.is_duplicate ? (
                        <span className="text-xs text-gray-400">{periodLabel(row.period_start)}</span>
                      ) : (
                        <div className="flex items-center gap-1 text-xs">
                          <button onClick={() => update(row.id, { period_start: addMonths(row.period_start, -1) })}
                            className="px-1 text-gray-400 hover:text-gray-700">‹</button>
                          <span className="w-20 text-center">{periodLabel(row.period_start)}</span>
                          <button onClick={() => update(row.id, { period_start: addMonths(row.period_start, 1) })}
                            className="px-1 text-gray-400 hover:text-gray-700">›</button>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {row.is_duplicate
                        ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Imported</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">New</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {errorMsg && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{errorMsg}</p>}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-gray-500">{includedCount} row{includedCount !== 1 ? 's' : ''} will be imported</p>
            <button onClick={handleConfirm} disabled={loading || includedCount === 0}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
              {loading ? 'Importing…' : 'Confirm Import'}
            </button>
          </div>
        </>
      )}

      {status === 'done' && stats && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          Import complete — <strong>{stats.imported} new records</strong> added, {stats.skipped} duplicate(s) skipped.
          <button onClick={() => { setStatus('idle'); setRows([]); setStats(null) }}
            className="ml-3 underline text-green-700">Import another</button>
        </div>
      )}
    </div>
  )
}
