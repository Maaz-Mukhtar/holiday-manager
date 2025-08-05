import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    console.log('Testing database connection...')
    
    // Test 1: Basic connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    // Test 2: Check if tables exist by counting records
    const employeeCount = await prisma.employee.count()
    console.log(`✅ Employees table accessible. Current count: ${employeeCount}`)
    
    const leaveRecordCount = await prisma.leaveRecord.count()
    console.log(`✅ Leave records table accessible. Current count: ${leaveRecordCount}`)
    
    // Test 3: Test table structure by creating a simple query
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('employees', 'leave_records')
    `
    
    return NextResponse.json({
      status: 'success',
      message: 'Database connection and tables verified successfully!',
      details: {
        employeeCount,
        leaveRecordCount,
        tablesFound: tables,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Database test failed:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}