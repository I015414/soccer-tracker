import { useState } from 'react'
import { supabase } from '../../lib/supabase'

type Action = 'payments' | 'balances' | 'all'

interface ResetAction {
  id: Action
  label: string
  description: string
  tables: string[]
}

const ACTIONS: ResetAction[] = [
  {
    id: 'payments',
    label: 'Clear all payments',
    description: 'Deletes every imported payment record (SignUpGenius, Venmo, Zelle, Cash). Rent config and initial balances are kept.',
    tables: ['payments'],
  },
  {
    id: 'balances',
    label: 'Clear initial balances',
    description: 'Removes the carry-forward starting balances for all years. Payments and rent config are kept.',
    tables: ['initial_balance'],
  },
  {
    id: 'all',
    label: 'Clear everything',
    description: 'Deletes all payments and all initial balances. Rent config is kept.',
    tables: ['payments', 'initial_balance'],
  },
]

export default function ResetData() {
  const [confirming, setConfirming] = useState<Action | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState<Action | null>(null)
  const [error, setError] = useState('')

  async function executeReset(action: ResetAction) {
    setLoading(true)
    setError('')
    for (const table of action.tables) {
      const { error: err } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (err) {
        setError(`Failed to clear ${table}: ${err.message}`)
        setLoading(false)
        setConfirming(null)
        return
      }
    }
    setLoading(false)
    setConfirming(null)
    setDone(action.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <span className="text-red-500 mt-0.5">⚠</span>
        <p className="text-xs text-red-700">
          These actions are <strong>permanent and cannot be undone</strong>. Use only to correct import mistakes before sharing the dashboard.
        </p>
      </div>

      <div className="space-y-3">
        {ACTIONS.map(action => (
          <div key={action.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">{action.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
              </div>
              {confirming !== action.id ? (
                <button
                  onClick={() => { setDone(null); setError(''); setConfirming(action.id) }}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-medium transition-colors"
                >
                  Delete
                </button>
              ) : (
                <div className="shrink-0 flex gap-2">
                  <button
                    onClick={() => setConfirming(null)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeReset(action)}
                    disabled={loading}
                    className="text-xs px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Deleting…' : 'Yes, delete'}
                  </button>
                </div>
              )}
            </div>
            {confirming === action.id && (
              <p className="text-xs text-red-600 mt-2 font-medium">
                Are you sure? This will permanently delete the data listed above.
              </p>
            )}
            {done === action.id && (
              <p className="text-xs text-green-700 mt-2">✓ Done — data cleared successfully.</p>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>}
    </div>
  )
}
