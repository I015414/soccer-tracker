export interface Payment {
  id: string
  player_name: string
  player_email?: string
  amount: number
  type: 'monthly' | 'on_demand'
  period_start?: string
  payment_date: string
  source: 'signupgenius' | 'venmo' | 'zelle' | 'cash'
  signupgenius_key?: string
  venmo_transaction_id?: string
  zelle_key?: string
  notes?: string
  created_at: string
}

export interface RentConfig {
  id: string
  effective_from: string
  monthly_amount: number
  admin_contribution?: number   // nullable until ALTER TABLE is run
  created_at: string
}

export interface InitialBalance {
  id: string
  year: number
  amount: number
  notes?: string
  created_at: string
}

export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>
