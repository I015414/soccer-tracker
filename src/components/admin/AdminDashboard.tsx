import { useEffect, useState, useMemo, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Payment, RentConfig, InitialBalance } from '../../lib/types'
import { getRentForMonth, getAdminContributionForMonth } from '../../lib/calculations'

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ColumnKey = 'monthlyPlayers' | 'onDemandPlayers' | 'signupgenius' | 'venmoZelleMonthly' | 'venmoZelleOnDemand' | 'cashMonthly' | 'cashOnDemand'

const COLUMN_LABELS: Record<ColumnKey, string> = {
  monthlyPlayers: 'Monthly Players',
  onDemandPlayers: 'On Demand',
  signupgenius: 'SignUpGenius',
  venmoZelleMonthly: 'Venmo/Zelle Monthly',
  venmoZelleOnDemand: 'Venmo/Zelle On Demand',
  cashMonthly: 'Cash Monthly',
  cashOnDemand: 'Cash On Demand',
}

interface Selection {
  year: number
  month: number
  col: ColumnKey
}

interface LedgerRow {
  year: number
  month: number
  monthlyPlayers: number
  onDemandPlayers: number
  signupgenius: number
  venmoZelleMonthly: number
  venmoZelleOnDemand: number
  cashMonthly: number
  cashOnDemand: number
  adminContrib: number
  rent: number
  total: number
  balance: number
  accumulated: number
  hasData: boolean
}

function effectiveYear(p: Payment): number {
  const d = p.type === 'monthly' && p.period_start
    ? new Date(p.period_start + 'T12:00:00Z')
    : new Date(p.payment_date)
  return d.getFullYear()
}

function effectiveMonth(p: Payment): number {
  const d = p.type === 'monthly' && p.period_start
    ? new Date(p.period_start + 'T12:00:00Z')
    : new Date(p.payment_date)
  return d.getMonth() + 1
}

function getPaymentsForCell(payments: Payment[], year: number, month: number, col: ColumnKey): Payment[] {
  const mp = payments.filter(p => effectiveYear(p) === year && effectiveMonth(p) === month)
  switch (col) {
    case 'monthlyPlayers':     return mp.filter(p => p.type === 'monthly')
    case 'onDemandPlayers':    return mp.filter(p => p.type === 'on_demand')
    case 'signupgenius':       return mp.filter(p => p.source === 'signupgenius')
    case 'venmoZelleMonthly':  return mp.filter(p => (p.source === 'venmo' || p.source === 'zelle') && p.type === 'monthly')
    case 'venmoZelleOnDemand': return mp.filter(p => (p.source === 'venmo' || p.source === 'zelle') && p.type === 'on_demand')
    case 'cashMonthly':        return mp.filter(p => p.source === 'cash' && p.type === 'monthly')
    case 'cashOnDemand':       return mp.filter(p => p.source === 'cash' && p.type === 'on_demand')
  }
}

function buildLedger(
  payments: Payment[],
  rentConfigs: RentConfig[],
  initialBalances: InitialBalance[],
  selectedYear: number | 'all'
): LedgerRow[] {
  const allYears = Array.from(new Set([
    ...payments.map(p => effectiveYear(p)),
    ...initialBalances.map(b => Number(b.year)),
    new Date().getFullYear(),
  ])).sort()

  const years = selectedYear === 'all' ? allYears : [selectedYear]
  const firstYear = Math.min(...years)
  const firstEntry = initialBalances.find(b => Number(b.year) === firstYear)
  let running = firstEntry ? Number(firstEntry.amount) : 0
  const rows: LedgerRow[] = []

  for (const y of years) {
    for (let m = 1; m <= 12; m++) {
      const mp = payments.filter(p => effectiveYear(p) === y && effectiveMonth(p) === m)
      const monthlyPlayers    = mp.filter(p => p.type === 'monthly').reduce((s, p) => s + Number(p.amount), 0)
      const onDemandPlayers   = mp.filter(p => p.type === 'on_demand').reduce((s, p) => s + Number(p.amount), 0)
      const signupgenius      = mp.filter(p => p.source === 'signupgenius').reduce((s, p) => s + Number(p.amount), 0)
      const venmoZelleMonthly = mp.filter(p => (p.source === 'venmo' || p.source === 'zelle') && p.type === 'monthly').reduce((s, p) => s + Number(p.amount), 0)
      const venmoZelleOnDemand = mp.filter(p => (p.source === 'venmo' || p.source === 'zelle') && p.type === 'on_demand').reduce((s, p) => s + Number(p.amount), 0)
      const cashMonthly       = mp.filter(p => p.source === 'cash' && p.type === 'monthly').reduce((s, p) => s + Number(p.amount), 0)
      const cashOnDemand      = mp.filter(p => p.source === 'cash' && p.type === 'on_demand').reduce((s, p) => s + Number(p.amount), 0)
      const adminContrib      = getAdminContributionForMonth(rentConfigs, y, m)
      const rent              = getRentForMonth(rentConfigs, y, m)
      const total             = monthlyPlayers + onDemandPlayers + adminContrib
      const balance           = total - rent
      running += balance
      rows.push({ year: y, month: m, monthlyPlayers, onDemandPlayers, signupgenius, venmoZelleMonthly, venmoZelleOnDemand, cashMonthly, cashOnDemand, adminContrib, rent, total, balance, accumulated: running, hasData: mp.length > 0 })
    }
  }
  return rows
}

function money(v: number) {
  if (v === 0) return <span className="text-gray-300">—</span>
  return <span className={v < 0 ? 'text-red-600 font-medium' : ''}>${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}
function balanceMoney(v: number) {
  const cls = v < 0 ? 'text-red-600 font-semibold' : v > 0 ? 'text-green-700 font-semibold' : 'text-gray-300'
  return <span className={cls}>{v === 0 ? '—' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
}
function accumMoney(v: number) {
  return <span className={v < 0 ? 'text-red-700 font-bold' : 'text-blue-700 font-bold'}>${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
}

function sourceLabel(source: string) {
  if (source === 'signupgenius') return 'SignUpGenius'
  if (source === 'venmo') return 'Venmo'
  if (source === 'zelle') return 'Zelle'
  if (source === 'cash') return 'Cash'
  return source
}

interface DetailModalProps {
  selection: Selection
  payments: Payment[]
  onClose: () => void
}

function DetailModal({ selection, payments, onClose }: DetailModalProps) {
  const entries = getPaymentsForCell(payments, selection.year, selection.month, selection.col)
    .sort((a, b) => a.player_name.localeCompare(b.player_name))
  const total = entries.reduce((s, p) => s + Number(p.amount), 0)
  const title = `${COLUMN_LABELS[selection.col]} — ${MONTH_LABELS[selection.month - 1]} ${selection.year}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        {entries.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 text-center">No entries for this cell.</p>
        ) : (
          <div className="overflow-y-auto max-h-80">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Name</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Period / Date</th>
                  <th className="px-4 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide">Source</th>
                  <th className="px-4 py-2 text-right text-gray-500 font-semibold uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800 font-medium">{p.player_name}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {p.type === 'monthly' && p.period_start
                        ? new Date(p.period_start + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
                      }
                    </td>
                    <td className="px-4 py-2 text-gray-400">{sourceLabel(p.source)}</td>
                    <td className="px-4 py-2 text-right font-mono text-gray-800">
                      ${Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer total */}
        {entries.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">{entries.length} entr{entries.length === 1 ? 'y' : 'ies'}</span>
            <span className="text-xs font-semibold text-gray-800">
              Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [rentConfigs, setRentConfigs] = useState<RentConfig[]>([])
  const [initialBalances, setInitialBalances] = useState<InitialBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | 'all'>(new Date().getFullYear())
  const [selection, setSelection] = useState<Selection | null>(null)

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      const [p, r, b] = await Promise.all([
        supabase.from('payments').select('*').order('payment_date', { ascending: true }),
        supabase.from('rent_config').select('*').order('effective_from', { ascending: true }),
        supabase.from('initial_balance').select('*'),
      ])
      if (p.error || r.error || b.error) { setError('Failed to load data.') }
      else {
        setPayments(p.data as Payment[])
        setRentConfigs(r.data as RentConfig[])
        setInitialBalances(b.data as InitialBalance[])
      }
      setLoading(false)
    }
    fetchAll()
  }, [])

  const availableYears = useMemo(() => Array.from(new Set([
    new Date().getFullYear(),
    ...payments.map(p => effectiveYear(p)),
    ...initialBalances.map(b => Number(b.year)),
  ])).sort((a, b) => b - a), [payments, initialBalances])

  const rows = useMemo(() =>
    buildLedger(payments, rentConfigs, initialBalances, selectedYear),
    [payments, rentConfigs, initialBalances, selectedYear]
  )

  const totals = useMemo(() => ({
    monthlyPlayers:    rows.reduce((s, r) => s + r.monthlyPlayers, 0),
    onDemandPlayers:   rows.reduce((s, r) => s + r.onDemandPlayers, 0),
    signupgenius:      rows.reduce((s, r) => s + r.signupgenius, 0),
    venmoZelleMonthly: rows.reduce((s, r) => s + r.venmoZelleMonthly, 0),
    venmoZelleOnDemand:rows.reduce((s, r) => s + r.venmoZelleOnDemand, 0),
    cashMonthly:       rows.reduce((s, r) => s + r.cashMonthly, 0),
    cashOnDemand:      rows.reduce((s, r) => s + r.cashOnDemand, 0),
    adminContrib:      rows.reduce((s, r) => s + r.adminContrib, 0),
    rent:              rows.reduce((s, r) => s + r.rent, 0),
    total:             rows.reduce((s, r) => s + r.total, 0),
    balance:           rows.reduce((s, r) => s + r.balance, 0),
    accumulated:       rows.at(-1)?.accumulated ?? 0,
  }), [rows])

  const handleCell = useCallback((year: number, month: number, col: ColumnKey, value: number) => {
    if (value === 0) return
    setSelection({ year, month, col })
  }, [])

  const showYear = selectedYear === 'all'

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Loading ledger…</div>
  if (error)   return <div className="py-10 text-center text-red-500 text-sm">{error}</div>

  function clickableTd(value: number, year: number, month: number, col: ColumnKey, extraClass = '') {
    const clickable = value !== 0
    return (
      <td
        className={`px-3 py-2 text-right ${extraClass} ${clickable ? 'cursor-pointer hover:bg-blue-100/60 hover:underline decoration-dotted' : ''}`}
        onClick={clickable ? () => handleCell(year, month, col, value) : undefined}
        title={clickable ? 'Click to see entries' : undefined}
      >
        {money(value)}
      </td>
    )
  }

  return (
    <div className="space-y-4">
      {selection && (
        <DetailModal
          selection={selection}
          payments={payments}
          onClose={() => setSelection(null)}
        />
      )}

      {/* Year selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500">Year:</span>
        <button onClick={() => setSelectedYear('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedYear === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          All
        </button>
        {availableYears.map(y => (
          <button key={y} onClick={() => setSelectedYear(y)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${selectedYear === y ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {y}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-400">
        <span><span className="text-green-700 font-semibold">+</span> positive balance</span>
        <span><span className="text-red-600 font-semibold">−</span> negative balance / deficit</span>
        <span><span className="text-blue-700 font-bold">$X</span> accumulated running total</span>
        <span>— = zero</span>
        <span className="text-blue-400">underlined cells are clickable</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="text-xs w-full min-w-[1000px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {showYear && <th className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">Year</th>}
              <th className="px-3 py-2.5 text-left text-gray-500 font-semibold uppercase tracking-wide">Month</th>
              <th className="px-3 py-2.5 text-right text-blue-600 font-semibold uppercase tracking-wide whitespace-nowrap border-l border-gray-200">Monthly Players</th>
              <th className="px-3 py-2.5 text-right text-orange-500 font-semibold uppercase tracking-wide whitespace-nowrap">On Demand</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap border-l border-gray-200">SignUpGenius</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">V/Z Monthly</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">V/Z On Dem.</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">Cash Monthly</th>
              <th className="px-3 py-2.5 text-right text-gray-500 font-semibold uppercase tracking-wide whitespace-nowrap">Cash On Dem.</th>
              <th className="px-3 py-2.5 text-right text-green-600 font-semibold uppercase tracking-wide whitespace-nowrap border-l border-gray-200">Admin</th>
              <th className="px-3 py-2.5 text-right text-red-400 font-semibold uppercase tracking-wide whitespace-nowrap">Rent</th>
              <th className="px-3 py-2.5 text-right text-gray-700 font-semibold uppercase tracking-wide whitespace-nowrap border-l border-gray-200">Total</th>
              <th className="px-3 py-2.5 text-right text-gray-700 font-semibold uppercase tracking-wide whitespace-nowrap">Balance</th>
              <th className="px-3 py-2.5 text-right text-blue-700 font-semibold uppercase tracking-wide whitespace-nowrap">Accumulated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, i) => {
              const isFuture = !row.hasData && (
                row.year > new Date().getFullYear() ||
                (row.year === new Date().getFullYear() && row.month > new Date().getMonth() + 1)
              )
              const isYearBoundary = i > 0 && rows[i - 1].year !== row.year
              return (
                <tr key={`${row.year}-${row.month}`}
                  className={`${isFuture ? 'opacity-30' : ''} ${isYearBoundary ? 'border-t-2 border-gray-300' : ''} transition-colors`}
                >
                  {showYear && (
                    <td className="px-3 py-2 text-gray-500 font-medium whitespace-nowrap">
                      {row.month === 1 || i === 0 ? row.year : ''}
                    </td>
                  )}
                  <td className="px-3 py-2 font-medium text-gray-700 whitespace-nowrap">{MONTH_LABELS[row.month - 1]}</td>
                  {clickableTd(row.monthlyPlayers,    row.year, row.month, 'monthlyPlayers',    'border-l border-gray-100')}
                  {clickableTd(row.onDemandPlayers,   row.year, row.month, 'onDemandPlayers')}
                  {clickableTd(row.signupgenius,      row.year, row.month, 'signupgenius',      'border-l border-gray-100')}
                  {clickableTd(row.venmoZelleMonthly, row.year, row.month, 'venmoZelleMonthly')}
                  {clickableTd(row.venmoZelleOnDemand,row.year, row.month, 'venmoZelleOnDemand')}
                  {clickableTd(row.cashMonthly,       row.year, row.month, 'cashMonthly')}
                  {clickableTd(row.cashOnDemand,      row.year, row.month, 'cashOnDemand')}
                  <td className="px-3 py-2 text-right text-green-600 border-l border-gray-100">{money(row.adminContrib)}</td>
                  <td className="px-3 py-2 text-right text-red-400">{money(row.rent)}</td>
                  <td className="px-3 py-2 text-right text-gray-800 font-medium border-l border-gray-100">{money(row.total)}</td>
                  <td className="px-3 py-2 text-right">{balanceMoney(row.balance)}</td>
                  <td className="px-3 py-2 text-right bg-blue-50/40">{isFuture ? <span className="text-gray-300">—</span> : accumMoney(row.accumulated)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
              {showYear && <td className="px-3 py-2.5 text-gray-600 text-xs uppercase tracking-wide" />}
              <td className="px-3 py-2.5 text-gray-600 text-xs uppercase tracking-wide">Total</td>
              <td className="px-3 py-2.5 text-right border-l border-gray-200">{money(totals.monthlyPlayers)}</td>
              <td className="px-3 py-2.5 text-right">{money(totals.onDemandPlayers)}</td>
              <td className="px-3 py-2.5 text-right border-l border-gray-200">{money(totals.signupgenius)}</td>
              <td className="px-3 py-2.5 text-right">{money(totals.venmoZelleMonthly)}</td>
              <td className="px-3 py-2.5 text-right">{money(totals.venmoZelleOnDemand)}</td>
              <td className="px-3 py-2.5 text-right">{money(totals.cashMonthly)}</td>
              <td className="px-3 py-2.5 text-right">{money(totals.cashOnDemand)}</td>
              <td className="px-3 py-2.5 text-right text-green-600 border-l border-gray-200">{money(totals.adminContrib)}</td>
              <td className="px-3 py-2.5 text-right text-red-400">{money(totals.rent)}</td>
              <td className="px-3 py-2.5 text-right text-gray-800 border-l border-gray-200">{money(totals.total)}</td>
              <td className="px-3 py-2.5 text-right">{balanceMoney(totals.balance)}</td>
              <td className="px-3 py-2.5 text-right bg-blue-50/40">{accumMoney(totals.accumulated)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Balance = Total − Rent (monthly net). Accumulated = running total including initial balance.
        Future months shown at reduced opacity.
      </p>
    </div>
  )
}
