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

export const mockEmployees: Employee[] = [
  {
    id: "1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@homestaff.com",
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
  {
    id: "2",
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@homestaff.com",
    department: "Kitchen",
    role: "Head Chef",
    annualLeaveEntitlement: 28,
    currentStatus: "available"
  },
  {
    id: "3",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@homestaff.com",
    department: "Security",
    role: "Security Guard",
    annualLeaveEntitlement: 22,
    currentStatus: "returning_soon",
    currentLeaveDetails: {
      startDate: "2024-08-03",
      endDate: "2024-08-06",
      type: "SICK",
      remainingDays: 1
    }
  },
  {
    id: "4",
    firstName: "Sarah",
    lastName: "Williams",
    email: "sarah.williams@homestaff.com",
    department: "Gardener",
    role: "Head Gardener",
    annualLeaveEntitlement: 25,
    currentStatus: "available"
  },
  {
    id: "5",
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@homestaff.com",
    department: "Cleaning",
    role: "Housekeeper",
    annualLeaveEntitlement: 25,
    currentStatus: "on_leave",
    currentLeaveDetails: {
      startDate: "2024-08-02",
      endDate: "2024-08-09",
      type: "ANNUAL",
      remainingDays: 4
    }
  },
  {
    id: "6",
    firstName: "Emma",
    lastName: "Davis",
    email: "emma.davis@homestaff.com",
    department: "Maintenance",
    role: "Electrician",
    annualLeaveEntitlement: 23,
    currentStatus: "available"
  },
  {
    id: "7",
    firstName: "Tom",
    lastName: "Wilson",
    email: "tom.wilson@homestaff.com",
    department: "Maintenance",
    role: "Plumber",
    annualLeaveEntitlement: 28,
    currentStatus: "available"
  },
  {
    id: "8",
    firstName: "Lisa",
    lastName: "Garcia",
    email: "lisa.garcia@homestaff.com",
    department: "Kitchen",
    role: "Sous Chef",
    annualLeaveEntitlement: 25,
    currentStatus: "on_leave",
    currentLeaveDetails: {
      startDate: "2024-07-29",
      endDate: "2024-08-12",
      type: "ANNUAL",
      remainingDays: 7
    }
  }
]

export const mockLeaveRecords: LeaveRecord[] = [
  // John Doe's records
  {
    id: "l1",
    employeeId: "1",
    startDate: "2024-08-01",
    endDate: "2024-08-15",
    totalDays: 15,
    workingDays: 11,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Summer vacation",
    year: 2024
  },
  {
    id: "l2",
    employeeId: "1",
    startDate: "2024-05-20",
    endDate: "2024-05-24",
    totalDays: 5,
    workingDays: 5,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Long weekend break",
    year: 2024
  },
  {
    id: "l3",
    employeeId: "1",
    startDate: "2024-03-15",
    endDate: "2024-03-16",
    totalDays: 2,
    workingDays: 2,
    type: "SICK",
    status: "APPROVED",
    notes: "Flu symptoms",
    year: 2024
  },
  {
    id: "l4",
    employeeId: "1",
    startDate: "2023-12-22",
    endDate: "2024-01-02",
    totalDays: 12,
    workingDays: 8,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Christmas holidays",
    year: 2023
  },
  {
    id: "l5",
    employeeId: "1",
    startDate: "2023-08-14",
    endDate: "2023-08-25",
    totalDays: 12,
    workingDays: 9,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Family vacation",
    year: 2023
  },

  // Jane Smith's records
  {
    id: "l6",
    employeeId: "2",
    startDate: "2024-06-10",
    endDate: "2024-06-21",
    totalDays: 12,
    workingDays: 9,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "European trip",
    year: 2024
  },
  {
    id: "l7",
    employeeId: "2",
    startDate: "2024-04-03",
    endDate: "2024-04-05",
    totalDays: 3,
    workingDays: 3,
    type: "PERSONAL",
    status: "APPROVED",
    notes: "Moving house",
    year: 2024
  },
  {
    id: "l8",
    employeeId: "2",
    startDate: "2023-11-20",
    endDate: "2023-11-24",
    totalDays: 5,
    workingDays: 5,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Thanksgiving break",
    year: 2023
  },

  // Mike Johnson's records
  {
    id: "l9",
    employeeId: "3",
    startDate: "2024-08-03",
    endDate: "2024-08-06",
    totalDays: 4,
    workingDays: 2,
    type: "SICK",
    status: "APPROVED",
    notes: "Recovery from surgery",
    year: 2024
  },
  {
    id: "l10",
    employeeId: "3",
    startDate: "2024-07-01",
    endDate: "2024-07-05",
    totalDays: 5,
    workingDays: 5,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "July 4th extended weekend",
    year: 2024
  },
  {
    id: "l11",
    employeeId: "3",
    startDate: "2024-02-14",
    endDate: "2024-02-16",
    totalDays: 3,
    workingDays: 3,
    type: "PERSONAL",
    status: "APPROVED",
    notes: "Wedding anniversary",
    year: 2024
  },

  // Sarah Williams's records
  {
    id: "l12",
    employeeId: "4",
    startDate: "2024-07-15",
    endDate: "2024-07-26",
    totalDays: 12,
    workingDays: 9,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Summer holidays",
    year: 2024
  },
  {
    id: "l13",
    employeeId: "4",
    startDate: "2024-01-08",
    endDate: "2024-01-10",
    totalDays: 3,
    workingDays: 3,
    type: "SICK",
    status: "APPROVED",
    notes: "Stomach bug",
    year: 2024
  },

  // David Brown's records
  {
    id: "l14",
    employeeId: "5",
    startDate: "2024-08-02",
    endDate: "2024-08-09",
    totalDays: 8,
    workingDays: 6,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Staycation",
    year: 2024
  },
  {
    id: "l15",
    employeeId: "5",
    startDate: "2024-04-15",
    endDate: "2024-04-19",
    totalDays: 5,
    workingDays: 5,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Spring break",
    year: 2024
  },

  // Emma Davis's records
  {
    id: "l16",
    employeeId: "6",
    startDate: "2024-06-24",
    endDate: "2024-07-05",
    totalDays: 12,
    workingDays: 9,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Midsummer vacation",
    year: 2024
  },
  {
    id: "l17",
    employeeId: "6",
    startDate: "2024-03-28",
    endDate: "2024-04-01",
    totalDays: 5,
    workingDays: 3,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Easter holiday",
    year: 2024
  },

  // Tom Wilson's records
  {
    id: "l18",
    employeeId: "7",
    startDate: "2024-05-27",
    endDate: "2024-06-07",
    totalDays: 12,
    workingDays: 9,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Memorial Day extended vacation",
    year: 2024
  },

  // Lisa Garcia's records
  {
    id: "l19",
    employeeId: "8",
    startDate: "2024-07-29",
    endDate: "2024-08-12",
    totalDays: 15,
    workingDays: 11,
    type: "ANNUAL",
    status: "APPROVED",
    notes: "Design conference and vacation",
    year: 2024
  },
  {
    id: "l20",
    employeeId: "8",
    startDate: "2024-01-22",
    endDate: "2024-01-26",
    totalDays: 5,
    workingDays: 5,
    type: "PERSONAL",
    status: "APPROVED",
    notes: "Family emergency",
    year: 2024
  }
]

// Helper functions
export const getEmployeeById = (id: string): Employee | undefined => {
  return mockEmployees.find(emp => emp.id === id)
}

export const getLeaveRecordsByEmployeeId = (employeeId: string): LeaveRecord[] => {
  return mockLeaveRecords.filter(record => record.employeeId === employeeId)
}

export const getLeaveRecordsByEmployeeAndYear = (employeeId: string, year: number): LeaveRecord[] => {
  return mockLeaveRecords.filter(record => 
    record.employeeId === employeeId && record.year === year
  )
}

export const calculateUsedLeaveDays = (employeeId: string, year: number): number => {
  const records = getLeaveRecordsByEmployeeAndYear(employeeId, year)
  return records
    .filter(record => record.status === 'APPROVED' && record.type === 'ANNUAL')
    .reduce((total, record) => total + record.workingDays, 0)
}

export const getAvailableYears = (employeeId: string): number[] => {
  const records = getLeaveRecordsByEmployeeId(employeeId)
  const years = [...new Set(records.map(record => record.year))]
  return years.sort((a, b) => b - a) // Sort descending (most recent first)
}