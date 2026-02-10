import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, TreePine, DollarSign, Map, Target, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="sm" disabled className="mt-1">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Kembali
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                <Skeleton className="h-4 w-32" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-36 mb-2" />
              <Skeleton className="h-3 w-24" />
              <div className="mt-3">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          {["Overview", "Keuangan", "Karbon", "Dokumen", "Timeline"].map((tab, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>

        {/* Content Skeleton */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full mt-2" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48 mt-2" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info Skeleton */}
      <Card className="bg-blue-50/50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48 mb-2" />
              <Skeleton className="h-12 w-full" />
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}