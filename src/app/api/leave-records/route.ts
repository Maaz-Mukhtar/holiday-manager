import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { datesOverlap, formatDateForDisplay } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const year = searchParams.get('year')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build where clause based on query parameters
    const where: {
      employeeId?: string
      year?: number
      status?: string
      type?: string
    } = {}
    
    if (employeeId) {
      where.employeeId = employeeId
    }
    
    if (year) {
      where.year = parseInt(year)
    }
    
    if (status) {
      where.status = status
    }
    
    if (type) {
      where.type = type
    }

    const leaveRecords = await prisma.leaveRecord.findMany({
      where,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      leaveRecords
    })
  } catch (error) {
    console.error('Error fetching leave records:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leave records' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { 
      employeeId,
      startDate,
      endDate,
      totalDays,
      workingDays,
      type,
      notes,
      bonus,
      year
    } = body

    // Validate required fields
    if (!employeeId || !startDate || !endDate || !totalDays || !workingDays || !type || !year) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      )
    }

    // Validate that employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee not found' 
        },
        { status: 404 }
      )
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'End date must be after start date' 
        },
        { status: 400 }
      )
    }

    // Check for overlapping leave records
    const existingLeaveRecords = await prisma.leaveRecord.findMany({
      where: {
        employeeId: employeeId,
        status: {
          in: ['APPROVED', 'PENDING'] // Only check approved and pending leaves
        }
      }
    })

    // Check if any existing leave overlaps with the new period
    const overlappingLeave = existingLeaveRecords.find(record => 
      datesOverlap(start, end, record.startDate, record.endDate)
    )

    if (overlappingLeave) {
      const overlappingPeriod = `${formatDateForDisplay(overlappingLeave.startDate)} - ${formatDateForDisplay(overlappingLeave.endDate)}`
      const requestedPeriod = `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Leave dates conflict with existing ${overlappingLeave.status.toLowerCase()} leave`,
          details: {
            conflictingLeave: {
              id: overlappingLeave.id,
              period: overlappingPeriod,
              type: overlappingLeave.type,
              status: overlappingLeave.status
            },
            requestedPeriod: requestedPeriod
          }
        },
        { status: 409 }
      )
    }

    // Create leave record
    const leaveRecord = await prisma.leaveRecord.create({
      data: {
        employeeId,
        startDate: start,
        endDate: end,
        totalDays: parseInt(totalDays),
        workingDays: parseInt(workingDays),
        type,
        status: 'APPROVED', // Default status
        notes: notes || null,
        bonus: bonus ? parseInt(bonus) : null,
        year: parseInt(year)
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            role: true
          }
        }
      }
    })

    // If this is current leave, update employee status
    const today = new Date()
    if (start <= today && end >= today) {
      const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      await prisma.employee.update({
        where: { id: employeeId },
        data: {
          currentStatus: daysRemaining <= 3 ? 'returning_soon' : 'on_leave',
          currentLeaveStartDate: start,
          currentLeaveEndDate: end,
          currentLeaveType: type
        }
      })
    }

    return NextResponse.json({
      success: true,
      leaveRecord
    })
  } catch (error) {
    console.error('Error creating leave record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create leave record' 
      },
      { status: 500 }
    )
  }
}