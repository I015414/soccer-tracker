import type { Payment, RentConfig, InitialBalance } from './types'

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export interface MonthData {
  month: number
  monthLabel: string
  monthlyTotal: number
  onDemandTotal: number
  adminContribution: number
  total: number
}

export interface AccumulatedData {
  month: number
  monthLabel: string
  accumulated: number
}

export interface PlayerCountData {
  month: number
  monthLabel: string
  monthlyPlayers: number
  onDemandPlayers: number
}

function effectiveDate(p: Payment): Date {
  return p.type === 'monthly' && p.period_start
    ? new Date(p.period_start + 'T12:00:00Z')
    : new Date(p.payment_date)
}

function paymentYear(p: Payment): number {
  return effectiveDate(p).getFullYear()
}

function paymentMonth(p: Payment): number {
  return effectiveDate(p).getMonth() + 1
}

export function getRentForMonth(rentConfigs: RentConfig[], year: number, month: number): number {
  const targetDate = new Date(year, month - 1, 21)
  const applicable = rentConfigs
    .filter(r => new Date(r.effective_from) <= targetDate)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
  return Number(applicable[0]?.monthly_amount ?? 0)
}

export function getAdminContributionForMonth(rentConfigs: RentConfig[], year: number, month: number): number {
  const targetDate = new Date(year, month - 1, 21)
  const applicable = rentConfigs
    .filter(r => new Date(r.effective_from) <= targetDate)
    .sort((a, b) => new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime())
  return Number(applicable[0]?.admin_contribution ?? 0)
}

export function getMonthlyBreakdown(payments: Payment[], rentConfigs: RentConfig[], year: number): MonthData[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const mp = payments.filter(p => paymentYear(p) === year && paymentMonth(p) === month)
    const monthlyTotal = mp.filter(p => p.type === 'monthly').reduce((s, p) => s + Number(p.amount), 0)
    const onDemandTotal = mp.filter(p => p.type === 'on_demand').reduce((s, p) => s + Number(p.amount), 0)
    const adminContribution = getAdminContributionForMonth(rentConfigs, year, month)
    return { month, monthLabel: MONTH_LABELS[i], monthlyTotal, onDemandTotal, adminContribution, total: monthlyTotal + onDemandTotal + adminContribution }
  })
}

export function getAccumulatedBalance(
  payments: Payment[],
  rentConfigs: RentConfig[],
  initialBalances: InitialBalance[],
  year: number
): AccumulatedData[] {
  const entry = initialBalances.find(b => Number(b.year) === year)
  const startBalance = entry ? Number(entry.amount) : 0
  let running = startBalance
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const collected = payments
      .filter(p => paymentYear(p) === year && paymentMonth(p) === month)
      .reduce((s, p) => s + Number(p.amount), 0)
    const adminContrib = getAdminContributionForMonth(rentConfigs, year, month)
    const rent = getRentForMonth(rentConfigs, year, month)
    running = running + collected + adminContrib - rent
    return { month, monthLabel: MONTH_LABELS[i], accumulated: running }
  })
}

export function getPlayerCountsByMonth(payments: Payment[], year: number): PlayerCountData[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1
    const mp = payments.filter(p => paymentYear(p) === year && paymentMonth(p) === month)
    const monthlyPlayers = new Set(mp.filter(p => p.type === 'monthly').map(p => p.player_name)).size
    const onDemandPlayers = new Set(mp.filter(p => p.type === 'on_demand').map(p => p.player_name)).size
    return { month, monthLabel: MONTH_LABELS[i], monthlyPlayers, onDemandPlayers }
  })
}

export function getSummary(payments: Payment[], rentConfigs: RentConfig[], year: number) {
  const yearPayments = payments.filter(p => paymentYear(p) === year)
  const totalCollected = yearPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalRent = Array.from({ length: 12 }, (_, i) => getRentForMonth(rentConfigs, year, i + 1))
    .reduce((s, r) => s + r, 0)
  const totalAdminContribution = Array.from({ length: 12 }, (_, i) => getAdminContributionForMonth(rentConfigs, year, i + 1))
    .reduce((s, v) => s + v, 0)
  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()
  const monthlyPlayerCount = year === currentYear
    ? new Set(yearPayments.filter(p => paymentMonth(p) === currentMonth && p.type === 'monthly').map(p => p.player_name)).size
    : new Set(yearPayments.filter(p => p.type === 'monthly').map(p => p.player_name)).size
  const onDemandPlayerCount = year === currentYear
    ? new Set(yearPayments.filter(p => paymentMonth(p) === currentMonth && p.type === 'on_demand').map(p => p.player_name)).size
    : new Set(yearPayments.filter(p => p.type === 'on_demand').map(p => p.player_name)).size
  return { totalCollected, totalRent, totalAdminContribution, monthlyPlayerCount, onDemandPlayerCount }
}
