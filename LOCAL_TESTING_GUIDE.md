# Local Testing Guide - 1hrLearning Refactoring

This guide will help you test all the new features implemented in the refactoring locally.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Running Services](#running-services)
5. [Testing Backend Features](#testing-backend-features)
6. [Testing Frontend Features](#testing-frontend-features)
7. [API Testing](#api-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Ensure you have the following installed:
- **Node.js** 18+ (`node --version`)
- **npm** 9+ (`npm --version`)
- **Git** (`git --version`)
- **PostgreSQL** 14+ (for database)
- **Redis** (optional, for caching)
- **Docker** (optional, alternative to local PostgreSQL)

---

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project root
cd /path/to/1hrlearning

# Install all dependencies
npm install

# Install backend-specific dependencies
cd apps/backend
npm install

# Install frontend-specific dependencies
cd ../frontend
npm install

# Back to root
cd ../..
```

### 2. Configure Environment Variables

```bash
# Copy the example env file
cp .env.example .env

# Edit .env with your local configuration
```

**Key environment variables to configure:**

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/1hrlearning"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Email (SendGrid - optional for testing)
SENDGRID_API_KEY=""

# Frontend
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
BACKEND_URL="http://localhost:4000"

# Auth
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# OAuth (optional)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
```

### 3. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

#### Option B: Local PostgreSQL Installation

```bash
# Start PostgreSQL service (macOS with Homebrew)
brew services start postgresql

# Start PostgreSQL service (Windows with WSL2)
sudo service postgresql start

# Create database
psql -U postgres -c "CREATE DATABASE 1hrlearning;"
```

### 4. Initialize Database Schema

```bash
cd apps/backend

# Run migrations to create tables
npx prisma migrate deploy

# Seed database with initial data (if seed script exists)
npx prisma db seed

# Generate Prisma client
npx prisma generate
```

Verify the schema:
```bash
# Open Prisma Studio to inspect database
npx prisma studio
```

---

## Running Services

### Terminal 1: Start Backend Server

```bash
cd apps/backend

# Install dependencies
npm install

# Start development server (port 4000)
npm run dev

# Expected output:
# 🚀 Server running on port 4000 (development)
# Background jobs scheduler initialized
```

### Terminal 2: Start Frontend Server

```bash
cd apps/frontend

# Install dependencies
npm install

# Start development server (port 3000)
npm run dev

# Expected output:
# ▲ Next.js 15.0
# - Local: http://localhost:3000
```

### Verify Services

```bash
# Backend health check
curl http://localhost:4000

# Frontend check
curl http://localhost:3000
```

---

## Testing Backend Features

### 1. Test User Authentication

```bash
# Register a new user
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "displayName": "Test User"
  }'

# Response should include:
# {
#   "success": true,
#   "data": {
#     "user": { "id", "email", "displayName" },
#     "accessToken": "...",
#     "refreshToken": "..."
#   }
# }

# Login
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'

# Save the accessToken for subsequent requests
export TOKEN="your_access_token_here"
```

### 2. Test Profile & Onboarding

```bash
# Update user profile
curl -X PATCH http://localhost:4000/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Updated Name",
    "bio": "I love teaching and learning",
    "timezone": "EST"
  }'

# Mark onboarding complete
curl -X PATCH http://localhost:4000/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isOnboardingComplete": true
  }'
```

### 3. Test Skills Management

```bash
# Get all skills
curl http://localhost:4000/api/v1/skills

# Add a teaching skill
curl -X POST http://localhost:4000/api/v1/users/skills/skill-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isTeaching": true,
    "proficiency": "EXPERT"
  }'

# Add a learning skill
curl -X POST http://localhost:4000/api/v1/users/skills/skill-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isLearning": true,
    "depthLevel": "BEGINNER"
  }'
```

### 4. Test Availability Management

```bash
# Create availability slot
curl -X POST http://localhost:4000/api/v1/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2024-06-01T09:00:00Z",
    "endTime": "2024-06-01T17:00:00Z"
  }'

# Get user's availability
curl http://localhost:4000/api/v1/availability/me \
  -H "Authorization: Bearer $TOKEN"

# Get specific user's availability
curl http://localhost:4000/api/v1/availability/user-id \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Test Points System

```bash
# Get user's points balance
curl http://localhost:4000/api/v1/users/profile \
  -H "Authorization: Bearer $TOKEN"

# Get points config
curl http://localhost:4000/api/v1/admin/points/config \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check points economy health
curl http://localhost:4000/api/v1/admin/points/economy \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 6. Test Matching Algorithm

```bash
# Get matches
curl http://localhost:4000/api/v1/users/matches?limit=20 \
  -H "Authorization: Bearer $TOKEN"

# Response includes fitment scores with breakdown:
# {
#   "userId": "...",
#   "fitmentScore": 75,
#   "scoreFactors": {
#     "topicMatch": 50,
#     "availabilityOverlap": 20,
#     "reputation": 5,
#     "total": 75
#   },
#   "user": {...},
#   "canTeachMe": [...],
#   "iCanTeach": [...]
# }
```

### 7. Test Session Management

```bash
# Send interest (first interaction)
curl -X POST http://localhost:4000/api/v1/sessions/interest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sharerId": "sharer-user-id",
    "skillId": "skill-id",
    "availabilityId": "availability-id",
    "depthLevel": "BEGINNER",
    "message": "I would love to learn from you!"
  }'

# Send session request (subsequent interaction)
curl -X POST http://localhost:4000/api/v1/sessions/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sharerId": "sharer-user-id",
    "skillId": "skill-id",
    "scheduledAt": "2024-06-01T10:00:00Z",
    "durationMinutes": 60,
    "depthLevel": "BEGINNER",
    "agenda": "Basic concepts and getting started"
  }'

# Get user's sessions
curl "http://localhost:4000/api/v1/sessions?role=teacher" \
  -H "Authorization: Bearer $TOKEN"

# Update session status
curl -X PATCH http://localhost:4000/api/v1/sessions/session-id \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "CONFIRMED"
  }'
```

### 8. Test Admin Features

First, create an admin user in the database:

```bash
# Connect to database
psql -d 1hrlearning

# Update a user's role to ADMIN
UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
```

```bash
# Get admin dashboard
curl http://localhost:4000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List users
curl http://localhost:4000/api/v1/admin/users?page=1&limit=20 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List sessions
curl http://localhost:4000/api/v1/admin/sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Suspend a user
curl -X POST http://localhost:4000/api/v1/admin/users/user-id/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Violation of community guidelines"
  }'

# Update point config
curl -X PATCH http://localhost:4000/api/v1/admin/points/config \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "PER_30_MIN",
    "value": 10
  }'

# Manually trigger background jobs
curl -X POST http://localhost:4000/api/v1/admin/jobs/run-emails \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST http://localhost:4000/api/v1/admin/jobs/run-sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 9. Test Email Service

```bash
# In development, emails are logged (not sent via SendGrid)
# Check backend logs for email output:

# Look for log messages like:
# [Email] Would send to user@example.com: Welcome to 1hrLearning!
# [Email] Would send to user@example.com: Your First Match!
```

To enable actual SendGrid emails:
1. Set `SENDGRID_API_KEY` in `.env`
2. Restart backend server

---

## Testing Frontend Features

### 1. Test Onboarding Flow

1. **Navigate to the app**
   - Open http://localhost:3000

2. **Create a new account**
   - Click "Sign Up"
   - Fill in email, password, display name
   - Click "Register"

3. **Complete onboarding**
   - **Step 1 (Profile)**: Fill name, bio, timezone → Continue
   - **Step 2 (Share Side)**: Select 2-3 skills to teach → Continue
   - **Step 3 (Learn Side)**: Select 2-3 skills to learn with depth levels → Continue
   - **Step 4 (Availability)**: Add time slots for each day of the week → Finish

4. **Verify**
   - Should redirect to dashboard
   - Dashboard should show "Welcome back!"

### 2. Test Discover/Matches

1. **Navigate to Discover**
   - Click "Discover" in navigation
   - Should see matches grid with match cards

2. **Filter Matches**
   - Click on skill filters to filter matches
   - Should update match list

3. **View Match Details**
   - Click "View Profile" on a match card
   - Should see sharer's full profile with skills and testimonials

### 3. Test Interest/Request Flow

1. **Send Interest**
   - On a match card, click "Send Interest"
   - Select skill, depth level, availability slot
   - Add optional message
   - Click "Send Interest"

2. **Send Request**
   - On a match card, click menu → "Send Request"
   - Select skill, duration, date/time
   - Add optional agenda
   - Click "Send Request"

### 4. Test Request Management

1. **Navigate to Requests**
   - Click "Requests" in navigation
   - Should see two tabs: "Incoming Requests" and "My Requests"

2. **Review Requests**
   - Click on incoming request to review
   - Click on outgoing request for details

### 5. Test Profile Page

1. **Navigate to Profile**
   - Click on your avatar → "Profile" or click "Profile" in navigation
   - Should see your teaching and learning skills

2. **View Another User's Profile**
   - From matches, click "View Profile"
   - Should see their skills, ratings, testimonials

---

## API Testing

### Using Postman

1. **Import Collection**
   - Create a new Postman environment with:
     ```
     {{base_url}} = http://localhost:4000/api/v1
     {{token}} = your_access_token
     ```

2. **Test Each Endpoint**
   - Use the curl commands above as reference
   - Set Authorization header: `Bearer {{token}}`

### Using cURL

Create a test script `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:4000/api/v1"
TOKEN=""

# Register user
REGISTER=$(curl -s -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "displayName": "Test User"
  }')

TOKEN=$(echo $REGISTER | jq -r '.data.accessToken')
echo "Token: $TOKEN"

# Get user profile
curl -s $BASE_URL/users/profile \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get matches
curl -s "$BASE_URL/users/matches?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Get availability
curl -s "$BASE_URL/availability/me" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Run it:
```bash
chmod +x test-api.sh
./test-api.sh
```

### Using Thunder Client (VS Code)

1. Install "Thunder Client" extension
2. Create requests with similar format to Postman
3. Easy testing directly in VS Code

---

## Testing Checklist

### Backend Features

- [ ] **Authentication**
  - [ ] User registration works
  - [ ] User login works
  - [ ] Tokens are generated correctly
  - [ ] Protected endpoints require valid tokens

- [ ] **Profile & Onboarding**
  - [ ] Profile updates work
  - [ ] Onboarding status can be marked complete
  - [ ] Dashboard redirects incomplete onboardings to /onboarding

- [ ] **Skills**
  - [ ] Can add teaching skills
  - [ ] Can add learning skills
  - [ ] Skills list is searchable

- [ ] **Availability**
  - [ ] Can create time slots
  - [ ] Can update slots
  - [ ] Can delete slots
  - [ ] Overlap validation works
  - [ ] Status transitions (OPEN → HELD → BOOKED) work

- [ ] **Points System**
  - [ ] Points balance is calculated correctly
  - [ ] Points can be locked
  - [ ] Points transfers work
  - [ ] Low balance notifications trigger
  - [ ] Point expiry works

- [ ] **Matching**
  - [ ] Matches are returned with fitment scores
  - [ ] Score factors breakdown is correct
  - [ ] Minimum threshold (40pts) is enforced
  - [ ] Related categories matching works

- [ ] **Sessions**
  - [ ] Interest can be sent
  - [ ] Requests can be sent
  - [ ] Session status transitions work
  - [ ] Points are locked on CONFIRMED
  - [ ] Points are transferred on COMPLETED
  - [ ] Ratings trigger reputation updates

- [ ] **Admin Features**
  - [ ] Admin dashboard loads
  - [ ] User suspension works
  - [ ] User banning works
  - [ ] Point config can be updated
  - [ ] Audit logs are created
  - [ ] Background jobs can be triggered

### Frontend Features

- [ ] **Onboarding**
  - [ ] All 4 steps load correctly
  - [ ] Form validation works
  - [ ] Back/next navigation works
  - [ ] Data persists to API
  - [ ] Completion redirects to dashboard

- [ ] **Discovery**
  - [ ] Match cards display correctly
  - [ ] Filters work
  - [ ] Score visualization is clear
  - [ ] Profile links navigate correctly

- [ ] **Interest/Request**
  - [ ] Forms validate required fields
  - [ ] Forms submit to API
  - [ ] Success redirects to appropriate page
  - [ ] Error messages display

- [ ] **Profile**
  - [ ] Own profile shows editing options
  - [ ] Other profiles show contact buttons
  - [ ] Skills display correctly
  - [ ] Stats display correctly

- [ ] **Request Management**
  - [ ] Incoming requests tab works
  - [ ] Outgoing requests tab works
  - [ ] Request details load
  - [ ] Navigation works

---

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U postgres -d 1hrlearning -c "SELECT 1;"

# Check connection string
echo $DATABASE_URL

# Verify Prisma can connect
cd apps/backend
npx prisma db execute --stdin < /dev/null
```

### Backend Server Won't Start

```bash
# Check Node version
node --version  # Should be 18+

# Check if port 4000 is in use
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Clear cache and reinstall
cd apps/backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Frontend Server Issues

```bash
# Clear Next.js cache
cd apps/frontend
rm -rf .next
npm run dev

# Check port 3000
lsof -i :3000  # macOS/Linux
```

### Authentication Not Working

```bash
# Verify NEXTAUTH_SECRET is set
echo $NEXTAUTH_SECRET

# Check browser console for errors
# In Chrome DevTools → Console → Check for auth errors

# Verify backend is accessible
curl http://localhost:4000/health
```

### Database Migrations Failed

```bash
# Check migration status
cd apps/backend
npx prisma migrate status

# Reset database (warning: deletes all data)
npx prisma migrate reset

# Verify schema
npx prisma studio
```

### Email Templates Not Triggering

```bash
# Check backend logs for email messages
# Look for "[Email] Would send to..."

# To enable actual SendGrid:
# 1. Set SENDGRID_API_KEY in .env
# 2. Restart backend: npm run dev

# Manually trigger email jobs
curl -X POST http://localhost:4000/api/v1/admin/jobs/run-emails \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Matching Algorithm Not Working

```bash
# Verify both users have:
# 1. Teaching skills (one user)
# 2. Learning skills (other user)
# 3. Overlapping availability
# 4. Fitment score ≥ 40

# Test with admin user
curl http://localhost:4000/api/v1/users/matches \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## Performance Testing

### Load Testing with Artillery

```bash
# Install Artillery
npm install -g artillery

# Create load-test.yml
cat > load-test.yml <<EOF
config:
  target: "http://localhost:4000"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Workflow"
    flow:
      - get:
          url: "/api/v1/skills"
      - post:
          url: "/api/v1/users/matches"
          json:
            limit: 20
EOF

# Run test
artillery run load-test.yml
```

### Monitor Database Performance

```bash
# In Prisma Studio
npx prisma studio

# In PostgreSQL
psql -d 1hrlearning -c "\timing on"
SELECT * FROM "Session" LIMIT 10;
```

---

## Useful Development Tools

### Prisma Studio
```bash
cd apps/backend
npx prisma studio
# Opens http://localhost:5555
```

### Docker Compose Commands
```bash
# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Restart PostgreSQL
docker-compose restart postgres

# Remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Git Branch Info
```bash
# View current branch
git branch

# View branch info
git log --oneline -n 5

# Compare with main
git diff main
```

---

## Next Steps After Testing

1. **Create Test Cases**: Document specific test scenarios
2. **Automated Testing**: Set up Jest/Playwright tests
3. **Staging Deployment**: Deploy to staging environment
4. **Team Review**: Have team members test features
5. **Production Deployment**: Deploy to production

---

## Additional Resources

- **Backend API Docs**: (Add Swagger/OpenAPI docs if available)
- **Database Schema**: `apps/backend/prisma/schema.prisma`
- **Frontend Code**: `apps/frontend/src/app/`
- **Refactoring Report**: `REFACTORING_COMPLETE.md`
- **PR Description**: Check GitHub PR #19 for detailed changes

---

**Happy Testing! 🚀**

For issues or questions, check the troubleshooting section or review the relevant source files.
