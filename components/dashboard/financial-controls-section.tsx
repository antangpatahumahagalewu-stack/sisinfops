"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Workflow, Banknote } from "lucide-react"

const SpendingLimitsManager = dynamic(() => import('./spending-limits-manager').then(mod => mod.SpendingLimitsManager), { ssr: false })
const ApprovalWorkflowManager = dynamic(() => import('./approval-workflow-manager').then(mod => mod.ApprovalWorkflowManager), { ssr: false })
const BankAccountsWhitelist = dynamic(() => import('./bank-accounts-whitelist').then(mod => mod.BankAccountsWhitelist), { ssr: false })

export function FinancialControlsSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Financial Controls & Anti-Fraud System
        </h2>
        <p className="text-muted-foreground">
          Kelola sistem kontrol keuangan Phase 2 untuk mencegah fraud dan memastikan compliance
        </p>
      </div>

      {/* Control Cards Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              Spending Limits
            </CardTitle>
            <CardDescription>Batas pengeluaran berdasarkan role</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Atur batas transaksi harian, bulanan, dan per transaksi untuk setiap role keuangan
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Workflow className="h-4 w-4 text-purple-600" />
              Approval Workflows
            </CardTitle>
            <CardDescription>Alur persetujuan multi-level</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sistem four-eyes principle untuk transaksi besar dengan auto-approval dan escalation
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4 text-green-600" />
              Bank Account Whitelist
            </CardTitle>
            <CardDescription>Rekening bank terverifikasi</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Daftar rekening bank yang sudah diverifikasi untuk kebijakan cashless
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Controls */}
      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="spending" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Spending Limits
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Approval Workflows
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-2">
            <Banknote className="h-4 w-4" />
            Bank Accounts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="spending" className="space-y-4">
          <SpendingLimitsManager />
        </TabsContent>
        <TabsContent value="approval" className="space-y-4">
          <ApprovalWorkflowManager />
        </TabsContent>
        <TabsContent value="bank" className="space-y-4">
          <BankAccountsWhitelist />
        </TabsContent>
      </Tabs>

      {/* Information Section */}
      <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-12 w-12 text-amber-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Phase 2 Financial Controls - Selesai</h3>
              <p className="text-muted-foreground mt-2">
                Sistem kontrol keuangan Phase 2 telah diimplementasikan dengan fitur:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1 mt-2">
                <li>Spending limits berdasarkan role untuk mencegah overspending</li>
                <li>Approval workflows dengan four-eyes principle untuk transaksi besar</li>
                <li>Bank account whitelist untuk kebijakan cashless (transaksi &gt; 1 juta)</li>
                <li>Automatic policy enforcement dan audit logging</li>
                <li>Compliance dengan SAK dan prinsip anti-fraud</li>
              </ul>
              <div className="mt-4 p-3 bg-white/50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-amber-800">
                  ✅ <strong>Status:</strong> Phase 2 Controls telah siap digunakan. 
                  Sistem akan otomatis menegakkan kebijakan saat transaksi dibuat.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}