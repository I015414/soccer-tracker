import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { RentConfig } from '../../lib/types'

interface EditState {
  effective_from: string
  monthly_amount: string
  admin_contribution: string
}

export default function RentConfigPanel() {
  const [configs, setConfigs] = useState<RentConfig[]>([])
  const [effectiveFrom, setEffectiveFrom] = useState('')
  const [amount, setAmount] = useState('')
  const [adminContrib, setAdminContrib] = useState('48.00')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ effective_from: '', monthly_amount: '', admin_contribution: '' })
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function fetchConfigs() {
    const { data } = await supabase.from('rent_config').select('*').order('effective_from', { ascending: false })
    setConfigs((data ?? []) as RentConfig[])
  }

  useEffect(() => { fetchConfigs() }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess(false)
    const { error: err } = await supabase.from('rent_config').insert({
      effective_from: effectiveFrom,
      monthly_amount: parseFloat(amount),
      admin_contribution: parseFloat(adminContrib),
    })
    if (err) { setError(err.message) } else { setSuccess(true); setEffectiveFrom(''); setAmount(''); setAdminContrib('48.00'); fetchConfigs() }
    setLoading(false)
  }

  function startEdit(c: RentConfig) {
    setEditId(c.id)
    setEditState({
      effective_from: c.effective_from,
      monthly_amount: Number(c.monthly_amount).toFixed(2),
      admin_contribution: Number(c.admin_contribution ?? 0).toFixed(2),
    })
    setEditError('')
  }

  function cancelEdit() {
    setEditId(null)
    setEditError('')
  }

  async function handleSaveEdit(id: string) {
    setEditLoading(true); setEditError('')
    const { error: err } = await supabase.from('rent_config').update({
      effective_from: editState.effective_from,
      monthly_amount: parseFloat(editState.monthly_amount),
      admin_contribution: parseFloat(editState.admin_contribution),
    }).eq('id', id)
    if (err) { setEditError(err.message) } else { setEditId(null); fetchConfigs() }
    setEditLoading(false)
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true); setDeleteError('')
    const { error: err } = await supabase.from('rent_config').delete().eq('id', id)
    if (err) { setDeleteError(err.message) } else { setDeleteId(null); setDeleteError(''); fetchConfigs() }
    setDeleteLoading(false)
  }

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-gray-600">
        The rent amount and admin contribution apply from the effective date onward. Add a new entry each time either changes.
      </p>

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-2 text-left">Effective From</th>
              <th className="px-4 py-2 text-right">Monthly Rent</th>
              <th className="px-4 py-2 text-right">Admin Contrib.</th>
              <th className="px-4 py-2 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {configs.map(c => (
              editId === c.id ? (
                <tr key={c.id} className="bg-blue-50">
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={editState.effective_from}
                      onChange={e => setEditState(s => ({ ...s, effective_from: e.target.value }))}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={editState.monthly_amount}
                      onChange={e => setEditState(s => ({ ...s, monthly_amount: e.target.value }))}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number" min="0" step="0.01"
                      value={editState.admin_contribution}
                      onChange={e => setEditState(s => ({ ...s, admin_contribution: e.target.value }))}
                      className="w-full px-2 py-1 border border-blue-300 rounded text-xs text-right font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleSaveEdit(c.id)}
                        disabled={editLoading}
                        className="px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                      >
                        {editLoading ? '…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs rounded border border-gray-300 hover:border-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    {editError && <p className="text-xs text-red-600 mt-1">{editError}</p>}
                  </td>
                </tr>
              ) : deleteId === c.id ? (
                <tr key={c.id} className="bg-red-50">
                  <td colSpan={3} className="px-4 py-2 text-sm text-red-700">
                    Delete this entry? This cannot be undone.
                    {deleteError && <span className="block text-xs text-red-600 mt-0.5">{deleteError}</span>}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deleteLoading}
                        className="px-2 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                      >
                        {deleteLoading ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => { setDeleteId(null); setDeleteError('') }}
                        className="px-2 py-1 text-gray-500 hover:text-gray-700 text-xs rounded border border-gray-300 hover:border-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} className="bg-white hover:bg-gray-50 group">
                  <td className="px-4 py-2 text-gray-700">
                    {new Date(c.effective_from + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-gray-800">${Number(c.monthly_amount).toFixed(2)}</td>
                  <td className="px-4 py-2 text-right font-mono text-gray-800">${Number(c.admin_contribution ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEdit(c)}
                        className="px-2 py-1 text-blue-500 hover:text-blue-700 text-xs rounded border border-blue-200 hover:border-blue-400 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="px-2 py-1 text-red-400 hover:text-red-600 text-xs rounded border border-red-200 hover:border-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {configs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-4 text-center text-gray-400 text-xs">No rent configuration yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleAdd} className="space-y-3 border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700">Add New Rate</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Effective From (21st)</label>
            <input
              type="date" required value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Monthly Rent ($)</label>
            <input
              type="number" required min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="1100.00"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Admin Contrib. ($)</label>
            <input
              type="number" required min="0" step="0.01" value={adminContrib} onChange={e => setAdminContrib(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="48.00"
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Rent rate added.</p>}
        <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          {loading ? 'Saving…' : 'Add Rate'}
        </button>
      </form>
    </div>
  )
}
