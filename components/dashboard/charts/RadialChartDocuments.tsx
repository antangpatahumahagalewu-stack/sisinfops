"use client"

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface RadialChartDocumentsProps {
  verified: number
  total: number
  percentage: number
}

export default function RadialChartDocuments({ verified, total, percentage }: RadialChartDocumentsProps) {
  // Data for radial chart
  const chartData = [
    { name: 'Completed', value: percentage, fill: getColorForPercentage(percentage) }
  ]

  // Get color based on percentage
  function getColorForPercentage(pct: number): string {
    if (pct >= 80) return '#10B981' // Green
    if (pct >= 50) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  // Get status icon
  function getStatusIcon(pct: number) {
    if (pct >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (pct >= 50) return <Clock className="h-5 w-5 text-yellow-600" />
    return <AlertCircle className="h-5 w-5 text-red-600" />
  }

  // Get status text
  function getStatusText(pct: number) {
    if (pct >= 80) return 'Excellent'
    if (pct >= 50) return 'Needs Attention'
    return 'Critical'
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium">Documents Compliance</p>
          <p className="text-sm text-gray-600">
            {verified} of {total} documents verified
          </p>
          <p className="text-sm font-medium mt-1">
            {percentage}% completion rate
          </p>
        </div>
      )
    }
    return null
  }

  // Custom label in center of radial chart
  const renderCenterLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-current"
      >
        <tspan x="50%" y="45%" className="text-3xl font-bold">
          {percentage}%
        </tspan>
        <tspan x="50%" y="55%" className="text-sm text-gray-500">
          Complete
        </tspan>
      </text>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <FileCheck className="h-4 w-4 text-emerald-600" />
          Documents Compliance
        </CardTitle>
        <CardDescription>
          Legal documents verification status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <div className="h-[300px] min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={300}>
              <RadialBarChart
                innerRadius="40%"
                outerRadius="90%"
                data={chartData}
                startAngle={180}
                endAngle={0}
                cx="50%"
                cy="50%"
              >
                <PolarAngleAxis
                  type="number"
                  domain={[0, 100]}
                  angleAxisId={0}
                  tick={false}
                />
                <RadialBar
                  background
                  dataKey="value"
                  cornerRadius={10}
                  animationBegin={300}
                  animationDuration={2000}
                  animationEasing="ease-out"
                />
                <Tooltip content={<CustomTooltip />} />
                {renderCenterLabel()}
              </RadialBarChart>
            </ResponsiveContainer>
            
            {/* Status indicators */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(percentage)}
                  <div>
                    <div className="font-medium text-sm">Status</div>
                    <div className="text-xs text-gray-500">{getStatusText(percentage)}</div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  percentage >= 80 ? 'bg-green-100 text-green-800' :
                  percentage >= 50 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {getStatusText(percentage)}
                </div>
              </div>
              
              {/* Document counts */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <div className="text-xs text-emerald-700">Verified</div>
                  <div className="text-2xl font-bold text-emerald-900">{verified}</div>
                  <div className="text-xs text-emerald-700 mt-1">
                    {total > 0 ? Math.round((verified / total) * 100) : 0}% of total
                  </div>
                </div>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="text-xs text-gray-700">Pending</div>
                  <div className="text-2xl font-bold text-gray-900">{total - verified}</div>
                  <div className="text-xs text-gray-700 mt-1">
                    {total > 0 ? Math.round(((total - verified) / total) * 100) : 0}% of total
                  </div>
                </div>
              </div>
              
              {/* Progress indicator */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Verification Progress</span>
                  <span>{percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-1000 ease-out"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: getColorForPercentage(percentage)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-center">
            <FileCheck className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">No documents data available</p>
            <p className="text-sm text-gray-400 mt-1">Upload legal documents to track compliance</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}