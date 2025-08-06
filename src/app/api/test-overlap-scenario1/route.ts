import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  let testLeaveId1: string | null = null
  let testEmployeeId: string | null = null

  try {
    const testResults = []

    // Step 0: Find or create a test employee
    let testEmployee = await prisma.employee.findFirst({
      where: {
        email: { startsWith: 'test-overlap-' }
      }
    })

    if (!testEmployee) {
      testEmployee = await prisma.employee.create({
        data: {
          firstName: 'Test',
          lastName: 'Employee Overlap',
          email: 'test-overlap-scenario1@test.com',
          department: 'Kitchen',
          role: 'Test Role',
          annualLeaveEntitlement: 25,
          currentStatus: 'available'
        }
      })
      testResults.push({
        step: 'Setup',
        action: 'Created test employee',
        status: 'SUCCESS',
        data: { employeeId: testEmployee.id }
      })
    } else {
      testResults.push({
        step: 'Setup',
        action: 'Found existing test employee',
        status: 'SUCCESS',
        data: { employeeId: testEmployee.id }
      })
    }

    testEmployeeId = testEmployee.id

    // Clean up any existing test leave records
    await prisma.leaveRecord.deleteMany({
      where: {
        employeeId: testEmployeeId,
        notes: { contains: 'TEST_OVERLAP_SCENARIO1' }
      }
    })

    testResults.push({
      step: 'Cleanup',
      action: 'Removed existing test leave records',
      status: 'SUCCESS'
    })

    // Step 1: Create first leave record (should succeed)
    const firstLeaveData = {
      employeeId: testEmployeeId,
      startDate: '2024-06-10',
      endDate: '2024-06-15',
      totalDays: 6,
      workingDays: 4,
      type: 'ANNUAL',
      status: 'APPROVED',
      notes: 'TEST_OVERLAP_SCENARIO1 - First leave record',
      bonus: 0,
      year: 2024
    }

    const firstLeaveResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/leave-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(firstLeaveData)
    })

    const firstLeaveResult = await firstLeaveResponse.json()

    if (firstLeaveResponse.status === 201 && firstLeaveResult.success) {
      testLeaveId1 = firstLeaveResult.leaveRecord.id
      testResults.push({
        step: 'Step 1',
        action: 'Create first leave record',
        status: 'SUCCESS',
        expected: '201 Created',
        actual: `${firstLeaveResponse.status} Created`,
        data: {
          period: '10/06/2024 - 15/06/2024',
          leaveId: testLeaveId1
        }
      })
    } else {
      testResults.push({
        step: 'Step 1',
        action: 'Create first leave record',
        status: 'FAILED',
        expected: '201 Created',
        actual: `${firstLeaveResponse.status} ${firstLeaveResult.error || 'Unknown error'}`,
        data: firstLeaveResult
      })
      
      // If first step fails, we can't continue
      return NextResponse.json({
        status: 'TEST_FAILED',
        scenario: 'Create Overlapping Leave (Scenario 1)',
        summary: {
          total: 2,
          passed: 0,
          failed: 1,
          skipped: 1
        },
        steps: testResults,
        error: 'First leave creation failed - cannot test overlap'
      })
    }

    // Step 2: Try to create overlapping leave (should fail with 409)
    const overlappingLeaveData = {
      employeeId: testEmployeeId,
      startDate: '2024-06-12',  // Overlaps with first leave (10-15)
      endDate: '2024-06-18',
      totalDays: 7,
      workingDays: 5,
      type: 'ANNUAL',
      status: 'APPROVED',
      notes: 'TEST_OVERLAP_SCENARIO1 - Overlapping leave record',
      bonus: 0,
      year: 2024
    }

    const overlappingResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/leave-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(overlappingLeaveData)
    })

    const overlappingResult = await overlappingResponse.json()

    // This should fail with 409 Conflict
    if (overlappingResponse.status === 409 && !overlappingResult.success) {
      const hasExpectedError = overlappingResult.error && 
                              overlappingResult.error.includes('conflict') &&
                              overlappingResult.details &&
                              overlappingResult.details.conflictingLeave

      testResults.push({
        step: 'Step 2',
        action: 'Create overlapping leave record',
        status: hasExpectedError ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        expected: '409 Conflict with detailed error',
        actual: `${overlappingResponse.status} ${overlappingResult.error}`,
        data: {
          conflictDetected: true,
          conflictingLeave: overlappingResult.details?.conflictingLeave,
          requestedPeriod: '12/06/2024 - 18/06/2024',
          errorDetails: overlappingResult
        }
      })
    } else if (overlappingResponse.status === 201) {
      // This is BAD - overlap detection failed!
      testResults.push({
        step: 'Step 2',
        action: 'Create overlapping leave record',
        status: 'CRITICAL_FAILURE',
        expected: '409 Conflict',
        actual: '201 Created - OVERLAP DETECTION FAILED!',
        data: {
          overlappingLeaveCreated: overlappingResult,
          criticalIssue: 'System allowed overlapping leave periods'
        }
      })
    } else {
      testResults.push({
        step: 'Step 2',
        action: 'Create overlapping leave record',
        status: 'UNEXPECTED_ERROR',
        expected: '409 Conflict',
        actual: `${overlappingResponse.status} ${overlappingResult.error || 'Unknown response'}`,
        data: overlappingResult
      })
    }

    // Calculate test results
    const successSteps = testResults.filter(step => step.status === 'SUCCESS').length
    const failedSteps = testResults.filter(step => 
      step.status === 'FAILED' || step.status === 'CRITICAL_FAILURE' || step.status === 'UNEXPECTED_ERROR'
    ).length
    const testPassed = failedSteps === 0 && successSteps >= 2 // Setup + both main steps

    return NextResponse.json({
      status: testPassed ? 'TEST_PASSED' : 'TEST_FAILED',
      scenario: 'Scenario 1: Create Overlapping Leave',
      description: 'Test that creating overlapping leave periods is properly rejected with 409 Conflict',
      summary: {
        total: testResults.length,
        passed: testResults.filter(r => r.status === 'SUCCESS').length,
        failed: testResults.filter(r => r.status.includes('FAIL')).length,
        errors: testResults.filter(r => r.status.includes('ERROR')).length
      },
      testPeriods: {
        firstLeave: '10/06/2024 - 15/06/2024',
        overlappingLeave: '12/06/2024 - 18/06/2024 (should be rejected)'
      },
      steps: testResults,
      overlapDetectionWorking: testResults.some(r => 
        r.step === 'Step 2' && r.status === 'SUCCESS'
      ),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'TEST_ERROR',
        scenario: 'Scenario 1: Create Overlapping Leave',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        steps: testResults || [],
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  } finally {
    // Cleanup: Remove test leave records
    try {
      if (testEmployeeId) {
        await prisma.leaveRecord.deleteMany({
          where: {
            employeeId: testEmployeeId,
            notes: { contains: 'TEST_OVERLAP_SCENARIO1' }
          }
        })
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError)
    }
  }
}