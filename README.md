# 88XP Employee Dashboard

A Next.js + Supabase employee dashboard with project management and comprehensive points tracking.

## Features

- **Monthly Scoreboard**: Leaderboard based on completed projects with month/year filtering
- **Yearly Scoreboard**: Annual points aggregation and leaderboard
- **Points Breakdown**: Detailed view of each project's points, who assigned it, and any overrides
- **Active Projects**: View all ongoing projects
- **Project Management**: Create, assign, complete, and approve projects
- **Rank System**: Higher rank employees can assign projects to lower ranks and optionally override points
- **Admin Panel**: Manage employees, set ranks, and admin privileges

## Points System

### Project Types & Default Points

| Type | Points |
|------|--------|
| Static | 10 |
| Carousel | 20 |
| Reel | 30 |
| Video | 40 |
| Animation | 50 |

### Points Flow

1. **Project Created**: Employee creates a project and assigns it to themselves or a lower-ranked employee
2. **Project Completed**: Assignee marks the project as complete
3. **Points Awarded Instantly**: Database trigger automatically awards points on completion:
   - Uses `points_override` if set by a Rank 1 user, otherwise uses project type's default points
   - Updates `monthly_scores` table for the assignee
   - Updates `yearly_scores` table for the assignee

**Note**: Points are awarded immediately upon completion. Approval is optional and not required for points.

### Points Override (Optional)

Rank 1 employees (highest rank) can optionally override the default points for any project. This is useful for:
- Extra complexity in a project
- Bonus points for exceptional work
- Adjusted points based on effort

If no override is set, the standard points from the project type are used.

### Aggregation

- **Monthly**: Points are aggregated per employee per month
- **Yearly**: Monthly points are automatically summed into yearly totals
- All aggregation happens via database triggers for reliability

## Setup

### 1. Create Supabase Project

Go to [supabase.com](https://supabase.com) and create a new project.

### 2. Run Database Migrations

Run the following migrations in your Supabase SQL Editor **in order**:

1. `supabase/migrations/002_points_system.sql` - Points tracking system with triggers

This migration creates:
- `monthly_scores` table with automatic updates
- `yearly_scores` table with automatic updates
- Database triggers that fire when projects are completed (points awarded instantly)
- Helper functions for points calculation

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

**Important**: Admin and Rank are separate concepts!

### Admin
- Has access to the Admin Panel (`/admin`)
- Can add, edit, and delete employees
- Manages the organization but may or may not be Rank 1

### Ranks
- **Rank 1** = Highest authority (there can be multiple Rank 1 users)
- **Rank 2, 3, 4...** = Progressively lower authority
- Higher rank (lower number) can override points for lower ranks
- Users can assign projects to employees with equal or higher rank numbers

### Points Override
- Rank 1 can override points for Rank 2, 3, 4...
- Rank 2 can override points for Rank 3, 4...
- And so on (flexible hierarchy)

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
