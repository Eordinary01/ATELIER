# ATELIER Architecture & Production Deployment Guide

This guide details the recommended deployment topology, environment variable specifications, and step-by-step launch procedures for the **ATELIER** luxury commerce platform.

---

## 1. System Architecture Overview

The platform is structured as a high-performance monorepo with three runtime applications and four shared packages:

```mermaid
graph TD
    Client["Patrons (Browsers & Mobile)"] -->|HTTPS / Edge CDN| Storefront["Next.js Storefront (atelier.in)"]
    AdminUser["Operations Staff"] -->|HTTPS / Protected| Admin["Next.js Admin Studio (admin.atelier.in)"]
    Storefront -->|REST API / JSON| FastifyAPI["Fastify API (api.atelier.in)"]
    Admin -->|REST API + Bearer JWT| FastifyAPI
    
    FastifyAPI -->|SQL Queries (Pool)| Postgres[(PostgreSQL 16+ / Neon / Supabase)]
    FastifyAPI -->|Stock Lock / Cache| Redis[(Redis 7+ / Upstash)]
    FastifyAPI -->|Transactional REST| Brevo["Brevo Email Service"]
    FastifyAPI -->|Orders & Webhooks| Razorpay["Razorpay Payment Gateway"]
    FastifyAPI -->|Media Asset Delivery| Cloudinary["Cloudinary CDN"]
```

---

## 2. Recommended Production Topologies

### Option A: Modern Managed Cloud (Recommended)
*Best for zero DevOps maintenance, global Edge caching, and automated CI/CD.*

| Component | Recommended Platform | Why |
| :--- | :--- | :--- |
| **Storefront (`apps/storefront`)** | **Vercel** | Native Next.js App Router optimization, Edge ISR, global asset compression. |
| **Admin (`apps/admin`)** | **Vercel** | Instant branch previews, zero server maintenance, role-protected dashboard. |
| **API Server (`apps/api`)** | **Render** or **Railway** | Always-on Node.js Fastify runtime, health check monitoring, private networking. |
| **Database** | **Neon** or **Supabase** | Managed PostgreSQL 16 with automated connection pooling and point-in-time recovery. |
| **Cache & Queues** | **Upstash Redis** | Serverless low-latency Redis with auto-scaling and zero idle cost. |
| **Media CDN** | **Cloudinary** | Automatic image compression, WebP/AVIF transcoding, responsive breakpoints. |

---

### Option B: Self-Hosted Cloud VPS (Hetzner / DigitalOcean / AWS EC2)
*Best for full data sovereignty, fixed monthly pricing ($10–$25/mo), and unified infrastructure via Coolify or Docker Compose.*

- Single Ubuntu 22.04 LTS or 24.04 LTS instance (4 vCPU, 8GB RAM).
- Automated container management with **Coolify** (open-source Vercel alternative) or **Docker Compose** + **Caddy/Nginx** reverse proxy with automated Let's Encrypt SSL.

---

## 3. Step-by-Step Deployment Walkthrough (Option A: Vercel + Railway/Neon)

### Step 1: Provision Managed Database & Redis

1. **PostgreSQL (Neon / Supabase)**:
   - Create a project named `atelier-production`.
   - Copy the pooled connection string:
     `postgres://user:password@ep-xyz-pooler.region.neon.tech/atelier_commerce?sslmode=require`
2. **Redis (Upstash)**:
   - Create an Upstash Redis database in the matching cloud region.
   - Copy the `rediss://...` connection URL.

---

### Step 2: Run Database Migrations & Initial Seed

From your local machine or CI/CD runner pointing to the production database:

```bash
# 1. Run migrations to create schema tables, enums, and indexes
DATABASE_URL="postgres://user:password@hostname/dbname?sslmode=require" pnpm --filter @atelier/database db:migrate

# 2. Seed default categories, products, carriers, and initial super admin
DATABASE_URL="postgres://user:password@hostname/dbname?sslmode=require" pnpm --filter @atelier/database db:seed
```

> [!IMPORTANT]
> The database seed creates the super administrator (`admin@atelier.in`). Update the default password immediately via the database or reset script before opening the store to patrons.

---

### Step 3: Deploy the API Server (`apps/api`) to Render / Railway

1. **Root Directory**: Set root directory to `apps/api` (or configure monorepo build command from root).
2. **Build Command**:
   ```bash
   pnpm install && pnpm --filter @atelier/contract build && pnpm --filter @atelier/database build && pnpm --filter @atelier/api build
   ```
3. **Start Command**:
   ```bash
   node dist/server.js
   ```
4. **Environment Variables**:
   Configure all variables listed in the **API Environment Matrix** below.
5. **Health Check Path**: `/api/v1/health`

---

### Step 4: Deploy Storefront & Admin to Vercel

#### A. Deploy Storefront (`apps/storefront`):
1. In Vercel, import your Git repository.
2. Select **Root Directory**: `apps/storefront`.
3. In **Build Settings**, set:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm --filter @atelier/tokens build && pnpm --filter @atelier/ui build && pnpm --filter @atelier/contract build && pnpm --filter @atelier/storefront build`
   - **Install Command**: `pnpm install`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://api.atelier.in`
   - `NEXT_PUBLIC_STOREFRONT_URL`: `https://atelier.in`

#### B. Deploy Admin Studio (`apps/admin`):
1. Import the same repository as a new Vercel project.
2. Select **Root Directory**: `apps/admin`.
3. In **Build Settings**, set:
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm --filter @atelier/tokens build && pnpm --filter @atelier/ui build && pnpm --filter @atelier/contract build && pnpm --filter @atelier/admin build`
   - **Install Command**: `pnpm install`
4. Add Environment Variables:
   - `NEXT_PUBLIC_API_URL`: `https://api.atelier.in`
   - `NEXT_PUBLIC_ADMIN_URL`: `https://admin.atelier.in`

---

### Step 5: Configure Custom Domains & DNS Records

Point your domain (e.g. `atelier.in`) DNS to the respective endpoints:

| Subdomain | Type | Target | Purpose |
| :--- | :--- | :--- | :--- |
| `@` (`atelier.in`) | `A` / `CNAME` | Vercel Apex Target (`76.76.21.21` or `cname.vercel-dns.com`) | Public Storefront |
| `www` | `CNAME` | `cname.vercel-dns.com` | Storefront Redirect |
| `admin` | `CNAME` | `cname.vercel-dns.com` | Operations Studio |
| `api` | `CNAME` | Render / Railway hostname (`atelier-api.onrender.com`) | Backend Fastify API |

---

### Step 6: Configure Razorpay & Brevo Production Webhooks

1. **Razorpay Dashboard**:
   - Switch from *Test Mode* to *Live Mode*.
   - Copy **Live Key ID** (`rzp_live_...`) and **Key Secret**.
   - Navigate to **Settings → Webhooks → Add New Webhook**:
     - **URL**: `https://api.atelier.in/api/v1/webhooks/razorpay`
     - **Secret**: Set a strong random secret and add to `RAZORPAY_WEBHOOK_SECRET`.
     - **Active Events**: `payment.captured`, `payment.failed`, `refund.processed`.
2. **Brevo Dashboard**:
   - Generate a live REST API key starting with `xkeysib-...`.
   - Verify your custom sender domain (`orders@atelier.in`) via DKIM and SPF records in your DNS manager.

---

## 4. Production Environment Variables Matrix

### `apps/api` (Backend Production Service)
| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables strict HMAC, disables simulated orders and mock logins. |
| `PORT` | `4000` | Port Fastify listens on (or provided by host via `$PORT`). |
| `HOST` | `0.0.0.0` | Binds to all network interfaces. |
| `DATABASE_URL` | `postgres://user:pass@pooler.neon.tech/db?sslmode=require` | PostgreSQL pooled connection string. |
| `REDIS_URL` | `rediss://default:pass@redis.upstash.io:6379` | TLS Redis connection string. |
| `SESSION_SECRET` | `64_char_crypto_random_hex_string` | Secret for customer JWT tokens and cookies (32+ chars). |
| `ADMIN_SESSION_SECRET` | `64_char_crypto_random_hex_string` | Secret for administrative JWT tokens (32+ chars). |
| `CORS_ORIGINS` | `https://atelier.in,https://admin.atelier.in` | Whitelisted origins for API requests. |
| `RAZORPAY_KEY_ID` | `rzp_live_xxxxxxxxxxxxxx` | Razorpay Live Key ID. |
| `RAZORPAY_KEY_SECRET` | `live_secret_key` | Razorpay Live Secret Key. |
| `RAZORPAY_WEBHOOK_SECRET` | `webhook_hmac_secret` | Webhook verification secret. |
| `BREVO_API_KEY` | `xkeysib-xxxxxxxxxxxxxxxxxxxx` | Brevo REST API v3 Key. |
| `BREVO_SENDER_EMAIL` | `orders@atelier.in` | Verified business email address. |
| `BREVO_SENDER_NAME` | `ATELIER Haute Couture` | Sender identity display name. |
| `CLOUDINARY_CLOUD_NAME` | `atelier-media` | Cloudinary account name. |
| `CLOUDINARY_API_KEY` | `123456789012345` | Cloudinary API Key. |
| `CLOUDINARY_API_SECRET` | `cloudinary_secret` | Cloudinary API Secret. |
| `STOREFRONT_URL` | `https://atelier.in` | Public storefront origin for transactional links. |

### `apps/storefront` (Next.js Public App)
| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.atelier.in` | Public URL of the backend API. |
| `NEXT_PUBLIC_STOREFRONT_URL` | `https://atelier.in` | Base URL for canonical links and metadata. |

### `apps/admin` (Next.js Operations Studio)
| Variable | Example Value | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.atelier.in` | Public URL of the backend API. |
| `NEXT_PUBLIC_ADMIN_URL` | `https://admin.atelier.in` | Base URL of the admin panel. |

---

## 5. Post-Deployment Verification Checklist

1. [ ] **Health Endpoint**: `curl https://api.atelier.in/api/v1/health` returns `{"status":"ok"}`.
2. [ ] **Storefront Catalog**: Open `https://atelier.in/catalog` and verify products, images, and prices load smoothly from PostgreSQL via Fastify.
3. [ ] **Cart & Coupon Progress**: Add an item to the bag and verify the floating coupon banner tracks progress to the next tier (`SERIES04`).
4. [ ] **Checkout Flow**: Initiate a test order to verify Razorpay checkout modal opens with the production Key ID.
5. [ ] **Admin Clearance**: Visit `https://admin.atelier.in/login`, verify dev quick-fill is absent, log in with production admin credentials, and inspect inventory.
6. [ ] **Email Dispatch**: Subscribe to the newsletter in the footer and confirm receipt of the welcome email via Brevo.
