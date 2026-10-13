import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Payment, RentConfig, InitialBalance } from '../lib/types'
import {
  getMonthlyBreakdown, getAccumulatedBalance, getPlayerCountsByMonth, getSummary, getRentForMonth,
} from '../lib/calculations'
import CashFlowChart from './charts/CashFlowChart'
import AccumulatedChart from './charts/AccumulatedChart'
import PlayersChart from './charts/PlayersChart'

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

interface DrillSelection {
  month: number
  type: 'monthly' | 'on_demand' | 'all'
}

function DrillModal({ payments, year, selection, onClose }: {
  payments: Payment[]
  year: number
  selection: DrillSelection
  onClose: () => void
}) {
  const filtered = payments
    .filter(p => {
      const d = new Date(p.payment_date)
      return d.getFullYear() === year && d.getMonth() + 1 === selection.month
    })
    .filter(p => selection.type === 'all' || p.type === selection.type)
    .sort((a, b) => a.player_name.localeCompare(b.player_name))

  const typeLabel = selection.type === 'all' ? 'All Payments'
    : selection.type === 'monthly' ? 'Monthly Players'
    : 'On Demand Players'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            {typeLabel} — {MONTH_NAMES[selection.month - 1]} {year}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto max-h-80">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium uppercase tracking-wide">Name</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium uppercase tracking-wide">Date</th>
                <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(p => (
                <tr key={p.id} className="bg-white">
                  <td className="px-4 py-2 text-gray-800">{p.player_name}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      p.type === 'monthly' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {p.type === 'monthly' ? 'Monthly' : 'On Demand'}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-400 text-xs">No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>
    </div>
  )
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-semibold text-gray-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function Dashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [rentConfigs, setRentConfigs] = useState<RentConfig[]>([])
  const [initialBalances, setInitialBalances] = useState<InitialBalance[]>([])
  const [year, setYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [drill, setDrill] = useState<DrillSelection | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      setError('')
      const [p, r, b] = await Promise.all([
        supabase.from('payments').select('*').order('payment_date', { ascending: true }),
        supabase.from('rent_config').select('*').order('effective_from', { ascending: true }),
        supabase.from('initial_balance').select('*'),
      ])
      if (p.error || r.error || b.error) {
        setError('Failed to load data. Check your Supabase connection.')
      } else {
        setPayments(p.data as Payment[])
        setRentConfigs(r.data as RentConfig[])
        setInitialBalances(b.data as InitialBalance[])
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const availableYears = Array.from(
    new Set([
      new Date().getFullYear(),
      ...payments.map(p => new Date(p.payment_date).getFullYear()),
      ...initialBalances.map(b => Number(b.year)),
    ])
  ).sort((a, b) => b - a)

  const breakdown = getMonthlyBreakdown(payments, rentConfigs, year)
  const accumulated = getAccumulatedBalance(payments, rentConfigs, initialBalances, year)
  const playerCounts = getPlayerCountsByMonth(payments, year)
  const { totalCollected, totalRent, monthlyPlayerCount, onDemandPlayerCount } = getSummary(payments, rentConfigs, year)
  const rentAmount = getRentForMonth(rentConfigs, year, 1)

  const currentMonthAccum = accumulated[new Date().getMonth()]?.accumulated ?? 0

  const lastUpdated = payments.length > 0
    ? new Date(Math.max(...payments.map(p => new Date(p.created_at).getTime())))
    : null

  if (loading) return <div className="text-center py-20 text-gray-400">Loading dashboard…</div>
  if (error) return <div className="text-center py-20 text-red-500">{error}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-600 mt-0.5 bg-white/70 rounded px-1.5 py-0.5 inline-block">
              Last updated: {lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}{' '}
              at {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card label="Collected YTD" value={`$${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} sub={`${year}`} />
        <Card label="Rent YTD" value={`$${totalRent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} sub="12 months" />
        <Card label="Balance" value={`$${currentMonthAccum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} sub="as of this month" />
        <Card label="Monthly Players" value={String(monthlyPlayerCount)} sub="this month" />
        <Card label="On-Demand Players" value={String(onDemandPlayerCount)} sub="this month" />
      </div>

      <CashFlowChart
        data={breakdown}
        rentAmount={rentAmount}
        onBarClick={(month, type) => setDrill({ month, type })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AccumulatedChart data={accumulated} rentAmount={rentAmount} />
        <PlayersChart
          data={playerCounts}
          onBarClick={(month, type) => setDrill({ month, type })}
        />
      </div>

      {drill && (
        <DrillModal
          payments={payments}
          year={year}
          selection={drill}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  )
}
