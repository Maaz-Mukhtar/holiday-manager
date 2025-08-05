import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET() {
  try {
    console.log('Testing Supabase connection with transaction pooler...')
    console.log('Supabase URL:', supabaseUrl)
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Test 1: Check if we can connect and query tables
    const { error: employeeError } = await supabase
      .from('employees')
      .select('count')
      .limit(1)
    
    if (employeeError) {
      console.error('Employee table error:', employeeError)
    } else {
      console.log('✅ Employees table accessible via Supabase client')
    }
    
    const { error: leaveError } = await supabase
      .from('leave_records')
      .select('count')
      .limit(1)
    
    if (leaveError) {
      console.error('Leave records table error:', leaveError)
    } else {
      console.log('✅ Leave records table accessible via Supabase client')
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection working!',
      details: {
        supabaseUrl,
        employeeTableStatus: employeeError ? 'error' : 'accessible',
        leaveRecordsTableStatus: leaveError ? 'error' : 'accessible',
        employeeError: employeeError?.message,
        leaveRecordsError: leaveError?.message,
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Supabase test failed:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        message: 'Supabase connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}