import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UpdateUserData } from "@/types"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Users can only view their own profile unless they're admin/manager
    if (session.user.role === "EMPLOYEE" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profileImageUrl: true,
        dateHired: true,
        annualLeaveEntitlement: true,
        carryOverDays: true,
        isActive: true,
        department: true,
        position: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        holidays: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        bonuses: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Users can only update their own profile unless they're admin/manager
    if (session.user.role === "EMPLOYEE" && session.user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body: UpdateUserData = await request.json()

    // Only admins can change roles and certain fields
    if (session.user.role !== "ADMIN") {
      delete body.annualLeaveEntitlement
      delete body.carryOverDays
      delete body.isActive
    }

    const user = await prisma.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phoneNumber: true,
        profileImageUrl: true,
        dateHired: true,
        annualLeaveEntitlement: true,
        carryOverDays: true,
        isActive: true,
        department: true,
        position: true,
        role: true,
        updatedAt: true,
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete users
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    // Don't allow deleting self
    if (session.user.id === id) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 })
    }

    // Instead of deleting, deactivate the user
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })

    return NextResponse.json({ message: "User deactivated successfully" })
  } catch (error) {
    console.error("Error deactivating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}