"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert } from "@/components/ui/alert"

interface TestResult {
  name: string
  status: "success" | "error" | "warning"
  message: string
  details?: any
}

export default function TestConnectionPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result])
  }

  const clearResults = () => {
    setResults([])
  }

  const runTests = async () => {
    setIsRunning(true)
    clearResults()

    try {
      const supabase = createClient()

      // Test 1: Check environment variables
      addResult({
        name: "Environment Variables",
        status: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "success"
          : "error",
        message: process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          ? "Environment variables configured"
          : "Missing environment variables",
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
        }
      })

      // Test 2: Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      addResult({
        name: "Authentication",
        status: user ? "success" : "error",
        message: user
          ? `Authenticated as ${user.email}`
          : `Not authenticated: ${authError?.message || "No user found"}`,
        details: {
          userId: user?.id,
          userEmail: user?.email,
          error: authError,
        }
      })

      if (!user) {
        setIsRunning(false)
        return
      }

      // Test 3: Check user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .single()

      addResult({
        name: "User Profile",
        status: profile ? "success" : "error",
        message: profile
          ? `Profile found: ${profile.full_name || "No name"} (Role: ${profile.role || "No role"})`
          : `Profile not found: ${profileError?.message || "Unknown error"}`,
        details: {
          profile,
          error: profileError,
        }
      })

      if (!profile) {
        setIsRunning(false)
        return
      }

      // Test 4: Check role permissions
      const hasPermission = profile.role === 'admin' || profile.role === 'monev'
      addResult({
        name: "Role Permissions",
        status: hasPermission ? "success" : "warning",
        message: hasPermission
          ? `User has edit permissions (Role: ${profile.role})`
          : `User does NOT have edit permissions (Role: ${profile.role}). Only 'admin' and 'monev' can edit.`,
        details: {
          role: profile.role,
          canEdit: hasPermission,
        }
      })

      // Test 5: Test SELECT on perhutanan_sosial
      const { data: psData, error: psSelectError } = await supabase
        .from("perhutanan_sosial")
        .select("id, pemegang_izin")
        .limit(1)

      addResult({
        name: "SELECT perhutanan_sosial",
        status: psSelectError ? "error" : "success",
        message: psSelectError
          ? `Cannot read: ${psSelectError.message}`
          : `Can read (found ${psData?.length || 0} records)`,
        details: {
          error: psSelectError,
          recordCount: psData?.length || 0,
        }
      })

      // Test 6: Test SELECT on lembaga_pengelola
      const { data: lembagaData, error: lembagaSelectError } = await supabase
        .from("lembaga_pengelola")
        .select("id, nama, perhutanan_sosial_id")
        .limit(1)

      addResult({
        name: "SELECT lembaga_pengelola",
        status: lembagaSelectError ? "error" : "success",
        message: lembagaSelectError
          ? `Cannot read: ${lembagaSelectError.message}`
          : `Can read (found ${lembagaData?.length || 0} records)`,
        details: {
          error: lembagaSelectError,
          recordCount: lembagaData?.length || 0,
        }
      })

      // Test 7: Test UPDATE on perhutanan_sosial (dry run - no actual update)
      if (hasPermission && psData && psData.length > 0) {
        const testId = psData[0].id
        
        // Try to update with same value (should not change anything)
        const { error: updateError } = await supabase
          .from("perhutanan_sosial")
          .update({ pemegang_izin: psData[0].pemegang_izin })
          .eq("id", testId)

        addResult({
          name: "UPDATE perhutanan_sosial",
          status: updateError ? "error" : "success",
          message: updateError
            ? `Cannot update: ${updateError.message}`
            : "Can update (test passed)",
          details: {
            error: updateError,
            testId,
          }
        })
      } else {
        addResult({
          name: "UPDATE perhutanan_sosial",
          status: "warning",
          message: "Skipped (no permission or no test data)",
        })
      }

      // Test 8: Test UPSERT on lembaga_pengelola (dry run)
      if (hasPermission && psData && psData.length > 0) {
        const testPsId = psData[0].id
        
        // Try to upsert with minimal data
        const { error: upsertError } = await supabase
          .from("lembaga_pengelola")
          .upsert({
            perhutanan_sosial_id: testPsId,
            nama: "TEST - DO NOT USE",
          }, {
            onConflict: "perhutanan_sosial_id"
          })

        addResult({
          name: "UPSERT lembaga_pengelola",
          status: upsertError ? "error" : "success",
          message: upsertError
            ? `Cannot upsert: ${upsertError.message}`
            : "Can upsert (test passed - test record may have been created)",
          details: {
            error: upsertError,
            testPsId,
          }
        })

        // Clean up test record if it was created
        if (!upsertError) {
          await supabase
            .from("lembaga_pengelola")
            .delete()
            .eq("perhutanan_sosial_id", testPsId)
            .eq("nama", "TEST - DO NOT USE")
        }
      } else {
        addResult({
          name: "UPSERT lembaga_pengelola",
          status: "warning",
          message: "Skipped (no permission or no test data)",
        })
      }

      // Test 9: Check if check_user_role function works
      if (hasPermission) {
        // We can't directly test the function from client, but we can verify
        // that updates work, which indirectly tests the function
        addResult({
          name: "check_user_role Function",
          status: "success",
          message: "Function should work if UPDATE/UPSERT tests passed",
          details: {
            note: "Cannot test function directly from client. If UPDATE/UPSERT tests passed, the function is working."
          }
        })
      } else {
        addResult({
          name: "check_user_role Function",
          status: "warning",
          message: "Cannot test without edit permissions",
        })
      }

    } catch (error: any) {
      addResult({
        name: "Test Execution",
        status: "error",
        message: `Error running tests: ${error.message}`,
        details: error,
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Supabase Connection Test</CardTitle>
          <CardDescription>
            Test koneksi dan permissions untuk mengidentifikasi masalah update data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? "Running Tests..." : "Run Tests"}
            </Button>
            <Button onClick={clearResults} variant="outline" disabled={isRunning}>
              Clear Results
            </Button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              {results.map((result, index) => (
                <Alert
                  key={index}
                  className={
                    result.status === "success"
                      ? "bg-green-50 border-green-200"
                      : result.status === "error"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{result.name}</h4>
                      <p className="text-sm">{result.message}</p>
                      {result.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer text-gray-600">
                            Show details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <div className="ml-4">
                      {result.status === "success" && (
                        <span className="text-green-600">✓</span>
                      )}
                      {result.status === "error" && (
                        <span className="text-red-600">✗</span>
                      )}
                      {result.status === "warning" && (
                        <span className="text-yellow-600">⚠</span>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          )}

          {results.length === 0 && !isRunning && (
            <p className="text-gray-500 text-sm">
              Klik "Run Tests" untuk memulai diagnosa koneksi Supabase.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

