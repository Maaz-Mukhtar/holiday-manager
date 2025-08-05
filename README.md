# Holiday Manager - Staff Holiday Tracking System

A comprehensive web application for managing staff holiday requests, approvals, and bonus tracking built with Next.js, TypeScript, and PostgreSQL.

## 🚀 Features

- **User Authentication**: Secure login with role-based access control
- **Holiday Management**: Request, approve, and track holiday requests
- **Bonus Tracking**: Manage and track holiday bonuses
- **Role-based Permissions**: Admin, Manager, and Employee roles
- **Real-time Notifications**: Live updates for holiday status changes
- **Analytics Dashboard**: Comprehensive reporting and analytics
- **Calendar Integration**: Visual holiday planning and team availability
- **Export Functionality**: PDF and CSV export capabilities

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand + React Query
- **Deployment**: Vercel
- **Styling**: Tailwind CSS with Headless UI components

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd holiday-manager
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Update `.env.local` with your database URL and other configuration:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/holiday_manager?schema=public"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Start the development server:
```bash
npm run dev
```

## 🚀 Deployment to Vercel

### Step 1: Set up Database
You'll need a PostgreSQL database. Recommended options:

**Option A: Vercel Postgres (Recommended)**
1. Go to your Vercel dashboard
2. Go to Storage tab and create a new Postgres database
3. Copy the connection string

**Option B: Supabase (Free tier available)**
1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings > Database and copy connection string

### Step 2: Deploy to Vercel
1. Push your code to GitHub repository
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Configure environment variables in Vercel dashboard:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Will be auto-set by Vercel

4. Deploy and run database setup:
```bash
npx prisma generate
npx prisma db push
```

## 🔐 Demo Credentials

For testing, create these demo users in your database or use the seed script:

- **Admin**: admin@company.com / admin123
- **Manager**: manager@company.com / manager123  
- **Employee**: employee@company.com / employee123

## 👥 User Roles

- **Admin**: Full system access, can manage all users and settings
- **Manager**: Can approve holidays for their department, view team reports
- **Employee**: Can request holidays, view their own data

## 🛠️ Development Commands

```bash
# Start development server
npm run dev

# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# View database in Prisma Studio
npx prisma studio

# Type checking
npm run build

# Linting
npm run lint
```

## 📝 Key Features Overview

### For Employees:
- Request holidays with automatic working day calculation
- View holiday history and remaining entitlement
- Track holiday bonuses
- Real-time notifications for approval status

### For Managers:
- Approve/reject team holiday requests
- View department holiday calendar
- Generate team reports
- Manage holiday bonuses

### For Admins:
- Full user management (create, update, deactivate)
- System-wide analytics and reporting
- Manage all departments and roles
- Export functionality (PDF/CSV)

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Dashboard pages
│   └── layout.tsx         # Root layout
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Helper functions
├── types/                 # TypeScript type definitions
└── components/           # Reusable UI components
```

## 🔒 Security Features

- JWT-based authentication with NextAuth.js
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention with Prisma ORM
- Password hashing with bcrypt
- CSRF protection
- Secure session management

## 📱 Responsive Design

Fully responsive design that works on:
- Desktop (1024px+)
- Tablet (768px-1023px)
- Mobile (320px-767px)

## 🚀 Performance Optimizations

- Server-side rendering (SSR) with Next.js
- Static generation where appropriate
- Database query optimization with Prisma
- Code splitting and lazy loading
- Image optimization
- Efficient caching strategies

## 🛠️ Customization

The application is built with modularity in mind. Key areas for customization:

1. **User Roles**: Modify in `prisma/schema.prisma`
2. **Holiday Types**: Update enums in schema
3. **Business Rules**: Edit calculation functions in `lib/utils.ts`
4. **UI Theme**: Customize Tailwind CSS configuration
5. **Email Templates**: Add email service integration

## 📊 Database Schema

Key entities:
- **User**: Employee information and authentication
- **Holiday**: Holiday requests and approvals
- **HolidayBonus**: Bonus tracking per holiday
- **Notification**: System notifications

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues:

**Database Connection Issues:**
- Verify `DATABASE_URL` is correct
- Ensure database is accessible from your deployment environment
- Check firewall settings for database access

**Authentication Issues:**
- Verify `NEXTAUTH_SECRET` is set
- Ensure `NEXTAUTH_URL` matches your deployment URL
- Check session configuration

**Build Issues:**
- Run `npx prisma generate` before building
- Ensure all environment variables are set
- Check TypeScript errors with `npm run build`

## 📞 Support

For support and questions:
1. Check this documentation
2. Review the code examples
3. Check GitHub issues
4. Create new issue with detailed information

Built with ❤️ using Next.js, TypeScript, and modern web technologies.