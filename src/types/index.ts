import { User, Holiday, HolidayBonus, Notification, Role, HolidayType, HolidayStatus, NotificationType } from "@prisma/client"

export type UserWithRelations = User & {
  holidays: Holiday[]
  bonuses: HolidayBonus[]
  notifications: Notification[]
}

export type HolidayWithRelations = Holiday & {
  user: User
  approvedBy?: User | null
  bonus?: HolidayBonus | null
}

export type NotificationWithRelations = Notification & {
  user: User
  relatedHoliday?: Holiday | null
}

export interface CreateUserData {
  email: string
  firstName: string
  lastName: string
  phoneNumber?: string
  dateHired: Date
  annualLeaveEntitlement: number
  department?: string
  position?: string
  role: Role
  password: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  department?: string
  position?: string
  annualLeaveEntitlement?: number
  carryOverDays?: number
  isActive?: boolean
}

export interface CreateHolidayData {
  startDate: Date
  endDate: Date
  holidayType: HolidayType
  notes?: string
}

export interface UpdateHolidayData {
  startDate?: Date
  endDate?: Date
  holidayType?: HolidayType
  notes?: string
  status?: HolidayStatus
}

export interface CreateBonusData {
  holidayId: string
  amount: number
  currency: string
  notes?: string
  fiscalYear: number
}

export interface DashboardStats {
  totalEmployees: number
  activeEmployees: number
  currentlyOnHoliday: number
  pendingRequests: number
  totalBonusesPaid: number
  avgHolidaysTaken: number
}

export interface HolidayFilters {
  userId?: string
  department?: string
  status?: HolidayStatus
  holidayType?: HolidayType
  startDate?: Date
  endDate?: Date
  year?: number
}

export interface BonusFilters {
  userId?: string
  fiscalYear?: number
  minAmount?: number
  maxAmount?: number
}

export interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  userId: string
  userName: string
  status: HolidayStatus
  type: HolidayType
}

export {
  Role,
  HolidayType,
  HolidayStatus,
  NotificationType,
}