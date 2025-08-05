import { NextRequest } from "next/server"
import { authOptions } from "@/lib/auth"

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const NextAuth = require("next-auth")

const handler = NextAuth(authOptions)

export async function GET(req: NextRequest) {
  return handler(req)
}

export async function POST(req: NextRequest) {
  return handler(req)
}