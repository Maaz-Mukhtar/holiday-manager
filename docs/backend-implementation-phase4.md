# Phase 4: Data Migration & Cleanup

## 🎯 **Phase 4 Goal**
Migrate existing mock data to the production database, clean up legacy code, and ensure a smooth transition from the development setup to a fully functional production system.

## ⏱️ **Total Time Estimate: 1-2 hours**

## 📋 **Prerequisites**
- Phase 1, 2, and 3 completed successfully
- Database connection working
- API endpoints tested and functional
- Frontend integration working

---

## **Step 4.1: Create Database Seeding Script** (15 minutes)

### Instructions:
Create `scripts/seed-database.ts`:

```typescript
import { PrismaClient } from '@prisma/client'
import { mockEmployees, mockLeaveRecords } from '../src/data/mockData'

const prisma = new PrismaClient()

async function seedDatabase() {
  console.log('🌱 Starting database seeding...')

  try {
    // Clear existing data (be careful in production!)
    console.log('🧹 Clearing existing data...')
    await prisma.leaveRecord.deleteMany()
    await prisma.employee.deleteMany()
    
    console.log('✅ Existing data cleared')

    // Seed employees
    console.log('👥 Seeding employees...')
    const createdEmployees = []
    
    for (const employee of mockEmployees) {
      const createdEmployee = await prisma.employee.create({
        data: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          department: employee.department,
          role: employee.role,
          annualLeaveEntitlement: employee.annualLeaveEntitlement,
          currentStatus: employee.currentStatus,
          currentLeaveStartDate: employee.currentLeaveDetails 
            ? new Date(employee.currentLeaveDetails.startDate)
            : null,
          currentLeaveEndDate: employee.currentLeaveDetails 
            ? new Date(employee.currentLeaveDetails.endDate)
            : null,
          currentLeaveType: employee.currentLeaveDetails?.type || null,
          currentLeaveRemaining: employee.currentLeaveDetails?.remainingDays || null,
        }
      })
      
      createdEmployees.push(createdEmployee)
      console.log(`  ✅ Created employee: ${createdEmployee.firstName} ${createdEmployee.lastName}`)
    }

    console.log(`✅ Created ${createdEmployees.length} employees`)

    // Create mapping from old IDs to new IDs
    const employeeIdMap = new Map()
    mockEmployees.forEach((mockEmp, index) => {
      employeeIdMap.set(mockEmp.id, createdEmployees[index].id)
    })

    // Seed leave records
    console.log('📝 Seeding leave records...')
    let createdRecordsCount = 0
    
    for (const record of mockLeaveRecords) {
      const newEmployeeId = employeeIdMap.get(record.employeeId)
      
      if (newEmployeeId) {
        await prisma.leaveRecord.create({
          data: {
            employeeId: newEmployeeId,
            startDate: new Date(record.startDate),
            endDate: new Date(record.endDate),
            totalDays: record.totalDays,
            workingDays: record.workingDays,
            type: record.type,
            status: record.status,
            notes: record.notes,
            year: record.year,
          }
        })
        
        createdRecordsCount++
        console.log(`  ✅ Created leave record for employee ID: ${newEmployeeId}`)
      } else {
        console.log(`  ⚠️ Skipping leave record for unknown employee ID: ${record.employeeId}`)
      }
    }

    console.log(`✅ Created ${createdRecordsCount} leave records`)

    // Verify data
    const employeeCount = await prisma.employee.count()
    const leaveRecordCount = await prisma.leaveRecord.count()
    
    console.log('\n📊 Database Summary:')
    console.log(`  👥 Employees: ${employeeCount}`)
    console.log(`  📝 Leave Records: ${leaveRecordCount}`)
    
    console.log('\n🎉 Database seeding completed successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedDatabase()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
```

### Add Script to package.json:
Update `package.json` scripts section:

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:seed": "tsx scripts/seed-database.ts",
    "db:reset": "prisma db push --force-reset && npm run db:seed"
  }
}
```

### Install tsx for TypeScript execution:
```bash
npm install -D tsx
```

### ✅ Expected Outcome:
- Database seeding script created
- Package.json updated with seeding commands
- Ready to migrate mock data to database

---

## **Step 4.2: Run Database Migration** (10 minutes)

### Instructions:
Execute the database seeding:

```bash
# Run the seeding script
npm run db:seed
```

### Expected Output:
```
🌱 Starting database seeding...
🧹 Clearing existing data...
✅ Existing data cleared
👥 Seeding employees...
  ✅ Created employee: Aqeel 
  ✅ Created employee: Faisal 
  ✅ Created employee: Ahsan 
  ✅ Created employee: faiz 
  ✅ Created employee: Irshad 
  ✅ Created employee: Ashiq 
  ✅ Created employee: Imran 
  ✅ Created employee: Amir 
✅ Created 8 employees
📝 Seeding leave records...
  ✅ Created leave record for employee ID: cm4x...
  ✅ Created leave record for employee ID: cm4x...
  ...
✅ Created 20 leave records

📊 Database Summary:
  👥 Employees: 8
  📝 Leave Records: 20

🎉 Database seeding completed successfully!
```

### Verify Migration:
1. Check Supabase dashboard to see data
2. Test API endpoints: `http://localhost:3000/api/employees`
3. Test frontend: `http://localhost:3000`

### ✅ Expected Outcome:
- All mock employees migrated to database
- All leave records migrated and linked properly
- Frontend displays database data correctly

---

## **Step 4.3: Create localStorage Migration Helper** (15 minutes)

### Instructions:
Create `src/lib/migrate-localStorage.ts`:

```typescript
// Helper to migrate user's localStorage data to the database
import { apiClient, type CreateEmployeeData } from './api-client'

export type LocalStorageEmployee = {
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
}

export async function migrateLocalStorageToDatabase(): Promise<{
  success: boolean
  migratedCount: number
  errors: string[]
}> {
  const errors: string[] = []
  let migratedCount = 0

  try {
    // Check if there's localStorage data to migrate
    const localData = localStorage.getItem('homestaff-employees')
    if (!localData) {
      return { success: true, migratedCount: 0, errors: ['No localStorage data found'] }
    }

    const localEmployees: LocalStorageEmployee[] = JSON.parse(localData)
    
    // Get existing employees from database to avoid duplicates
    const existingEmployees = await apiClient.getAllEmployees()
    const existingEmails = new Set(existingEmployees.map(emp => emp.email))

    // Migrate each employee that doesn't already exist
    for (const localEmployee of localEmployees) {
      if (existingEmails.has(localEmployee.email)) {
        errors.push(`Employee ${localEmployee.email} already exists in database`)
        continue
      }

      try {
        const employeeData: CreateEmployeeData = {
          firstName: localEmployee.firstName,
          lastName: localEmployee.lastName,
          email: localEmployee.email,
          department: localEmployee.department,
          role: localEmployee.role,
          annualLeaveEntitlement: localEmployee.annualLeaveEntitlement
        }

        const createdEmployee = await apiClient.createEmployee(employeeData)
        
        // Update current leave status if needed
        if (localEmployee.currentLeaveDetails && localEmployee.currentStatus !== 'available') {
          await apiClient.updateEmployee(createdEmployee.id, {
            currentStatus: localEmployee.currentStatus,
            currentLeaveStartDate: localEmployee.currentLeaveDetails.startDate,
            currentLeaveEndDate: localEmployee.currentLeaveDetails.endDate,
            currentLeaveType: localEmployee.currentLeaveDetails.type,
            currentLeaveRemaining: localEmployee.currentLeaveDetails.remainingDays
          })
        }

        migratedCount++
      } catch (error) {
        errors.push(`Failed to migrate ${localEmployee.firstName} ${localEmployee.lastName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return { success: true, migratedCount, errors }
  } catch (error) {
    return { 
      success: false, 
      migratedCount, 
      errors: [`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    }
  }
}

export function clearLocalStorageData(): void {
  localStorage.removeItem('homestaff-employees')
  console.log('localStorage data cleared')
}

export function hasLocalStorageData(): boolean {
  const data = localStorage.getItem('homestaff-employees')
  return data !== null && data !== '[]'
}
```

### ✅ Expected Outcome:
- Migration helper functions created
- Can detect localStorage data
- Can migrate unique employees to database
- Handles errors gracefully

---

## **Step 4.4: Add Migration UI to Homepage** (20 minutes)

### Instructions:
Update `src/app/page.tsx` to include migration functionality:

Add at the top of the component (after existing imports):

```typescript
import { migrateLocalStorageToDatabase, clearLocalStorageData, hasLocalStorageData } from "@/lib/migrate-localStorage"
```

Add to state variables:

```typescript
const [showMigrationBanner, setShowMigrationBanner] = useState(false)
const [migrating, setMigrating] = useState(false)
const [migrationResult, setMigrationResult] = useState<string | null>(null)
```

Add to useEffect (after existing useEffect):

```typescript
useEffect(() => {
  // Check if user has localStorage data that needs migration
  if (hasLocalStorageData()) {
    setShowMigrationBanner(true)
  }
}, [])
```

Add migration functions:

```typescript
const handleMigrateData = async () => {
  setMigrating(true)
  setError(null)
  
  try {
    const result = await migrateLocalStorageToDatabase()
    
    if (result.success) {
      if (result.migratedCount > 0) {
        setMigrationResult(`Successfully migrated ${result.migratedCount} employees to database!`)
        // Clear localStorage after successful migration
        clearLocalStorageData()
        // Reload employees to show migrated data
        await loadEmployees()
      } else {
        setMigrationResult('No new employees to migrate.')
      }
      
      if (result.errors.length > 0) {
        console.warn('Migration warnings:', result.errors)
      }
      
      setShowMigrationBanner(false)
    } else {
      setError('Migration failed. Please try again or contact support.')
    }
  } catch (err) {
    setError('Migration failed. Please try again.')
  } finally {
    setMigrating(false)
  }
}

const dismissMigrationBanner = () => {
  setShowMigrationBanner(false)
  clearLocalStorageData()
}
```

Add migration banner after error display and before header:

```typescript
{/* Migration Banner */}
{showMigrationBanner && (
  <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="font-medium">Local Data Found</h3>
        <p className="text-sm mt-1">
          We found employee data saved locally on this device. Would you like to migrate it to the database 
          so it's accessible from all your devices?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleMigrateData}
            disabled={migrating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center"
          >
            {migrating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Migrating...
              </>
            ) : (
              'Migrate Data'
            )}
          </button>
          <button
            onClick={dismissMigrationBanner}
            disabled={migrating}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
          >
            Skip
          </button>
        </div>
      </div>
      <button
        onClick={dismissMigrationBanner}
        disabled={migrating}
        className="text-blue-400 hover:text-blue-600 ml-4 disabled:opacity-50"
      >
        ×
      </button>
    </div>
  </div>
)}

{/* Migration Success Message */}
{migrationResult && (
  <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
    <div className="flex justify-between items-center">
      <span>{migrationResult}</span>
      <button
        onClick={() => setMigrationResult(null)}
        className="text-green-500 hover:text-green-700"
      >
        ×
      </button>
    </div>
  </div>
)}
```

### ✅ Expected Outcome:
- Migration banner appears if localStorage data exists
- Users can migrate or dismiss local data
- Successful migration shows confirmation
- Local data cleared after migration

---

## **Step 4.5: Clean Up Legacy Code** (15 minutes)

### Instructions:

1. **Remove deprecated mock data functions** from `src/data/mockData.ts`:

```typescript
// Remove or comment out all the mock data and helper functions
// Keep only the type definitions

export type Employee = {
  // ... keep type definition
}

export type LeaveRecord = {
  // ... keep type definition  
}

// All other exports can be removed
```

2. **Update any remaining imports** in components that might reference old functions.

3. **Remove test API route** (if it still exists):
```bash
rm -f src/app/api/test-all/route.ts
```

4. **Clean up unused dependencies** in `package.json`:
Check if any packages are no longer needed and remove them.

### ✅ Expected Outcome:
- Legacy mock data functions removed
- Clean codebase without deprecated code
- Only essential dependencies remain

---

## **Step 4.6: Create Production Deployment Checklist** (5 minutes)

### Instructions:
Create `docs/production-deployment.md`:

```markdown
# Production Deployment Checklist

## Pre-Deployment

### Environment Variables
- [ ] `DATABASE_URL` - Production Supabase connection string  
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production Supabase anon key

### Database
- [ ] Production Supabase project created
- [ ] Database schema deployed (`npx prisma db push`)
- [ ] Production data seeded if needed (`npm run db:seed`)
- [ ] Database access policies configured (if using RLS)

### Code
- [ ] All tests passing
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No console errors in production build
- [ ] Environment-specific configurations updated

## Deployment

### Vercel Deployment
- [ ] Environment variables added to Vercel project
- [ ] Domain configured (if custom domain)
- [ ] Build and deployment successful
- [ ] All API routes responding correctly

### Post-Deployment Testing
- [ ] Homepage loads and displays employees
- [ ] Add employee functionality works
- [ ] Employee detail pages load correctly
- [ ] API endpoints respond correctly
- [ ] Error handling works as expected
- [ ] Multi-device access confirmed

## Monitoring
- [ ] Set up error monitoring (optional)
- [ ] Database usage monitoring
- [ ] Performance monitoring
- [ ] Backup strategy confirmed

## Rollback Plan
- [ ] Previous working version identified
- [ ] Database backup available
- [ ] Rollback procedure documented
```

### ✅ Expected Outcome:
- Clear deployment checklist created
- Production requirements documented  
- Quality assurance steps defined

---

## **Step 4.7: Final Testing and Validation** (10 minutes)

### Instructions:

1. **Test Complete Workflow:**
   - Add a new employee
   - View employee detail page
   - Verify data persists across browser refresh
   - Test on different devices/browsers (if possible)

2. **Performance Testing:**
   - Check page load times
   - Verify database query performance
   - Test with multiple employees

3. **Error Testing:**
   - Disconnect network and test error handling
   - Test with invalid data inputs
   - Verify error messages are user-friendly

4. **Database Validation:**
   - Check Supabase dashboard for data integrity
   - Verify relationships between employees and leave records
   - Confirm data types and constraints

### Manual Testing Checklist:
- [ ] Homepage loads employees from database
- [ ] Employee cards display correctly
- [ ] Add employee form validation works
- [ ] New employees save to database permanently
- [ ] Employee detail pages load from database
- [ ] Leave history displays correctly
- [ ] Year filtering works
- [ ] Error states display properly
- [ ] Loading states show appropriately
- [ ] Migration banner works (test with localStorage data)
- [ ] Data persists across browser sessions
- [ ] Works on mobile devices

### ✅ Expected Outcome:
- Complete system working end-to-end
- Database integration fully functional
- Error handling robust
- User experience smooth and responsive

---

## 🎉 **Phase 4 Complete!**

### ✅ **What You've Accomplished:**
- ✅ Database successfully seeded with existing employee data
- ✅ localStorage migration helper for existing users
- ✅ Clean migration UI with user-friendly options
- ✅ Legacy code cleaned up and removed
- ✅ Production deployment checklist created
- ✅ Complete system tested and validated
- ✅ Multi-device data synchronization confirmed

### 📁 **Files Created:**
- ✅ `scripts/seed-database.ts`
- ✅ `src/lib/migrate-localStorage.ts` 
- ✅ `docs/production-deployment.md`

### 📁 **Files Modified:**
- ✅ `package.json` (added seeding scripts)
- ✅ `src/app/page.tsx` (migration UI)
- ✅ `src/data/mockData.ts` (cleaned up)

### 📁 **Dependencies Added:**
- ✅ `tsx` for TypeScript script execution

### 🚀 **System Now Provides:**
- **Complete database integration** - All data stored in Supabase PostgreSQL
- **Cross-device synchronization** - Access from phone, tablet, laptop, anywhere
- **Data persistence** - No more data loss on browser refresh or device changes
- **Scalable architecture** - Can handle hundreds of employees and thousands of leave records
- **Professional error handling** - User-friendly error messages and recovery options
- **Migration path** - Smooth transition for existing localStorage users
- **Production ready** - Fully deployable with comprehensive testing

---

## 🚨 **Troubleshooting**

### **Seeding Script Fails**
- Check database connection in Phase 1
- Verify Prisma schema is current (`npx prisma generate`)
- Check for constraint violations or duplicate data

### **Migration UI Not Showing**
- Verify localStorage contains 'homestaff-employees' key
- Check browser console for JavaScript errors
- Ensure migration functions are imported correctly

### **Data Not Persisting**
- Verify database connection is working
- Check API endpoints are saving data correctly
- Confirm Supabase database has the data

### **Performance Issues**
- Check database indexes are optimized
- Monitor Supabase usage dashboard
- Consider implementing pagination for large datasets

---

## 🎯 **Mission Accomplished!**

Your HomeStaff Holiday Manager is now a **complete, professional, multi-device accessible application** with:

✅ **Database-backed storage** (Supabase PostgreSQL)  
✅ **REST API** with full CRUD operations  
✅ **Type-safe frontend** with React and TypeScript  
✅ **Real-time synchronization** across all devices  
✅ **Professional error handling** and user experience  
✅ **Production-ready deployment** on Vercel  
✅ **Scalable architecture** for future growth  

**You can now manage your household staff from anywhere, on any device, with complete data persistence and synchronization!** 🎉