import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create demo users
  const hashedPassword = await bcrypt.hash("demo123", 12)

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: "admin@company.com" },
    update: {},
    create: {
      email: "admin@company.com",
      firstName: "Admin",
      lastName: "User",
      dateHired: new Date("2020-01-01"),
      annualLeaveEntitlement: 25,
      department: "Management",
      position: "System Administrator",
      role: "ADMIN",
      hashedPassword,
      isActive: true,
    },
  })

  // Manager user
  const manager = await prisma.user.upsert({
    where: { email: "manager@company.com" },
    update: {},
    create: {
      email: "manager@company.com",
      firstName: "Jane",
      lastName: "Manager",
      phoneNumber: "+1-555-0101",
      dateHired: new Date("2020-06-01"),
      annualLeaveEntitlement: 25,
      department: "Engineering",
      position: "Engineering Manager",
      role: "MANAGER",
      hashedPassword,
      isActive: true,
    },
  })

  // Employee users
  const employee1 = await prisma.user.upsert({
    where: { email: "employee@company.com" },
    update: {},
    create: {
      email: "employee@company.com",
      firstName: "John",
      lastName: "Employee",
      phoneNumber: "+1-555-0102",
      dateHired: new Date("2021-03-15"),
      annualLeaveEntitlement: 20,
      carryOverDays: 2,
      department: "Engineering",
      position: "Software Developer",
      role: "EMPLOYEE",
      hashedPassword,
      isActive: true,
    },
  })

  const employee2 = await prisma.user.upsert({
    where: { email: "sarah.dev@company.com" },
    update: {},
    create: {
      email: "sarah.dev@company.com",
      firstName: "Sarah",
      lastName: "Developer",
      phoneNumber: "+1-555-0103",
      dateHired: new Date("2021-08-20"),
      annualLeaveEntitlement: 20,
      department: "Engineering",
      position: "Senior Software Developer",
      role: "EMPLOYEE",
      hashedPassword,
      isActive: true,
    },
  })

  const employee3 = await prisma.user.upsert({
    where: { email: "mike.design@company.com" },
    update: {},
    create: {
      email: "mike.design@company.com",
      firstName: "Mike",
      lastName: "Designer",
      phoneNumber: "+1-555-0104",
      dateHired: new Date("2022-01-10"),
      annualLeaveEntitlement: 18,
      department: "Design",
      position: "UI/UX Designer",
      role: "EMPLOYEE",
      hashedPassword,
      isActive: true,
    },
  })

  // Create some sample holiday requests
  const currentYear = new Date().getFullYear()
  
  // Approved holiday for employee1
  const holiday1 = await prisma.holiday.create({
    data: {
      userId: employee1.id,
      startDate: new Date(currentYear, 2, 15), // March 15
      endDate: new Date(currentYear, 2, 19),   // March 19
      totalDays: 5,
      workingDays: 5,
      holidayType: "ANNUAL",
      status: "APPROVED",
      notes: "Family vacation",
      dateRequested: new Date(currentYear, 1, 1),
      dateApproved: new Date(currentYear, 1, 2),
      approvedById: manager.id,
    },
  })

  // Pending holiday for employee2
  const holiday2 = await prisma.holiday.create({
    data: {
      userId: employee2.id,
      startDate: new Date(currentYear, 5, 1),  // June 1
      endDate: new Date(currentYear, 5, 7),    // June 7
      totalDays: 7,
      workingDays: 5,
      holidayType: "ANNUAL",
      status: "PENDING",
      notes: "Summer break",
      dateRequested: new Date(),
    },
  })

  // Create holiday bonus for approved holiday
  await prisma.holidayBonus.create({
    data: {
      holidayId: holiday1.id,
      userId: employee1.id,
      amount: 250.00,
      currency: "USD",
      notes: "Annual leave bonus",
      fiscalYear: currentYear,
    },
  })

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: manager.id,
      type: "HOLIDAY_REQUEST",
      title: "New Holiday Request",
      message: `${employee2.firstName} ${employee2.lastName} has requested 5 days of annual leave`,
      relatedHolidayId: holiday2.id,
    },
  })

  await prisma.notification.create({
    data: {
      userId: employee1.id,
      type: "HOLIDAY_APPROVED",
      title: "Holiday Request Approved",
      message: "Your holiday request for March 15-19 has been approved",
      relatedHolidayId: holiday1.id,
      isRead: true,
    },
  })

  console.log("✅ Database seeded successfully!")
  console.log("\n🔐 Demo Credentials:")
  console.log("Admin: admin@company.com / demo123")
  console.log("Manager: manager@company.com / demo123")
  console.log("Employee: employee@company.com / demo123")
  console.log("Employee 2: sarah.dev@company.com / demo123")
  console.log("Employee 3: mike.design@company.com / demo123")
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })