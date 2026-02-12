"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users } from 'lucide-react'

interface PieChartStakeholderProps {
  data: {
    INVESTOR: number
    KOMUNITAS: number
    PEMERINTAH: number
    OTHER: number
  }
}

const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#6B7280']
const ROLE_LABELS: Record<string, string> = {
  INVESTOR: 'Investor',
  KOMUNITAS: 'Komunitas',
  PEMERINTAH: 'Pemerintah',
  OTHER: 'Lainnya'
}

export default function PieChartStakeholder({ data }: PieChartStakeholderProps) {
  // Transform data for Recharts
  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name: ROLE_LABELS[name] || name,
      value,
      color: COLORS[Object.keys(data).indexOf(name) % COLORS.length]
    }))

  // Calculate total for percentage display
  const total = chartData.reduce((sum, item) => sum + item.value, 0)

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-gray-600">
            {data.value} stakeholder ({percentage}%)
          </p>
        </div>
      )
    }
    return null
  }

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props
    return (
      <ul className="flex flex-wrap justify-center gap-3 mt-4">
        {payload.map((entry: any, index: number) => {
          const percentage = total > 0 ? ((entry.payload.value / total) * 100).toFixed(1) : 0
          return (
            <li key={`item-${index}`} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm">
                {entry.value} ({percentage}%)
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-600" />
          Stakeholder Distribution
        </CardTitle>
        <CardDescription>
          Breakdown by role with animated pie chart
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-[300px] min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  innerRadius={40}
                  fill="#8884d8"
                  dataKey="value"
                  animationBegin={200}
                  animationDuration={1500}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      strokeWidth={2}
                      stroke="#fff"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend content={renderLegend} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Summary stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="bg-green-50 p-2 rounded">
                <div className="text-green-700 font-medium">Investors</div>
                <div className="text-green-900 font-bold">{data.INVESTOR}</div>
              </div>
              <div className="bg-blue-50 p-2 rounded">
                <div className="text-blue-700 font-medium">Community</div>
                <div className="text-blue-900 font-bold">{data.KOMUNITAS}</div>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <div className="text-purple-700 font-medium">Government</div>
                <div className="text-purple-900 font-bold">{data.PEMERINTAH}</div>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <div className="text-gray-700 font-medium">Other</div>
                <div className="text-gray-900 font-bold">{data.OTHER}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <Users className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No stakeholder data available</p>
            <p className="text-sm text-gray-400 mt-1">Add stakeholders to see distribution</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}