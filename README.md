# 1hrLearning — Open Knowledge Exchange Platform

> Connect with experts. Share what you know. Learn something new in an hour.

[![CI](https://github.com/1hrlearning/1hrlearning/actions/workflows/ci.yml/badge.svg)](https://github.com/1hrlearning/1hrlearning/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

1hrLearning is a non-commercial, open knowledge exchange platform where people connect for one-to-one skill-sharing sessions. Users list skills they can teach and skills they want to learn, then get matched with complementary partners for focused 1-hour learning sessions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo |
| Frontend | Next.js 14 (App Router), Tailwind CSS, shadcn/ui |
| Auth | NextAuth.js v5, JWT with refresh tokens |
| State | TanStack Query, Zustand |
| Real-time | Socket.io |
| Backend | Express.js + TypeScript |
| ORM | Prisma |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7, Bull |
| Email | SendGrid |
| Monitoring | Winston, Sentry |
| DevOps | Docker Compose, GitHub Actions |

## Project Structure

```
1hrlearning/
├── apps/
│   ├── backend/          # Express.js API server
│   └── frontend/         # Next.js 14 web app
├── packages/
│   └── shared/           # Shared types, validators, constants
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml
└── turbo.json
```

## Getting Started

### Prerequisites

- Node.js >= 20
- Docker & Docker Compose
- npm >= 10

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/1hrlearning/1hrlearning.git
cd 1hrlearning

# 2. Copy environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 3. Start infrastructure (PostgreSQL + Redis)
docker compose up postgres redis -d

# 4. Install dependencies
npm install

# 5. Run database migrations
cd apps/backend && npx prisma migrate dev && cd ../..

# 6. Start development servers
npm run dev
```

The frontend runs at http://localhost:3000 and the API at http://localhost:4000.

### Docker (Full Stack)

```bash
docker compose up --build
```

## API Documentation

The REST API base URL is `/api/v1`. All endpoints (except auth) require a Bearer token.

| Resource | Endpoints |
|----------|-----------|
| Auth | POST /auth/register, /auth/login, /auth/refresh, /auth/logout |
| Users | GET/PUT /users/:id, GET /users/:username |
| Skills | GET /skills, POST /skills, GET /skills/:id |
| Sessions | GET/POST /sessions, PATCH /sessions/:id |
| Connections | GET/POST /connections, PATCH /connections/:id |
| Notifications | GET /notifications, PATCH /notifications/:id/read |
| Points | GET /points/balance, GET /points/history |

## SEO Features

- Server-side rendering on all public pages
- Dynamic `sitemap.xml` with skills and profiles
- `robots.txt` configuration
- JSON-LD structured data (Person, Course schemas)
- Open Graph and Twitter Card metadata
- Canonical URLs

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes following [Conventional Commits](https://conventionalcommits.org)
4. Open a Pull Request

## License

MIT — see [LICENSE](LICENSE) for details.
