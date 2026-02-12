"use client"

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, CheckCircle } from 'lucide-react'

interface GaugeChartTimelineProps {
  progress: number
  startDate?: string
  endDate?: string
}

export default function GaugeChartTimeline({ progress, startDate, endDate }: GaugeChartTimelineProps) {
  // Data for gauge chart (semi-circle)
  const gaugeData = [
    { value: progress, fill: getColorForProgress(progress) }
  ]

  // Get color based on progress
  function getColorForProgress(pct: number): string {
    if (pct >= 80) return '#10B981' // Green
    if (pct >= 50) return '#3B82F6' // Blue
    if (pct >= 30) return '#F59E0B' // Yellow
    return '#EF4444' // Red
  }

  // Get status text
  function getStatusText(pct: number): string {
    if (pct >= 80) return 'Ahead of Schedule'
    if (pct >= 50) return 'On Track'
    if (pct >= 30) return 'Slightly Behind'
    return 'Behind Schedule'
  }

  // Get status icon
  function getStatusIcon(pct: number) {
    if (pct >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />
    if (pct >= 50) return <Clock className="h-5 w-5 text-blue-600" />
    return <Clock className="h-5 w-5 text-yellow-600" />
  }

  // Calculate remaining time if we have dates
  function calculateTimeRemaining() {
    if (!startDate) return 'N/A'
    
    const start = new Date(startDate)
    const today = new Date()
    const end = endDate ? new Date(endDate) : new Date(start.getFullYear() + 10, start.getMonth(), start.getDate())
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const elapsedDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const remainingDays = totalDays - elapsedDays
    
    if (remainingDays <= 0) return 'Completed'
    if (remainingDays < 30) return `${remainingDays} days`
    if (remainingDays < 365) return `${Math.floor(remainingDays / 30)} months`
    return `${Math.floor(remainingDays / 365)} years`
  }

  // Custom label in center of gauge
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
          {progress}%
        </tspan>
        <tspan x="50%" y="55%" className="text-sm text-gray-500">
          Completed
        </tspan>
      </text>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-600" />
          Timeline Progress Gauge
        </CardTitle>
        <CardDescription>
          Project timeline visualization with animated gauge
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] min-h-[300px] min-w-0">
          <ResponsiveContainer width="100%" height="60%" minWidth={0} minHeight={180}>
            <RadialBarChart
              innerRadius="40%"
              outerRadius="90%"
              data={gaugeData}
              startAngle={180}
              endAngle={0}
              cx="50%"
              cy="100%"
            >
              <PolarAngleAxis
                type="number"
                domain={[0, 100]}
                angleAxisId={0}
                tick={false}
              />
              <RadialBar
                background={{ fill: '#f3f4f6' }}
                dataKey="value"
                cornerRadius={10}
                animationBegin={500}
                animationDuration={2000}
                animationEasing="ease-out"
              />
              {renderCenterLabel()}
            </RadialBarChart>
          </ResponsiveContainer>
          
          {/* Status and timeline info */}
          <div className="mt-6 space-y-4">
            {/* Status indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(progress)}
                <div>
                  <div className="font-medium text-sm">Timeline Status</div>
                  <div className="text-xs text-gray-500">{getStatusText(progress)}</div>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                progress >= 80 ? 'bg-green-100 text-green-800' :
                progress >= 50 ? 'bg-blue-100 text-blue-800' :
                progress >= 30 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {getStatusText(progress)}
              </div>
            </div>
            
            {/* Timeline dates */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Start Date:</span>
                <span className="font-medium">
                  {startDate 
                    ? new Date(startDate).toLocaleDateString('id-ID')
                    : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">End Date:</span>
                <span className="font-medium">
                  {endDate
                    ? new Date(endDate).toLocaleDateString('id-ID')
                    : 'Not set'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Time Remaining:</span>
                <span className="font-medium">{calculateTimeRemaining()}</span>
              </div>
            </div>
            
            {/* Progress breakdown */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span>Timeline Breakdown</span>
                <span>{progress}% elapsed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="h-2.5 rounded-full transition-all duration-1500 ease-out"
                  style={{ 
                    width: `${progress}%`,
                    backgroundColor: getColorForProgress(progress)
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <div className="text-xs text-gray-500">Start</div>
                <div className="text-xs text-gray-500">Today</div>
                <div className="text-xs text-gray-500">End</div>
              </div>
            </div>
            
            {/* Milestone indicators */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-cyan-50 rounded">
                <div className="text-xs text-cyan-700">Initial Phase</div>
                <div className="font-bold text-cyan-900">0-25%</div>
                <div className="text-xs text-cyan-700">
                  {progress <= 25 ? 'Active' : 'Completed'}
                </div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="text-xs text-blue-700">Mid Phase</div>
                <div className="font-bold text-blue-900">26-75%</div>
                <div className="text-xs text-blue-700">
                  {progress > 25 && progress <= 75 ? 'Active' : 
                   progress > 75 ? 'Completed' : 'Pending'}
                </div>
              </div>
              <div className="p-2 bg-green-50 rounded">
                <div className="text-xs text-green-700">Final Phase</div>
                <div className="font-bold text-green-900">76-100%</div>
                <div className="text-xs text-green-700">
                  {progress > 75 ? 'Active' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}