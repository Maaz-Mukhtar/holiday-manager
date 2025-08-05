import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
          error: 'Employee ID is required' 
        },
        { status: 400 }
      )
    }

    // Fetch employee with their leave records
    const employee = await prisma.employee.findUnique({
      where: {
        id: id
      },
      include: {
        leaveRecords: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
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

    return NextResponse.json({
      success: true,
      employee
    })
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch employee details' 
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
          error: 'Employee ID is required' 
        },
        { status: 400 }
      )
    }

    const { 
      firstName, 
      lastName, 
      phone, 
      department, 
      role, 
      annualLeaveEntitlement 
    } = body

    // Validate required fields
    if (!firstName || !department || !role || !annualLeaveEntitlement) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields' 
        },
        { status: 400 }
      )
    }

    // Update employee
    const employee = await prisma.employee.update({
      where: {
        id: id
      },
      data: {
        firstName,
        lastName: lastName || '',
        email: phone || `temp_${Date.now()}@placeholder.com`,
        department,
        role,
        annualLeaveEntitlement: parseInt(annualLeaveEntitlement)
      }
    })

    return NextResponse.json({
      success: true,
      employee
    })
  } catch (error) {
    console.error('Error updating employee:', error)
    
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update employee' 
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
          error: 'Employee ID is required' 
        },
        { status: 400 }
      )
    }

    // Delete employee (cascade will handle leave records)
    await prisma.employee.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting employee:', error)
    
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee not found' 
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete employee' 
      },
      { status: 500 }
    )
  }
}