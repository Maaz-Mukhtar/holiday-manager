# Phase 1: Database Setup & Schema Design

## 🎯 **Phase 1 Goal**
Set up Supabase database with proper schema and connect it to the Next.js application.

## ⏱️ **Total Time Estimate: 40-45 minutes**

## 📋 **Prerequisites**
- GitHub account
- Node.js and npm installed
- Basic understanding of environment variables
- HomeStaff project already set up locally

---

## **Step 1.1: Create Supabase Project** (5 minutes)

### Instructions:
1. Go to [supabase.com](https://supabase.com)
2. Click "Sign in" and authenticate with GitHub
3. Click "New Project" button
4. Choose your organization (create one if this is your first project)
5. Fill out project details:
   - **Name**: `homestaff-manager`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Select closest to your location
   - **Pricing Plan**: Free tier is sufficient
6. Click "Create new project"
7. Wait for project initialization (~2 minutes)

### ✅ Expected Outcome:
- Supabase project dashboard is accessible
- Project shows "Active" status
- You have the database password saved

---

## **Step 1.2: Get Database Credentials** (2 minutes)

### Instructions:
1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to "Connection string" section
3. Copy the **URI** connection string (starts with `postgresql://`)
4. Go to **Settings** → **API**
5. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon/public key** (long string starting with `eyJ`)

### 📝 Save These Credentials:
```env
# Save these temporarily - we'll use them in Step 1.5
PROJECT_URL=https://your-project-ref.supabase.co
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

### ✅ Expected Outcome:
- You have all three credentials saved
- Database URL includes your password

---

## **Step 1.3: Install Required Dependencies** (3 minutes)

### Instructions:
```bash
# Navigate to your project directory
cd "/mnt/c/Maaz/Programming/Claude Dev projects/HomeStaff/holiday-manager"

# Install Supabase and Prisma dependencies
npm install @supabase/supabase-js prisma @prisma/client

# Install Prisma CLI as dev dependency
npm install -D prisma
```

### ✅ Expected Outcome:
- Dependencies installed successfully
- `package.json` updated with new dependencies
- `node_modules` contains new packages

---

## **Step 1.4: Initialize Prisma** (2 minutes)

### Instructions:
```bash
# Initialize Prisma in your project
npx prisma init
```

### 📁 Files Created:
- `prisma/schema.prisma` - Database schema file
- `.env` - Environment variables file (if doesn't exist)

### ✅ Expected Outcome:
- `prisma` directory created
- Schema file exists with basic template
- `.env` file has DATABASE_URL placeholder

---

## **Step 1.5: Configure Environment Variables** (3 minutes)

### Instructions:
1. Create or update `.env.local` file in project root:

```env
# Database
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
```

2. Replace the placeholders:
   - `[YOUR_PASSWORD]` - Database password from Step 1.1
   - `[YOUR_PROJECT_REF]` - Project reference from Supabase URL
   - `[YOUR_ANON_KEY]` - Anon key from Step 1.2

### ⚠️ Security Note:
- Never commit `.env.local` to git
- Use `.env.local` for local development
- Production environments will use different env vars

### ✅ Expected Outcome:
- `.env.local` file exists with correct credentials
- All placeholders replaced with real values

---

## **Step 1.6: Design Database Schema** (10 minutes)

### Instructions:
Replace the contents of `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Employee {
  id                     String  @id @default(cuid())
  firstName              String
  lastName               String
  email                  String  @unique
  department             String
  role                   String
  annualLeaveEntitlement Int
  currentStatus          String  @default("available")
  currentLeaveStartDate  DateTime?
  currentLeaveEndDate    DateTime?
  currentLeaveType       String?
  currentLeaveRemaining  Int?
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  leaveRecords LeaveRecord[]

  @@map("employees")
}

model LeaveRecord {
  id          String   @id @default(cuid())
  employeeId  String
  startDate   DateTime
  endDate     DateTime
  totalDays   Int
  workingDays Int
  type        String
  status      String   @default("APPROVED")
  notes       String?
  year        Int
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@map("leave_records")
}
```

### 📝 Schema Explanation:
- **Employee**: Main staff member data with current leave status
- **LeaveRecord**: Individual leave requests/records
- **Relations**: One employee can have many leave records
- **Constraints**: Unique email, cascade delete for leave records

### ✅ Expected Outcome:
- Schema file updated with proper models
- TypeScript types will be generated automatically

---

## **Step 1.7: Generate Prisma Client** (2 minutes)

### Instructions:
```bash
npx prisma generate
```

### ✅ Expected Outcome:
- Prisma Client generated successfully
- TypeScript types available for database operations
- `node_modules/.prisma/client` directory created

---

## **Step 1.8: Push Schema to Database** (3 minutes)

### Instructions:
```bash
npx prisma db push
```

### 📝 What This Does:
- Creates tables in your Supabase database
- Applies schema without creating migration files
- Perfect for development/prototyping

### ✅ Expected Outcome:
- Command completes successfully
- Tables created in Supabase dashboard
- You can see `employees` and `leave_records` tables in Supabase

---

## **Step 1.9: Create Supabase Client** (5 minutes)

### Instructions:
Create `src/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### 📝 Purpose:
- Provides Supabase client for real-time features
- Can be used for authentication later
- Alternative to Prisma for some operations

### ✅ Expected Outcome:
- File created successfully
- No TypeScript errors
- Supabase client ready for use

---

## **Step 1.10: Create Prisma Client Instance** (3 minutes)

### Instructions:
Create `src/lib/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### 📝 Purpose:
- Prevents multiple Prisma instances in development
- Optimizes database connections
- Ready for production deployment

### ✅ Expected Outcome:
- File created successfully
- Prisma client instance ready for API routes

---

## **Step 1.11: Test Database Connection** (5 minutes)

### Instructions:
Create `src/app/api/test-db/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect()
    
    // Count existing employees
    const employeeCount = await prisma.employee.count()
    
    return NextResponse.json({ 
      status: 'success',
      message: 'Database connected successfully',
      employeeCount 
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Database connection failed' },
      { status: 500 }
    )
  }
}
```

### Test the Connection:
1. Start development server: `npm run dev`
2. Visit: `http://localhost:3000/api/test-db`
3. Should see success message with employee count (0)

### ✅ Expected Outcome:
- API route returns success message
- Database connection working
- Employee count shows 0 (empty database)

---

## **Step 1.12: Update .gitignore** (1 minute)

### Instructions:
Ensure `.gitignore` includes:

```gitignore
# Environment variables
.env
.env.local
.env.production
.env.development

# Database
prisma/migrations
```

### ✅ Expected Outcome:
- Environment files won't be committed
- Database secrets remain secure

---

## 🎉 **Phase 1 Complete!**

### ✅ **What You've Accomplished:**
- ✅ Supabase project created and configured
- ✅ Database schema deployed with `employees` and `leave_records` tables
- ✅ Prisma client generated and configured
- ✅ Environment variables set up properly
- ✅ Database connection tested and working
- ✅ Ready to start building API routes in Phase 2

### 📁 **Files Created:**
- ✅ `prisma/schema.prisma`
- ✅ `src/lib/supabase.ts`
- ✅ `src/lib/prisma.ts`
- ✅ `src/app/api/test-db/route.ts`
- ✅ `.env.local`

### 📁 **Files Modified:**
- ✅ `package.json` (dependencies added)
- ✅ `.gitignore` (environment variables)

---

## 🚨 **Troubleshooting**

### **Database Connection Fails**
- Double-check DATABASE_URL format
- Verify password and project reference
- Ensure Supabase project is active

### **Schema Push Fails**
- Check internet connection
- Verify Supabase project status
- Try `npx prisma db push --force-reset` if needed

### **Environment Variables Not Loading**
- Ensure `.env.local` is in project root
- Restart development server
- Check for typos in variable names

### **Prisma Generate Fails**
- Run `npm install @prisma/client`
- Clear node_modules and reinstall
- Check schema syntax

---

## ➡️ **Next Steps**
Ready for Phase 2: API Routes Development!