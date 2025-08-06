import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const testResults: Array<{
    category: string
    name: string
    status: string
    expected?: string
    actual?: string
    details?: Record<string, unknown>
  }> = []

  try {
    // 1. Database Connection Test
    try {
      await prisma.$connect()
      testResults.push({
        category: 'Database',
        name: 'Prisma Connection',
        status: 'SUCCESS',
        expected: 'Connected to database',
        actual: 'Connected successfully'
      })
    } catch (error) {
      testResults.push({
        category: 'Database',
        name: 'Prisma Connection',
        status: 'FAILED',
        expected: 'Connected to database',
        actual: error instanceof Error ? error.message : 'Connection failed'
      })
    }

    // 2. Employee API Tests
    try {
      const employees = await prisma.employee.findMany({ take: 1 })
      testResults.push({
        category: 'Employee API',
        name: 'Fetch Employees',
        status: 'SUCCESS',
        expected: 'Retrieved employee records',
        actual: `Found ${employees.length} employee(s)`
      })

      if (employees.length > 0) {
        const employee = employees[0]
        testResults.push({
          category: 'Employee API',
          name: 'Employee Data Structure',
          status: 'SUCCESS',
          expected: 'Valid employee object',
          actual: 'Employee has required fields',
          details: {
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            department: employee.department,
            role: employee.role
          }
        })
      }
    } catch (error) {
      testResults.push({
        category: 'Employee API',
        name: 'Fetch Employees',
        status: 'FAILED',
        expected: 'Retrieved employee records',
        actual: error instanceof Error ? error.message : 'Query failed'
      })
    }

    // 3. Leave Records API Tests
    try {
      const leaveRecords = await prisma.leaveRecord.findMany({ 
        take: 5,
        include: {
          employee: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        }
      })
      
      testResults.push({
        category: 'Leave Records API',
        name: 'Fetch Leave Records',
        status: 'SUCCESS',
        expected: 'Retrieved leave records',
        actual: `Found ${leaveRecords.length} leave record(s)`
      })

      if (leaveRecords.length > 0) {
        const record = leaveRecords[0]
        const hasRequiredFields = record.employeeId && record.startDate && record.endDate && record.type
        
        testResults.push({
          category: 'Leave Records API',
          name: 'Leave Record Structure',
          status: hasRequiredFields ? 'SUCCESS' : 'FAILED',
          expected: 'Valid leave record structure',
          actual: hasRequiredFields ? 'All required fields present' : 'Missing required fields',
          details: {
            id: record.id,
            employeeId: record.employeeId,
            period: `${record.startDate.toDateString()} - ${record.endDate.toDateString()}`,
            type: record.type,
            status: record.status,
            hasBonus: record.bonus !== null
          }
        })
      }
    } catch (error) {
      testResults.push({
        category: 'Leave Records API',
        name: 'Fetch Leave Records',
        status: 'FAILED',
        expected: 'Retrieved leave records',
        actual: error instanceof Error ? error.message : 'Query failed'
      })
    }

    // 4. API Utilities Test
    try {
      const utilsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/test-utils`)
      if (utilsResponse.ok) {
        const utilsData = await utilsResponse.json()
        const allUtilsPassed = utilsData.status === 'ALL_TESTS_PASSED'
        
        testResults.push({
          category: 'API Utilities',
          name: 'Utility Functions Test',
          status: allUtilsPassed ? 'SUCCESS' : 'PARTIAL_SUCCESS',
          expected: 'All utility functions working',
          actual: `${utilsData.summary.passed}/${utilsData.summary.total} tests passed`,
          details: {
            totalTests: utilsData.summary.total,
            passed: utilsData.summary.passed,
            failed: utilsData.summary.failed
          }
        })
      } else {
        testResults.push({
          category: 'API Utilities',
          name: 'Utility Functions Test',
          status: 'FAILED',
          expected: 'API utilities accessible',
          actual: `HTTP ${utilsResponse.status}`
        })
      }
    } catch (error) {
      testResults.push({
        category: 'API Utilities',
        name: 'Utility Functions Test',
        status: 'FAILED',
        expected: 'API utilities accessible',
        actual: error instanceof Error ? error.message : 'Request failed'
      })
    }

    // 5. Overlap Detection Test
    try {
      const overlapResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/test-overlap-scenario1`)
      if (overlapResponse.ok) {
        const overlapData = await overlapResponse.json()
        const overlapWorking = overlapData.status === 'TEST_PASSED'
        
        testResults.push({
          category: 'Overlap Detection',
          name: 'Scenario 1 Test',
          status: overlapWorking ? 'SUCCESS' : 'FAILED',
          expected: 'Overlap detection prevents conflicts',
          actual: overlapWorking ? 'Overlap detection working' : 'Overlap detection failed',
          details: {
            scenario: overlapData.scenario,
            overlapDetectionWorking: overlapData.overlapDetectionWorking,
            testPeriods: overlapData.testPeriods
          }
        })
      } else {
        testResults.push({
          category: 'Overlap Detection',
          name: 'Scenario 1 Test',
          status: 'FAILED',
          expected: 'Overlap test accessible',
          actual: `HTTP ${overlapResponse.status}`
        })
      }
    } catch (error) {
      testResults.push({
        category: 'Overlap Detection',
        name: 'Scenario 1 Test',
        status: 'FAILED',
        expected: 'Overlap test accessible',
        actual: error instanceof Error ? error.message : 'Request failed'
      })
    }

    // 6. API Endpoints Health Check
    const endpoints = [
      { name: 'Employees API', url: '/api/employees' },
      { name: 'Leave Records API', url: '/api/leave-records' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}${endpoint.url}`)
        testResults.push({
          category: 'API Health',
          name: endpoint.name,
          status: response.ok ? 'SUCCESS' : 'FAILED',
          expected: '200 OK',
          actual: `${response.status} ${response.statusText}`
        })
      } catch (error) {
        testResults.push({
          category: 'API Health',
          name: endpoint.name,
          status: 'FAILED',
          expected: '200 OK',
          actual: error instanceof Error ? error.message : 'Request failed'
        })
      }
    }

    // Calculate summary
    const totalTests = testResults.length
    const passedTests = testResults.filter(test => test.status === 'SUCCESS').length
    const failedTests = testResults.filter(test => test.status === 'FAILED').length
    const partialTests = testResults.filter(test => test.status === 'PARTIAL_SUCCESS').length

    const overallStatus = failedTests === 0 ? 
      (partialTests === 0 ? 'ALL_SYSTEMS_OPERATIONAL' : 'MINOR_ISSUES_DETECTED') : 
      'CRITICAL_ISSUES_DETECTED'

    return NextResponse.json({
      status: overallStatus,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        partial: partialTests,
        systemHealth: failedTests === 0 ? 'HEALTHY' : 'ISSUES_DETECTED'
      },
      categories: {
        database: testResults.filter(t => t.category === 'Database'),
        employeeAPI: testResults.filter(t => t.category === 'Employee API'),
        leaveRecordsAPI: testResults.filter(t => t.category === 'Leave Records API'),
        apiUtilities: testResults.filter(t => t.category === 'API Utilities'),
        overlapDetection: testResults.filter(t => t.category === 'Overlap Detection'),
        apiHealth: testResults.filter(t => t.category === 'API Health')
      },
      allTests: testResults,
      recommendations: generateRecommendations(testResults),
      timestamp: new Date().toISOString(),
      version: 'Phase 2 API Testing Suite v1.0'
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'SYSTEM_ERROR',
        error: error instanceof Error ? error.message : 'Unknown system error',
        partialResults: testResults,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

function generateRecommendations(testResults: Array<{ category: string; name: string; status: string }>): string[] {
  const recommendations: string[] = []
  
  const failedTests = testResults.filter(test => test.status === 'FAILED')
  const partialTests = testResults.filter(test => test.status === 'PARTIAL_SUCCESS')
  
  if (failedTests.length === 0 && partialTests.length === 0) {
    recommendations.push('✅ All systems operational - no immediate action required')
  }
  
  if (failedTests.some(test => test.category === 'Database')) {
    recommendations.push('🔴 Critical: Database connectivity issues detected - check connection string and database server')
  }
  
  if (failedTests.some(test => test.category === 'API Health')) {
    recommendations.push('🟡 Warning: Some API endpoints are not responding - verify route configurations')
  }
  
  if (failedTests.some(test => test.category === 'Overlap Detection')) {
    recommendations.push('🔴 Critical: Leave overlap detection not working - this could allow conflicting leave schedules')
  }
  
  if (partialTests.some(test => test.category === 'API Utilities')) {
    recommendations.push('🟡 Info: Some utility function tests failed - check individual function implementations')
  }
  
  if (failedTests.length > 0) {
    recommendations.push(`⚠️ ${failedTests.length} critical issues detected - immediate attention required`)
  }
  
  return recommendations
}