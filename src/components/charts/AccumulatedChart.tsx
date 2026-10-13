import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import type { AccumulatedData } from '../../lib/calculations'

const fmt = (v: number) => `$${v.toFixed(0)}`

export default function AccumulatedChart({ data, rentAmount }: { data: AccumulatedData[]; rentAmount?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">$ Accumulated</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmt} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
          <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Balance']} />
          <ReferenceLine y={0} stroke="#d1d5db" />
          {rentAmount != null && rentAmount > 0 && (
            <ReferenceLine
              y={rentAmount}
              stroke="#EF4444"
              strokeDasharray="6 3"
              strokeWidth={2}
              label={{ value: `Rent $${rentAmount.toFixed(0)}`, fill: '#EF4444', fontSize: 11, position: 'insideTopRight' }}
            />
          )}
          <Bar
            dataKey="accumulated" name="Balance" radius={[3, 3, 0, 0]}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.accumulated >= 0 ? '#4472C4' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
