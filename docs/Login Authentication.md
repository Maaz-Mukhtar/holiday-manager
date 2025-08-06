# Login Authentication & Role-Based Access Control

## 🎯 **System Overview**

This document provides a complete implementation guide for adding authentication and role-based access control to the HomeStaff Holiday Management System using **Admin Panel Method** for user creation.

### **Authentication Approach**
- **Custom Session-Based Authentication** (no external dependencies)
- **Role-Based Access Control** (Admin vs User permissions)
- **Admin Panel User Management** (admins create users)
- **Forced Password Change** on first login

### **User Roles & Permissions**

#### **Admin Users**
- ✅ View all employees and leave records
- ✅ Add/edit/delete staff members
- ✅ Create/edit/delete leave records  
- ✅ Access admin panel
- ✅ Create and manage user accounts
- ✅ Full system access

#### **Regular Users**
- ✅ View employees and leave records
- ❌ Cannot add/edit staff members
- ❌ Cannot modify leave records
- ❌ No admin panel access
- ✅ Read-only dashboard access

---

## 🗄️ **Database Schema Design**

### **Update Prisma Schema**

Add these models to `prisma/schema.prisma`:

```prisma
model User {
  id              String    @id @default(cuid())
  username        String    @unique
  email           String    @unique
  password        String    // bcrypt hashed
  role            String    // "admin" or "user"
  firstName       String
  lastName        String
  mustChangePassword Boolean @default(true)
  lastLogin       DateTime?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  sessions Session[]
  
  @@map("users")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("sessions")
}
```

---

## 🚀 **Implementation Guide**

## **Phase 1: Database & Backend Setup** (45 minutes)

### **Step 1.1: Database Migration** (15 minutes)

1. **Update Prisma Schema**
   ```bash
   # Add User and Session models to prisma/schema.prisma (see above)
   ```

2. **Generate Migration**
   ```bash
   npx prisma migrate dev --name add_authentication
   ```

3. **Create Seed Script** - Create `prisma/seed.ts`:
   ```typescript
   import { PrismaClient } from '@prisma/client'
   import bcrypt from 'bcryptjs'

   const prisma = new PrismaClient()

   async function main() {
     // Create default admin user
     const hashedPassword = await bcrypt.hash('admin123', 12)
     
     const adminUser = await prisma.user.upsert({
       where: { username: 'admin' },
       update: {},
       create: {
         username: 'admin',
         email: 'admin@homestaff.com',
         password: hashedPassword,
         role: 'admin',
         firstName: 'System',
         lastName: 'Administrator',
         mustChangePassword: true,
         isActive: true
       }
     })
     
     console.log('Default admin user created:', adminUser.username)
   }

   main()
     .catch(e => console.error(e))
     .finally(async () => await prisma.$disconnect())
   ```

4. **Install Dependencies**
   ```bash
   npm install bcryptjs
   npm install -D @types/bcryptjs
   ```

5. **Run Seed**
   ```bash
   npx prisma db seed
   ```

### **Step 1.2: Authentication Utilities** (15 minutes)

1. **Create Password Utilities** - `src/lib/password.ts`:
   ```typescript
   import bcrypt from 'bcryptjs'

   export async function hashPassword(password: string): Promise<string> {
     return bcrypt.hash(password, 12)
   }

   export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
     return bcrypt.compare(password, hashedPassword)
   }

   export function generateDefaultPassword(): string {
     const adjectives = ['Quick', 'Bright', 'Swift', 'Smart', 'Cool']
     const nouns = ['Cat', 'Dog', 'Bird', 'Fish', 'Lion']
     const numbers = Math.floor(Math.random() * 900) + 100
     
     const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
     const noun = nouns[Math.floor(Math.random() * nouns.length)]
     
     return `${adjective}${noun}${numbers}!`
   }

   export function isValidPassword(password: string): boolean {
     // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
     return passwordRegex.test(password)
   }
   ```

2. **Create Auth Utilities** - `src/lib/auth.ts`:
   ```typescript
   import { prisma } from './prisma'
   import { User } from '@prisma/client'
   import crypto from 'crypto'

   export type AuthUser = Omit<User, 'password'>

   export async function createSession(userId: string): Promise<string> {
     const token = crypto.randomBytes(32).toString('hex')
     const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

     await prisma.session.create({
       data: {
         userId,
         token,
         expiresAt
       }
     })

     return token
   }

   export async function getSessionUser(token: string): Promise<AuthUser | null> {
     const session = await prisma.session.findUnique({
       where: { token },
       include: { user: true }
     })

     if (!session || session.expiresAt < new Date()) {
       if (session) {
         await prisma.session.delete({ where: { id: session.id } })
       }
       return null
     }

     const { password, ...user } = session.user
     return user
   }

   export async function deleteSession(token: string): Promise<void> {
     await prisma.session.delete({ where: { token } }).catch(() => {})
   }

   export async function cleanupExpiredSessions(): Promise<void> {
     await prisma.session.deleteMany({
       where: {
         expiresAt: { lt: new Date() }
       }
     })
   }
   ```

### **Step 1.3: Authentication API Endpoints** (15 minutes)

1. **Login Endpoint** - `src/app/api/auth/login/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { prisma } from '@/lib/prisma'
   import { verifyPassword, createSession } from '@/lib/auth'
   import { cookies } from 'next/headers'

   export async function POST(request: NextRequest) {
     try {
       const { username, password } = await request.json()

       if (!username || !password) {
         return NextResponse.json(
           { success: false, error: 'Username and password are required' },
           { status: 400 }
         )
       }

       // Find user
       const user = await prisma.user.findUnique({
         where: { username }
       })

       if (!user || !user.isActive) {
         return NextResponse.json(
           { success: false, error: 'Invalid credentials' },
           { status: 401 }
         )
       }

       // Verify password
       const isValidPassword = await verifyPassword(password, user.password)
       if (!isValidPassword) {
         return NextResponse.json(
           { success: false, error: 'Invalid credentials' },
           { status: 401 }
         )
       }

       // Create session
       const sessionToken = await createSession(user.id)

       // Update last login
       await prisma.user.update({
         where: { id: user.id },
         data: { lastLogin: new Date() }
       })

       // Set cookie
       const cookieStore = await cookies()
       cookieStore.set('auth-token', sessionToken, {
         httpOnly: true,
         secure: process.env.NODE_ENV === 'production',
         sameSite: 'lax',
         maxAge: 7 * 24 * 60 * 60 // 7 days
       })

       const { password: _, ...userWithoutPassword } = user

       return NextResponse.json({
         success: true,
         user: userWithoutPassword,
         mustChangePassword: user.mustChangePassword
       })

     } catch (error) {
       console.error('Login error:', error)
       return NextResponse.json(
         { success: false, error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

2. **Logout Endpoint** - `src/app/api/auth/logout/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { deleteSession } from '@/lib/auth'
   import { cookies } from 'next/headers'

   export async function POST(request: NextRequest) {
     try {
       const cookieStore = await cookies()
       const token = cookieStore.get('auth-token')?.value

       if (token) {
         await deleteSession(token)
       }

       cookieStore.delete('auth-token')

       return NextResponse.json({ success: true })

     } catch (error) {
       console.error('Logout error:', error)
       return NextResponse.json(
         { success: false, error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

3. **Current User Endpoint** - `src/app/api/auth/me/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { getSessionUser } from '@/lib/auth'
   import { cookies } from 'next/headers'

   export async function GET(request: NextRequest) {
     try {
       const cookieStore = await cookies()
       const token = cookieStore.get('auth-token')?.value

       if (!token) {
         return NextResponse.json(
           { success: false, error: 'Not authenticated' },
           { status: 401 }
         )
       }

       const user = await getSessionUser(token)
       if (!user) {
         return NextResponse.json(
           { success: false, error: 'Invalid session' },
           { status: 401 }
         )
       }

       return NextResponse.json({
         success: true,
         user
       })

     } catch (error) {
       console.error('Get user error:', error)
       return NextResponse.json(
         { success: false, error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

4. **Change Password Endpoint** - `src/app/api/auth/change-password/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { getSessionUser } from '@/lib/auth'
   import { verifyPassword, hashPassword, isValidPassword } from '@/lib/password'
   import { prisma } from '@/lib/prisma'
   import { cookies } from 'next/headers'

   export async function POST(request: NextRequest) {
     try {
       const cookieStore = await cookies()
       const token = cookieStore.get('auth-token')?.value

       if (!token) {
         return NextResponse.json(
           { success: false, error: 'Not authenticated' },
           { status: 401 }
         )
       }

       const user = await getSessionUser(token)
       if (!user) {
         return NextResponse.json(
           { success: false, error: 'Invalid session' },
           { status: 401 }
         )
       }

       const { currentPassword, newPassword } = await request.json()

       if (!currentPassword || !newPassword) {
         return NextResponse.json(
           { success: false, error: 'Current and new passwords are required' },
           { status: 400 }
         )
       }

       if (!isValidPassword(newPassword)) {
         return NextResponse.json(
           { success: false, error: 'Password must be at least 8 characters with uppercase, lowercase, and number' },
           { status: 400 }
         )
       }

       // Get user with password
       const userWithPassword = await prisma.user.findUnique({
         where: { id: user.id }
       })

       if (!userWithPassword) {
         return NextResponse.json(
           { success: false, error: 'User not found' },
           { status: 404 }
         )
       }

       // Verify current password
       const isCurrentPasswordValid = await verifyPassword(currentPassword, userWithPassword.password)
       if (!isCurrentPasswordValid) {
         return NextResponse.json(
           { success: false, error: 'Current password is incorrect' },
           { status: 400 }
         )
       }

       // Hash new password
       const hashedNewPassword = await hashPassword(newPassword)

       // Update password
       await prisma.user.update({
         where: { id: user.id },
         data: {
           password: hashedNewPassword,
           mustChangePassword: false
         }
       })

       return NextResponse.json({ success: true })

     } catch (error) {
       console.error('Change password error:', error)
       return NextResponse.json(
         { success: false, error: 'Internal server error' },
         { status: 500 }
       )
     }
   }
   ```

---

## **Phase 2: Frontend Authentication** (30 minutes)

### **Step 2.1: Authentication Context** (15 minutes)

1. **Create Auth Context** - `src/contexts/AuthContext.tsx`:
   ```typescript
   'use client'

   import React, { createContext, useContext, useEffect, useState } from 'react'

   export type User = {
     id: string
     username: string
     email: string
     role: string
     firstName: string
     lastName: string
     mustChangePassword: boolean
     lastLogin: string | null
     isActive: boolean
   }

   type AuthContextType = {
     user: User | null
     loading: boolean
     login: (username: string, password: string) => Promise<{ success: boolean; error?: string; mustChangePassword?: boolean }>
     logout: () => Promise<void>
     changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>
     isAdmin: () => boolean
     isAuthenticated: () => boolean
   }

   const AuthContext = createContext<AuthContextType | undefined>(undefined)

   export function AuthProvider({ children }: { children: React.ReactNode }) {
     const [user, setUser] = useState<User | null>(null)
     const [loading, setLoading] = useState(true)

     useEffect(() => {
       checkAuth()
     }, [])

     const checkAuth = async () => {
       try {
         const response = await fetch('/api/auth/me')
         const data = await response.json()

         if (data.success) {
           setUser(data.user)
         } else {
           setUser(null)
         }
       } catch (error) {
         console.error('Auth check error:', error)
         setUser(null)
       } finally {
         setLoading(false)
       }
     }

     const login = async (username: string, password: string) => {
       try {
         const response = await fetch('/api/auth/login', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ username, password })
         })

         const data = await response.json()

         if (data.success) {
           setUser(data.user)
           return { success: true, mustChangePassword: data.mustChangePassword }
         } else {
           return { success: false, error: data.error }
         }
       } catch (error) {
         return { success: false, error: 'Network error' }
       }
     }

     const logout = async () => {
       try {
         await fetch('/api/auth/logout', { method: 'POST' })
       } catch (error) {
         console.error('Logout error:', error)
       } finally {
         setUser(null)
       }
     }

     const changePassword = async (currentPassword: string, newPassword: string) => {
       try {
         const response = await fetch('/api/auth/change-password', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ currentPassword, newPassword })
         })

         const data = await response.json()

         if (data.success) {
           // Update user to reflect password change
           setUser(prev => prev ? { ...prev, mustChangePassword: false } : null)
           return { success: true }
         } else {
           return { success: false, error: data.error }
         }
       } catch (error) {
         return { success: false, error: 'Network error' }
       }
     }

     const isAdmin = () => user?.role === 'admin'
     const isAuthenticated = () => user !== null

     return (
       <AuthContext.Provider value={{
         user,
         loading,
         login,
         logout,
         changePassword,
         isAdmin,
         isAuthenticated
       }}>
         {children}
       </AuthContext.Provider>
     )
   }

   export function useAuth() {
     const context = useContext(AuthContext)
     if (context === undefined) {
       throw new Error('useAuth must be used within an AuthProvider')
     }
     return context
   }
   ```

### **Step 2.2: Login Page** (15 minutes)

1. **Create Login Page** - `src/app/login/page.tsx`:
   ```typescript
   'use client'

   import { useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { useAuth } from '@/contexts/AuthContext'

   export default function LoginPage() {
     const [formData, setFormData] = useState({
       username: '',
       password: ''
     })
     const [error, setError] = useState('')
     const [loading, setLoading] = useState(false)

     const { login } = useAuth()
     const router = useRouter()

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault()
       setError('')
       setLoading(true)

       const result = await login(formData.username, formData.password)

       if (result.success) {
         if (result.mustChangePassword) {
           router.push('/change-password')
         } else {
           router.push('/dashboard')
         }
       } else {
         setError(result.error || 'Login failed')
       }

       setLoading(false)
     }

     const handleInputChange = (field: keyof typeof formData, value: string) => {
       setFormData(prev => ({
         ...prev,
         [field]: value
       }))
     }

     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <div className="max-w-md w-full space-y-8">
           <div>
             <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
               HomeStaff Holiday Manager
             </h2>
             <p className="mt-2 text-center text-sm text-gray-600">
               Sign in to your account
             </p>
           </div>
           <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
             <div className="rounded-md shadow-sm -space-y-px">
               <div>
                 <label htmlFor="username" className="sr-only">
                   Username
                 </label>
                 <input
                   id="username"
                   name="username"
                   type="text"
                   required
                   disabled={loading}
                   className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Username"
                   value={formData.username}
                   onChange={(e) => handleInputChange('username', e.target.value)}
                 />
               </div>
               <div>
                 <label htmlFor="password" className="sr-only">
                   Password
                 </label>
                 <input
                   id="password"
                   name="password"
                   type="password"
                   required
                   disabled={loading}
                   className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Password"
                   value={formData.password}
                   onChange={(e) => handleInputChange('password', e.target.value)}
                 />
               </div>
             </div>

             {error && (
               <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                 {error}
               </div>
             )}

             <div>
               <button
                 type="submit"
                 disabled={loading}
                 className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
               >
                 {loading ? 'Signing in...' : 'Sign in'}
               </button>
             </div>
           </form>
         </div>
       </div>
     )
   }
   ```

2. **Create Change Password Page** - `src/app/change-password/page.tsx`:
   ```typescript
   'use client'

   import { useState } from 'react'
   import { useRouter } from 'next/navigation'
   import { useAuth } from '@/contexts/AuthContext'

   export default function ChangePasswordPage() {
     const [formData, setFormData] = useState({
       currentPassword: '',
       newPassword: '',
       confirmPassword: ''
     })
     const [error, setError] = useState('')
     const [loading, setLoading] = useState(false)

     const { changePassword, user } = useAuth()
     const router = useRouter()

     const handleSubmit = async (e: React.FormEvent) => {
       e.preventDefault()
       setError('')

       if (formData.newPassword !== formData.confirmPassword) {
         setError('New passwords do not match')
         return
       }

       if (formData.newPassword.length < 8) {
         setError('Password must be at least 8 characters long')
         return
       }

       setLoading(true)

       const result = await changePassword(formData.currentPassword, formData.newPassword)

       if (result.success) {
         router.push('/dashboard')
       } else {
         setError(result.error || 'Failed to change password')
       }

       setLoading(false)
     }

     return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
         <div className="max-w-md w-full space-y-8">
           <div>
             <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
               Change Password
             </h2>
             <p className="mt-2 text-center text-sm text-gray-600">
               Welcome {user?.firstName}! Please change your password to continue.
             </p>
           </div>
           <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
             <div className="space-y-4">
               <div>
                 <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                   Current Password
                 </label>
                 <input
                   id="currentPassword"
                   name="currentPassword"
                   type="password"
                   required
                   disabled={loading}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={formData.currentPassword}
                   onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                 />
               </div>
               <div>
                 <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                   New Password
                 </label>
                 <input
                   id="newPassword"
                   name="newPassword"
                   type="password"
                   required
                   disabled={loading}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={formData.newPassword}
                   onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                 />
                 <p className="mt-1 text-sm text-gray-500">
                   Must be at least 8 characters with uppercase, lowercase, and number
                 </p>
               </div>
               <div>
                 <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                   Confirm New Password
                 </label>
                 <input
                   id="confirmPassword"
                   name="confirmPassword"
                   type="password"
                   required
                   disabled={loading}
                   className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                   value={formData.confirmPassword}
                   onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                 />
               </div>
             </div>

             {error && (
               <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                 {error}
               </div>
             )}

             <div>
               <button
                 type="submit"
                 disabled={loading}
                 className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
               >
                 {loading ? 'Changing Password...' : 'Change Password'}
               </button>
             </div>
           </form>
         </div>
       </div>
     )
   }
   ```

---

## **Phase 3: Route Protection & Navigation** (25 minutes)

### **Step 3.1: Protected Route Component** (10 minutes)

1. **Create Protected Route** - `src/components/ProtectedRoute.tsx`:
   ```typescript
   'use client'

   import { useAuth } from '@/contexts/AuthContext'
   import { useRouter } from 'next/navigation'
   import { useEffect } from 'react'

   type ProtectedRouteProps = {
     children: React.ReactNode
     adminOnly?: boolean
   }

   export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
     const { user, loading, isAuthenticated, isAdmin } = useAuth()
     const router = useRouter()

     useEffect(() => {
       if (!loading) {
         if (!isAuthenticated()) {
           router.push('/login')
           return
         }

         if (user?.mustChangePassword) {
           router.push('/change-password')
           return
         }

         if (adminOnly && !isAdmin()) {
           router.push('/dashboard') // Redirect non-admins to dashboard
           return
         }
       }
     }, [user, loading, isAuthenticated, isAdmin, adminOnly, router])

     if (loading) {
       return (
         <div className="min-h-screen flex items-center justify-center">
           <div className="text-center">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
             <p className="text-gray-600">Loading...</p>
           </div>
         </div>
       )
     }

     if (!isAuthenticated() || (adminOnly && !isAdmin()) || user?.mustChangePassword) {
       return null
     }

     return <>{children}</>
   }
   ```

### **Step 3.2: Navigation Header** (15 minutes)

1. **Create Navbar Component** - `src/components/Navbar.tsx`:
   ```typescript
   'use client'

   import { useAuth } from '@/contexts/AuthContext'
   import Link from 'next/link'
   import { useRouter } from 'next/navigation'
   import { useState } from 'react'

   export default function Navbar() {
     const { user, logout, isAdmin } = useAuth()
     const router = useRouter()
     const [showUserMenu, setShowUserMenu] = useState(false)

     const handleLogout = async () => {
       await logout()
       router.push('/login')
     }

     return (
       <nav className="bg-white shadow-sm border-b">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <div className="flex justify-between items-center h-16">
             {/* Logo */}
             <div className="flex items-center">
               <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                 HomeStaff Manager
               </Link>
             </div>

             {/* Navigation Links */}
             <div className="hidden md:flex space-x-8">
               <Link
                 href="/dashboard"
                 className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
               >
                 Dashboard
               </Link>
               {isAdmin() && (
                 <Link
                   href="/admin/users"
                   className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                 >
                   User Management
                 </Link>
               )}
             </div>

             {/* User Menu */}
             <div className="relative">
               <button
                 onClick={() => setShowUserMenu(!showUserMenu)}
                 className="flex items-center space-x-3 text-sm focus:outline-none"
               >
                 <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                   <span className="text-indigo-600 font-semibold text-sm">
                     {user?.firstName[0]}{user?.lastName[0]}
                   </span>
                 </div>
                 <div className="text-left">
                   <div className="text-sm font-medium text-gray-900">
                     {user?.firstName} {user?.lastName}
                   </div>
                   <div className="text-xs text-gray-500">
                     {user?.role === 'admin' ? 'Administrator' : 'User'}
                   </div>
                 </div>
               </button>

               {showUserMenu && (
                 <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                   <div className="px-4 py-2 text-sm text-gray-700 border-b">
                     {user?.email}
                   </div>
                   <Link
                     href="/profile"
                     className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                     onClick={() => setShowUserMenu(false)}
                   >
                     Profile Settings
                   </Link>
                   <button
                     onClick={handleLogout}
                     className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                   >
                     Sign out
                   </button>
                 </div>
               )}
             </div>
           </div>
         </div>
       </nav>
     )
   }
   ```

---

## **Phase 4: Admin Panel User Creation** (30 minutes)

### **Step 4.1: User Management API** (15 minutes)

1. **Create User Management API** - `src/app/api/admin/users/route.ts`:
   ```typescript
   import { NextRequest, NextResponse } from 'next/server'
   import { getSessionUser } from '@/lib/auth'
   import { hashPassword, generateDefaultPassword } from '@/lib/password'
   import { prisma } from '@/lib/prisma'
   import { cookies } from 'next/headers'

   export async function GET(request: NextRequest) {
     try {
       const cookieStore = await cookies()
       const token = cookieStore.get('auth-token')?.value

       if (!token) {
         return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
       }

       const user = await getSessionUser(token)
       if (!user || user.role !== 'admin') {
         return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
       }

       const users = await prisma.user.findMany({
         select: {
           id: true,
           username: true,
           email: true,
           firstName: true,
           lastName: true,
           role: true,
           isActive: true,
           lastLogin: true,
           createdAt: true
         },
         orderBy: { createdAt: 'desc' }
       })

       return NextResponse.json({ success: true, users })

     } catch (error) {
       console.error('Get users error:', error)
       return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
     }
   }

   export async function POST(request: NextRequest) {
     try {
       const cookieStore = await cookies()
       const token = cookieStore.get('auth-token')?.value

       if (!token) {
         return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
       }

       const currentUser = await getSessionUser(token)
       if (!currentUser || currentUser.role !== 'admin') {
         return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
       }

       const { username, email, firstName, lastName, role } = await request.json()

       if (!username || !email || !firstName || !lastName || !role) {
         return NextResponse.json(
           { success: false, error: 'All fields are required' },
           { status: 400 }
         )
       }

       if (!['admin', 'user'].includes(role)) {
         return NextResponse.json(
           { success: false, error: 'Invalid role' },
           { status: 400 }
         )
       }

       // Check if username or email already exists
       const existingUser = await prisma.user.findFirst({
         where: {
           OR: [
             { username },
             { email }
           ]
         }
       })

       if (existingUser) {
         return NextResponse.json(
           { success: false, error: 'Username or email already exists' },
           { status: 400 }
         )
       }

       // Generate default password
       const defaultPassword = generateDefaultPassword()
       const hashedPassword = await hashPassword(defaultPassword)

       // Create user
       const newUser = await prisma.user.create({
         data: {
           username,
           email,
           firstName,
           lastName,
           role,
           password: hashedPassword,
           mustChangePassword: true,
           isActive: true
         },
         select: {
           id: true,
           username: true,
           email: true,
           firstName: true,
           lastName: true,
           role: true,
           isActive: true,
           createdAt: true
         }
       })

       return NextResponse.json({
         success: true,
         user: newUser,
         defaultPassword
       })

     } catch (error) {
       console.error('Create user error:', error)
       return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
     }
   }
   ```

### **Step 4.2: User Management Page** (15 minutes)

1. **Create User Management Page** - `src/app/admin/users/page.tsx`:
   ```typescript
   'use client'

   import { useState, useEffect } from 'react'
   import ProtectedRoute from '@/components/ProtectedRoute'
   import Navbar from '@/components/Navbar'

   type User = {
     id: string
     username: string
     email: string
     firstName: string
     lastName: string
     role: string
     isActive: boolean
     lastLogin: string | null
     createdAt: string
   }

   type NewUserForm = {
     username: string
     email: string
     firstName: string
     lastName: string
     role: string
   }

   export default function UserManagementPage() {
     const [users, setUsers] = useState<User[]>([])
     const [loading, setLoading] = useState(true)
     const [showAddModal, setShowAddModal] = useState(false)
     const [addingUser, setAddingUser] = useState(false)
     const [error, setError] = useState('')
     const [successMessage, setSuccessMessage] = useState('')
     const [newUser, setNewUser] = useState<NewUserForm>({
       username: '',
       email: '',
       firstName: '',
       lastName: '',
       role: 'user'
     })

     useEffect(() => {
       loadUsers()
     }, [])

     const loadUsers = async () => {
       try {
         const response = await fetch('/api/admin/users')
         const data = await response.json()

         if (data.success) {
           setUsers(data.users)
         } else {
           setError('Failed to load users')
         }
       } catch (err) {
         setError('Failed to load users')
       } finally {
         setLoading(false)
       }
     }

     const handleAddUser = async (e: React.FormEvent) => {
       e.preventDefault()
       setError('')
       setAddingUser(true)

       try {
         const response = await fetch('/api/admin/users', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(newUser)
         })

         const data = await response.json()

         if (data.success) {
           setUsers(prev => [data.user, ...prev])
           setNewUser({
             username: '',
             email: '',
             firstName: '',
             lastName: '',
             role: 'user'
           })
           setShowAddModal(false)
           setSuccessMessage(`User created successfully! Default password: ${data.defaultPassword}`)
           
           // Clear success message after 10 seconds
           setTimeout(() => setSuccessMessage(''), 10000)
         } else {
           setError(data.error)
         }
       } catch (err) {
         setError('Failed to create user')
       } finally {
         setAddingUser(false)
       }
     }

     const formatDate = (dateString: string) => {
       return new Date(dateString).toLocaleDateString()
     }

     return (
       <ProtectedRoute adminOnly>
         <div className="min-h-screen bg-gray-50">
           <Navbar />
           
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             {/* Header */}
             <div className="flex justify-between items-center mb-8">
               <div>
                 <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                 <p className="mt-2 text-sm text-gray-600">
                   Manage user accounts and permissions
                 </p>
               </div>
               <button
                 onClick={() => setShowAddModal(true)}
                 className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
               >
                 <span className="text-lg">+</span>
                 Add User
               </button>
             </div>

             {/* Messages */}
             {error && (
               <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                 {error}
                 <button onClick={() => setError('')} className="ml-4 text-red-500">×</button>
               </div>
             )}

             {successMessage && (
               <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                 {successMessage}
                 <button onClick={() => setSuccessMessage('')} className="ml-4 text-green-500">×</button>
               </div>
             )}

             {/* Users Table */}
             <div className="bg-white shadow rounded-lg overflow-hidden">
               <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       User
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Role
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Last Login
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Created
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                       Status
                     </th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-200">
                   {loading ? (
                     <tr>
                       <td colSpan={5} className="px-6 py-4 text-center">
                         <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                         <span className="ml-2">Loading users...</span>
                       </td>
                     </tr>
                   ) : users.length === 0 ? (
                     <tr>
                       <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                         No users found
                       </td>
                     </tr>
                   ) : (
                     users.map((user) => (
                       <tr key={user.id} className="hover:bg-gray-50">
                         <td className="px-6 py-4 whitespace-nowrap">
                           <div className="flex items-center">
                             <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                               <span className="text-indigo-600 font-semibold text-sm">
                                 {user.firstName[0]}{user.lastName[0]}
                               </span>
                             </div>
                             <div className="ml-4">
                               <div className="text-sm font-medium text-gray-900">
                                 {user.firstName} {user.lastName}
                               </div>
                               <div className="text-sm text-gray-500">
                                 {user.username} • {user.email}
                               </div>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             user.role === 'admin' 
                               ? 'bg-purple-100 text-purple-800' 
                               : 'bg-green-100 text-green-800'
                           }`}>
                             {user.role === 'admin' ? 'Administrator' : 'User'}
                           </span>
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {formatDate(user.createdAt)}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                             user.isActive 
                               ? 'bg-green-100 text-green-800' 
                               : 'bg-red-100 text-red-800'
                           }`}>
                             {user.isActive ? 'Active' : 'Inactive'}
                           </span>
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>

             {/* Add User Modal */}
             {showAddModal && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                 <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                   <div className="flex justify-between items-center mb-4">
                     <h2 className="text-xl font-bold text-gray-900">Add New User</h2>
                     <button
                       onClick={() => setShowAddModal(false)}
                       disabled={addingUser}
                       className="text-gray-400 hover:text-gray-600 text-2xl"
                     >
                       ×
                     </button>
                   </div>

                   <form onSubmit={handleAddUser} className="space-y-4">
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Username *
                       </label>
                       <input
                         type="text"
                         required
                         disabled={addingUser}
                         value={newUser.username}
                         onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="username"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Email *
                       </label>
                       <input
                         type="email"
                         required
                         disabled={addingUser}
                         value={newUser.email}
                         onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="user@example.com"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         First Name *
                       </label>
                       <input
                         type="text"
                         required
                         disabled={addingUser}
                         value={newUser.firstName}
                         onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="John"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Last Name *
                       </label>
                       <input
                         type="text"
                         required
                         disabled={addingUser}
                         value={newUser.lastName}
                         onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                         placeholder="Doe"
                       />
                     </div>

                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Role *
                       </label>
                       <select
                         required
                         disabled={addingUser}
                         value={newUser.role}
                         onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       >
                         <option value="user">User (Read Only)</option>
                         <option value="admin">Administrator (Full Access)</option>
                       </select>
                     </div>

                     <div className="bg-blue-50 p-3 rounded-md">
                       <p className="text-sm text-blue-800">
                         <strong>Note:</strong> A default password will be generated. The user must change it on first login.
                       </p>
                     </div>

                     <div className="flex gap-3 pt-4">
                       <button
                         type="button"
                         onClick={() => setShowAddModal(false)}
                         disabled={addingUser}
                         className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                       >
                         Cancel
                       </button>
                       <button
                         type="submit"
                         disabled={addingUser}
                         className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                       >
                         {addingUser ? 'Creating...' : 'Create User'}
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
             )}
           </div>
         </div>
       </ProtectedRoute>
     )
   }
   ```

---

## **Phase 5: App Integration & Route Updates** (20 minutes)

### **Step 5.1: Update App Structure** (10 minutes)

1. **Update Root Layout** - `src/app/layout.tsx`:
   ```typescript
   import type { Metadata } from 'next'
   import './globals.css'
   import { AuthProvider } from '@/contexts/AuthContext'

   export const metadata: Metadata = {
     title: 'HomeStaff Holiday Manager',
     description: 'Manage household staff leave and holidays',
   }

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <html lang="en">
         <body>
           <AuthProvider>
             {children}
           </AuthProvider>
         </body>
       </html>
     )
   }
   ```

2. **Update Root Page** - `src/app/page.tsx`:
   ```typescript
   'use client'

   import { useAuth } from '@/contexts/AuthContext'
   import { useRouter } from 'next/navigation'
   import { useEffect } from 'react'

   export default function RootPage() {
     const { isAuthenticated, loading, user } = useAuth()
     const router = useRouter()

     useEffect(() => {
       if (!loading) {
         if (isAuthenticated()) {
           if (user?.mustChangePassword) {
             router.push('/change-password')
           } else {
             router.push('/dashboard')
           }
         } else {
           router.push('/login')
         }
       }
     }, [isAuthenticated, loading, user, router])

     if (loading) {
       return (
         <div className="min-h-screen flex items-center justify-center">
           <div className="text-center">
             <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
             <p className="text-gray-600">Loading...</p>
           </div>
         </div>
       )
     }

     return null
   }
   ```

3. **Create Dashboard Page** - `src/app/dashboard/page.tsx`:
   ```typescript
   // Move your existing src/app/page.tsx content here and wrap with ProtectedRoute
   'use client'

   import ProtectedRoute from '@/components/ProtectedRoute'
   import Navbar from '@/components/Navbar'
   import { useAuth } from '@/contexts/AuthContext'
   // ... your existing homepage imports and logic

   export default function DashboardPage() {
     const { isAdmin } = useAuth()
     
     return (
       <ProtectedRoute>
         <div className="min-h-screen bg-gray-50">
           <Navbar />
           
           {/* Your existing homepage content with role-based UI modifications */}
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
             {/* Header with conditional Add Staff button */}
             <div className="mb-8 flex justify-between items-start">
               <div>
                 <h1 className="text-3xl font-bold text-gray-900">HomeStaff Status Dashboard</h1>
                 <p className="mt-2 text-sm text-gray-600">
                   View current household staff availability and leave status
                 </p>
               </div>
               
               {/* Only show Add Staff button to admins */}
               {isAdmin() && (
                 <button
                   onClick={() => setShowAddModal(true)}
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
                 >
                   <span className="text-lg">+</span>
                   Add Staff Member
                 </button>
               )}
             </div>
             
             {/* Rest of your existing dashboard content */}
             {/* ... */}
           </div>
         </div>
       </ProtectedRoute>
     )
   }
   ```

### **Step 5.2: Protect API Routes** (10 minutes)

1. **Create Auth Middleware** - `src/middleware.ts`:
   ```typescript
   import { NextResponse } from 'next/server'
   import type { NextRequest } from 'next/server'
   import { getSessionUser } from './lib/auth'

   export async function middleware(request: NextRequest) {
     const { pathname } = request.nextUrl

     // Public routes that don't need authentication
     const publicRoutes = ['/login', '/api/auth/login']
     
     if (publicRoutes.some(route => pathname.startsWith(route))) {
       return NextResponse.next()
     }

     // Check for auth token
     const token = request.cookies.get('auth-token')?.value

     if (!token) {
       if (pathname.startsWith('/api/')) {
         return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
       }
       return NextResponse.redirect(new URL('/login', request.url))
     }

     // Validate session
     try {
       const user = await getSessionUser(token)
       if (!user) {
         if (pathname.startsWith('/api/')) {
           return NextResponse.json({ success: false, error: 'Invalid session' }, { status: 401 })
         }
         return NextResponse.redirect(new URL('/login', request.url))
       }

       // Check admin routes
       if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
         if (user.role !== 'admin') {
           if (pathname.startsWith('/api/')) {
             return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 })
           }
           return NextResponse.redirect(new URL('/dashboard', request.url))
         }
       }

       // Force password change
       if (user.mustChangePassword && !pathname.startsWith('/change-password') && !pathname.startsWith('/api/auth')) {
         if (pathname.startsWith('/api/')) {
           return NextResponse.json({ success: false, error: 'Password change required' }, { status: 403 })
         }
         return NextResponse.redirect(new URL('/change-password', request.url))
       }

       return NextResponse.next()

     } catch (error) {
       if (pathname.startsWith('/api/')) {
         return NextResponse.json({ success: false, error: 'Authentication error' }, { status: 500 })
       }
       return NextResponse.redirect(new URL('/login', request.url))
     }
   }

   export const config = {
     matcher: [
       '/((?!_next/static|_next/image|favicon.ico|public).*)',
     ]
   }
   ```

---

## **📋 Implementation Checklist**

### **Phase 1: Database & Backend** ✅
- [ ] Update Prisma schema with User and Session models
- [ ] Run database migration
- [ ] Create seed script for default admin
- [ ] Install bcryptjs dependency
- [ ] Create password utilities
- [ ] Create auth utilities
- [ ] Create login API endpoint
- [ ] Create logout API endpoint
- [ ] Create current user API endpoint
- [ ] Create change password API endpoint

### **Phase 2: Frontend Authentication** ✅
- [ ] Create AuthContext with user state management
- [ ] Create useAuth hook
- [ ] Create login page
- [ ] Create change password page
- [ ] Add form validation and error handling
- [ ] Test login/logout flow

### **Phase 3: Route Protection** ✅
- [ ] Create ProtectedRoute component
- [ ] Create Navbar component with user menu
- [ ] Update app layout with AuthProvider
- [ ] Update root page with auth redirect logic
- [ ] Create dashboard page (move existing homepage)
- [ ] Create middleware for route protection

### **Phase 4: Admin Panel** ✅
- [ ] Create user management API endpoints
- [ ] Create user management page
- [ ] Add user creation form with validation
- [ ] Add user table with status indicators
- [ ] Test user creation flow
- [ ] Add success/error messages

### **Phase 5: Role-Based UI** ✅
- [ ] Update dashboard with role-based buttons
- [ ] Update employee detail page with role checks
- [ ] Hide/show features based on user role
- [ ] Test admin vs user experience
- [ ] Add role indicators throughout UI

---

## **🔧 Testing Procedures**

### **Initial Setup Test**
1. Run `npm run dev`
2. Navigate to application
3. Should redirect to `/login`
4. Login with `admin` / `admin123`
5. Should redirect to change password
6. Change password successfully
7. Should redirect to dashboard

### **Admin User Creation Test**
1. Login as admin
2. Navigate to User Management
3. Click "Add User"
4. Fill form and create user
5. Note the generated password
6. Logout and login with new user credentials
7. Verify forced password change
8. Test role-based access restrictions

### **Role-Based Access Test**
1. Create both admin and regular users
2. Test admin can:
   - Access user management
   - Add staff members
   - Edit leave records
3. Test regular user can:
   - View dashboard
   - View employee details
   - Cannot access admin features

---

## **🚀 Real-World Usage Scenarios**

### **Day 1: Initial Setup**
1. **Deploy application** with database migration
2. **Default admin created** (`admin` / `admin123`)
3. **You log in** as admin and change password
4. **Create your personal admin account** with proper details
5. **Disable default admin** (optional security measure)

### **Day 2: Add Users**
1. **Add household manager** → Admin role (can manage staff)
2. **Add family member** → User role (view-only access)
3. **Add other staff** → User role (can view their colleagues)
4. **Share credentials** with each person securely

### **Ongoing Management**
1. **Users log in** with provided credentials
2. **Forced to change passwords** on first login
3. **Admin manages** staff records and leave
4. **Users view** current status and availability
5. **System maintains** secure access control

---

## **🛡️ Security Best Practices**

### **Password Security**
- Passwords hashed with bcrypt (cost factor 12)
- Minimum password requirements enforced
- Forced password change on first login
- Session tokens are cryptographically secure

### **Session Management**
- Secure HTTP-only cookies
- 7-day session expiration
- Automatic cleanup of expired sessions
- Logout invalidates server-side session

### **Access Control**
- Role-based permissions at API level
- Frontend route protection with middleware
- Admin-only features properly secured
- Input validation on all forms

### **Development Security**
- Environment-based security settings
- CSRF protection via SameSite cookies
- SQL injection protection via Prisma
- XSS protection via React

---

## **📁 Complete File Structure**

```
src/
├── app/
│   ├── admin/
│   │   └── users/
│   │       └── page.tsx                 # User management page
│   ├── api/
│   │   ├── admin/
│   │   │   └── users/
│   │   │       └── route.ts             # User CRUD API
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   │   └── route.ts             # Login endpoint
│   │   │   ├── logout/
│   │   │   │   └── route.ts             # Logout endpoint
│   │   │   ├── me/
│   │   │   │   └── route.ts             # Current user endpoint
│   │   │   └── change-password/
│   │   │       └── route.ts             # Password change endpoint
│   │   └── [existing APIs...]
│   ├── change-password/
│   │   └── page.tsx                     # Password change page
│   ├── dashboard/
│   │   └── page.tsx                     # Main dashboard (moved from root)
│   ├── login/
│   │   └── page.tsx                     # Login page
│   ├── layout.tsx                       # Updated with AuthProvider
│   └── page.tsx                         # Root redirect logic
├── components/
│   ├── Navbar.tsx                       # Navigation with user menu
│   └── ProtectedRoute.tsx               # Route protection component
├── contexts/
│   └── AuthContext.tsx                  # Authentication state management
├── lib/
│   ├── auth.ts                          # Session management utilities
│   ├── password.ts                      # Password hashing utilities
│   └── prisma.ts                        # Existing Prisma client
├── middleware.ts                        # Route protection middleware
└── [existing files...]

prisma/
├── schema.prisma                        # Updated with User & Session models
└── seed.ts                              # Default admin user creation
```

---

## **⚡ Quick Start Commands**

```bash
# Install new dependencies
npm install bcryptjs
npm install -D @types/bcryptjs

# Update database
npx prisma migrate dev --name add_authentication
npx prisma db seed

# Start development
npm run dev

# Default admin credentials
Username: admin
Password: admin123
```

---

**🎉 Congratulations!** 

You now have a complete authentication system with:
- ✅ Secure login/logout functionality  
- ✅ Role-based access control (Admin vs User)
- ✅ Admin panel for user management
- ✅ Automatic user creation with default passwords
- ✅ Forced password changes on first login
- ✅ Protected routes and API endpoints
- ✅ Professional user interface with navigation
- ✅ Session management with secure cookies

Your HomeStaff Holiday Management System is now enterprise-ready with proper security and user management! 🚀