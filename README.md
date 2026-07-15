# Buddy Script — Social Feed App

A full-stack social feed application built with React, NestJS, and PostgreSQL. Users can register, log in, create posts (public/private with images), like/unlike posts and comments, comment with one-level replies, and view who liked any content.

## Live Demo

- **Web App:** [Vercel URL — add after deploy]
- **API:** [Render URL — add after deploy]
- **Video Walkthrough:** [YouTube link — add after recording]

## Architecture

```
appifylab/
├── apps/
│   ├── api/          # NestJS 11 REST API + Prisma + PostgreSQL
│   │   ├── src/
│   │   │   ├── auth/          # JWT auth (register, login, refresh rotation, guards)
│   │   │   ├── posts/          # Post CRUD + feed with keyset pagination
│   │   │   ├── comments/       # Comments + one-level replies
│   │   │   ├── likes/          # Like/unlike toggle + who-liked listing
│   │   │   ├── storage/        # Supabase presigned URL service
│   │   │   ├── prisma/         # PrismaService (global)
│   │   │   └── common/         # SanitizePipe, ExceptionFilter
│   │   └── prisma/
│   │       ├── schema.prisma   # User, Post, Comment, PostLike, CommentLike, RefreshToken
│   │       └── seed.ts         # Demo data seeder
│   └── web/          # React 18 + Vite 6 + react-bootstrap + TanStack Query
│       ├── src/
│       │   ├── api/            # Orval-generated hooks (codegen output)
│       │   ├── components/     # PostComposer, PostCard, LikeButton, WhoLiked,
│       │   │                   # CommentComposer, CommentItem, ReplyItem, CommentList
│       │   ├── pages/          # Login, Register, Feed
│       │   ├── hooks/          # useAuth context + ProtectedRoute
│       │   ├── lib/            # In-memory access token + axios interceptor
│       │   └── assets/         # Design CSS, images, fonts
│       ├── openapi.json        # Frozen OpenAPI spec (Orval input)
│       ├── orval.config.ts     # Orval codegen config
│       └── vercel.json         # Vercel deploy config
├── packages/
│   └── shared/       # Shared TypeScript types (FeedPost, CommentItem, etc.)
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

## Key Decisions

**Auth:** JWT access token (15min, in-memory on frontend) + rotating refresh token (7d, httpOnly secure cookie). Refresh token reuse detection revokes the entire token family if a rotated token is presented again.

**Pagination:** Keyset/cursor pagination everywhere — no OFFSET. Feed uses `(visibility, createdAt DESC)` compound index for efficient newest-first queries. Comments use `(postId, createdAt)` for thread loading.

**Visibility:** Private posts are invisible to non-authors at the database query level. Likes and comments on private posts are also gated. All visibility enforcement lives in the service layer, never in the frontend.

**API Contract:** NestJS Swagger generates an OpenAPI spec. Orval reads a frozen `openapi.json` file (not a live URL) to generate typed TanStack Query hooks into the web app. This means Vercel builds work without the Render API being live.

**Security:**
- `helmet()` middleware for security headers
- Rate limiting: global 100 req/min, auth 5/15s, write endpoints 30/min
- XSS sanitization on all user text via `SanitizePipe` (strips all HTML tags)
- bcrypt password hashing (cost 12)
- CORS scoped to exact web origin
- Uniform error shape via global exception filter

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `PORT` | API server port (default 3000) |
| `CORS_ORIGIN` | Frontend origin URL |
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `JWT_SECRET` | Access token signing secret |
| `JWT_REFRESH_SECRET` | Refresh token signing secret |
| `JWT_ACCESS_EXPIRES` | Access token TTL (e.g. 15m) |
| `JWT_REFRESH_EXPIRES` | Refresh token TTL (e.g. 7d) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for storage) |
| `STORAGE_BUCKET` | Supabase storage bucket name (e.g. post-images) |
| `VITE_API_BASE_URL` | API base URL for the web app (frontend env) |

## Local Development

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Fill in your Supabase credentials and DB URL

# Generate Prisma client
pnpm --filter api prisma:generate

# Run migrations
pnpm --filter api prisma:migrate

# Seed demo data
pnpm --filter api db:seed

# Start both apps (from repo root)
pnpm dev

# Or start individually:
pnpm --filter api dev     # API at http://localhost:3000
pnpm --filter web dev     # Web at http://localhost:5173

# Regenerate API client hooks
pnpm --filter web codegen
```

## Deployment

### Supabase (DB + Storage)
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Note the DATABASE_URL, anon key, and service role key
3. Create a `post-images` storage bucket
4. Set bucket RLS policies: `SELECT` for anon, `INSERT`/`UPDATE` for authenticated

### NestJS API (Render)
1. Create a Render account and connect your GitHub repo
2. Use the Blueprint at `apps/api/render.yaml` or create a Web Service manually:
   - Root Directory: `apps/api`
   - Build Command: `pnpm install && pnpm --filter api build`
   - Start Command: `node dist/main.js`
3. Add all environment variables from `.env.example`
4. Set `CORS_ORIGIN` to your Vercel URL

### React Web App (Vercel)
1. Import your GitHub repo to Vercel
2. Configure as a Vite project with the settings in `apps/web/vercel.json`:
   - Build Command: `pnpm install && pnpm --filter web codegen && pnpm --filter web build`
   - Output Directory: `dist`
3. Set `VITE_API_BASE_URL` to your Render API URL

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo 2 + pnpm 10 |
| Backend | NestJS 11 + Prisma 6 |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (access + rotating refresh) |
| Storage | Supabase Storage (presigned URLs) |
| Frontend | React 18 + Vite 6 |
| Styling | react-bootstrap + custom CSS |
| Data Fetching | TanStack Query 5 (infinite query + cursor pagination) |
| API Client | Orval 7 (OpenAPI → typed hooks) |
| Security | Helmet, Throttler, sanitize-html, bcrypt |

## Features

- Register / Login / Logout with JWT + refresh token rotation
- Create posts with text + image (public or private)
- Feed with infinite scroll + keyset cursor pagination
- Like/unlike posts, comments, and replies (optimistic updates)
- View who liked any content (avatar row + popover list)
- Nested comments with one-level replies
- View previous comments + lazy-load replies
- Edit post text/visibility (author only)
- Delete post with confirmation (author only)
- XSS sanitization on all text inputs
- Rate limiting on auth and write endpoints
- Uniform error response shape
