import Papa from 'papaparse'
import { classifyAmount, defaultPeriodStart, type StagingRow } from './shared'

interface VenmoRow {
  ID: string
  Datetime: string
  Type: string
  Status: string
  Note: string
  From: string
  To: string
  'Amount (total)': string
}

export function parseVenmoCSV(csvText: string): StagingRow[] {
  const lines = csvText.split('\n')
  const headerIdx = lines.findIndex(l => l.includes('Datetime') && l.includes('Type') && l.includes('Status'))
  if (headerIdx === -1) return []

  const dataCSV = lines.slice(headerIdx).join('\n')
  const result = Papa.parse<VenmoRow>(dataCSV, { header: true, skipEmptyLines: true })

  return result.data
    .filter(row => {
      const id = row['ID']?.trim()
      const type = row['Type']?.trim()
      const status = row['Status']?.trim()
      const amount = row['Amount (total)']?.trim()
      return id && /^\d+$/.test(id) && type === 'Payment' && status === 'Complete' && amount?.startsWith('+')
    })
    .map(row => {
      const amountStr = row['Amount (total)'].replace('+', '').replace(/[$,]/g, '').trim()
      const rawAmount = parseFloat(amountStr)
      const { type, count, unit_amount } = classifyAmount(rawAmount)
      const paymentDate = new Date(row['Datetime']).toISOString()

      return {
        id: crypto.randomUUID(),
        source: 'venmo' as const,
        venmo_transaction_id: row['ID'].trim(),
        player_name: row['From']?.trim() || '',
        raw_amount: rawAmount,
        note: row['Note']?.trim() || '',
        payment_date: paymentDate,
        included: true,
        type,
        count,
        unit_amount,
        period_start: defaultPeriodStart(paymentDate),
      }
    })
}
