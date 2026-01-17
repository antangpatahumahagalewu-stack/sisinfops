import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertTriangle, FileText, Users, MapPin, Shield, Download } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

export default async function DueDiligencePage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    redirect("/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  // Check if user has access to due diligence toolkit
  const allowedRoles = ["admin", "carbon_specialist", "program_planner"]
  if (!profile || !allowedRoles.includes(profile.role)) {
    redirect("/dashboard")
  }

  // Due diligence checklist items
  const checklistItems = [
    { id: 1, category: "Legal & Land Tenure", items: [
      "Land ownership/use rights verified",
      "No ongoing land disputes",
      "Carbon rights agreement in place",
      "Benefit sharing mechanism documented"
    ]},
    { id: 2, category: "Social & Community", items: [
      "Free, Prior and Informed Consent (FPIC) obtained",
      "Stakeholder mapping completed",
      "Grievance mechanism established",
      "Gender inclusion plan in place"
    ]},
    { id: 3, category: "Technical & Environmental", items: [
      "Baseline carbon stock assessment",
      "Leakage risk assessment",
      "Permanence risk management plan",
      "Biodiversity impact assessment"
    ]},
    { id: 4, category: "Financial & Economic", items: [
      "Financial model with sensitivity analysis",
      "Cost-benefit analysis completed",
      "Revenue distribution plan",
      "Risk-adjusted return projections"
    ]},
    { id: 5, category: "MRV & Compliance", items: [
      "Monitoring plan aligned with standard",
      "Verification body identified",
      "Registry account set up",
      "Insurance for non-permanence"
    ]}
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Due Diligence Toolkit</h1>
        <p className="text-muted-foreground">
          Comprehensive checklist and tools for carbon project investment due diligence
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checklist Items</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">Across 5 categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Areas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">High priority items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Required templates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <MapPin className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Ready for due diligence</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklist */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Due Diligence Checklist
            </CardTitle>
            <CardDescription>
              Complete checklist for carbon project investment assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {checklistItems.map((category) => (
                <div key={category.id} className="space-y-3">
                  <h3 className="font-medium text-lg">{category.category}</h3>
                  <div className="space-y-2">
                    {category.items.map((item, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                        <div className="h-5 w-5 rounded-full border flex items-center justify-center">
                          <div className="h-3 w-3 rounded-full bg-gray-300"></div>
                        </div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tools & Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Risk Assessment Tools
              </CardTitle>
              <CardDescription>
                Tools for evaluating project risks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/carbon-projects">
                  <MapPin className="mr-2 h-4 w-4" />
                  Project Risk Matrix
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/investor">
                  <Users className="mr-2 h-4 w-4" />
                  Stakeholder Analysis
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link href="/dashboard/legal">
                  <FileText className="mr-2 h-4 w-4" />
                  Legal Document Review
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Templates & Documents
              </CardTitle>
              <CardDescription>
                Download due diligence templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Investment Memo Template
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Risk Assessment Form
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Due Diligence Report
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-green-50 border-blue-200">
            <CardContent className="pt-6">
              <h3 className="font-bold text-lg mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Contact our carbon investment specialists for personalized due diligence support.
              </p>
              <Button className="w-full" asChild>
                <Link href="/dashboard/investor">
                  Schedule Consultation
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Action */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-lg">Generate Due Diligence Report</h3>
              <p className="text-muted-foreground">
                Create a comprehensive due diligence report for your selected carbon projects
              </p>
            </div>
            <Button size="lg" asChild>
              <Link href="/dashboard/carbon-projects">
                Select Projects
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
