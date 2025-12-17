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

### 5. Run Development Server

```bash
npm run dev
```

## Rank System

- Rank 1 is highest (admin/manager)
- Higher numbers = lower rank
- Users can only assign projects to employees with higher rank numbers (lower rank)
- Only higher-ranked employees can approve projects

## Pages

- `/login` - Authentication
- `/home` - Dashboard with scoreboard and active projects
- `/projects` - Manage your projects
- `/profile` - View your profile and stats
- `/admin` - Employee management (admin only)
