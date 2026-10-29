# 1hrLearning — Open Knowledge Exchange Platform

> Connect with experts. Share what you know. Learn something new in an hour.

[![CI](https://github.com/1hrlearning/1hrlearning/actions/workflows/ci.yml/badge.svg)](https://github.com/1hrlearning/1hrlearning/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

1hrLearning is a non-commercial, open knowledge exchange platform where people connect for one-to-one skill-sharing sessions. Users list skills they can teach and skills they want to learn, then get matched with complementary partners for focused 1-hour learning sessions.

**Key principles:**
- 🆓 Free forever — no subscription, no payments
- 🔄 Knowledge exchange — points-based system, no money changes hands
- 🚫 No ads in-session or on profile pages — only non-intrusive email recommendations you can opt out of
- 🔓 Reciprocal visibility — you only appear in matches if you have relevant skills to offer

## Features

| Feature | Status |
|---------|--------|
| Skill declaration (teach & learn) | ✅ |
| Matching engine with explainable score factors | ✅ |
| Reciprocal visibility control | ✅ |
| Public session discovery & apply/accept flow | ✅ |
| Points / credit system | ✅ |
| Query/concept clarification session type | ✅ |
| Calendar export (ICS) for confirmed sessions | ✅ |
| Intent-based email recommendations (opt-out) | ✅ |
| Session notifications | ✅ |
| SEO-friendly public pages with JSON-LD | ✅ |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo |
| Frontend | Next.js 15 (App Router), Tailwind CSS, shadcn/ui |
| Auth | NextAuth.js v5, JWT with refresh tokens |
| State | TanStack Query, Zustand |
| Real-time | Socket.io |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, Bull |
| Email | Runtime-selectable Resend or SendGrid; encrypted credentials managed by administrators |
| Monitoring | Winston, Sentry |
| DevOps | Docker Compose, GitHub Actions |

## Project Structure

```
1hrlearning/
├── apps/
│   ├── backend/          # Express.js API server
│   │   ├── prisma/       # Prisma schema & migrations
│   │   └── src/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── routes/
│   │       └── db/seed.ts
│   ├── frontend/         # Next.js 15 web app
│   │   └── src/app/
│   │       ├── discover/    # Matching & public sessions
│   │       ├── sessions/    # Session management
│   │       ├── points/      # Points balance & history
│   │       └── settings/    # Privacy & ad preferences
│   └── admin/            # Next.js 15 admin dashboard
├── packages/
│   └── shared/           # Shared types, validators, constants
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- npm >= 10

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Omshiva007/1hrlearning.git
cd 1hrlearning

# 2. Install dependencies
npm install

# 3. Start infrastructure, apply migrations, repair test fixtures, and launch all apps
npm run dev
```

`npm run dev` owns only the 1hrLearning children it starts and reports readiness for:

- User app: **http://localhost:3100**
- Admin app: **http://localhost:3101**
- API: **http://localhost:4000**
- PostgreSQL: **127.0.0.1:55432**
- Redis: **127.0.0.1:56379**

Press Ctrl+C in that terminal to stop this stack. Startup refuses to reuse an occupied port, so another local project is never silently replaced.

### Verification

With `npm run dev` running, execute the local acceptance checks from another terminal:

```bash
npm run type-check
npm run test
npm run test:acceptance
npm run lint
npm run build
```

`test:acceptance` exercises the real isolated PostgreSQL/API lifecycle, including transactional point settlement, concurrent public-session acceptance, token rotation/logout, matching/privacy, calendar export, and admin role gates. Production builds run workspace builds sequentially because concurrent Next.js type generation can trigger intermittent Windows `EPERM` failures.

Resend sandbox delivery was verified through Admin → Configuration using the hosted `onboarding@resend.dev` sender and the account-owner inbox. Replace the encrypted API key and sender address in the same panel after verifying the production domain; no code change is required.

### Docker (Full Stack)

```bash
docker compose up --build
```

## API Documentation

The REST API base URL is `/api/v1`. All endpoints (except auth) require a Bearer token.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login |
| POST | /auth/refresh | Refresh access token |
| POST | /auth/logout | Logout |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /users/search | Search users |
| GET | /users/leaderboard | Get leaderboard |
| GET | /users/matches | Get skill matches with score factors |
| GET | /users/ad-preferences | Get ad/email preferences |
| PATCH | /users/ad-preferences | Update ad/email preferences |
| GET | /users/:id | Get user profile |
| PUT | /users/me | Update profile (incl. isDiscoverable) |

### Sessions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /sessions | List my sessions |
| GET | /sessions/discover | Discover public open sessions |
| POST | /sessions | Create session (private or public) |
| GET | /sessions/:id | Get session details |
| PATCH | /sessions/:id | Update session status |
| POST | /sessions/:id/rate | Rate a session |
| POST | /sessions/:id/apply | Apply to a public session |
| GET | /sessions/:id/applications | List applications (teacher only) |
| PATCH | /sessions/:id/applications/:appId | Accept/reject application |
| GET | /sessions/:id/calendar.ics | Download ICS calendar file |

### Other Resources
| Resource | Endpoints |
|----------|-----------|
| Skills | GET /skills, POST /skills, GET /skills/:id |
| Connections | GET/POST /connections, PATCH /connections/:id |
| Notifications | GET /notifications, PATCH /notifications/:id/read |
| Points | GET /points/balance, GET /points/history |

## Matching Engine

The matching algorithm scores potential partners based on explainable factors:

| Factor | Weight | Description |
|--------|--------|-------------|
| `skillOverlap` | Variable | Number of skills where one can teach what the other wants to learn |
| `mutualExchangeBonus` | +0.5 | Both parties can teach each other something (reciprocal exchange) |
| `ratingBonus` | 0–0.5 | Quality of past sessions (avg rating / 10) |
| `activityBonus` | 0–0.3 | Activity level (total sessions taught, capped) |

Each match response includes a `scoreFactors` object exposing all factors for transparency.

## Points System

| Action | Points |
|--------|--------|
| Registration welcome bonus | +10 pts |
| Teaching a session | +5 pts |
| Learning a session | -5 pts |
| Minimum balance to book | 5 pts |

## Session Types

- **Teaching** — Standard 1-hour session where the teacher explains a topic
- **Query/Clarification** — Focused Q&A session to answer specific questions or clarify concepts

Sessions can be:
- **Private** — Invite a specific person
- **Public** — Open for anyone to apply; teacher accepts/rejects applications

## Privacy & Ad Policy

- **Reciprocal visibility**: Set `isDiscoverable: false` in your profile to be invisible to the matching system
- **No in-session ads**: Guaranteed — no ads are ever shown during sessions or on profile pages
- **Email recommendations**: Skill-interest based emails only; opt out at any time via Settings → Communication Preferences (`adEmailOptOut: true`)
- **No third-party ad networks**: All recommendations are first-party and non-commercial

## Calendar Integration

After a session is confirmed, download an ICS calendar file from `GET /sessions/:id/calendar.ics` to add the session to Google Calendar, Apple Calendar, Outlook, or any ICS-compatible calendar.

## SEO

- Server-side rendering on all public pages
- Dynamic `sitemap.xml` with skills and profiles
- `robots.txt` configuration
- JSON-LD structured data (Person, Course schemas)
- Open Graph and Twitter Card metadata
- Canonical URLs

## Contributing

Before writing or reviewing code, follow the repository's [AI development baseline](docs/AI_DEVELOPMENT_BASELINE.md) and [development workflow](docs/DEVELOPMENT_WORKFLOW.md). The persistent agent entry point is [AGENTS.md](AGENTS.md).

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes following [Conventional Commits](https://conventionalcommits.org)
4. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.
