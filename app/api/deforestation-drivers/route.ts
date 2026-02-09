// Temporary placeholder - deforestation_drivers table not available in new schema
// Will be re-implemented in Phase 2 when carbon module tables are added back

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Feature not yet implemented",
      message: "Feature implementation in progress",
      status: 501
    },
    { status: 501 }
  );
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Feature not yet implemented",
      message: "Feature implementation in progress",
      status: 501
    },
    { status: 501 }
  );
}

export async function PUT(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Feature not yet implemented",
      message: "Feature implementation in progress",
      status: 501
    },
    { status: 501 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { 
      error: "Feature not yet implemented",
      message: "Feature implementation in progress",
      status: 501
    },
    { status: 501 }
  );
}
