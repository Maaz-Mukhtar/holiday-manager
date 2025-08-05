import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      employees
    })
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch employees' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
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

    // Create new employee
    const employee = await prisma.employee.create({
      data: {
        firstName,
        lastName: lastName || '',
        email: phone || '',  // Store phone in email field temporarily
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
    console.error('Error creating employee:', error)
    
    // Handle unique constraint errors (duplicate phone)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Employee with this phone number already exists' 
        },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create employee' 
      },
      { status: 500 }
    )
  }
}