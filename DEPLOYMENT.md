# Deployment Guide - Holiday Manager

This guide will help you deploy the Holiday Manager application to Vercel with a PostgreSQL database.

## Prerequisites

- A Vercel account ([signup at vercel.com](https://vercel.com))
- A GitHub account with your code repository
- A PostgreSQL database (we recommend Vercel Postgres or Supabase)

## Step 1: Set up Your Database

### Option A: Vercel Postgres (Recommended)

1. Go to your [Vercel dashboard](https://vercel.com/dashboard)
2. Click on the "Storage" tab
3. Click "Create Database" → "Postgres"
4. Choose a name for your database (e.g., "holiday-manager-db")
5. Select your preferred region
6. Click "Create"
7. Copy the connection string from the "Quickstart" tab

### Option B: Supabase (Free Tier Available)

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project"
3. Fill in your project details:
   - Name: "Holiday Manager"
   - Database Password: Choose a strong password
   - Region: Select closest to your users
4. Wait for the project to be created (2-3 minutes)
5. Go to Settings → Database
6. Copy the "Connection string" (choose "Pooling" mode)
7. Replace `[YOUR-PASSWORD]` with your database password

## Step 2: Deploy to Vercel

### 2.1 Connect Your Repository

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js project

### 2.2 Configure Environment Variables

In the Vercel deployment settings, add these environment variables:

```
DATABASE_URL=your_postgresql_connection_string_here
NEXTAUTH_SECRET=your_secure_random_secret_here
NEXTAUTH_URL=https://your-app-name.vercel.app
```

To generate a secure `NEXTAUTH_SECRET`, run:
```bash
openssl rand -base64 32
```

### 2.3 Deploy

1. Click "Deploy"
2. Wait for the build to complete
3. Your app will be available at `https://your-app-name.vercel.app`

## Step 3: Set Up Your Database

After deployment, you need to set up your database schema and seed data.

### 3.1 Access Vercel CLI (if needed)

Install Vercel CLI locally:
```bash
npm i -g vercel
vercel login
vercel link
```

### 3.2 Run Database Setup

You have two options:

#### Option A: Using Vercel CLI
```bash
# Pull environment variables
vercel env pull .env.local

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with demo data
npm run db:seed
```

#### Option B: Using Database URL directly
```bash
# Set your database URL
export DATABASE_URL="your_postgresql_connection_string"

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database with demo data
npm run db:seed
```

## Step 4: Verify Your Deployment

1. Visit your deployed app URL
2. You should see the login page
3. Use these demo credentials to test:
   - **Admin**: admin@company.com / demo123
   - **Manager**: manager@company.com / demo123
   - **Employee**: employee@company.com / demo123

## Step 5: Custom Domain (Optional)

1. In your Vercel dashboard, go to your project
2. Click on the "Domains" tab
3. Add your custom domain
4. Follow the DNS configuration instructions
5. Update `NEXTAUTH_URL` environment variable to your custom domain

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
- Verify your `DATABASE_URL` is correct
- Ensure your database allows connections from Vercel's IP ranges
- Check if you need to allowlist Vercel's IPs in your database provider

#### 2. Authentication Issues
- Make sure `NEXTAUTH_SECRET` is set
- Verify `NEXTAUTH_URL` matches your deployment URL
- Check that environment variables are properly set in Vercel

#### 3. Build Failures
- Ensure `npx prisma generate` runs successfully
- Check that all TypeScript types are correct
- Verify all environment variables are set

#### 4. Database Schema Issues
```bash
# Reset and recreate database schema
npx prisma db push --force-reset
npm run db:seed
```

### Production Environment Variables

Make sure these are set in your Vercel dashboard:

```env
# Required
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"

# Optional: Email configuration
EMAIL_SERVER_HOST="smtp.example.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="your-email@example.com"
EMAIL_SERVER_PASSWORD="your-password"
EMAIL_FROM="noreply@your-domain.com"

# Optional: OAuth providers
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
```

## Monitoring

After deployment, monitor your application:

1. **Vercel Analytics**: Automatically enabled for performance monitoring
2. **Database Monitoring**: Check your database provider's dashboard
3. **Error Tracking**: Consider adding Sentry for error tracking
4. **Uptime Monitoring**: Use services like Uptime Robot

## Updates and Maintenance

### Updating Your Application
1. Push changes to your GitHub repository
2. Vercel will automatically deploy the changes
3. Run database migrations if schema changes:
   ```bash
   npx prisma db push
   ```

### Database Backups
- **Vercel Postgres**: Automatic backups included
- **Supabase**: Automatic backups on paid plans
- **Manual Backup**: Use `pg_dump` for manual backups

### Scaling Considerations
- **Database**: Monitor connection limits and upgrade plan if needed
- **Vercel**: Automatic scaling included, monitor usage in dashboard
- **Performance**: Use Vercel Analytics to identify bottlenecks

## Security Checklist

- [ ] Strong `NEXTAUTH_SECRET` set
- [ ] Database connection string is secure
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Environment variables not committed to git
- [ ] Database access restricted to necessary IPs
- [ ] Regular security updates applied

## Support

If you encounter issues:

1. Check Vercel deployment logs
2. Review database provider logs
3. Check this troubleshooting guide
4. Create an issue in the GitHub repository

---

🎉 **Congratulations!** Your Holiday Manager application should now be live and ready to use.

Visit your deployment URL and start managing holidays! 🏖️