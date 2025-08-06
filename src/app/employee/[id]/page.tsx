"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

type Employee = {
  id: string
  firstName: string
  lastName: string
  email: string
  department: string
  role: string
  annualLeaveEntitlement: number
  currentStatus: string
  currentLeaveStartDate?: string | null
  currentLeaveEndDate?: string | null
  currentLeaveType?: string | null
  createdAt: string
  updatedAt: string
  leaveRecords?: LeaveRecord[]
}

type LeaveRecord = {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  type: string
  status: string
  notes?: string | null
  bonus?: number | null
  year: number
  createdAt: string
  updatedAt: string
}

type LeaveForm = {
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  type: string
  status: string
  notes: string
  bonus: number
  year: number
}

export default function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddLeaveModal, setShowAddLeaveModal] = useState(false)
  const [editingLeave, setEditingLeave] = useState<LeaveRecord | null>(null)
  
  const [leaveForm, setLeaveForm] = useState<LeaveForm>({
    startDate: "",
    endDate: "",
    totalDays: 1,
    workingDays: 1,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "",
    bonus: 0,
    year: new Date().getFullYear()
  })

  const leaveTypes = ["ANNUAL", "SICK", "PERSONAL", "MATERNITY", "PATERNITY"]
  const leaveStatuses = ["APPROVED", "PENDING", "REJECTED"]

  useEffect(() => {
    // Resolve params Promise and get employee data
    params.then(async (resolvedParams) => {
      
      // Load employee data from database API
      const loadEmployeeData = async () => {
        try {
          const response = await fetch(`/api/employees/${resolvedParams.id}`)
          const data = await response.json()
          
          if (data.success && data.employee) {
            setEmployee(data.employee)
            
            // Extract available years from leave records
            const leaveRecords = data.employee.leaveRecords || []
            const years = [...new Set(leaveRecords.map((record: LeaveRecord) => record.year))] as number[]
            setAvailableYears(years.length > 0 ? years.sort((a, b) => b - a) : [new Date().getFullYear()])
          } else {
            console.error('Employee not found:', data.error)
            setEmployee(null)
          }
        } catch (error) {
          console.error('Error loading employee data:', error)
          setEmployee(null)
        }
        setLoading(false)
      }
      
      loadEmployeeData()
    })
  }, [params])

  const calculateDays = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { total: 1, working: 1 }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (start >= end) return { total: 1, working: 1 }
    
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
    
    // Simple working days calculation (exclude weekends)
    let workingDays = 0
    const currentDate = new Date(start)
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
        workingDays++
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    return { total: totalDays, working: workingDays }
  }

  const handleFormChange = (field: keyof LeaveForm, value: string | number) => {
    const newForm = { ...leaveForm, [field]: value }
    
    // Auto-calculate days when dates change
    if (field === 'startDate' || field === 'endDate') {
      const { total, working } = calculateDays(newForm.startDate, newForm.endDate)
      newForm.totalDays = total
      newForm.workingDays = working
      
      // Auto-set year based on start date
      if (field === 'startDate' && newForm.startDate) {
        newForm.year = new Date(newForm.startDate).getFullYear()
      }
    }
    
    setLeaveForm(newForm)
  }

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!employee) return
    
    try {
      const response = await fetch('/api/leave-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...leaveForm,
          employeeId: employee.id
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh employee data to get updated records and status
        const updatedResponse = await fetch(`/api/employees/${employee.id}`)
        const updatedData = await updatedResponse.json()
        
        if (updatedData.success) {
          setEmployee(updatedData.employee)
          
          // Update available years
          const leaveRecords = updatedData.employee.leaveRecords || []
          const years = [...new Set(leaveRecords.map((record: LeaveRecord) => record.year))] as number[]
          setAvailableYears(years.length > 0 ? years.sort((a, b) => b - a) : [new Date().getFullYear()])
        }
        
        // Reset form and close modal
        setLeaveForm({
          startDate: "",
          endDate: "",
          totalDays: 1,
          workingDays: 1,
          type: "ANNUAL",
          status: "APPROVED",
          notes: "",
          bonus: 0,
          year: new Date().getFullYear()
        })
        setShowAddLeaveModal(false)
      } else {
        alert('Error adding leave record: ' + data.error)
      }
    } catch (error) {
      console.error('Error adding leave record:', error)
      alert('Failed to add leave record. Please try again.')
    }
  }

  const handleEditLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!editingLeave) return
    
    try {
      const response = await fetch(`/api/leave-records/${editingLeave.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaveForm)
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh employee data
        const updatedResponse = await fetch(`/api/employees/${employee?.id}`)
        const updatedData = await updatedResponse.json()
        
        if (updatedData.success) {
          setEmployee(updatedData.employee)
        }
        
        // Reset form and close modal
        setEditingLeave(null)
        setLeaveForm({
          startDate: "",
          endDate: "",
          totalDays: 1,
          workingDays: 1,
          type: "ANNUAL",
          status: "APPROVED",
          notes: "",
          bonus: 0,
          year: new Date().getFullYear()
        })
      } else {
        alert('Error updating leave record: ' + data.error)
      }
    } catch (error) {
      console.error('Error updating leave record:', error)
      alert('Failed to update leave record. Please try again.')
    }
  }

  const handleDeleteLeave = async (leaveId: string) => {
    if (!confirm('Are you sure you want to delete this leave record?')) return
    
    try {
      const response = await fetch(`/api/leave-records/${leaveId}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh employee data
        const updatedResponse = await fetch(`/api/employees/${employee?.id}`)
        const updatedData = await updatedResponse.json()
        
        if (updatedData.success) {
          setEmployee(updatedData.employee)
        }
      } else {
        alert('Error deleting leave record: ' + data.error)
      }
    } catch (error) {
      console.error('Error deleting leave record:', error)
      alert('Failed to delete leave record. Please try again.')
    }
  }

  const startEditLeave = (leave: LeaveRecord) => {
    setEditingLeave(leave)
    setLeaveForm({
      startDate: leave.startDate.split('T')[0], // Convert to YYYY-MM-DD format
      endDate: leave.endDate.split('T')[0],
      totalDays: leave.totalDays,
      workingDays: leave.workingDays,
      type: leave.type,
      status: leave.status,
      notes: leave.notes || "",
      bonus: leave.bonus || 0,
      year: leave.year
    })
  }

  const closeModal = () => {
    setShowAddLeaveModal(false)
    setEditingLeave(null)
    setLeaveForm({
      startDate: "",
      endDate: "",
      totalDays: 1,
      workingDays: 1,
      type: "ANNUAL",
      status: "APPROVED",
      notes: "",
      bonus: 0,
      year: new Date().getFullYear()
    })
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

  if (!employee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Employee Not Found</h1>
          <Link href="/" className="text-indigo-600 hover:text-indigo-500">
            ← Back to Employee List
          </Link>
        </div>
      </div>
    )
  }

  const leaveRecords = employee?.leaveRecords || []
  const filteredRecords = leaveRecords.filter(record => record.year === selectedYear)
  const usedAnnualDays = filteredRecords
    .filter(record => record.type === 'ANNUAL' && record.status === 'APPROVED')
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
                  {employee.firstName[0]}{employee.lastName[0]}
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
            {(employee.currentLeaveStartDate && employee.currentLeaveEndDate && employee.currentLeaveType) && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Leave</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Period:</span>
                    <p className="font-medium text-black">{formatDateRange(employee.currentLeaveStartDate, employee.currentLeaveEndDate)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <p className="font-medium text-black">{employee.currentLeaveType} Leave</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium text-black">
                      {employee.currentStatus === "on_leave" 
                        ? `${getDaysRemaining(employee.currentLeaveEndDate)} days remaining`
                        : employee.currentStatus === "returning_soon"
                        ? `Returns in ${getDaysRemaining(employee.currentLeaveEndDate)} day(s)`
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
                    <span className="font-medium text-blue-600">{employee.annualLeaveEntitlement} days</span>
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
                      style={{ width: `${(usedAnnualDays / employee.annualLeaveEntitlement) * 100}%` }}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* Add Leave Button */}
              <div className="mt-6">
                <button
                  onClick={() => setShowAddLeaveModal(true)}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <span className="text-lg">+</span>
                  Add Leave Record
                </button>
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
                          Bonus (PKR)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Notes
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
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
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.bonus ? `₨${record.bonus.toLocaleString()}` : "-"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                            {record.notes || "-"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => startEditLeave(record)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteLeave(record.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
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

        {/* Add/Edit Leave Modal */}
        {(showAddLeaveModal || editingLeave) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingLeave ? 'Edit Leave Record' : 'Add Leave Record'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={editingLeave ? handleEditLeave : handleAddLeave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => handleFormChange("startDate", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => handleFormChange("endDate", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Total Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leaveForm.totalDays}
                      onChange={(e) => handleFormChange("totalDays", parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Working Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={leaveForm.workingDays}
                      onChange={(e) => handleFormChange("workingDays", parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leave Type *
                  </label>
                  <select
                    required
                    value={leaveForm.type}
                    onChange={(e) => handleFormChange("type", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  >
                    {leaveTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    required
                    value={leaveForm.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  >
                    {leaveStatuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <input
                    type="number"
                    value={leaveForm.year}
                    onChange={(e) => handleFormChange("year", parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bonus (PKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leaveForm.bonus}
                    onChange={(e) => handleFormChange("bonus", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="Enter bonus amount in PKR (optional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={leaveForm.notes}
                    onChange={(e) => handleFormChange("notes", e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                    placeholder="Optional notes about this leave..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    {editingLeave ? 'Update Leave' : 'Add Leave'}
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