import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { MonthData } from '../../lib/calculations'

const fmt = (v: number) => `$${v.toFixed(0)}`

interface Props {
  data: MonthData[]
  rentAmount?: number
  onBarClick?: (month: number, type: 'monthly' | 'on_demand') => void
}

export default function CashFlowChart({ data, rentAmount, onBarClick }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Soccer Practice at Ellis — Cash Flow</h2>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, '']} />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="monthlyTotal" name="Monthly Total" stackId="a" fill="#4472C4" radius={[0, 0, 0, 0]}
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
            onClick={(d) => d.monthlyTotal > 0 && onBarClick?.(d.month, 'monthly')}
          />
          <Bar
            dataKey="onDemandTotal" name="On Demand Total" stackId="a" fill="#ED7D31" radius={[0, 0, 0, 0]}
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
            onClick={(d) => d.onDemandTotal > 0 && onBarClick?.(d.month, 'on_demand')}
          />
          <Bar dataKey="adminContribution" name="Admin Contribution" stackId="a" fill="#70AD47" radius={[3, 3, 0, 0]} />
          {rentAmount != null && rentAmount > 0 && (
            <ReferenceLine
              y={rentAmount}
              stroke="#EF4444"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{ value: `Rent $${rentAmount.toFixed(0)}`, fill: '#EF4444', fontSize: 11, position: 'insideTopRight' }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
