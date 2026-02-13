"use client"

import { ProgramApprovalManager } from "@/components/dashboard/program-approval-manager"
import { createClient } from "@/lib/supabase/client"
import { redirect } from "next/navigation"
import { hasPermission } from "@/lib/auth/rbac"

export default function ProgramReviewPage() {
  // Since this is a client component, we'll do auth check in a useEffect
  // But we can also wrap with a parent server component
  return (
    <div className="container mx-auto p-4 md:p-6">
      <ProgramApprovalManager />
    </div>
  )
}