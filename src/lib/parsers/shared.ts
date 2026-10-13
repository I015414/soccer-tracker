export type PaymentType = 'monthly' | 'on_demand' | 'unknown'

export interface StagingRow {
  id: string
  source: 'venmo' | 'zelle'
  venmo_transaction_id?: string
  zelle_key_base?: string
  player_name: string
  raw_amount: number
  note: string
  payment_date: string
  included: boolean
  type: PaymentType
  count: number
  unit_amount: number
  period_start: string
  is_split_child?: boolean
  // Split amount tracking
  split_group_id?: string       // shared UUID for all rows from the same original transaction
  split_original_amount?: number // original full transaction amount
  split_suffix?: string          // 'p' for parent, 'c1'/'c2'/... for children — used in dedup keys
}

export function classifyAmount(amount: number): { type: PaymentType; count: number; unit_amount: number } {
  if (amount <= 0) return { type: 'unknown', count: 1, unit_amount: amount }

  const is53 = amount % 53 === 0
  const is50 = amount % 50 === 0
  const is20 = amount % 20 === 0

  if (is53 && !is20) return { type: 'monthly', count: amount / 53, unit_amount: 53 }
  if (is50 && !is20) return { type: 'monthly', count: amount / 50, unit_amount: 50 }
  if (is20 && !is50 && !is53) return { type: 'on_demand', count: amount / 20, unit_amount: 20 }
  // Ambiguous (e.g. $100 = 2×$50 or 5×$20)
  return { type: 'unknown', count: 1, unit_amount: amount }
}

export function defaultPeriodStart(paymentDate: string): string {
  const d = new Date(paymentDate)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-21`
}
