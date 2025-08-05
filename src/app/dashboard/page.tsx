"use client"

import { useState, useEffect } from "react"

type Holiday = {
  id: string
  startDate: string
  endDate: string
  totalDays: number
  workingDays: number
  holidayType: string
  status: string
  notes?: string
  user: {
    firstName: string
    lastName: string
    department: string
  }
}

const mockHolidays: Holiday[] = [
  {
    id: "1",
    startDate: "2024-08-15",
    endDate: "2024-08-20",
    totalDays: 6,
    workingDays: 4,
    holidayType: "ANNUAL",
    status: "APPROVED",
    notes: "Summer vacation",
    user: {
      firstName: "John",
      lastName: "Doe",
      department: "IT"
    }
  },
  {
    id: "2",
    startDate: "2024-09-01",
    endDate: "2024-09-03",
    totalDays: 3,
    workingDays: 3,
    holidayType: "SICK",
    status: "PENDING",
    notes: "Medical appointment",
    user: {
      firstName: "Jane",
      lastName: "Smith",
      department: "HR"
    }
  },
  {
    id: "3",
    startDate: "2024-10-10",
    endDate: "2024-10-12",
    totalDays: 3,
    workingDays: 2,
    holidayType: "ANNUAL",
    status: "REJECTED",
    notes: "Conference attendance",
    user: {
      firstName: "Mike",
      lastName: "Johnson",
      department: "Sales"
    }
  }
]

export default function Dashboard() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setHolidays(mockHolidays)
      setLoading(false)
    }, 1000)
  }, [])

  const getStatusColor = (status: string) => {
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ANNUAL":
        return "bg-blue-100 text-blue-800"
      case "SICK":
        return "bg-purple-100 text-purple-800"
      case "PERSONAL":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Holiday Manager Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and track holiday requests for your team
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
            <p className="text-2xl font-bold text-gray-900">{mockHolidays.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Approved</h3>
            <p className="text-2xl font-bold text-green-600">
              {mockHolidays.filter(h => h.status === "APPROVED").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Pending</h3>
            <p className="text-2xl font-bold text-yellow-600">
              {mockHolidays.filter(h => h.status === "PENDING").length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Days Booked</h3>
            <p className="text-2xl font-bold text-blue-600">
              {mockHolidays.reduce((sum, h) => sum + h.workingDays, 0)}
            </p>
          </div>
        </div>

        {/* Holiday Requests Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-medium text-gray-900">Recent Holiday Requests</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-600">Loading holidays...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
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
                  {holidays.map((holiday) => (
                    <tr key={holiday.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {holiday.user.firstName} {holiday.user.lastName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {holiday.user.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(holiday.startDate).toLocaleDateString()} - {new Date(holiday.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {holiday.workingDays} working days
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(holiday.holidayType)}`}>
                          {holiday.holidayType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(holiday.status)}`}>
                          {holiday.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {holiday.notes || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium">
            Request New Holiday
          </button>
        </div>
      </div>
    </div>
  )
}