# Phase 2: API Routes Development

## 🎯 **Phase 2 Goal**
Create REST API endpoints for employee and leave record management with proper error handling and validation.

## ⏱️ **Total Time Estimate: 2-3 hours**

## 📋 **Prerequisites**
- Phase 1 completed successfully
- Database connection tested and working
- Prisma client configured
- Development server can run (`npm run dev`)

---

## **Step 2.1: Create Employee List API** (20 minutes)

### Instructions:
Create `src/app/api/employees/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Validation schema for creating employees
const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string(),
  email: z.string().email('Valid email is required'),
  department: z.enum(['Driver', 'Kitchen', 'Security', 'Gardener', 'Cleaning', 'Maintenance']),
  role: z.string().min(1, 'Role is required'),
  annualLeaveEntitlement: z.number().min(1).max(50, 'Leave entitlement must be between 1-50 days')
})

// GET /api/employees - List all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const department = searchParams.get('department')

    const whereClause = department && department !== 'All' 
      ? { department }
      : {}

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            leaveRecords: {
              where: {
                year: new Date().getFullYear(),
                type: 'ANNUAL',
                status: 'APPROVED'
              }
            }
          }
        }
      },
      orderBy: {
        firstName: 'asc'
      }
    })

    // Transform data to match frontend expectations
    const transformedEmployees = employees.map(emp => ({
      id: emp.id,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      department: emp.department,
      role: emp.role,
      annualLeaveEntitlement: emp.annualLeaveEntitlement,
      currentStatus: emp.currentStatus,
      currentLeaveDetails: emp.currentLeaveStartDate ? {
        startDate: emp.currentLeaveStartDate.toISOString().split('T')[0],
        endDate: emp.currentLeaveEndDate?.toISOString().split('T')[0],
        type: emp.currentLeaveType,
        remainingDays: emp.currentLeaveRemaining
      } : undefined,
      usedLeaveDays: emp._count.leaveRecords
    }))

    return NextResponse.json(transformedEmployees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

// POST /api/employees - Create new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = createEmployeeSchema.parse(body)

    // Check if email already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { email: validatedData.email }
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: 'Employee with this email already exists' },
        { status: 409 }
      )
    }

    // Create new employee
    const employee = await prisma.employee.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        department: validatedData.department,
        role: validatedData.role,
        annualLeaveEntitlement: validatedData.annualLeaveEntitlement,
        currentStatus: 'available'
      }
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    )
  }
}
```

### Install Zod for Validation:
```bash
npm install zod
```

### ✅ Expected Outcome:
- API route created successfully
- GET endpoint returns employee list
- POST endpoint creates new employees
- Proper validation and error handling

---

## **Step 2.2: Create Individual Employee API** (15 minutes)

### Instructions:
Create `src/app/api/employees/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  department: z.enum(['Driver', 'Kitchen', 'Security', 'Gardener', 'Cleaning', 'Maintenance']).optional(),
  role: z.string().min(1).optional(),
  annualLeaveEntitlement: z.number().min(1).max(50).optional(),
  currentStatus: z.enum(['available', 'on_leave', 'returning_soon']).optional(),
  currentLeaveStartDate: z.string().optional(),
  currentLeaveEndDate: z.string().optional(),
  currentLeaveType: z.string().optional(),
  currentLeaveRemaining: z.number().optional()
})

// GET /api/employees/[id] - Get employee by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        leaveRecords: {
          orderBy: {
            startDate: 'desc'
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Transform leave records for frontend
    const transformedEmployee = {
      ...employee,
      currentLeaveDetails: employee.currentLeaveStartDate ? {
        startDate: employee.currentLeaveStartDate.toISOString().split('T')[0],
        endDate: employee.currentLeaveEndDate?.toISOString().split('T')[0],
        type: employee.currentLeaveType,
        remainingDays: employee.currentLeaveRemaining
      } : undefined,
      leaveRecords: employee.leaveRecords.map(record => ({
        ...record,
        startDate: record.startDate.toISOString().split('T')[0],
        endDate: record.endDate.toISOString().split('T')[0]
      }))
    }

    return NextResponse.json(transformedEmployee)
  } catch (error) {
    console.error('Error fetching employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

// PUT /api/employees/[id] - Update employee
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate request data
    const validatedData = updateEmployeeSchema.parse(body)

    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Handle date conversions
    if (validatedData.currentLeaveStartDate) {
      updateData.currentLeaveStartDate = new Date(validatedData.currentLeaveStartDate)
    }
    if (validatedData.currentLeaveEndDate) {
      updateData.currentLeaveEndDate = new Date(validatedData.currentLeaveEndDate)
    }

    // Update employee
    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updatedEmployee)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating employee:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

// DELETE /api/employees/[id] - Delete employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if employee exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { id }
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Delete employee (cascade will handle leave records)
    await prisma.employee.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Employee deleted successfully' })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
```

### ✅ Expected Outcome:
- Individual employee API endpoints created
- GET, PUT, DELETE operations supported
- Proper error handling and validation

---

## **Step 2.3: Create Leave Records API** (25 minutes)

### Instructions:
Create `src/app/api/leave-records/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLeaveRecordSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalDays: z.number().min(1, 'Total days must be at least 1'),
  workingDays: z.number().min(1, 'Working days must be at least 1'),
  type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY']),
  status: z.enum(['APPROVED', 'PENDING', 'REJECTED']).default('APPROVED'),
  notes: z.string().optional(),
  year: z.number().min(2020).max(2030)
})

// GET /api/leave-records - Get leave records with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const year = searchParams.get('year')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const whereClause: any = {}
    
    if (employeeId) whereClause.employeeId = employeeId
    if (year) whereClause.year = parseInt(year)
    if (type) whereClause.type = type
    if (status) whereClause.status = status

    const leaveRecords = await prisma.leaveRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            email: true
          }
        }
      },
      orderBy: {
        startDate: 'desc'
      }
    })

    // Transform dates for frontend
    const transformedRecords = leaveRecords.map(record => ({
      ...record,
      startDate: record.startDate.toISOString().split('T')[0],
      endDate: record.endDate.toISOString().split('T')[0]
    }))

    return NextResponse.json(transformedRecords)
  } catch (error) {
    console.error('Error fetching leave records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave records' },
      { status: 500 }
    )
  }
}

// POST /api/leave-records - Create new leave record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request data
    const validatedData = createLeaveRecordSchema.parse(body)

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: validatedData.employeeId }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Check for overlapping leave records
    const startDate = new Date(validatedData.startDate)
    const endDate = new Date(validatedData.endDate)

    const overlappingLeave = await prisma.leaveRecord.findFirst({
      where: {
        employeeId: validatedData.employeeId,
        status: { in: ['APPROVED', 'PENDING'] },
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } }
            ]
          }
        ]
      }
    })

    if (overlappingLeave) {
      return NextResponse.json(
        { error: 'Leave dates overlap with existing approved/pending leave' },
        { status: 409 }
      )
    }

    // Create leave record
    const leaveRecord = await prisma.leaveRecord.create({
      data: {
        employeeId: validatedData.employeeId,
        startDate: startDate,
        endDate: endDate,
        totalDays: validatedData.totalDays,
        workingDays: validatedData.workingDays,
        type: validatedData.type,
        status: validatedData.status,
        notes: validatedData.notes,
        year: validatedData.year
      },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            email: true
          }
        }
      }
    })

    // Transform response
    const transformedRecord = {
      ...leaveRecord,
      startDate: leaveRecord.startDate.toISOString().split('T')[0],
      endDate: leaveRecord.endDate.toISOString().split('T')[0]
    }

    return NextResponse.json(transformedRecord, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error creating leave record:', error)
    return NextResponse.json(
      { error: 'Failed to create leave record' },
      { status: 500 }
    )
  }
}
```

### ✅ Expected Outcome:
- Leave records API endpoints created
- Support for filtering by employee, year, type, status
- Overlap detection for leave periods
- Proper validation and error handling

---

## **Step 2.4: Create Individual Leave Record API** (15 minutes)

### Instructions:
Create `src/app/api/leave-records/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateLeaveRecordSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  totalDays: z.number().min(1).optional(),
  workingDays: z.number().min(1).optional(),
  type: z.enum(['ANNUAL', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY']).optional(),
  status: z.enum(['APPROVED', 'PENDING', 'REJECTED']).optional(),
  notes: z.string().optional(),
  year: z.number().min(2020).max(2030).optional()
})

// GET /api/leave-records/[id] - Get leave record by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const leaveRecord = await prisma.leaveRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            email: true
          }
        }
      }
    })

    if (!leaveRecord) {
      return NextResponse.json(
        { error: 'Leave record not found' },
        { status: 404 }
      )
    }

    // Transform dates for frontend
    const transformedRecord = {
      ...leaveRecord,
      startDate: leaveRecord.startDate.toISOString().split('T')[0],
      endDate: leaveRecord.endDate.toISOString().split('T')[0]
    }

    return NextResponse.json(transformedRecord)
  } catch (error) {
    console.error('Error fetching leave record:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leave record' },
      { status: 500 }
    )
  }
}

// PUT /api/leave-records/[id] - Update leave record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate request data
    const validatedData = updateLeaveRecordSchema.parse(body)

    // Check if leave record exists
    const existingRecord = await prisma.leaveRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Leave record not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    
    // Handle date conversions
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate)
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate)
    }

    // Update leave record
    const updatedRecord = await prisma.leaveRecord.update({
      where: { id },
      data: updateData,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            email: true
          }
        }
      }
    })

    // Transform response
    const transformedRecord = {
      ...updatedRecord,
      startDate: updatedRecord.startDate.toISOString().split('T')[0],
      endDate: updatedRecord.endDate.toISOString().split('T')[0]
    }

    return NextResponse.json(transformedRecord)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error updating leave record:', error)
    return NextResponse.json(
      { error: 'Failed to update leave record' },
      { status: 500 }
    )
  }
}

// DELETE /api/leave-records/[id] - Delete leave record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Check if leave record exists
    const existingRecord = await prisma.leaveRecord.findUnique({
      where: { id }
    })

    if (!existingRecord) {
      return NextResponse.json(
        { error: 'Leave record not found' },
        { status: 404 }
      )
    }

    // Delete leave record
    await prisma.leaveRecord.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Leave record deleted successfully' })
  } catch (error) {
    console.error('Error deleting leave record:', error)
    return NextResponse.json(
      { error: 'Failed to delete leave record' },
      { status: 500 }
    )
  }
}
```

### ✅ Expected Outcome:
- Individual leave record CRUD operations
- Proper validation and error handling
- Date transformation for frontend compatibility

---

## **Step 2.5: Create API Utility Functions** (10 minutes)

### Instructions:
Create `src/lib/api-utils.ts`:

```typescript
// Date utilities for API consistency
export function formatDateForAPI(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function parseAPIDate(dateString: string): Date {
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

// Calculate total days between dates
export function calculateTotalDays(startDate: Date, endDate: Date): number {
  const timeDiff = endDate.getTime() - startDate.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1
}

// Error response helpers
export function createErrorResponse(message: string, status: number = 500) {
  return Response.json({ error: message }, { status })
}

export function createSuccessResponse(data: any, status: number = 200) {
  return Response.json(data, { status })
}
```

### ✅ Expected Outcome:
- Utility functions for date handling
- Consistent error responses
- Working day calculations

---

## **Step 2.6: Test All API Endpoints** (15 minutes)

### Instructions:
Create `src/app/api/test-all/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const tests = []

    // Test 1: Database connection
    try {
      await prisma.$connect()
      tests.push({ name: 'Database Connection', status: 'PASS' })
    } catch (error) {
      tests.push({ name: 'Database Connection', status: 'FAIL', error: error.message })
    }

    // Test 2: Employee table access
    try {
      const count = await prisma.employee.count()
      tests.push({ name: 'Employee Table Access', status: 'PASS', count })
    } catch (error) {
      tests.push({ name: 'Employee Table Access', status: 'FAIL', error: error.message })
    }

    // Test 3: Leave records table access
    try {
      const count = await prisma.leaveRecord.count()
      tests.push({ name: 'Leave Records Table Access', status: 'PASS', count })
    } catch (error) {
      tests.push({ name: 'Leave Records Table Access', status: 'FAIL', error: error.message })
    }

    const allPassed = tests.every(test => test.status === 'PASS')

    return NextResponse.json({
      status: allPassed ? 'ALL_TESTS_PASSED' : 'SOME_TESTS_FAILED',
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
```

### Manual API Testing:
1. Start dev server: `npm run dev`
2. Test endpoints:
   - `GET http://localhost:3000/api/test-all`
   - `GET http://localhost:3000/api/employees`
   - `POST http://localhost:3000/api/employees` (with JSON body)
   - `GET http://localhost:3000/api/leave-records`

### ✅ Expected Outcome:
- All API endpoints responding correctly
- Proper JSON responses
- Error handling working

---

## **Step 2.7: Remove Test Database Route** (2 minutes)

### Instructions:
```bash
# Remove the temporary test route from Phase 1
rm src/app/api/test-db/route.ts
```

### ✅ Expected Outcome:
- Temporary test route removed
- API structure clean and organized

---

## 🎉 **Phase 2 Complete!**

### ✅ **What You've Accomplished:**
- ✅ Complete REST API for employee management
- ✅ Complete REST API for leave record management
- ✅ Proper validation with Zod schema validation
- ✅ Error handling and HTTP status codes
- ✅ Date transformation for frontend compatibility
- ✅ Overlap detection for leave periods
- ✅ Utility functions for common operations
- ✅ API testing endpoints

### 📁 **Files Created:**
- ✅ `src/app/api/employees/route.ts`
- ✅ `src/app/api/employees/[id]/route.ts`
- ✅ `src/app/api/leave-records/route.ts`
- ✅ `src/app/api/leave-records/[id]/route.ts`
- ✅ `src/lib/api-utils.ts`
- ✅ `src/app/api/test-all/route.ts`

### 📁 **Dependencies Added:**
- ✅ `zod` for validation

### 🔌 **API Endpoints Available:**

**Employee Management:**
- `GET /api/employees` - List employees (with department filter)
- `POST /api/employees` - Create employee
- `GET /api/employees/[id]` - Get employee details
- `PUT /api/employees/[id]` - Update employee
- `DELETE /api/employees/[id]` - Delete employee

**Leave Management:**
- `GET /api/leave-records` - List leave records (with filters)
- `POST /api/leave-records` - Create leave record
- `GET /api/leave-records/[id]` - Get leave record
- `PUT /api/leave-records/[id]` - Update leave record
- `DELETE /api/leave-records/[id]` - Delete leave record

---

## 🚨 **Troubleshooting**

### **API Returns 500 Errors**
- Check database connection in Phase 1
- Verify environment variables are loaded
- Check server logs for detailed errors

### **Validation Errors**
- Ensure request body matches Zod schemas
- Check required fields are provided
- Verify data types match expectations

### **CORS Issues (if testing with external tools)**
- Add CORS headers if needed for API testing tools
- Use browser dev tools Network tab for debugging

---

## ➡️ **Next Steps**
Ready for Phase 3: Frontend Integration!