"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function PemberdayaanSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>

      {/* Filter skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        
        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Statistics cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stats table skeleton */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <th key={i} className="text-left py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex} className="border-b">
                    {Array.from({ length: 5 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="py-3 px-4">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Main table skeleton */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="border-b">
              <div className="grid grid-cols-9 p-4 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
            
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div key={rowIndex} className="grid grid-cols-9 p-4 gap-4">
                  {Array.from({ length: 9 }).map((_, cellIndex) => (
                    <div key={cellIndex} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      {cellIndex === 0 && <Skeleton className="h-3 w-20" />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Pagination skeleton */}
          <div className="flex items-center justify-between mt-4 px-1">
            <Skeleton className="h-4 w-48" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-24" />
              <div className="flex items-center gap-1">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-8" />
                ))}
              </div>
              <Skeleton className="h-8 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}