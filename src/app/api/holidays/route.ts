import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CreateHolidayData } from "@/types"
import { calculateWorkingDays, calculateTotalDays } from "@/lib/utils"
import { HolidayStatus } from "@prisma/client"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Type assertion for user properties
    const user = session.user as { id: string; role: string; department: string }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const department = searchParams.get("department")
    const status = searchParams.get("status")
    const year = searchParams.get("year")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: Record<string, any> = {}

    // Role-based filtering
    if (user.role === "EMPLOYEE") {
      whereClause.userId = user.id
    } else if (user.role === "MANAGER" && user.department) {
      // Managers can see their department's holidays
      whereClause.user = {
        department: user.department
      }
    }

    // Apply additional filters
    if (userId && user.role !== "EMPLOYEE") {
      whereClause.userId = userId
    }

    if (department && user.role === "ADMIN") {
      whereClause.user = {
        ...whereClause.user,
        department
      }
    }

    if (status && Object.values(HolidayStatus).includes(status as HolidayStatus)) {
      whereClause.status = status as HolidayStatus
    }

    if (year) {
      const yearNum = parseInt(year)
      whereClause.startDate = {
        gte: new Date(yearNum, 0, 1),
        lt: new Date(yearNum + 1, 0, 1)
      }
    }

    const holidays = await prisma.holiday.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            email: true,
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        bonus: true,
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(holidays)
  } catch (error) {
    console.error("Error fetching holidays:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Type assertion for user properties
    const user = session.user as { id: string; role: string; department: string }

    const body: CreateHolidayData = await request.json()
    
    // Validate required fields
    if (!body.startDate || !body.endDate || !body.holidayType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const startDate = new Date(body.startDate)
    const endDate = new Date(body.endDate)

    // Validate dates
    if (startDate >= endDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    if (startDate < new Date()) {
      return NextResponse.json({ error: "Cannot request holiday in the past" }, { status: 400 })
    }

    // Check for overlapping holidays
    const overlappingHoliday = await prisma.holiday.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      }
    })

    if (overlappingHoliday) {
      return NextResponse.json({ error: "Holiday dates overlap with existing request" }, { status: 409 })
    }

    // Calculate days
    const totalDays = calculateTotalDays(startDate, endDate)
    const workingDays = calculateWorkingDays(startDate, endDate)

    // Check available holiday days (only for annual leave)
    if (body.holidayType === "ANNUAL") {
      const userDetails = await prisma.user.findUnique({
        where: { id: user.id },
        select: { annualLeaveEntitlement: true, carryOverDays: true }
      })

      if (!userDetails) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Calculate used days this year
      const currentYear = new Date().getFullYear()
      const usedDays = await prisma.holiday.aggregate({
        where: {
          userId: user.id,
          holidayType: "ANNUAL",
          status: { in: ["APPROVED", "PENDING"] },
          startDate: {
            gte: new Date(currentYear, 0, 1),
            lt: new Date(currentYear + 1, 0, 1)
          }
        },
        _sum: { workingDays: true }
      })

      const totalUsedDays = usedDays._sum.workingDays || 0
      const availableDays = userDetails.annualLeaveEntitlement + userDetails.carryOverDays - totalUsedDays

      if (workingDays > availableDays) {
        return NextResponse.json({ 
          error: `Insufficient holiday days. Available: ${availableDays}, Requested: ${workingDays}` 
        }, { status: 400 })
      }
    }

    // Create holiday request
    const holiday = await prisma.holiday.create({
      data: {
        userId: user.id,
        startDate,
        endDate,
        totalDays,
        workingDays,
        holidayType: body.holidayType,
        notes: body.notes,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: true,
            email: true,
          }
        }
      }
    })

    // Create notification for managers
    if (user.department) {
      const managers = await prisma.user.findMany({
        where: {
          department: user.department,
          role: { in: ["MANAGER", "ADMIN"] },
          isActive: true,
          id: { not: user.id }
        }
      })

      if (managers.length > 0) {
        await prisma.notification.createMany({
          data: managers.map(manager => ({
            userId: manager.id,
            type: "HOLIDAY_REQUEST",
            title: "New Holiday Request",
            message: `${holiday.user.firstName} ${holiday.user.lastName} has requested ${workingDays} days of ${body.holidayType.toLowerCase()} leave`,
            relatedHolidayId: holiday.id,
          }))
        })
      }
    }

    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    console.error("Error creating holiday:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}