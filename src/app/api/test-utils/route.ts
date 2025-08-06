import { NextResponse } from 'next/server'
import {
  formatDateForAPI,
  parseAPIDate,
  calculateWorkingDays,
  calculateTotalDays,
  isValidDateRange,
  getYearFromDate,
  createErrorResponse,
  createSuccessResponse,
  validateRequiredFields,
  parseInteger,
  datesOverlap
} from '@/lib/api-utils'

export async function GET() {
  try {
    const tests = []

    // Test date formatting
    const testDate = new Date('2024-03-15T10:30:00.000Z')
    tests.push({
      name: 'formatDateForAPI',
      input: testDate.toISOString(),
      output: formatDateForAPI(testDate),
      expected: '2024-03-15',
      status: formatDateForAPI(testDate) === '2024-03-15' ? 'PASS' : 'FAIL'
    })

    // Test date parsing
    const parsedDate = parseAPIDate('2024-03-15')
    tests.push({
      name: 'parseAPIDate',
      input: '2024-03-15',
      output: parsedDate.toISOString(),
      expected: '2024-03-15T00:00:00.000Z',
      status: parsedDate.toISOString() === '2024-03-15T00:00:00.000Z' ? 'PASS' : 'FAIL'
    })

    // Test working days calculation (Mon-Fri)
    const startDate = new Date('2024-03-11') // Monday
    const endDate = new Date('2024-03-15')   // Friday
    const workingDays = calculateWorkingDays(startDate, endDate)
    tests.push({
      name: 'calculateWorkingDays',
      input: 'Mon Mar 11 to Fri Mar 15, 2024',
      output: workingDays,
      expected: 5,
      status: workingDays === 5 ? 'PASS' : 'FAIL'
    })

    // Test total days calculation
    const totalDays = calculateTotalDays(startDate, endDate)
    tests.push({
      name: 'calculateTotalDays',
      input: 'Mar 11 to Mar 15, 2024',
      output: totalDays,
      expected: 5,
      status: totalDays === 5 ? 'PASS' : 'FAIL'
    })

    // Test date range validation
    tests.push({
      name: 'isValidDateRange (valid)',
      input: 'start <= end',
      output: isValidDateRange(startDate, endDate),
      expected: true,
      status: isValidDateRange(startDate, endDate) ? 'PASS' : 'FAIL'
    })

    tests.push({
      name: 'isValidDateRange (invalid)',
      input: 'start > end',
      output: isValidDateRange(endDate, startDate),
      expected: false,
      status: !isValidDateRange(endDate, startDate) ? 'PASS' : 'FAIL'
    })

    // Test year extraction
    tests.push({
      name: 'getYearFromDate',
      input: testDate.toISOString(),
      output: getYearFromDate(testDate),
      expected: 2024,
      status: getYearFromDate(testDate) === 2024 ? 'PASS' : 'FAIL'
    })

    // Test required fields validation
    const validationError = validateRequiredFields(
      { name: 'John', age: 30 }, 
      ['name', 'age']
    )
    tests.push({
      name: 'validateRequiredFields (valid)',
      input: 'name: John, age: 30',
      output: validationError,
      expected: null,
      status: validationError === null ? 'PASS' : 'FAIL'
    })

    const missingFieldError = validateRequiredFields(
      { name: 'John' }, 
      ['name', 'age']
    )
    tests.push({
      name: 'validateRequiredFields (missing field)',
      input: 'name: John, missing age',
      output: missingFieldError,
      expected: 'Missing required field: age',
      status: missingFieldError === 'Missing required field: age' ? 'PASS' : 'FAIL'
    })

    // Test integer parsing
    try {
      const parsedInt = parseInteger('25', 'days', 1, 50)
      tests.push({
        name: 'parseInteger (valid)',
        input: '25 (min: 1, max: 50)',
        output: parsedInt,
        expected: 25,
        status: parsedInt === 25 ? 'PASS' : 'FAIL'
      })
    } catch (error) {
      tests.push({
        name: 'parseInteger (valid)',
        input: '25 (min: 1, max: 50)',
        output: error instanceof Error ? error.message : 'Unknown error',
        expected: 25,
        status: 'FAIL'
      })
    }

    // Test date overlap
    const overlap1 = datesOverlap(
      new Date('2024-03-10'),
      new Date('2024-03-15'),
      new Date('2024-03-12'),
      new Date('2024-03-18')
    )
    tests.push({
      name: 'datesOverlap (overlapping)',
      input: '10-15 vs 12-18',
      output: overlap1,
      expected: true,
      status: overlap1 ? 'PASS' : 'FAIL'
    })

    const overlap2 = datesOverlap(
      new Date('2024-03-10'),
      new Date('2024-03-12'),
      new Date('2024-03-15'),
      new Date('2024-03-18')
    )
    tests.push({
      name: 'datesOverlap (no overlap)',
      input: '10-12 vs 15-18',
      output: overlap2,
      expected: false,
      status: !overlap2 ? 'PASS' : 'FAIL'
    })

    // Test response helpers
    const errorResponse = createErrorResponse('Test error')
    tests.push({
      name: 'createErrorResponse',
      input: 'Test error',
      output: errorResponse,
      expected: { success: false, error: 'Test error' },
      status: (errorResponse.success === false && errorResponse.error === 'Test error') ? 'PASS' : 'FAIL'
    })

    const successResponse = createSuccessResponse({ data: 'test' })
    tests.push({
      name: 'createSuccessResponse',
      input: '{ data: test }',
      output: successResponse,
      expected: { success: true, data: 'test' },
      status: (successResponse.success === true && successResponse.data === 'test') ? 'PASS' : 'FAIL'
    })

    const allPassed = tests.every(test => test.status === 'PASS')
    const passedCount = tests.filter(test => test.status === 'PASS').length

    return NextResponse.json({
      status: allPassed ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED',
      summary: {
        total: tests.length,
        passed: passedCount,
        failed: tests.length - passedCount
      },
      tests,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { status: 'ERROR', error: error.message },
      { status: 500 }
    )
  }
}