"use client"

import { signOut } from "next-auth/react"
import { Session } from "next-auth"

interface DashboardClientProps {
  session: Session
}

export function DashboardClient({ session }: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">
                Holiday Manager
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                Welcome, <span className="font-medium">{session.user.name}</span>
                <div className="text-xs text-gray-500 capitalize">
                  {session.user.role.toLowerCase()} • {session.user.department}
                </div>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg h-96 p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to Holiday Manager
              </h2>
              <p className="text-gray-600 mb-8">
                Your comprehensive staff holiday tracking and bonus management system
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Your Role
                  </h3>
                  <p className="text-3xl font-bold text-indigo-600 capitalize">
                    {session.user.role.toLowerCase()}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Department
                  </h3>
                  <p className="text-3xl font-bold text-green-600">
                    {session.user.department || "Not Set"}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg shadow">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Status
                  </h3>
                  <p className="text-3xl font-bold text-blue-600">
                    Active
                  </p>
                </div>
              </div>

              {/* Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <h4 className="font-semibold text-gray-900">My Holidays</h4>
                  <p className="text-sm text-gray-600">View and manage your holiday requests</p>
                </div>
                
                {(session.user.role === "ADMIN" || session.user.role === "MANAGER") && (
                  <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                    <h4 className="font-semibold text-gray-900">Team Holidays</h4>
                    <p className="text-sm text-gray-600">Approve and manage team requests</p>
                  </div>
                )}
                
                <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <h4 className="font-semibold text-gray-900">Calendar</h4>
                  <p className="text-sm text-gray-600">View team holiday calendar</p>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer">
                  <h4 className="font-semibold text-gray-900">Reports</h4>
                  <p className="text-sm text-gray-600">Generate holiday and bonus reports</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}