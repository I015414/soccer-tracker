import { useState } from 'react'
import { supabase } from '../../lib/supabase'

interface PendingEntry {
  id: string
  player_name: string
  amount: string
  type: 'monthly' | 'on_demand'
  payment_date: string
  period_start: string
  notes: string
}

function defaultPeriodStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-21`
}

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function CashEntry() {
  const [playerName, setPlayerName] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'monthly' | 'on_demand'>('monthly')
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart)
  const [paymentDate, setPaymentDate] = useState(today)
  const [notes, setNotes] = useState('')

  const [pending, setPending] = useState<PendingEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function addToList(e: React.FormEvent) {
    e.preventDefault()
    if (!playerName.trim() || !amount) return
    setPending(p => [...p, {
      id: crypto.randomUUID(),
      player_name: playerName.trim(),
      amount,
      type,
      payment_date: paymentDate,
      period_start: periodStart,
      notes,
    }])
    setPlayerName('')
    setAmount('')
    setNotes('')
    setDone(false)
  }

  function updateEntry(id: string, patch: Partial<PendingEntry>) {
    setPending(p => p.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function removeEntry(id: string) {
    setPending(p => p.filter(e => e.id !== id))
  }

  async function confirmAll() {
    if (pending.length === 0) return
    setLoading(true)
    setError('')
    const count = pending.length
    const records = pending.map(e => ({
      player_name: e.player_name,
      amount: parseFloat(e.amount),
      type: e.type,
      period_start: e.type === 'monthly' ? e.period_start : null,
      payment_date: new Date(e.payment_date).toISOString(),
      source: 'cash' as const,
      notes: e.notes.trim() || null,
    }))
    const { error: err } = await supabase.from('payments').insert(records)
    if (err) {
      setError(err.message)
    } else {
      setSavedCount(count)
      setPending([])
      setDone(true)
    }
    setLoading(false)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const smallInputCls = 'w-full px-2 py-1 border border-gray-200 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-400'

  return (
    <div className="flex gap-6 min-h-[360px]">

      {/* ── Left: entry form ── */}
      <div className="w-72 shrink-0">
        <p className="text-sm text-gray-600 mb-4">Fill in the details and click <strong>Add to List</strong>.</p>
        <form onSubmit={addToList} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Player Name</label>
            <input required value={playerName} onChange={e => setPlayerName(e.target.value)}
              className={inputCls} placeholder="First Last" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" required min="0.01" step="0.01"
                value={amount} onChange={e => setAmount(e.target.value)}
                className={inputCls} placeholder="53.00" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value as 'monthly' | 'on_demand')} className={inputCls}>
                <option value="monthly">Monthly</option>
                <option value="on_demand">On Demand</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Payment Date</label>
            <input type="date" required value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className={inputCls} />
          </div>

          {type === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Period (21st)</label>
              <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className={inputCls} />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className={inputCls} placeholder="Any details…" />
          </div>

          <button type="submit"
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            + Add to List
          </button>
        </form>
      </div>

      {/* ── Divider ── */}
      <div className="w-px bg-gray-200 self-stretch" />

      {/* ── Right: pending list ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Pending entries {pending.length > 0 && <span className="text-blue-600">({pending.length})</span>}
          </p>
          {pending.length > 0 && (
            <p className="text-xs text-gray-400">All fields are editable before you confirm</p>
          )}
        </div>

        {pending.length === 0 && !done ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl py-16">
            No entries yet — add some from the form
          </div>
        ) : (
          <>
            <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
              {pending.map((entry, idx) => (
                <div key={entry.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400 w-5 shrink-0">#{idx + 1}</span>
                    <input
                      value={entry.player_name}
                      onChange={e => updateEntry(entry.id, { player_name: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                      placeholder="Player Name"
                    />
                    <button onClick={() => removeEntry(entry.id)}
                      className="text-red-400 hover:text-red-600 px-1 text-sm font-bold" title="Remove">✕</button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 ml-7">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Amount ($)</label>
                      <input type="number" min="0.01" step="0.01"
                        value={entry.amount} onChange={e => updateEntry(entry.id, { amount: e.target.value })}
                        className={smallInputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Type</label>
                      <select value={entry.type}
                        onChange={e => updateEntry(entry.id, { type: e.target.value as 'monthly' | 'on_demand' })}
                        className={smallInputCls}>
                        <option value="monthly">Monthly</option>
                        <option value="on_demand">On Demand</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">Date</label>
                      <input type="date" value={entry.payment_date}
                        onChange={e => updateEntry(entry.id, { payment_date: e.target.value })}
                        className={smallInputCls} />
                    </div>
                    {entry.type === 'monthly' && (
                      <div>
                        <label className="block text-xs text-gray-500 mb-0.5">Period (21st)</label>
                        <input type="date" value={entry.period_start}
                          onChange={e => updateEntry(entry.id, { period_start: e.target.value })}
                          className={smallInputCls} />
                      </div>
                    )}
                    <div className={entry.type === 'monthly' ? 'col-span-2' : 'col-span-3'}>
                      <label className="block text-xs text-gray-500 mb-0.5">Notes</label>
                      <input value={entry.notes}
                        onChange={e => updateEntry(entry.id, { notes: e.target.value })}
                        className={smallInputCls} placeholder="optional" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            {pending.length > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Total: <span className="font-mono font-medium">${pending.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toFixed(2)}</span>
                </p>
                <button onClick={confirmAll} disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                  {loading ? 'Saving…' : `Confirm All (${pending.length})`}
                </button>
              </div>
            )}
          </>
        )}

        {done && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            ✓ {savedCount} payment{savedCount !== 1 ? 's' : ''} saved successfully.
          </p>
        )}
      </div>
    </div>
  )
}
