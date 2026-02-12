"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, TrendingUp } from 'lucide-react'

interface ProgramData {
  id: string
  nama_program: string
  progress_percentage: number
  status: string
}

interface BarChartProgramsProps {
  programs: ProgramData[]
}

// Get color based on progress percentage
function getBarColor(percentage: number): string {
  if (percentage >= 80) return '#10B981' // Green
  if (percentage >= 50) return '#3B82F6' // Blue
  if (percentage >= 30) return '#F59E0B' // Yellow
  return '#EF4444' // Red
}

// Get status color
function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return '#10B981'
    case 'completed': return '#8B5CF6'
    case 'draft': return '#6B7280'
    case 'pending': return '#F59E0B'
    default: return '#6B7280'
  }
}

export default function BarChartPrograms({ programs }: BarChartProgramsProps) {
  // Filter out any null/undefined programs and transform data for chart
  const chartData = programs
    .filter(program => program != null)
    .map(program => ({
      name: (program.nama_program || 'Unnamed Program').length > 20 
        ? (program.nama_program || 'Unnamed Program').substring(0, 20) + '...' 
        : (program.nama_program || 'Unnamed Program'),
      fullName: program.nama_program || 'Unnamed Program',
      progress: program.progress_percentage || 0,
      status: program.status || 'draft',
      color: getBarColor(program.progress_percentage || 0)
    }))
    .sort((a, b) => b.progress - a.progress) // Sort by progress descending

  // Calculate average progress
  const averageProgress = programs.length > 0
    ? Math.round(programs.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / programs.length)
    : 0

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            Progress: <span className="font-medium">{data.progress}%</span>
          </p>
          <p className="text-sm text-gray-600">
            Status: <span className="font-medium capitalize">{data.status}</span>
          </p>
        </div>
      )
    }
    return null
  }

  // Custom XAxis tick
  const renderCustomTick = ({ x, y, payload }: any) => {
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="end"
          fill="#666"
          transform="rotate(-35)"
          fontSize={12}
        >
          {payload.value}
        </text>
      </g>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          Program Progress Comparison
        </CardTitle>
        <CardDescription>
          Horizontal bar chart showing progress across all programs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {programs.length > 0 ? (
          <div className="flex flex-col h-full">
            {/* Chart section with fixed height */}
            <div className="h-[280px] min-h-[280px] mb-4">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={renderCustomTick}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="progress"
                    name="Progress"
                    animationBegin={400}
                    animationDuration={1500}
                    animationEasing="ease-out"
                    radius={[0, 4, 4, 0]}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Summary stats - separate section with proper spacing */}
            <div className="space-y-4 pt-4 border-t">
              {/* Average progress */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <div>
                    <div className="font-medium text-sm">Average Progress</div>
                    <div className="text-xs text-gray-500">Across all programs</div>
                  </div>
                </div>
                <div className="text-2xl font-bold">{averageProgress}%</div>
              </div>
              
              {/* Progress distribution - responsive grid */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">Program Distribution by Progress</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-700 font-medium">0-29%</div>
                    <div className="text-lg sm:text-xl font-bold text-red-800">
                      {programs.filter(p => (p.progress_percentage || 0) < 30).length}
                    </div>
                    <div className="text-xs text-red-600 mt-1">Low</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-50 rounded-lg">
                    <div className="text-xs text-yellow-700 font-medium">30-49%</div>
                    <div className="text-lg sm:text-xl font-bold text-yellow-800">
                      {programs.filter(p => (p.progress_percentage || 0) >= 30 && (p.progress_percentage || 0) < 50).length}
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">Medium</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <div className="text-xs text-blue-700 font-medium">50-79%</div>
                    <div className="text-lg sm:text-xl font-bold text-blue-800">
                      {programs.filter(p => (p.progress_percentage || 0) >= 50 && (p.progress_percentage || 0) < 80).length}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">Good</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <div className="text-xs text-green-700 font-medium">80-100%</div>
                    <div className="text-lg sm:text-xl font-bold text-green-800">
                      {programs.filter(p => (p.progress_percentage || 0) >= 80).length}
                    </div>
                    <div className="text-xs text-green-600 mt-1">Excellent</div>
                  </div>
                </div>
              </div>
              
              {/* Status breakdown */}
              <div>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">Program Status</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(programs.map(p => p.status || 'draft'))).map(status => {
                    const count = programs.filter(p => (p.status || 'draft') === status).length
                    const percentage = Math.round((count / programs.length) * 100)
                    return (
                      <div
                        key={status}
                        className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"
                        style={{ 
                          backgroundColor: `${getStatusColor(status)}20`,
                          color: getStatusColor(status)
                        }}
                      >
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getStatusColor(status) }}
                        />
                        <span className="truncate max-w-[100px] sm:max-w-none">
                          {status.charAt(0).toUpperCase() + status.slice(1)}: {count} ({percentage}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <BarChart3 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No program data available</p>
            <p className="text-sm text-gray-400 mt-1">Create programs to track progress</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}