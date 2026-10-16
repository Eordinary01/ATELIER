# Atelier Editorial Commerce: Monorepo Context & Milestone Roadmap

**Last Updated:** 2026-10-14  
**Workspace:** `c:/Users/Parth Manocha/Desktop/DEV/ecommerce_new`  
**Brand Identity:** ATELIER (Editorial Haute Couture & Permanent Wardrobe Architecture), New Delhi, India  

---

## 1. Project Foundations & Non-Negotiable Rules

- **Brand Source of Truth**:
  - `DESIGN/DESIGN.md`: Primary source of truth for design tokens, typography, palettes, and spacing.
  - `DESIGN/code.html`: Primary source of truth for visual layouts, structural hierarchy, and editorial compositions.
- **Strict Brand & Code Constraints**:
  - **Zero em dashes (`—`)**: Disallowed across all code, comments, documentation, and user-facing copy.
  - **Zero emojis**: No emojis in UI, console logs, emails, or system notifications.
  - **Zero visual gradients**: Pure, tactile surface colors (`#FAF9F6`, `#FFFFFF`, `#1B1C1A`, `#E5E3DC`).
  - **Border Radii Constraint**: Strictly `2px` for interactive controls (buttons, inputs, badges) and `4px` for structural cards/containers.
  - **Authentic Metrics Only**: Zero fabricated reviews, ratings, or simulated buyer counters.
  - **Currency Standard**: Indian Rupee (`₹`), stored internally as integer paise (`basePricePaise`), formatted with standard Indian grouping (`en-IN`).
  - **Token Integrity**: Pure reusable components referencing design tokens; zero arbitrary inline CSS utility drift.

---

## 2. Infrastructure & Port Mapping

| Service | Target Port | Container / Environment | Configuration / Health |
|---|---|---|---|
| **PostgreSQL Database** | `5433` | Docker (`atelier_postgres`) | Drizzle ORM (18 relational tables, port 5433 avoids host 5432 collision) |
| **Redis Cache & Sessions**| `6379` | Docker (`atelier_redis`) | ioredis (session stores, stock reservation holds) |
| **Fastify API Server** | `4000` | Node.js / `apps/api` | Fastify 5, Zod Type Provider, Argon2id, JWT, Redis sessions |
| **Admin Dashboard** | `3001` | Next.js 15 / `apps/admin` | App Router, Server Components, Inventory Matrix, Product Ingestion |
| **Customer Storefront** | `3000` | Next.js 15 / `apps/storefront` | App Router, matching `DESIGN/code.html`, PDP, multi-facet catalog |
| **Cloudinary Media CDN** | Remote | Third-Party API | Multipart uploads, auto-format optimization, asset delivery |
| **Brevo Email Service** | Remote | Third-Party REST API | Transactional emails (Order confirmation, Dispatch, Welcome, Refund) |

---

## 3. Milestone Completion Matrix

| Milestone | Scope | Status | Verification & Deliverables |
|---|---|---|---|
| **Milestone 0: Audit** | Token extraction and reconciliation | Completed | Tokens extracted from `DESIGN/DESIGN.md` |
| **Milestone 1: Monorepo** | Turborepo, pnpm workspaces, tokens, contract, UI | Completed | `@atelier/tokens`, `@atelier/contract`, `@atelier/ui` verified |
| **Milestone 2: Database** | PostgreSQL, Drizzle ORM schema & seeder | Completed | 18 tables, migration SQL, dev seeder with 6 reference garments |
| **Milestone 3: API Core** | Fastify 5 app, Argon2id auth & Redis sessions | Completed | JWT + Redis cookies, RBAC (`admin_super`, `customer`), test suite |
| **Milestone 4: Catalog API**| Filtered catalog, search, pagination, facets | Completed | Full categories, cursor/offset pagination, dynamic facets |
| **Milestone 5: Admin App** | Operations dashboard, inventory & batch ingestion | Completed | Metrics overview, product creation, CSV batch validator, inline stock updates |
| **Infrastructure Extensions**| Cloudinary CDN & Brevo Email integrations | Completed | Cloudinary uploader with preview, Brevo v3 luxury HTML templates, welcome email |
| **Milestone 6: Storefront**| Customer storefront, catalog & product experience | Completed | Replicating `DESIGN/code.html` in Next.js 15 (`apps/storefront` on port 3000), PDP, collection filters, 0 build errors |
| **Milestone 7: Cart & Checkout**| Cart state, checkout funnel & order initialization | Completed | CartDrawer, Cart page with courtesy coupon, `/checkout` funnel, Indian PIN validator |
| **Milestone 8: Razorpay Payments**| Gateway integration, signature verification, order flow | Completed | Razorpay order creation, HMAC-SHA256 verification, Sandbox simulator, stock deduction, Brevo order confirmation email |
| **Admin Operations Suite** | Product delete, Category & Collection CRUD, Pagination | Completed | `/categories`, `/collections`, backend pagination on products table, soft delete, inline +New modals in product creator |
| **Milestone 9: Fulfillment & Carrier Registry**| Admin order management, dynamic carrier directory, AWB tracking, live visual tracking | Completed | `/orders` admin page with dynamic carrier management modal, automatic tracking URL template substitution (`{trackingNumber}`), `/track-order` live visual progress stepper & carrier link, Brevo dispatch notification |
| **Patron Order Cancellation**| Customer self-serve cancellation, automatic stock replenishment & refunds | Completed | `CancelOrderModal` on `/track-order` and `/account`, eligibility guard, database inventory quantity restoration, Brevo refund notification email, live visual status updates |
| **Exchange & Return Concierge**| Customer exchange & return request system, reverse logistics tracking | Completed | `ExchangeReturnModal` on `/track-order` and `/account`, `POST /return-exchange` endpoint, size/fit replacement, reverse pickup tracking card, live integration with Admin operations |
| **Milestone 10: Launch** | Production hardening, Lighthouse, WCAG AA | Pending | Performance budget, rate limiting, security headers |

---

## 4. Deep-Dive: Completed Modules

### Package Layer
1. **`@atelier/tokens`**:
   - Palette: Olive neutral tones (`#1B1C1A`, `#FAF9F6`, `#E5E3DC`, `#767872`, `#D6D3CA`).
   - Typography: Editorial Serif (`Playfair Display` / `Cinzel` / `Newsreader`) and technical Sans/Mono (`Inter`, `JetBrains Mono`).
   - Radii: Standardized to `2px` controls, `4px` containers.
2. **`@atelier/contract`**:
   - Zod validation schemas for User Auth, Products, Variants, Inventory, Orders, Shipments, Indian PIN codes (`/^[1-9][0-9]{5}$/`), and CSV import payloads.
3. **`@atelier/ui`**:
   - Token-compliant atomic components: `Button`, `Input`, `Badge`, `Card`, `PriceDisplay` (tabular INR), `Checkbox`, `EmptyState`.
4. **`@atelier/database`**:
   - Complete Drizzle ORM relational schema with 18 tables: `users`, `addresses`, `categories`, `products`, `product_images`, `product_variants`, `inventory`, `stock_reservations`, `carts`, `cart_items`, `coupons`, `orders`, `order_items`, `payments`, `shipments`, `returns_and_refunds`, `audit_logs`.
   - Seed script populating categories and `ATELIER 01` through `ATELIER 06`.

### Backend API (`apps/api`)
1. **Security & Authentication**:
   - Argon2id password hashing and session generation with Redis.
   - Dual authentication: Standard JWT Bearer + Development Admin credentials (`x-admin-secret`, `x-dev-admin`).
   - RBAC pre-handler enforcing role constraints across admin routes.
2. **Catalog & Search**:
   - `GET /api/v1/categories`: Categories with live product counts.
   - `GET /api/v1/products`: Multi-faceted filtering (category, size, color, price range, status), cursor-based & offset pagination.
   - `GET /api/v1/products/:slug`: Complete product details with variant availability.
3. **Admin Operations**:
   - `GET /api/v1/admin/metrics`: Real-time daily revenue, order counts, dispatch counts, low stock alerts.
   - `POST /api/v1/admin/products`: Complete garment creation with variant matrix generator and inventory initialization.
   - `PATCH /api/v1/admin/inventory/:variantId`: Real-time stock adjustment with audit logging.
   - `POST /api/v1/admin/products/csv-validate`: Live schema validation with row-by-row error reporting.
   - `POST /api/v1/admin/products/csv-import`: Batch variant ingestion.
4. **Cloudinary Integration**:
   - `apps/api/src/services/cloudinary.ts`: Buffer and Base64 upload methods with auto-format optimization (`f_auto, q_auto`).
   - `POST /api/v1/admin/uploads`: Fastify multipart endpoint accepting images up to 10MB.
   - `GET /api/v1/admin/uploads/signature`: Signed upload parameters for direct client uploads.
5. **Brevo Email Integration**:
   - `apps/api/src/services/email.ts`: Brevo v3 Transactional REST API integration.
   - Luxury brutalist HTML templates for Order Confirmation, Shipment Dispatch, Welcome Registration, and Refund Settlement.
   - Automated welcome email hook on user registration (`POST /api/v1/auth/register`).
   - Graceful development simulation when API key is unconfigured.

### Admin Dashboard (`apps/admin`)
1. **Overview Page (`/`)**: Operations metrics, catalog quick actions, live Cloudinary CDN & Brevo status pills.
2. **Product Catalog (`/products`)**: Filterable table of published garments, variant counts, and stock levels.
3. **Product Creation (`/products/new`)**: Form with title, slug, price, fabric specs, variant matrix generator, and 1-click Cloudinary image file uploader with live thumbnail preview.
4. **Batch CSV Ingestion (`/products/import`)**: Interactive CSV editor, validation error preview, batch commit.
5. **Inventory Matrix (`/inventory`)**: Table showing stock per SKU with instant `-1`, `+1`, and `+10` adjustment actions.

### Storefront Application (`apps/storefront`)
1. **Next.js 15 App Router Architecture**:
   - Port `3000` with Turborepo workspace compilation.
   - Design tokens integration via `atelierTailwindPreset`.
2. **Editorial Homepage (`/`)**:
   - Breadcrumb & Series 04 volume meta strip matching `DESIGN/code.html`.
   - Title & Controls Header with live product counts and sorting dropdown.
   - Dynamic 2-column mobile / 3-column desktop luxury grid with 4:5 aspect ratio imagery, tabular INR prices (`₹`), status badges, and color shade swatches.
   - Infinite scroll pagination powered by `IntersectionObserver` with shimmer placeholder cards.
3. **Multi-Faceted Refinement & Mobile Drawer**:
   - Live category checkboxes with item counts.
   - Collection filters with dynamic backend API sync (`GET /api/v1/collections`).
   - Size chips (`XS`, `S`, `M`, `L`, `XL`, `XXL`).
   - Color shade swatches with active ring selection.
   - Active refinement chips row with one-click removal and "Clear All".
   - Mobile slide-over bottom sheet filter drawer with backdrop blur and sticky apply bar.
4. **Product Detail Page (PDP) (`/products/[slug]`)**:
   - Dual-column editorial layout: sticky 4:5 image gallery with interactive thumbnail selector.
   - Dynamic color shade picker and size selector.
   - Real-time stock status badge (`Low Stock: X remaining`, `In Stock`, `Sold Out`).
   - Quantity selector (+/- stepper) and "Add to Commission Bag" CTA.
   - Technical accordions for Fabric Architecture, Cut & Silhouette, and Tax & HSN compliance.
5. **Universal Layout & Dynamic Footer**:
   - Header with top announcement bar, brand logo, navigation links, search, bag badge, and mobile drawer.
   - Dynamic Footer with live collections fetched from API, exchange concierge link, and GST compliance seal.
   - Global `AuthWatcher` auto-redirecting to `/login?expired=true` upon JWT expiry from any route.
6. **Offline-First PWA & Low-Bandwidth Resilience**:
   - Dual-tier storage engine (L1 RAM + L2 IndexedDB via `offlineStore.ts`) providing sub-5ms local reads.
   - Service Worker (`sw.js`) with `Cache-First` image and static chunk caching, and `Stale-While-Revalidate` for RSC payloads.
   - Instant in-place **Offline Garment Sheet** (`OfflineGarmentModal.tsx`) when offline without white screens or network failures.
   - Offline checkout protection disabling payment submission while preserving all customer form data locally.
7. **GSAP Editorial Animation Architecture**:
   - Client-safe GSAP 3 + ScrollTrigger registration via `@gsap/react` `useGSAP` hook (`apps/storefront/src/lib/gsap.ts`).
   - `EditorialHeroHeader.tsx`: Timeline stagger on Series 04 volume strip, architectural eyebrow, headline, controls, and active refinement chips.
   - `ProductGridClient.tsx`: `ScrollTrigger.batch('[data-product-card]', ...)` fluid staggers (`y: 32 -> 0, opacity: 0 -> 1`) across catalog scrolling and infinite scroll loads.
   - `ProductCard.tsx`: Micro-scale ease-out (`1.035`) image hover interaction.
   - `ProductDetailClient.tsx`: Cinematic gallery cross-dissolve with micro-pan (`opacity: 0.3, scale: 1.025, x: 6 -> 1, 1, 0`), tactile CTA pulse on "Add to Commission Bag", and fluid GSAP height interpolation on technical specifications accordions (`EditorialAccordionItem`).
   - Fully accessible and guarded by `prefers-reduced-motion`.
8. **Scroll Depth, Continuous Ambient Motion & Pagination Decoupling**:
   - `ScrollProgressBar.tsx`: 1.5px architectural hairline indicator docked beneath fixed header tracking scroll percentage.
   - `ArchivalTicker.tsx`: Continuous left-to-right marquee detailing textile origins (Flanders, Gujarat), atelier craft, and seasonal volume at 22s velocity without cursor-freeze traps.
   - `EditorialCurtain.tsx`: Haute-couture entrance curtain with letter-spaced serif monogram signature ("A T E L I E R") wiping upward on load with click-to-skip support.
   - `LiveAtelierTime.tsx`: Real-time Indian Standard Time (IST) clock with 24/7 ambient breathing pulse (Craft Active deep forest `#1B3B2B` vs Studio Nocturne `#5A1827`).
   - `ProductCard.tsx`: Client-only ScrollTrigger parallax shifting garment imagery (`yPercent: -4%` to `+4%`) inside 4:5 frames at differential scroll speed.
   - **Infinite Scroll & History Decoupling**: Prevented URL search param pollution (`?page=2`) during infinite scrolling. Preserved cumulative client feed state so scrolling back up keeps all products intact. Sanitized `returnUrl` across `auth.ts` and `/login` so session expirations return the customer to the root catalog rather than stranded sub-pages.
   - Zero SSR conflicts: all motion libraries are dynamically loaded on the client.

---

## 5. What is Left to Do

### Milestone 7: Stock Reservations (Completed)
- [x] Client cart state with persistent localStorage / cookie sync (`@atelier/storefront/src/context/CartContext.tsx`).
- [x] Slide-out cart drawer with itemized line items, size/color specs, quantity steppers, subtotal in ₹, and free shipping progress meter (₹1,999 threshold).
- [x] Checkout steps: Shipping address collection with strict 6-digit Indian PIN code validation, GST invoice calculation, coupon code application.
- [x] Server-side atomic stock reservations: 15-minute temporary hold pattern via Redis (`stock_hold:{variantId}`) + PostgreSQL `stock_reservations` table in `apps/api/src/services/stockReservation.ts`.

### Milestone 8: Payments & Webhooks (Completed)
- [x] Payment gateway adapter interface (Razorpay SDK ready with sandbox simulator).
- [x] Automatic Brevo order confirmation email dispatch on successful payment verification.
- [x] Idempotent webhook handler: `POST /api/v1/checkout/webhook` in `apps/api/src/routes/webhooks.ts` validating `x-razorpay-signature` and updating order state (`pending_payment` -> `confirmed`) asynchronously.

### Milestone 9: Admin Fulfillment, Shipments & Returns (Completed)
- [x] Admin order fulfillment interface for packing and label generation.
- [x] Dynamic custom logistics carrier directory with tracking URL templates (`{trackingNumber}`).
- [x] Carrier assignment, Airway Bill (AWB) generation, automatic tracking link assignment.
- [x] Automatic Brevo dispatch notification email.
- [x] Customer self-serve cancellation (`CancelOrderModal`) on `/track-order` and `/account`.
- [x] Inventory stock replenishment, payment refund recording, Brevo cancellation refund email.
- [x] Customer exchange & return request system (`ExchangeReturnModal`) on `/track-order` and `/account`.

### Milestone 10: Production Hardening & Launch Audit
- [x] Rate limiting on API endpoints via `@fastify/rate-limit` (300 req/min global, automatic HTTP 429 response).
- [x] Database search index optimization on `products(title, collection_name, slug, status, category_id)`.
- [ ] Security headers & CSP lockdown across storefront and admin apps.
- [ ] Lighthouse audit (>95 across performance, accessibility, SEO) and WCAG AA verification.



---

## 6. How to Run Locally

```bash
# 1. Start Docker Containers (Postgres on 5433, Redis on 6379)
docker compose up -d

# 2. Run Database Seeder (if starting fresh)
pnpm --filter @atelier/database db:seed

# 3. Start Backend API Server (Port 4000)
pnpm --filter @atelier/api dev

# 4. Start Admin Dashboard (Port 3001)
pnpm --filter @atelier/admin dev

# 5. Typecheck & Tests Verification
pnpm --filter @atelier/api typecheck
pnpm --filter @atelier/admin exec tsc --noEmit
pnpm --filter @atelier/api test
```
