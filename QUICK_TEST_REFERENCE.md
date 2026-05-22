# Quick Test Reference - Essential Commands

## One-Time Setup

```bash
# 1. Clone and setup
cd /path/to/1hrlearning
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your settings

# 3. Start database
docker-compose up -d
# OR: brew services start postgresql (macOS)

# 4. Initialize database
cd apps/backend
npx prisma migrate deploy
npx prisma generate
cd ../..
```

## Daily Development

### Terminal 1: Backend
```bash
cd apps/backend
npm run dev
# Runs on http://localhost:4000
```

### Terminal 2: Frontend
```bash
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

### Terminal 3 (Optional): Database Studio
```bash
cd apps/backend
npx prisma studio
# Opens http://localhost:5555
```

---

## Quick API Testing

### Save your token
```bash
# Get token from login response, then export it
export TOKEN="your_access_token_here"
export ADMIN_TOKEN="admin_access_token_here"
export BASE_URL="http://localhost:4000/api/v1"
```

### Core Feature Tests

#### 1. Authentication
```bash
# Register
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!","displayName":"Test"}'

# Login
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Pass123!"}'
```

#### 2. Profile
```bash
# Get profile
curl $BASE_URL/users/profile -H "Authorization: Bearer $TOKEN"

# Update profile
curl -X PATCH $BASE_URL/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName":"New Name","bio":"My bio","timezone":"EST"}'
```

#### 3. Skills
```bash
# List skills
curl $BASE_URL/skills

# Add teaching skill
curl -X POST $BASE_URL/users/skills/SKILL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isTeaching":true,"proficiency":"EXPERT"}'

# Add learning skill
curl -X POST $BASE_URL/users/skills/SKILL_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"isLearning":true,"depthLevel":"BEGINNER"}'
```

#### 4. Availability
```bash
# Create slot
curl -X POST $BASE_URL/availability \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startTime":"2024-06-01T09:00:00Z",
    "endTime":"2024-06-01T17:00:00Z"
  }'

# Get my availability
curl $BASE_URL/availability/me -H "Authorization: Bearer $TOKEN"
```

#### 5. Matching
```bash
# Get matches
curl "$BASE_URL/users/matches?limit=20" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Response includes:
# - fitmentScore (0-100)
# - scoreFactors (topic, availability, reputation)
# - user info and compatible skills
```

#### 6. Sessions
```bash
# Send interest
curl -X POST $BASE_URL/sessions/interest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sharerId":"USER_ID",
    "skillId":"SKILL_ID",
    "availabilityId":"AVAIL_ID",
    "depthLevel":"BEGINNER",
    "message":"Interested in learning!"
  }'

# Send request
curl -X POST $BASE_URL/sessions/request \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sharerId":"USER_ID",
    "skillId":"SKILL_ID",
    "scheduledAt":"2024-06-01T10:00:00Z",
    "durationMinutes":60,
    "depthLevel":"BEGINNER",
    "agenda":"Learn basics"
  }'

# Get sessions
curl "$BASE_URL/sessions?role=teacher" -H "Authorization: Bearer $TOKEN"

# Update session
curl -X PATCH $BASE_URL/sessions/SESSION_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"CONFIRMED"}'

# Rate session
curl -X POST $BASE_URL/sessions/SESSION_ID/rate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":5,"comment":"Excellent session!"}'
```

#### 7. Points
```bash
# Check balance
curl $BASE_URL/users/profile \
  -H "Authorization: Bearer $TOKEN" | jq '.data.pointsBalance'

# Get point config
curl $BASE_URL/admin/points/config \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check economy health
curl $BASE_URL/admin/points/economy \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

#### 8. Admin
```bash
# Dashboard
curl $BASE_URL/admin/dashboard -H "Authorization: Bearer $ADMIN_TOKEN"

# List users
curl "$BASE_URL/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Suspend user
curl -X POST $BASE_URL/admin/users/USER_ID/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Violation"}'

# Ban user
curl -X POST $BASE_URL/admin/users/USER_ID/ban \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Serious violation"}'

# Run background jobs
curl -X POST $BASE_URL/admin/jobs/run-emails \
  -H "Authorization: Bearer $ADMIN_TOKEN"

curl -X POST $BASE_URL/admin/jobs/run-sessions \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Frontend Testing Checklist

### Onboarding
- [ ] Register new account
- [ ] Complete 4-step onboarding
- [ ] Verify redirect to dashboard

### Discovery
- [ ] View matches
- [ ] Filter by skill
- [ ] View match details
- [ ] Click "View Profile"

### Interactions
- [ ] Send interest
- [ ] Send request
- [ ] View requests page

### Profile
- [ ] View own profile
- [ ] View others' profiles
- [ ] See skills and stats

---

## Database

### Open Studio
```bash
cd apps/backend
npx prisma studio
# http://localhost:5555
```

### Common Queries
```bash
# Connect to DB
psql -d 1hrlearning

# List tables
\dt

# Check users
SELECT id, email, "displayName", role FROM "User" LIMIT 10;

# Check sessions
SELECT id, status, "skillId", "scheduledAt" FROM "Session" LIMIT 10;

# Check notifications
SELECT id, type, "userId", "createdAt" FROM "Notification" ORDER BY "createdAt" DESC LIMIT 10;
```

---

## Logs & Debug

### Backend Logs
```bash
# Terminal where backend is running will show:
# - API requests
# - Database queries
# - Email send logs
# - Background job execution
```

### Frontend Logs
```bash
# Browser Console (F12)
# - Check for errors
# - Check network requests
# - Check application state
```

### Email Logs
```bash
# In development, emails are logged not sent
# Look for "[Email] Would send to..." in backend logs

# To send actual emails:
# 1. Set SENDGRID_API_KEY in .env
# 2. Restart backend
```

---

## Helpful Tools

```bash
# Pretty-print JSON
curl ... | jq .

# Save token to variable
TOKEN=$(curl ... | jq -r '.data.accessToken')

# Count request time
curl -w "Time: %{time_total}s\n" ...

# Watch file changes
nodemon --watch src --exec "npm run dev"

# Monitor database
watch -n 1 'psql -d 1hrlearning -c "SELECT COUNT(*) FROM \"Session\";"'
```

---

## Common Issues

### Port Already in Use
```bash
# Kill process on port 4000
lsof -i :4000 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Kill process on port 3000
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill -9
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
pg_isready

# Start PostgreSQL
brew services start postgresql  # macOS
# OR
sudo service postgresql start  # Linux

# OR use Docker
docker-compose restart postgres
```

### Migration Failed
```bash
# Check migration status
npx prisma migrate status

# Reset database (caution: deletes data)
npx prisma migrate reset

# Resolve migration conflicts
# Edit the failing migration file, then:
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### Token Expired
```bash
# Get new token by logging in again
curl -X POST $BASE_URL/auth/login ...
export TOKEN="new_token"
```

---

## Quick Troubleshooting Map

| Issue | Solution |
|-------|----------|
| Node_modules issues | `rm -rf node_modules package-lock.json && npm install` |
| Port in use | Kill process with `lsof -i :PORT` |
| Database empty | Run `npx prisma migrate reset` |
| Can't connect to DB | Check `DATABASE_URL` in `.env` |
| Frontend won't load | Clear `.next` folder, restart dev server |
| Tokens not working | Login again to get new token |
| Email not sending | Check logs, enable SendGrid in `.env` |
| Matches empty | Add skills to both users, check points balance |
| Admin endpoints blocked | Verify user role is ADMIN in database |

---

## Time-Saving Tips

### Batch Testing
```bash
# Create multiple test accounts quickly
for i in {1..5}; do
  curl -X POST $BASE_URL/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@example.com\",\"password\":\"Pass123!\",\"displayName\":\"User $i\"}"
done
```

### Export for Reuse
```bash
# Save IDs for repeated testing
USER1_ID="..."
USER2_ID="..."
SKILL_ID="..."

# Use them in subsequent calls
curl -X POST $BASE_URL/sessions/interest \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"sharerId\":\"$USER2_ID\",\"skillId\":\"$SKILL_ID\",...}"
```

### Keep Terminal Sessions
```bash
# Use tmux or screen to keep terminals open
tmux new-session -d -s backend -c apps/backend "npm run dev"
tmux new-session -d -s frontend -c apps/frontend "npm run dev"

# Reattach later
tmux attach -t backend
```

---

## Complete Testing Flow (20 minutes)

1. **Setup (5 min)**
   ```bash
   npm install
   cd apps/backend && npx prisma migrate deploy
   ```

2. **Start services (2 min)**
   - Terminal 1: `cd apps/backend && npm run dev`
   - Terminal 2: `cd apps/frontend && npm run dev`

3. **Register accounts (3 min)**
   - Go to http://localhost:3000
   - Register 2 test accounts

4. **Complete onboarding (5 min)**
   - Complete 4-step onboarding for each account
   - Add different teaching/learning skills

5. **Test features (5 min)**
   - View matches
   - Send interest/request
   - Check points
   - Admin operations

---

For detailed testing guide, see **LOCAL_TESTING_GUIDE.md**

Happy testing! 🚀
