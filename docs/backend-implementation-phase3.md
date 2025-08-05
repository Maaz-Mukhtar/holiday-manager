# Phase 3: Frontend Integration

## 🎯 **Phase 3 Goal**
Replace localStorage-based system with API calls, implement proper loading states, error handling, and create a seamless user experience.

## ⏱️ **Total Time Estimate: 2-3 hours**

## 📋 **Prerequisites**
- Phase 1 & 2 completed successfully
- All API endpoints tested and working
- Development server running
- No compilation errors

---

## **Step 3.1: Create API Client Utility** (15 minutes)

### Instructions:
Create `src/lib/api-client.ts`:

```typescript
// API client with proper error handling and type safety

export type APIError = {
  error: string
  details?: any
}

export type Employee = {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  annualLeaveEntitlement: number
  currentStatus: 'available' | 'on_leave' | 'returning_soon'
  currentLeaveDetails?: {
    startDate: string
    endDate: string
    type: string
    remainingDays: number
  }
  usedLeaveDays?: number
}

export type LeaveRecord = {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY'
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  notes?: string
  year: number
  employee?: {
    firstName: string
    lastName: string
    department: string
    email: string
  }
}

export type CreateEmployeeData = {
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  annualLeaveEntitlement: number
}

export type CreateLeaveRecordData = {
  employeeId: string
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY'
  status?: 'APPROVED' | 'PENDING' | 'REJECTED'
  notes?: string
  year: number
}

class APIClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NODE_ENV === 'production' 
      ? '' // Use relative URLs in production
      : 'http://localhost:3000'
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }
    return response.json()
  }

  // Employee API methods
  async getAllEmployees(department?: string): Promise<Employee[]> {
    const url = new URL(`${this.baseURL}/api/employees`)
    if (department && department !== 'All') {
      url.searchParams.set('department', department)
    }
    
    const response = await fetch(url.toString())
    return this.handleResponse<Employee[]>(response)
  }

  async getEmployeeById(id: string): Promise<Employee> {
    const response = await fetch(`${this.baseURL}/api/employees/${id}`)
    return this.handleResponse<Employee>(response)
  }

  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    const response = await fetch(`${this.baseURL}/api/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<Employee>(response)
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const response = await fetch(`${this.baseURL}/api/employees/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<Employee>(response)
  }

  async deleteEmployee(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/employees/${id}`, {
      method: 'DELETE',
    })
    await this.handleResponse<{ message: string }>(response)
  }

  // Leave Records API methods
  async getLeaveRecords(filters?: {
    employeeId?: string
    year?: number
    type?: string
    status?: string
  }): Promise<LeaveRecord[]> {
    const url = new URL(`${this.baseURL}/api/leave-records`)
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value.toString())
      })
    }
    
    const response = await fetch(url.toString())
    return this.handleResponse<LeaveRecord[]>(response)
  }

  async createLeaveRecord(data: CreateLeaveRecordData): Promise<LeaveRecord> {
    const response = await fetch(`${this.baseURL}/api/leave-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<LeaveRecord>(response)
  }

  async updateLeaveRecord(id: string, data: Partial<LeaveRecord>): Promise<LeaveRecord> {
    const response = await fetch(`${this.baseURL}/api/leave-records/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    return this.handleResponse<LeaveRecord>(response)
  }

  async deleteLeaveRecord(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/leave-records/${id}`, {
      method: 'DELETE',
    })
    await this.handleResponse<{ message: string }>(response)
  }
}

export const apiClient = new APIClient()
```

### ✅ Expected Outcome:
- Centralized API client with type safety
- Proper error handling
- Environment-aware base URLs
- Ready for use in components

---

## **Step 3.2: Update Homepage with API Integration** (25 minutes)

### Instructions:
Update `src/app/page.tsx` to replace localStorage with API calls:

```typescript
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { apiClient, type Employee, type CreateEmployeeData } from "@/lib/api-client"

type NewEmployeeForm = {
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  annualLeaveEntitlement: number
}

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All")
  const [showAddModal, setShowAddModal] = useState(false)
  const [addingEmployee, setAddingEmployee] = useState(false)
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    firstName: "",
    lastName: "",
    email: "",
    department: "Driver",
    role: "",
    annualLeaveEntitlement: 25
  })

  const availableDepartments = ["Driver", "Kitchen", "Security", "Gardener", "Cleaning", "Maintenance"]

  // Load employees from API
  useEffect(() => {
    loadEmployees()
  }, [selectedDepartment])

  const loadEmployees = async () => {
    try {
      setError(null)
      setLoading(true)
      const data = await apiClient.getAllEmployees(selectedDepartment)
      setEmployees(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees')
      console.error('Error loading employees:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setAddingEmployee(true)
      setError(null)

      const employeeData: CreateEmployeeData = {
        firstName: newEmployee.firstName,
        lastName: newEmployee.lastName,
        email: newEmployee.email,
        department: newEmployee.department,
        role: newEmployee.role,
        annualLeaveEntitlement: newEmployee.annualLeaveEntitlement
      }

      const createdEmployee = await apiClient.createEmployee(employeeData)
      
      // Add to local state for immediate UI update
      setEmployees(prev => [...prev, createdEmployee])
      
      // Reset form and close modal
      setNewEmployee({
        firstName: "",
        lastName: "",
        email: "",
        department: "Driver",
        role: "",
        annualLeaveEntitlement: 25
      })
      setShowAddModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee')
    } finally {
      setAddingEmployee(false)
    }
  }

  const handleInputChange = (field: keyof NewEmployeeForm, value: string | number) => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const departments = ["All", ...new Set(employees.map(emp => emp.department))]
  
  const filteredEmployees = selectedDepartment === "All" 
    ? employees 
    : employees.filter(emp => emp.department === selectedDepartment)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200"
      case "on_leave":
        return "bg-red-100 text-red-800 border-red-200"
      case "returning_soon":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Available"
      case "on_leave":
        return "On Leave"
      case "returning_soon":
        return "Returning Soon"
      default:
        return "Unknown"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return "✓"
      case "on_leave":
        return "✈"
      case "returning_soon":
        return "⏰"
      default:
        return "?"
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-red-500 hover:text-red-700"
              >
                ×
              </button>
            </div>
            <button
              onClick={loadEmployees}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">HomeStaff Status Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">
              View current household staff availability and leave status
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <span className="text-lg">+</span>
            Add Staff Member
          </button>
        </div>

        {/* Department Filter */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDepartment(dept)}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  selectedDepartment === dept
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Staff</h3>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "..." : filteredEmployees.length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Available</h3>
            <p className="text-2xl font-bold text-green-600">
              {loading ? "..." : filteredEmployees.filter(emp => emp.currentStatus === "available").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">On Leave</h3>
            <p className="text-2xl font-bold text-red-600">
              {loading ? "..." : filteredEmployees.filter(emp => emp.currentStatus === "on_leave").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Returning Soon</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {loading ? "..." : filteredEmployees.filter(emp => emp.currentStatus === "returning_soon").length}
            </p>
          </div>
        </div>

        {/* Staff Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredEmployees.map((employee) => (
            <Link key={employee.id} href={`/employee/${employee.id}`}>
              <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200">
                <div className="p-6">
                  {/* Employee Info */}
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 font-semibold text-lg">
                        {employee.firstName[0]}{employee.lastName[0] || ""}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{employee.role}</p>
                    </div>
                  </div>

                  {/* Department */}
                  <div className="mb-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {employee.department}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="mb-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(employee.currentStatus)}`}>
                      <span className="mr-1">{getStatusIcon(employee.currentStatus)}</span>
                      {getStatusText(employee.currentStatus)}
                    </span>
                  </div>

                  {/* Leave Details */}
                  {employee.currentLeaveDetails && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600 mb-1">
                        {formatDateRange(employee.currentLeaveDetails.startDate, employee.currentLeaveDetails.endDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.currentStatus === "on_leave" 
                          ? `${getDaysRemaining(employee.currentLeaveDetails.endDate)} days remaining`
                          : employee.currentStatus === "returning_soon"
                          ? `Returns in ${getDaysRemaining(employee.currentLeaveDetails.endDate)} day(s)`
                          : ""
                        }
                      </div>
                      <div className="text-xs font-medium text-gray-700 mt-1">
                        {employee.currentLeaveDetails.type} Leave
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {!loading && filteredEmployees.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No staff members found</p>
            <p className="text-gray-400 text-sm mt-2">
              {selectedDepartment !== "All" 
                ? `No employees in ${selectedDepartment} department`
                : "Start by adding your first staff member"
              }
            </p>
          </div>
        )}

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  disabled={addingEmployee}
                  className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={addingEmployee}
                    value={newEmployee.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    disabled={addingEmployee}
                    value={newEmployee.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="Enter last name (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    disabled={addingEmployee}
                    value={newEmployee.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    disabled={addingEmployee}
                    value={newEmployee.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                  >
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Role *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={addingEmployee}
                    value={newEmployee.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="Enter job role"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Annual Leave Entitlement (days) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="50"
                    disabled={addingEmployee}
                    value={newEmployee.annualLeaveEntitlement}
                    onChange={(e) => handleInputChange("annualLeaveEntitlement", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    placeholder="25"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    disabled={addingEmployee}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingEmployee}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {addingEmployee ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Adding...
                      </>
                    ) : (
                      "Add Staff Member"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

### ✅ Expected Outcome:
- Homepage uses API instead of localStorage
- Proper loading states and error handling
- Real-time updates when adding employees
- Better user experience with feedback

---

## **Step 3.3: Update Employee Detail Page with API Integration** (20 minutes)

### Instructions:
Update `src/app/employee/[id]/page.tsx`:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  apiClient,
  type Employee, 
  type LeaveRecord 
} from "@/lib/api-client"

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [employeeId, setEmployeeId] = useState<string>("")

  useEffect(() => {
    params.then((resolvedParams) => {
      setEmployeeId(resolvedParams.id)
      loadEmployeeData(resolvedParams.id)
    })
  }, [params])

  useEffect(() => {
    if (employeeId) {
      loadLeaveRecords()
    }
  }, [selectedYear, employeeId])

  const loadEmployeeData = async (id: string) => {
    try {
      setError(null)
      setLoading(true)
      
      const emp = await apiClient.getEmployeeById(id)
      setEmployee(emp)
      
      // Load leave records to get available years
      const records = await apiClient.getLeaveRecords({ employeeId: id })
      setLeaveRecords(records)
      
      // Calculate available years
      const years = [...new Set(records.map(record => record.year))]
      const sortedYears = years.sort((a, b) => b - a) // Most recent first
      setAvailableYears(sortedYears.length > 0 ? sortedYears : [new Date().getFullYear()])
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employee')
      console.error('Error loading employee:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadLeaveRecords = async () => {
    if (!employeeId) return
    
    try {
      const records = await apiClient.getLeaveRecords({ 
        employeeId, 
        year: selectedYear 
      })
      setLeaveRecords(records)
    } catch (err) {
      console.error('Error loading leave records:', err)
      // Don't set main error state for leave records failure
    }
  }

  const filteredRecords = leaveRecords.filter(record => record.year === selectedYear)
  const usedAnnualDays = filteredRecords
    .filter(record => record.status === 'APPROVED' && record.type === 'ANNUAL')
    .reduce((total, record) => total + record.workingDays, 0)
  const remainingAnnualDays = employee ? employee.annualLeaveEntitlement - usedAnnualDays : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 border-green-200"
      case "on_leave":
        return "bg-red-100 text-red-800 border-red-200"
      case "returning_soon":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "available":
        return "Available"
      case "on_leave":
        return "On Leave"
      case "returning_soon":
        return "Returning Soon"
      default:
        return "Unknown"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "available":
        return "✓"
      case "on_leave":
        return "✈"
      case "returning_soon":
        return "⏰"
      default:
        return "?"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ANNUAL":
        return "bg-blue-100 text-blue-800"
      case "SICK":
        return "bg-purple-100 text-purple-800"
      case "PERSONAL":
        return "bg-orange-100 text-orange-800"
      case "MATERNITY":
        return "bg-pink-100 text-pink-800"
      case "PATERNITY":
        return "bg-cyan-100 text-cyan-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getRecordStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "PENDING":
        return "bg-yellow-100 text-yellow-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  }

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 0 ? diffDays : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading employee details...</p>
        </div>
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error || "Employee Not Found"}
          </h1>
          <p className="text-gray-600 mb-4">
            {error ? "There was an error loading the employee details." : "The requested employee could not be found."}
          </p>
          <div className="space-x-4">
            <Link href="/" className="text-indigo-600 hover:text-indigo-500">
              ← Back to Employee List
            </Link>
            {error && (
              <button
                onClick={() => employeeId && loadEmployeeData(employeeId)}
                className="text-indigo-600 hover:text-indigo-500 underline"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
            ← Back to Employee List
          </Link>
        </div>

        {/* Employee Header */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-8">
            <div className="flex items-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-indigo-600 font-bold text-2xl">
                  {employee.firstName[0]}{employee.lastName[0] || ""}
                </span>
              </div>
              <div className="ml-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="text-lg text-gray-600 mt-1">{employee.role}</p>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="inline-flex px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-800">
                    {employee.department}
                  </span>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(employee.currentStatus)}`}>
                    <span className="mr-1">{getStatusIcon(employee.currentStatus)}</span>
                    {getStatusText(employee.currentStatus)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Leave Details */}
            {employee.currentLeaveDetails && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Leave</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <p className="font-medium">{formatDateRange(employee.currentLeaveDetails.startDate, employee.currentLeaveDetails.endDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="font-medium">{employee.currentLeaveDetails.type} Leave</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium">
                      {employee.currentStatus === "on_leave" 
                        ? `${getDaysRemaining(employee.currentLeaveDetails.endDate)} days remaining`
                        : employee.currentStatus === "returning_soon"
                        ? `Returns in ${getDaysRemaining(employee.currentLeaveDetails.endDate)} day(s)`
                        : "Available"
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Leave Summary & Year Filter */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Leave Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Summary {selectedYear}</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Annual Leave Entitlement</span>
                    <span className="font-medium">{employee.annualLeaveEntitlement} days</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Used</span>
                    <span className="font-medium text-red-600">{usedAnnualDays} days</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Remaining</span>
                    <span className="font-medium text-green-600">{remainingAnnualDays} days</span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${Math.min((usedAnnualDays / employee.annualLeaveEntitlement) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((usedAnnualDays / employee.annualLeaveEntitlement) * 100)}% used
                  </p>
                </div>
              </div>

              {/* Year Filter */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">View Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Leave History */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-medium text-gray-900">Leave History - {selectedYear}</h2>
              </div>
              
              {filteredRecords.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No leave records found for {selectedYear}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Dates
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Days
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredRecords
                        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
                        .map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDateRange(record.startDate, record.endDate)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.workingDays} working days
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(record.type)}`}>
                              {record.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecordStatusColor(record.status)}`}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {record.notes || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### ✅ Expected Outcome:
- Employee detail page uses API calls
- Proper error handling and loading states  
- Leave records filtered by year from API
- Better user experience with feedback

---

## **Step 3.4: Remove Old Mock Data Dependencies** (10 minutes)

### Instructions:
Update `src/data/mockData.ts` to keep only types and remove static data:

```typescript
// Keep types for compatibility but remove static data
export type Employee = {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  profileImage?: string
  annualLeaveEntitlement: number
  currentStatus: 'available' | 'on_leave' | 'returning_soon'
  currentLeaveDetails?: {
    startDate: string
    endDate: string
    type: string
    remainingDays: number
  }
}

export type LeaveRecord = {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  type: 'ANNUAL' | 'SICK' | 'PERSONAL' | 'MATERNITY' | 'PATERNITY'
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  notes?: string
  year: number
}

// Legacy functions - deprecated, use API client instead
export const getEmployeeById = () => {
  console.warn('getEmployeeById is deprecated. Use apiClient.getEmployeeById instead.')
  return null
}

export const getLeaveRecordsByEmployeeId = () => {
  console.warn('getLeaveRecordsByEmployeeId is deprecated. Use apiClient.getLeaveRecords instead.')
  return []
}

export const getAvailableYears = () => {
  console.warn('getAvailableYears is deprecated. Calculate from API data instead.')
  return [new Date().getFullYear()]
}

export const calculateUsedLeaveDays = () => {
  console.warn('calculateUsedLeaveDays is deprecated. Calculate from API data instead.')
  return 0
}

// Keep mock data for Phase 4 migration only
export const mockEmployees: Employee[] = [
  {
    id: "1",
    firstName: "Aqeel",
    lastName: "",
    email: "aqeel@homestaff.com",
    department: "Driver",
    role: "Personal Driver",
    annualLeaveEntitlement: 25,
    currentStatus: "on_leave",
    currentLeaveDetails: {
      startDate: "2024-08-01",
      endDate: "2024-08-15",
      type: "ANNUAL",
      remainingDays: 3
    }
  },
  // ... rest of mock data kept for migration
]

export const mockLeaveRecords: LeaveRecord[] = [
  // ... keep for migration in Phase 4
]
```

This keeps the data available for Phase 4 migration while warning about deprecated usage.

### ✅ Expected Outcome:
- Mock data still available for migration
- Clear deprecation warnings
- Types maintained for compatibility

---

## **Step 3.5: Add Loading and Error States** (10 minutes)

### Instructions:
Create `src/components/LoadingSpinner.tsx`:

```typescript
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  }

  return (
    <div className={`inline-block animate-spin rounded-full border-b-2 border-indigo-600 ${sizeClasses[size]}`}></div>
  )
}
```

Create `src/components/ErrorMessage.tsx`:

```typescript
interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorMessage({ message, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <p className="font-medium">Error</p>
          <p className="text-sm mt-1">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-sm underline hover:no-underline mt-2"
            >
              Try again
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700 ml-4"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
```

### ✅ Expected Outcome:
- Reusable loading and error components
- Consistent UI patterns across the app
- Better user experience

---

## **Step 3.6: Test Complete Integration** (10 minutes)

### Instructions:
1. Start development server: `npm run dev`
2. Test all functionality:
   - Homepage loads employees from API
   - Department filtering works
   - Add new employee works
   - Click employee card loads detail page
   - Employee detail shows correct data
   - Year filtering works on detail page
   - Error states display properly

### Manual Testing Checklist:
- [ ] Homepage loads without errors
- [ ] Employee cards display correctly
- [ ] Add employee form works
- [ ] New employees appear immediately
- [ ] Employee detail pages load
- [ ] Leave history displays correctly
- [ ] Error handling works (test with network off)
- [ ] Loading states show properly

### ✅ Expected Outcome:
- Complete API integration working
- No localStorage dependencies
- Proper error handling and loading states
- Seamless user experience

---

## 🎉 **Phase 3 Complete!**

### ✅ **What You've Accomplished:**
- ✅ Complete API integration replacing localStorage
- ✅ Type-safe API client with error handling
- ✅ Proper loading states throughout the application
- ✅ Error handling with user feedback and retry options
- ✅ Real-time updates when creating employees
- ✅ Optimistic UI updates for better user experience
- ✅ Reusable components for loading and error states
- ✅ Cross-device data synchronization via database

### 📁 **Files Created:**
- ✅ `src/lib/api-client.ts`
- ✅ `src/components/LoadingSpinner.tsx`
- ✅ `src/components/ErrorMessage.tsx`

### 📁 **Files Modified:**
- ✅ `src/app/page.tsx` (API integration)
- ✅ `src/app/employee/[id]/page.tsx` (API integration)
- ✅ `src/data/mockData.ts` (deprecated functions)

### 🚀 **Benefits Achieved:**
- **Multi-device access** - Data accessible from any device
- **Real-time sync** - Changes appear across all devices
- **Better performance** - Server-side data processing
- **Data persistence** - No more data loss on refresh
- **Error resilience** - Graceful handling of network issues
- **Type safety** - Full TypeScript support for API calls

---

## 🚨 **Troubleshooting**

### **API Calls Failing**
- Check Phase 1 & 2 setup is complete
- Verify database connection works
- Check browser Network tab for specific errors
- Ensure development server is running

### **Loading States Not Showing**
- Check component state management
- Verify loading states are set properly
- Test with slow network to see loading states

### **Type Errors**
- Ensure API client types match database schema
- Check Prisma client is generated
- Verify import paths are correct

---

## ➡️ **Next Steps**
Ready for Phase 4: Data Migration & Cleanup!