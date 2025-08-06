// API Utility Functions for Holiday Management System

// Date utilities for API consistency
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseAPIDate(dateString: string): Date {
  // Parse date string as UTC to avoid timezone issues
  return new Date(dateString + 'T00:00:00.000Z')
}

// Calculate working days (Monday-Friday)
export function calculateWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    const dayOfWeek = current.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

// Calculate total days between dates (inclusive)
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
}

// Validate date range
export function isValidDateRange(startDate: Date, endDate: Date): boolean {
  return startDate <= endDate
}

// Check if date is in the past
export function isDateInPast(date: Date): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date < today
}

// Get year from date
export function getYearFromDate(date: Date): number {
  return date.getFullYear()
}

// Error response helpers
export function createErrorResponse(message: string, status: number = 500) {
  return {
    success: false,
    error: message
  }
}

export function createSuccessResponse(data: any) {
  return {
    success: true,
    ...data
  }
}

// Validate required fields
export function validateRequiredFields(data: any, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!data[field] && data[field] !== 0) { // Allow 0 as valid value
      return `Missing required field: ${field}`
    }
  }
  return null
}

// Parse and validate integer
export function parseInteger(value: any, fieldName: string, min?: number, max?: number): number {
  const parsed = parseInt(value)
  
  if (isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number`)
  }
  
  if (min !== undefined && parsed < min) {
    throw new Error(`${fieldName} must be at least ${min}`)
  }
  
  if (max !== undefined && parsed > max) {
    throw new Error(`${fieldName} must be at most ${max}`)
  }
  
  return parsed
}

// Check if dates overlap (for leave period validation)
export function datesOverlap(
  start1: Date, 
  end1: Date, 
  start2: Date, 
  end2: Date
): boolean {
  return start1 <= end2 && start2 <= end1
}

// Format date for display
export function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

// Calculate days remaining until a future date
export function calculateDaysRemaining(futureDate: Date): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  futureDate.setHours(0, 0, 0, 0)
  
  const timeDiff = futureDate.getTime() - today.getTime()
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))
  
  return Math.max(0, daysRemaining)
}