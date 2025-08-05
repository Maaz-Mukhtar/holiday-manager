"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
  getEmployeeById, 
  getLeaveRecordsByEmployeeId, 
  getAvailableYears,
  calculateUsedLeaveDays,
  type Employee, 
  type LeaveRecord 
} from "@/data/mockData"

export default function EmployeeDetail({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [leaveRecords, setLeaveRecords] = useState<LeaveRecord[]>([])
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const emp = getEmployeeById(params.id)
      if (emp) {
        setEmployee(emp)
        const allRecords = getLeaveRecordsByEmployeeId(params.id)
        setLeaveRecords(allRecords)
        const years = getAvailableYears(params.id)
        setAvailableYears(years.length > 0 ? years : [new Date().getFullYear()])
      }
      setLoading(false)
    }, 500)
  }, [params.id])

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

  const filteredRecords = leaveRecords.filter(record => record.year === selectedYear)
  const usedAnnualDays = calculateUsedLeaveDays(params.id, selectedYear)
  const remainingAnnualDays = employee.annualLeaveEntitlement - usedAnnualDays

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