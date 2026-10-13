import Papa from 'papaparse'
import type { PaymentInsert } from '../types'

interface SignUpGeniusRow {
  'Start Date/Time (mm/dd/yyyy)': string
  Qty: string
  Item: string
  'Item Comment': string
  'First Name': string
  'Last Name': string
  Email: string
  'Sign Up Comment': string
  'Sign Up Timestamp': string
  'Paid Status': string
  'Amount Paid': string
  'Offline Payment': string
}

function parseMDY(dateStr: string): string {
  const [m, d, y] = dateStr.trim().split('/')
  return `${y.padStart(4, '20')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const SIGNUPGENIUS_CC_FEE = 3.15

function parseMoney(str: string): number {
  return parseFloat((str || '0').replace(/[$,]/g, '').trim()) || 0
}

export function parseSignUpGeniusCSV(csvText: string): PaymentInsert[] {
  const result = Papa.parse<SignUpGeniusRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  return result.data
    .filter(row => {
      const firstName = row['First Name']?.trim()
      const paidStatus = row['Paid Status']?.trim().toLowerCase()
      if (!firstName) return false
      if (paidStatus !== 'paid') return false
      return true
    })
    .flatMap(row => {
      const firstName = row['First Name'].trim()
      const lastName = row['Last Name'].trim()
      const email = row['Email']?.trim() || ''

      const periodStart = parseMDY(row['Start Date/Time (mm/dd/yyyy)'])

      // Use period_start as payment_date so payments are attributed to the session
      // month they belong to, not when the player signed up (which can cross year boundaries)
      const paymentDate = `${periodStart}T00:00:00Z`

      // Use email-based key when available; fall back to name+period so rows without
      // email are not silently dropped
      const signupgeniusKey = email
        ? `${email}::${periodStart}`
        : `${firstName}_${lastName}::${periodStart}`

      // Credit card fee applies only to online payments (Amount Paid column).
      // Offline/cash payments recorded in SignUpGenius are not charged the CC fee.
      const onlineAmount = parseMoney(row['Amount Paid'])
      const offlineAmount = parseMoney(row['Offline Payment'])
      const gross = onlineAmount || offlineAmount
      const amount = onlineAmount > 0 ? gross - SIGNUPGENIUS_CC_FEE : gross

      return [{
        player_name: `${firstName} ${lastName}`,
        player_email: email || undefined,
        amount,
        type: 'monthly' as const,
        period_start: periodStart,
        payment_date: paymentDate,
        source: 'signupgenius' as const,
        signupgenius_key: signupgeniusKey,
      }]
    })
}
