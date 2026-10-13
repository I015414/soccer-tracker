import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { PlayerCountData } from '../../lib/calculations'

interface Props {
  data: PlayerCountData[]
  onBarClick?: (month: number, type: 'monthly' | 'on_demand') => void
}

export default function PlayersChart({ data, onBarClick }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
      <h2 className="text-sm font-semibold text-gray-700 mb-4"># Players per Type</h2>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip />
          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey="monthlyPlayers" name="Monthly" stackId="a" fill="#4472C4" radius={[0, 0, 0, 0]}
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
            onClick={(d) => d.monthlyPlayers > 0 && onBarClick?.(d.month, 'monthly')}
          />
          <Bar
            dataKey="onDemandPlayers" name="On Demand" stackId="a" fill="#ED7D31" radius={[3, 3, 0, 0]}
            style={{ cursor: onBarClick ? 'pointer' : undefined }}
            onClick={(d) => d.onDemandPlayers > 0 && onBarClick?.(d.month, 'on_demand')}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
