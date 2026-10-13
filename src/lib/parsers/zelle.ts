import Papa from 'papaparse'
import { classifyAmount, defaultPeriodStart, type StagingRow } from './shared'

interface BankRow {
  'Transaction Type': string
  Date: string
  'Account Type': string
  Description: string
  Amount: string
  'Reference No.': string
  Credits: string
  Debits: string
}

function extractZelleName(description: string): string {
  const match = description.match(/^Zelle\s+(.+?)\s+\d{7,12}\s*/i)
  if (match) return match[1].trim()
  return description.replace(/^Zelle\s+/i, '').replace(/\s+\d{7,12}.*/i, '').trim()
}

function parseBankDate(dateStr: string): Date {
  const parts = dateStr.trim().split('/')
  if (parts.length === 3) {
    let year = parseInt(parts[2], 10)
    if (year < 100) year += 2000
    return new Date(year, parseInt(parts[0], 10) - 1, parseInt(parts[1], 10))
  }
  return new Date(dateStr)
}

function parseCredits(val: string): number {
  return parseFloat((val || '0').replace(/[$,]/g, '').trim()) || 0
}

export function parseBankCSV(csvText: string): StagingRow[] {
  const result = Papa.parse<BankRow>(csvText, { header: true, skipEmptyLines: true })

  return result.data
    .filter(row => {
      const desc = row['Description']?.trim() || ''
      const credits = parseCredits(row['Credits'])
      return desc.toLowerCase().startsWith('zelle') && credits > 0
    })
    .map(row => {
      const desc = row['Description'].trim()
      const rawAmount = parseCredits(row['Credits'])
      const playerName = extractZelleName(desc)
      const { type, count, unit_amount } = classifyAmount(rawAmount)
      const paymentDate = parseBankDate(row['Date']).toISOString()

      const dateCompact = paymentDate.slice(0, 10).replace(/-/g, '')
      const zelleKeyBase = `${dateCompact}::${desc}::${rawAmount}`

      return {
        id: crypto.randomUUID(),
        source: 'zelle' as const,
        zelle_key_base: zelleKeyBase,
        player_name: playerName,
        raw_amount: rawAmount,
        note: desc,
        payment_date: paymentDate,
        included: true,
        type,
        count,
        unit_amount,
        period_start: defaultPeriodStart(paymentDate),
      }
    })
}
