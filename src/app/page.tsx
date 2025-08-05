"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { mockEmployees, type Employee } from "@/data/mockData"

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newEmployee, setNewEmployee] = useState<NewEmployeeForm>({
    firstName: "",
    lastName: "",
    email: "",
    department: "Driver",
    role: "",
    annualLeaveEntitlement: 25
  })

  useEffect(() => {
    // Load employees from localStorage or use mock data
    const loadEmployees = () => {
      try {
        const savedEmployees = localStorage.getItem('homestaff-employees')
        if (savedEmployees) {
          const parsed = JSON.parse(savedEmployees)
          setEmployees(parsed)
        } else {
          // First time - save mock data to localStorage
          setEmployees(mockEmployees)
          localStorage.setItem('homestaff-employees', JSON.stringify(mockEmployees))
        }
      } catch (error) {
        console.error('Error loading employees:', error)
        setEmployees(mockEmployees)
      }
      setLoading(false)
    }

    // Simulate API call delay
    setTimeout(loadEmployees, 500)
  }, [])

  const availableDepartments = ["Driver", "Kitchen", "Security", "Gardener", "Cleaning", "Maintenance"]
  const departments = ["All", ...new Set(employees.map(emp => emp.department))]

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate new ID
    const newId = (Math.max(...employees.map(emp => parseInt(emp.id))) + 1).toString()
    
    // Create new employee object
    const employee: Employee = {
      id: newId,
      firstName: newEmployee.firstName,
      lastName: newEmployee.lastName,
      email: newEmployee.email,
      department: newEmployee.department,
      role: newEmployee.role,
      annualLeaveEntitlement: newEmployee.annualLeaveEntitlement,
      currentStatus: "available"
    }
    
    // Add to employees list
    const updatedEmployees = [...employees, employee]
    setEmployees(updatedEmployees)
    
    // Save to localStorage
    localStorage.setItem('homestaff-employees', JSON.stringify(updatedEmployees))
    
    // Reset form
    setNewEmployee({
      firstName: "",
      lastName: "",
      email: "",
      department: "Driver",
      role: "",
      annualLeaveEntitlement: 25
    })
    
    // Close modal
    setShowAddModal(false)
  }

  const handleInputChange = (field: keyof NewEmployeeForm, value: string | number) => {
    setNewEmployee(prev => ({
      ...prev,
      [field]: value
    }))
  }
  
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

  if (loading) {
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            <p className="text-2xl font-bold text-gray-900">{filteredEmployees.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Available</h3>
            <p className="text-2xl font-bold text-green-600">
              {filteredEmployees.filter(emp => emp.currentStatus === "available").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">On Leave</h3>
            <p className="text-2xl font-bold text-red-600">
              {filteredEmployees.filter(emp => emp.currentStatus === "on_leave").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Returning Soon</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {filteredEmployees.filter(emp => emp.currentStatus === "returning_soon").length}
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
                        {employee.firstName[0]}{employee.lastName[0]}
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

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Add New Staff Member</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
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
                    value={newEmployee.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={newEmployee.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    value={newEmployee.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department *
                  </label>
                  <select
                    required
                    value={newEmployee.department}
                    onChange={(e) => handleInputChange("department", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    value={newEmployee.role}
                    onChange={(e) => handleInputChange("role", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    value={newEmployee.annualLeaveEntitlement}
                    onChange={(e) => handleInputChange("annualLeaveEntitlement", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="25"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    Add Staff Member
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
