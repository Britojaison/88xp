# Employee Dashboard

A Next.js + Supabase employee dashboard with project management and scoreboard.

## Features

- **Scoreboard**: Monthly points leaderboard based on completed projects
- **Active Projects**: View all ongoing projects
- **Project Management**: Create, assign, complete, and approve projects
- **Rank System**: Higher rank employees can assign projects to lower ranks and approve their work
- **Admin Panel**: Manage employees, set ranks, and admin privileges

## Project Types & Points

| Type | Points |
|------|--------|
| Static | 10 |
| Carousel | 20 |
| Reel | 30 |
| Video | 40 |
| Animation | 50 |

## Setup

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Database Migration

Copy the SQL from `supabase/migrations/001_initial_schema.sql` and run it in your Supabase SQL Editor.

### 3. Configure Environment

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Create First Admin User

1. Go to Supabase Auth > Users and create a user
2. Copy the user's UUID
3. Insert into employees table:

```sql
INSERT INTO employees (id, email, name, rank, is_admin)
VALUES ('user-uuid-here', 'admin@example.com', 'Admin', 1, true);
```

### 5. Deploy Edge Functions

Deploy the admin functions to Supabase:

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy

# Set required secrets
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

See `supabase/functions/README.md` for detailed deployment instructions.

### 6. Run Development Server

```bash
npm run dev
```

## Rank System

- Rank 1 is highest (admin/manager)
- Higher numbers = lower rank
- Users can only assign projects to employees with higher rank numbers (lower rank)
- Only higher-ranked employees can approve projects

## Pages

### Admin Routes (Admin Only)
- `/admin` - Employee management dashboard
- `/admin/add-user` - Create new staff members
- `/admin/profile` - Admin profile view

### Staff Routes (Staff Only)
- `/home` - Dashboard with scoreboard and active projects
- `/projects` - Manage your projects
- `/profile` - View your profile and stats

### Public Routes
- `/login` - Authentication
