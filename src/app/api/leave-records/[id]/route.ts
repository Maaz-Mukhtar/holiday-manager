import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { datesOverlap, formatDateForDisplay } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record ID is required' 
        },
        { status: 400 }
      )
    }

    const leaveRecord = await prisma.leaveRecord.findUnique({
      where: { id },
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

    if (!leaveRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      leaveRecord
    })
  } catch (error) {
    console.error('Error fetching leave record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch leave record' 
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record ID is required' 
        },
        { status: 400 }
      )
    }

    const { 
      startDate,
      endDate,
      totalDays,
      workingDays,
      type,
      status,
      notes,
      bonus,
      year
    } = body

    // Validate required fields
    if (!startDate || !endDate || !totalDays || !workingDays || !type || !status || !year) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
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

    // Check if leave record exists
    const existingRecord = await prisma.leaveRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record not found' 
        },
        { status: 404 }
      )
    }

    // Check for overlapping leave records (excluding current record being updated)
    const otherLeaveRecords = await prisma.leaveRecord.findMany({
      where: {
        employeeId: existingRecord.employeeId,
        status: {
          in: ['APPROVED', 'PENDING'] // Only check approved and pending leaves
        },
        id: {
          not: id // Exclude the current record being updated
        }
      }
    })

    // Check if any other existing leave overlaps with the updated period
    const overlappingLeave = otherLeaveRecords.find(record => 
      datesOverlap(start, end, record.startDate, record.endDate)
    )

    if (overlappingLeave) {
      const overlappingPeriod = `${formatDateForDisplay(overlappingLeave.startDate)} - ${formatDateForDisplay(overlappingLeave.endDate)}`
      const requestedPeriod = `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Updated leave dates conflict with existing ${overlappingLeave.status.toLowerCase()} leave`,
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

    // Update leave record
    const leaveRecord = await prisma.leaveRecord.update({
      where: { id },
      data: {
        startDate: start,
        endDate: end,
        totalDays: parseInt(totalDays),
        workingDays: parseInt(workingDays),
        type,
        status,
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

    // Update employee current leave status if this affects current dates
    const today = new Date()
    if (start <= today && end >= today && status === 'APPROVED') {
      const daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      await prisma.employee.update({
        where: { id: existingRecord.employeeId },
        data: {
          currentStatus: daysRemaining <= 3 ? 'returning_soon' : 'on_leave',
          currentLeaveStartDate: start,
          currentLeaveEndDate: end,
          currentLeaveType: type
        }
      })
    } else if (status !== 'APPROVED') {
      // If leave is no longer approved, check if employee should be available
      const currentActiveLeave = await prisma.leaveRecord.findFirst({
        where: {
          employeeId: existingRecord.employeeId,
          status: 'APPROVED',
          startDate: { lte: today },
          endDate: { gte: today }
        }
      })

      if (!currentActiveLeave) {
        await prisma.employee.update({
          where: { id: existingRecord.employeeId },
          data: {
            currentStatus: 'available',
            currentLeaveStartDate: null,
            currentLeaveEndDate: null,
            currentLeaveType: null
          }
        })
      }
    }

    return NextResponse.json({
      success: true,
      leaveRecord
    })
  } catch (error) {
    console.error('Error updating leave record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update leave record' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record ID is required' 
        },
        { status: 400 }
      )
    }

    // Get the leave record before deleting to update employee status
    const existingRecord = await prisma.leaveRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Leave record not found' 
        },
        { status: 404 }
      )
    }

    // Delete the leave record
    await prisma.leaveRecord.delete({
      where: { id }
    })

    // Update employee status - check if there are other active leaves
    const today = new Date()
    const currentActiveLeave = await prisma.leaveRecord.findFirst({
      where: {
        employeeId: existingRecord.employeeId,
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today }
      }
    })

    if (currentActiveLeave) {
      // Update with the remaining active leave
      const daysRemaining = Math.ceil((currentActiveLeave.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      await prisma.employee.update({
        where: { id: existingRecord.employeeId },
        data: {
          currentStatus: daysRemaining <= 3 ? 'returning_soon' : 'on_leave',
          currentLeaveStartDate: currentActiveLeave.startDate,
          currentLeaveEndDate: currentActiveLeave.endDate,
          currentLeaveType: currentActiveLeave.type
        }
      })
    } else {
      // No active leaves, employee is available
      await prisma.employee.update({
        where: { id: existingRecord.employeeId },
        data: {
          currentStatus: 'available',
          currentLeaveStartDate: null,
          currentLeaveEndDate: null,
          currentLeaveType: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Leave record deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting leave record:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete leave record' 
      },
      { status: 500 }
    )
  }
}