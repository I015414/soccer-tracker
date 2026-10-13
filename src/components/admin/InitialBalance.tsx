import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { InitialBalance } from '../../lib/types'

export default function InitialBalancePanel() {
  const [balances, setBalances] = useState<InitialBalance[]>([])
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function fetchBalances() {
    const { data } = await supabase.from('initial_balance').select('*').order('year', { ascending: false })
    setBalances((data ?? []) as InitialBalance[])
  }

  useEffect(() => { fetchBalances() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess(false)

    const existing = balances.find(b => b.year === parseInt(year))
    const payload = { year: parseInt(year), amount: parseFloat(amount), notes: notes.trim() || null }

    const { error: err } = existing
      ? await supabase.from('initial_balance').update(payload).eq('id', existing.id)
      : await supabase.from('initial_balance').insert(payload)

    if (err) { setError(err.message) } else { setSuccess(true); setAmount(''); setNotes(''); fetchBalances() }
    setLoading(false)
  }

  return (
    <div className="max-w-lg space-y-6">
      <p className="text-sm text-gray-600">
        Set the carry-forward balance from the prior year. This becomes the starting point for the Accumulated chart.
      </p>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Year</th>
              <th className="px-4 py-2 text-right">Starting Balance</th>
              <th className="px-4 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {balances.map(b => (
              <tr key={b.id} className="bg-white">
                <td className="px-4 py-2 text-gray-700 font-medium">{b.year}</td>
                <td className="px-4 py-2 text-right font-mono text-gray-800">${b.amount.toFixed(2)}</td>
                <td className="px-4 py-2 text-gray-500 text-xs">{b.notes ?? '—'}</td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-4 text-center text-gray-400 text-xs">No initial balances set</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700">Set / Update Balance</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
            <input
              type="number" required min="2020" max="2100" value={year} onChange={e => setYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Balance ($)</label>
            <input
              type="number" required step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
          <input
            value={notes} onChange={e => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Carry-forward from 2025"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Balance saved.</p>}
        <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Saving…' : 'Save Balance'}
        </button>
      </form>
    </div>
  )
}
