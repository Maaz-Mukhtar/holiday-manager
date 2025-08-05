import { NextRequest, NextResponse } from "next/server"
import { authOptions } from "@/lib/auth"

// Manually handle NextAuth since v4 has App Router compatibility issues
export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const NextAuth = require("next-auth").default
  const handler = NextAuth(authOptions)
  return handler(req)
}

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const NextAuth = require("next-auth").default
  const handler = NextAuth(authOptions)
  return handler(req)
}