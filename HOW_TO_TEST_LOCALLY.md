# How to Test the Refactoring Changes Locally

This document explains how to set up and test all the changes from the refactoring PR locally.

## 📚 Available Testing Guides

We've created three guides to help you test:

### 1. **QUICK_START.sh** (Recommended for first-time setup)
An automated script that sets up everything for you.

```bash
# Make it executable
chmod +x QUICK_START.sh

# Run it
./QUICK_START.sh

# Follow the instructions printed at the end
```

**What it does:**
- ✅ Checks prerequisites (Node.js, npm, PostgreSQL/Docker)
- ✅ Installs all dependencies
- ✅ Sets up `.env` file
- ✅ Initializes database
- ✅ Generates Prisma client
- ✅ Prints next steps

**Time:** ~5 minutes

---

### 2. **QUICK_TEST_REFERENCE.md** (For quick API testing)
Essential commands for testing features without reading a long guide.

**Contains:**
- One-time setup commands
- Daily development commands
- API testing snippets for each feature
- Common curl commands
- Troubleshooting quick map

**Use this when:**
- You want to quickly test an API endpoint
- You need a curl command example
- You want to remember a command
- You're testing from command line

---

### 3. **LOCAL_TESTING_GUIDE.md** (Complete reference)
Comprehensive guide covering everything in detail.

**Contains:**
- Detailed setup instructions
- Backend feature testing
- Frontend feature testing
- Testing checklist
- API testing with different tools
- Performance testing
- Troubleshooting

**Use this when:**
- You need detailed explanation of a feature
- You want to test everything systematically
- You encounter an issue and need solutions
- You're new to the codebase

---

## 🚀 Getting Started (Quick Path)

### Step 1: Initial Setup (First Time Only)

```bash
# Clone repo and navigate to it
cd /path/to/1hrlearning

# Run the setup script
chmod +x QUICK_START.sh
./QUICK_START.sh

# The script will:
# - Check all requirements
# - Install dependencies
# - Set up database
# - Print next steps
```

### Step 2: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
# Should show: 🚀 Server running on port 4000
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
# Should show: ▲ Next.js 15 - http://localhost:3000
```

**Terminal 3 - Database (Optional):**
```bash
cd apps/backend
npx prisma studio
# Opens: http://localhost:5555
```

### Step 3: Test the Features

#### Option A: Browser Testing (Easiest)
```
1. Open http://localhost:3000
2. Register a new account
3. Complete the 4-step onboarding
4. Explore matches, profiles, requests
5. Create sessions and test interactions
```

#### Option B: API Testing (Fastest)
```bash
# Use QUICK_TEST_REFERENCE.md for exact curl commands
# Or use Postman with the commands provided

# Example:
export TOKEN="your_token_from_login_response"
curl http://localhost:4000/api/v1/users/matches \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 Testing Checklist

### Backend Features (API Level)

**Authentication**
- [ ] User registration works
- [ ] User login returns token
- [ ] Protected endpoints require valid token
- [ ] Invalid tokens return 401

**Profile & Onboarding**
- [ ] Profile can be updated
- [ ] Onboarding status can be marked complete
- [ ] Dashboard redirects incomplete profiles to /onboarding

**Skills**
- [ ] Can add teaching skills
- [ ] Can add learning skills  
- [ ] Skill list is searchable and filterable
- [ ] Skill counts are accurate

**Availability**
- [ ] Time slots can be created
- [ ] Slots can be updated (if OPEN/HELD)
- [ ] Slots can be deleted (if not BOOKED)
- [ ] Status transitions work (OPEN → HELD → BOOKED)
- [ ] Overlap validation prevents conflicts

**Points System**
- [ ] Points balance displays correctly
- [ ] Points can be locked on session confirmation
- [ ] Points transfer on session completion
- [ ] Low balance notifications trigger
- [ ] Point expiry works (6 months inactivity)

**Matching**
- [ ] Matches returned with fitment scores
- [ ] Score includes 3 dimensions (topic, availability, reputation)
- [ ] Minimum threshold (40pts) enforced
- [ ] Related categories matching works

**Sessions**
- [ ] Interest can be sent
- [ ] Requests can be sent
- [ ] Session status transitions work correctly
- [ ] Points lock on CONFIRMED
- [ ] Points transfer on COMPLETED
- [ ] Ratings trigger reputation updates
- [ ] Meeting URL hidden until CONFIRMED

**Admin Features**
- [ ] Admin dashboard loads
- [ ] User management works (suspend, ban, reinstate)
- [ ] Point config can be updated
- [ ] Session override works
- [ ] Audit logs created
- [ ] Background jobs can be triggered

### Frontend Features (UI Level)

**Onboarding**
- [ ] All 4 pages load without errors
- [ ] Form validation works on each step
- [ ] Back/next navigation works
- [ ] Data persists to backend
- [ ] Completion redirects to dashboard

**Discovery**
- [ ] Matches display as cards
- [ ] Skill filters work
- [ ] Fitment scores visible
- [ ] Profile links work

**Interest & Request Forms**
- [ ] Forms load correctly
- [ ] Required fields validated
- [ ] Forms submit to API
- [ ] Success shows feedback
- [ ] Error shows error message

**Requests Management**
- [ ] Incoming requests tab shows requests to you
- [ ] Outgoing requests tab shows your requests
- [ ] Request details load
- [ ] Navigation between tabs works

**Profile Page**
- [ ] Own profile shows edit options
- [ ] Other profiles show connect buttons
- [ ] Skills display correctly
- [ ] Stats accurate

---

## 🔧 Common Testing Scenarios

### Scenario 1: Test Matching Algorithm

1. Create 2 test accounts
2. Account A: Teach "JavaScript", Learn "Spanish"
3. Account B: Teach "Spanish", Learn "JavaScript"
4. Both accounts add availability slots
5. Login as Account A
6. Go to http://localhost:3000/discover
7. Should see Account B as a match with fitment score

**Expected Result:**
- Match score ≥ 40 (meets minimum threshold)
- Score factors show: topic match (25-50), availability overlap, reputation

### Scenario 2: Test Session Booking Flow

1. Both accounts complete onboarding
2. Account A views Account B's profile
3. Click "Send Interest"
4. Select skill, depth, and availability slot
5. Account B receives notification (check dashboard)
6. Account B confirms session
7. Account A's points are locked
8. After time passes, session auto-completes
9. Points transfer to Account B

**Expected Result:**
- Points locked when session CONFIRMED
- Points transferred when session COMPLETED
- Both users can rate after completion

### Scenario 3: Test Admin Operations

1. Update a user to have ADMIN role in database:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@example.com';
   ```

2. Login as admin user

3. Access admin endpoints:
   ```bash
   curl http://localhost:4000/api/v1/admin/dashboard \
     -H "Authorization: Bearer $ADMIN_TOKEN"
   ```

4. Test operations:
   - View users list
   - Suspend a user
   - View audit logs
   - Update point config
   - View analytics

**Expected Result:**
- All admin operations succeed
- Changes reflected in database
- Audit logs created for each action

### Scenario 4: Test Email Triggers

1. In development, emails are logged instead of sent
2. Check backend logs for: `[Email] Would send to...`
3. Trigger each email type:
   - Welcome: Register new user
   - Rate Prompt: Complete a session
   - Points Low: Use up points
   - Suspension: Admin suspend user
   - Re-engagement: Manually trigger via: 
     ```bash
     curl -X POST http://localhost:4000/api/v1/admin/jobs/run-emails \
       -H "Authorization: Bearer $ADMIN_TOKEN"
     ```

**Expected Result:**
- Email logs appear in backend terminal
- All 11 email types trigger correctly

---

## 🔍 Debugging Tips

### View Database State
```bash
cd apps/backend
npx prisma studio
# Opens visual database browser at http://localhost:5555
```

### Check Backend Logs
```bash
# Terminal where backend is running shows:
# - All API requests
# - Database queries
# - Email sends
# - Job executions
# - Errors and warnings
```

### Check Frontend Logs
```bash
# Press F12 in browser → Console tab
# Shows:
# - Network requests
# - JavaScript errors
# - Application state
# - Auth status
```

### Database Queries (Direct)
```bash
psql -d 1hrlearning

# Check users
SELECT id, email, "displayName", role, "isOnboardingComplete" 
FROM "User" LIMIT 5;

# Check sessions
SELECT id, "learnerId", "teacherId", status, "scheduledAt" 
FROM "Session" LIMIT 5;

# Check points
SELECT id, "userId", "pointsBalance" 
FROM "User" WHERE "pointsBalance" > 0 LIMIT 5;
```

### Reset Everything
```bash
# ⚠️  WARNING: This deletes all data!
cd apps/backend
npx prisma migrate reset

# Confirm: type 'y' when prompted
```

---

## 📊 Testing Timeline

**First Time:** 15-20 minutes
- Setup: 5 min
- Dependencies: 5 min
- Database: 5 min
- Start servers: 2-3 min

**Subsequent Tests:** 2-3 minutes
- Start servers only (already set up)

**Complete Feature Testing:** 30-45 minutes
- All features from checklist
- Multiple user scenarios
- API and UI testing

---

## 🆘 Troubleshooting Quick Start

### Servers won't start?
See "Backend Server Won't Start" in LOCAL_TESTING_GUIDE.md

### Can't connect to database?
See "Database Connection Issues" in LOCAL_TESTING_GUIDE.md

### Authentication not working?
See "Authentication Not Working" in LOCAL_TESTING_GUIDE.md

### Feature X not working?
See "Testing" section for that feature in LOCAL_TESTING_GUIDE.md

---

## 📞 Getting Help

1. **Check the guides in order:**
   - First: QUICK_TEST_REFERENCE.md (quick answers)
   - Second: LOCAL_TESTING_GUIDE.md (detailed help)
   - Third: REFACTORING_COMPLETE.md (implementation details)

2. **Check the code:**
   - Backend: `apps/backend/src/`
   - Frontend: `apps/frontend/src/app/`
   - Database: `apps/backend/prisma/schema.prisma`

3. **Check the PR:**
   - GitHub PR #19 has detailed description
   - Commit message has comprehensive changes list

---

## ✨ What to Test

The refactoring includes:

**10 Backend Features:**
✅ Database Schema - 8 new models
✅ Points Service - Duration-based scaling, locking, transfers
✅ Sessions Service - Full state machine
✅ Matching Algorithm - 3-dimension fitment score
✅ Availability Management - Slot booking system
✅ Testimonials - Learner feedback
✅ Meeting Links - User link storage
✅ Admin System - 50+ endpoints
✅ Email Service - 11 templates
✅ Background Jobs - Scheduled tasks

**4 Frontend Flows:**
✅ Onboarding - 4-step wizard
✅ Discovery - Match finding
✅ Interactions - Interest/request forms
✅ Management - Request tracking

---

## 🎯 Success Criteria

You'll know everything works when:

✅ Frontend loads without errors at http://localhost:3000
✅ Can register and complete onboarding
✅ Can discover matches with fitment scores
✅ Can send interest/request forms
✅ Can manage sessions and requests
✅ Admin endpoints return data
✅ Backend logs show email triggers
✅ Database contains all expected models
✅ Points lock and transfer correctly
✅ Matching returns results with 40+ score

---

## 📖 Next Steps

1. **Quick Setup:** Run `./QUICK_START.sh`
2. **Start Servers:** Open 2-3 terminals
3. **Test in Browser:** Go to http://localhost:3000
4. **Reference Guide:** Use QUICK_TEST_REFERENCE.md for API testing
5. **Deep Dive:** Read LOCAL_TESTING_GUIDE.md for detailed info
6. **Debug Issues:** Check troubleshooting section

---

**Happy Testing! 🚀**

All three guides are in the root directory:
- `QUICK_START.sh` - Run this first
- `QUICK_TEST_REFERENCE.md` - Use this for quick commands
- `LOCAL_TESTING_GUIDE.md` - Use this for detailed help
