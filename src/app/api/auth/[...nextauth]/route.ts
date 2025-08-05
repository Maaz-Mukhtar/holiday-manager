import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// Force NextAuth to work with App Router by bypassing type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = NextAuth(authOptions as any) as any

export { handler as GET, handler as POST }