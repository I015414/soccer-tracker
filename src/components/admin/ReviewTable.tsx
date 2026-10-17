import type { StagingRow, PaymentType } from '../../lib/parsers/shared'

interface Props {
  rows: StagingRow[]
  onChange: (rows: StagingRow[]) => void
  onConfirm: () => void
  loading: boolean
}

const TYPES: PaymentType[] = ['monthly', 'on_demand', 'unknown']

function dateLabel(iso: string) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

function periodLabel(iso: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function addMonths(isoDate: string, n: number): string {
  const d = new Date(isoDate + 'T12:00:00Z')
  d.setMonth(d.getMonth() + n)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-21`
}

export default function ReviewTable({ rows, onChange, onConfirm, loading }: Props) {
  function update(id: string, patch: Partial<StagingRow>) {
    onChange(rows.map(r => r.id === id ? { ...r, ...patch } : r))
  }

  function splitRow(row: StagingRow) {
    const groupId = row.split_group_id ?? crypto.randomUUID()
    const originalAmount = row.split_original_amount ?? row.raw_amount

    // Count existing children so we can assign deterministic suffix (c1, c2, ...)
    const childCount = rows.filter(r => r.split_group_id === groupId && r.is_split_child).length
    const childSuffix = `c${childCount + 1}`

    // Patch parent on first split: join the group, assign suffix 'p'
    const parentPatch: Partial<StagingRow> = !row.split_group_id
      ? { split_group_id: groupId, split_original_amount: originalAmount, split_suffix: 'p' }
      : {}

    const clone: StagingRow = {
      ...row,
      id: crypto.randomUUID(),
      is_split_child: true,
      split_group_id: groupId,
      split_original_amount: originalAmount,
      split_suffix: childSuffix,
      raw_amount: 0,
      unit_amount: 0,
      count: 1,
    }

    const next = rows.map(r => r.id === row.id ? { ...r, ...parentPatch } : r)
    const idx = next.findIndex(r => r.id === row.id)
    next.splice(idx + 1, 0, clone)
    onChange(next)
  }

  function removeRow(id: string) {
    onChange(rows.filter(r => r.id !== id))
  }

  function groupAllocated(groupId: string) {
    return rows.filter(r => r.split_group_id === groupId).reduce((s, r) => s + r.raw_amount, 0)
  }

  const hasUnknown = rows.some(r => r.included && r.type === 'unknown')
  const hasSplitImbalance = rows.some(r => {
    if (!r.split_group_id || !r.split_original_amount) return false
    const diff = Math.abs(groupAllocated(r.split_group_id) - r.split_original_amount)
    return diff > 0.01
  })
  const dupCount = rows.filter(r => r.is_duplicate).length

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-3 py-2 text-left">Include</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Player</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2 text-left w-32">Note</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-center">Count</th>
              <th className="px-3 py-2 text-right">Unit $</th>
              <th className="px-3 py-2 text-left">Start Period</th>
              <th className="px-3 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(row => {
              const isSplit = !!row.split_group_id
              const allocated = isSplit ? groupAllocated(row.split_group_id!) : 0
              const original = row.split_original_amount ?? 0
              const remaining = original - allocated
              const balanced = Math.abs(remaining) < 0.01

              return (
                <tr key={row.id} className={`${row.is_duplicate ? 'opacity-50 bg-gray-50' : !row.included ? 'opacity-40' : row.type === 'unknown' && row.included ? 'bg-amber-50' : isSplit ? 'bg-blue-50' : 'bg-white'}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={row.included && !row.is_duplicate} disabled={row.is_duplicate} onChange={e => update(row.id, { included: e.target.checked })} />
                  </td>
                  <td className="px-3 py-2">
                    {row.is_duplicate
                      ? <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Imported</span>
                      : <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">New</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{dateLabel(row.payment_date)}</td>
                  <td className="px-3 py-2">
                    <input
                      value={row.player_name}
                      onChange={e => update(row.id, { player_name: e.target.value })}
                      className="w-36 px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isSplit ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 text-xs">$</span>
                          <input
                            type="number" min={0} step={0.01}
                            value={row.raw_amount || ''}
                            placeholder="0.00"
                            onChange={e => {
                              const amt = parseFloat(e.target.value) || 0
                              update(row.id, { raw_amount: amt, unit_amount: row.count > 0 ? amt / row.count : amt })
                            }}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                        </div>
                        <span className={`text-xs ${balanced ? 'text-green-600' : 'text-amber-600'}`}>
                          {balanced ? `✓ of $${original.toFixed(2)}` : `$${remaining.toFixed(2)} left of $${original.toFixed(2)}`}
                        </span>
                      </div>
                    ) : (
                      <span className="font-mono text-gray-600">${row.raw_amount.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 w-32">
                    <span className="block max-w-[8rem] truncate text-gray-500 text-xs" title={row.note}>{row.note}</span>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={row.type}
                      onChange={e => update(row.id, { type: e.target.value as PaymentType })}
                      className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                    >
                      {TYPES.map(t => <option key={t} value={t}>{t === 'on_demand' ? 'On Demand' : t === 'monthly' ? 'Monthly' : '? Unknown'}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number" min={1} max={24}
                      value={row.count}
                      onChange={e => {
                        const count = Math.max(1, parseInt(e.target.value) || 1)
                        update(row.id, { count, unit_amount: row.raw_amount / count })
                      }}
                      className="w-14 px-2 py-1 border border-gray-200 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">${row.unit_amount.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    {row.type === 'monthly' ? (
                      <div className="flex items-center gap-1 text-xs">
                        <button onClick={() => update(row.id, { period_start: addMonths(row.period_start, -1) })} className="px-1 text-gray-400 hover:text-gray-700">‹</button>
                        <span className="w-20 text-center">{periodLabel(row.period_start)}</span>
                        <button onClick={() => update(row.id, { period_start: addMonths(row.period_start, 1) })} className="px-1 text-gray-400 hover:text-gray-700">›</button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button onClick={() => splitRow(row)} className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">Split</button>
                      {row.is_split_child && (
                        <button onClick={() => removeRow(row.id)} className="text-xs px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasUnknown && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Rows highlighted in yellow have an ambiguous amount. Please set the type and count before confirming.
        </p>
      )}
      {hasSplitImbalance && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Some split rows don't add up to the original transaction amount. Fill in all amounts before confirming.
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {rows.filter(r => r.included && !r.is_duplicate).length} of {rows.length} rows will be imported
          {dupCount > 0 && <span className="ml-2 text-gray-400">· {dupCount} already imported (shown for reference)</span>}
        </p>
        <button
          onClick={onConfirm}
          disabled={loading || hasUnknown || hasSplitImbalance}
          className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading ? 'Importing…' : 'Confirm Import'}
        </button>
      </div>
    </div>
  )
}
