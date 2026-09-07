# Engineering Roadmap: photo.emre.xyz

> **photo.emre.xyz** is an open-source, self-hostable, zero-database, Nostr-native photo gallery and event media platform built on Astro SSR, Cloudflare Pages, private Blossom serverless storage, and the Bitcoin Lightning Network.

---

## 1. Architectural Principles & Specifications

```
                          ┌────────────────────────────────────────────────────────┐
                          │                      Client Browser                    │
                          │   (Astro Island Hydration + Radix UI + Tailwind CSS)   │
                          └────────┬──────────────────────┬────────────────┬───────┘
                                   │                      │                │
            1. Query / Sync Events │      2. Direct Blob  │   3. Lightning │ (WebLN / NWC)
            (NIP-01/07/46/52/94)   │         Upload       │      Payment   │ (100 / 100 / 21 sats)
                                   ▼                      ▼                ▼
┌──────────────────────────────────────┐     ┌────────────────┐    ┌────────────────┐
│           Nostr Relay Mesh           │     │ Blossom Server │    │ Lightning Node │
│ ──────────────────────────────────── │     │  (Serverless)  │    │  / NWC Gateway │
│ Primary: wss://relay.emre.xyz        │     │media.emre.xyz  │    └────────────────┘
│ Global:  wss://relay.damus.io        │     └───────┬────────┘
│          wss://relay.primal.net      │             │
│          wss://nos.lol               │             │ Content Stream
└──────────────────┬───────────────────┘             ▼
                   │ Fetch / SWR        ┌────────────────────────────┐
                   ▼                    │ Cloudflare Edge Worker     │
┌──────────────────────────────────────┐│ /api/download/[hash]       │
│        Cloudflare Pages (SSR)        ││ - Dynamic Content-Owner    │
│  - Cloudflare Cache API (SWR)        ││   Watermark Overlay        │
│  - HTML & Metadata Pre-rendering     ││ - Resizing & Streaming     │
└──────────────────────────────────────┘└────────────────────────────┘
```

### 1.1 Zero-Database Architecture (Relay as Single Source of Truth)
- **No SQL, No KV, No D1**: No mutable traditional relational database or centralized state engine.
- **Relay Mesh Topology**:
  - **Primary Relay (`wss://relay.emre.xyz`)**: Acts as the high-throughput, low-latency primary anchor for indexing, profile publishing, and instantaneous local reads.
  - **Global Relay Federation**: Parallel query, deduplication, and broadcast synchronization across major public relays (`wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`) for censorship resistance and public discoverability.
- **Cache Acceleration**: Cloudflare Cache API + `stale-while-revalidate` (SWR) headers in Astro SSR endpoints cache relay response trees at 300+ edge locations.

### 1.2 Media Infrastructure (Blossom Serverless)
- **Private Blossom Instance**: Powered by [`Nostr-org-tr/blossom-serverless`](https://github.com/Nostr-org-tr/blossom-serverless) hosted at `https://media.emre.xyz`.
- **Content Addressing**: All photos are SHA-256 addressed (`https://media.emre.xyz/<sha256>`).
- **Authorization**: Upload requests use NIP-98 HTTP authorization (`Authorization: Nostr <base64-event>`) signed by the uploader's private key.
- **Dynamic Content-Owner Watermarking**:
  - Download route: `/api/download/:hash?album=:album_id`.
  - Resolution chain:
    $$\text{Watermark Label} = \text{Publisher NIP-05} \;\lor\; \text{Kind 0 Display Name} \;\lor\; \text{Kind 0 Name} \;\lor\; \text{"@delirehberi"}$$
  - Rendered via Cloudflare Worker edge streaming using Canvas/SVG compositing.

### 1.3 Nostr Event Data Specifications

| Entity | Nostr Kind | Identifier / Tagging Schema | Description |
| :--- | :--- | :--- | :--- |
| **Organization Profile** | `0` | Standard profile metadata | `{"name": "...", "display_name": "...", "nip05": "...", "picture": "...", "about": "..."}` |
| **Album / Event** | `31922` | NIP-52 Time-based Calendar Event | Parameterized replaceable `d` tag. Tags: `["d", "<album-slug>"]`, `["title", "..."]`, `["start", "<timestamp>"]`, `["end", "<timestamp>"]`, `["summary", "..."]` |
| **Photo Item** | `1063` | NIP-94 File Metadata Event | Tags: `["url", "https://media.emre.xyz/<sha256>"]`, `["x", "<sha256>"]`, `["m", "image/jpeg"]`, `["dim", "<width>x<height>"]`, `["a", "31922:<org_pubkey>:<d_tag>"]`, `["blurhash", "..."]` |
| **Prepaid Zap / Credit** | `9735` / `30078` | NIP-57 Zap Receipt / Verifiable App Data | Proof of Lightning payment settlement for actions |

#### Official Gallery vs. Community Uploads
On `/album/[id]`:
- **Official Gallery**: Photos where `event.pubkey === organization.pubkey`. Displayed in the primary hero masonry grid.
- **Community Uploads**: Photos where `event.pubkey !== organization.pubkey` but tagging the album's `a` tag `["a", "31922:<org_pubkey>:<d_tag>"]`. Displayed in a designated collapsible community tab/section.
- **Unlisted Albums**: Secured either via randomized high-entropy `d` tags (security through unindexability) or client-side encrypted payloads using NIP-44.

### 1.4 Lightning Network Monetization (Prepaid Model)
- **Rates for Non-Admin Organizations**:
  - **Create Organisation**: `100 sats`
  - **Create Event / Album**: `100 sats`
  - **Image Upload**: `21 sats` per image
- **Admin Exemption**: The configured admin public key (`ADMIN_PUBKEY`) is hardcoded to bypass all payment requirements (`0 sats`), permitting unlimited administration, testing, and operation.
- **Payment Execution**: Supported via WebLN (browser extension), NWC (NIP-47 Nostr Wallet Connect with budget limits), or standard dynamic Lightning invoice QR code modal.
- **Stateless Accounting**: Payment receipts are cryptographically verified via NIP-57 Zap Receipts or L402 payment authorization tokens without local databases.

### 1.5 UI Design System & Component Isolation
- **Styling**: Tailwind CSS with standard responsive layouts and custom CSS columns/subgrid.
- **Primitives**: Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`) for robust, accessible, unstyled interaction foundations.
- **Established UI Patterns**: Standard aspect-ratio masonry grids, standard full-screen lightbox modal with touch swipe and keyboard navigation, standard mobile bottom sheets for upload and bunker connection.
- **Storybook**: Full Storybook environment to isolate, document, and test components across all responsive breakpoints and theme states.

---

## 2. Phased Implementation Roadmap

### Phase Overview & Execution Sequence

| Phase | Milestone Name | Key Focus Areas | Dependencies |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation & Storybook Design System | Astro SSR, Cloudflare Pages adapter, Tailwind CSS, Radix UI primitives, Storybook setup, Makefile | Initial setup |
| **Phase 2** | Nostr Relay Engine & Data Modeling | Relay mesh client (`relay.emre.xyz` + global relays), Event schemas (Kind 0, 31922, 1063), official vs. community partition | Phase 1 |
| **Phase 3** | Blossom Media & Edge Watermarking | `media.emre.xyz` client, NIP-98 upload auth, Cloudflare Worker dynamic content-owner watermarking (`nip05` -> `display_name` -> `@delirehberi`) | Phase 2 |
| **Phase 4** | Authentication & Admin Keypair Creator | NIP-07 extension & NIP-46 Bunker login, Admin keypair generator (`nsec`/`npub`) with one-time reveal modal | Phase 3 |
| **Phase 5** | Lightning Monetization (Prepaid) | WebLN, NWC, 100/100/21 sat prepaid rate enforcement, zero-cost admin bypass, zap receipt verification | Phase 4 |
| **Phase 6** | Frontend Gallery, Lightbox & Polish | CLS-free dual-section Masonry layout (`dim` aspect ratios), Lightbox with EXIF viewer, Storybook coverage | Phase 5 |
| **Phase 7** | Edge Caching & Open-Source Release | Cloudflare Cache API with SWR headers, self-hosting guide, Wrangler configs, security audit | Phase 6 |

### Phase 1: Tooling, Design System & Storybook
- [x] Initialize Astro project with SSR mode (`output: 'server'`) and Cloudflare Pages adapter (`@astrojs/cloudflare`).
- [x] Install and configure `@astrojs/react`, Tailwind CSS, and Radix UI primitives.
- [x] Initialize Storybook (`@storybook/react` with Vite/Tailwind integration).
- [x] Implement `Makefile` with targets: `dev`, `build`, `preview`, `deploy`, `storybook`, `build-storybook`, `lint`, and `check`, enforcing `nvm use`.
- [x] Configure strict TypeScript (`tsconfig.json`) and ESLint/Prettier formatting standards.

### Phase 2: Nostr Relay Mesh & Zero-Database Architecture
- [x] Set up `nostr-tools` with connection pooling and multi-relay querying.
- [x] Configure default relay list:
  - Primary: `wss://relay.emre.xyz`
  - Global: `wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`
- [x] Implement parallel querying with timeout deduplication (`SimplePool`) and fastest-first response resolution.
- [x] Build type-safe event schemas:
  - Organization Profile (Kind `0`).
  - Event Album (Kind `31922`) with replaceable `d` tag support.
  - Photo Metadata (Kind `1063`) parsing `url`, `x` (SHA-256), `dim` (width $\times$ height), `m` (mime), and `a` tag references.
- [x] Implement official vs. community photo separation logic:
  - Filter by `event.pubkey === album.pubkey`.
- [x] Support unlisted album resolutions (randomized high-entropy `d` tags and NIP-44 client decryption).

### Phase 3: Blossom Media Pipeline & Dynamic Content-Owner Watermarking
- [x] Configure Blossom HTTP client for `https://media.emre.xyz`:
  - Client-side SHA-256 checksum calculation (`crypto.subtle.digest`).
  - NIP-98 authorization event generation (Kind `27235` HTTP Auth).
  - Direct HTTP `PUT` blob upload with progress reporting.
- [x] Extract image dimensions (`dim`) client-side prior to upload for inclusion in the NIP-94 event.
- [x] Implement Cloudflare Worker edge route `/api/download/:hash`:
  - Resolve content owner pubkey from the corresponding Kind 1063 / 31922 event.
  - Fetch Kind 0 metadata for the owner from `wss://relay.emre.xyz` or global relays.
  - Determine watermark string: `nip05 || display_name || name || "@delirehberi"`.
  - Stream image with dynamic SVG/Canvas watermark stamped onto bottom-right corner using Cloudflare Image Transformers.
  - Set aggressive edge cache headers (`Cache-Control: public, max-age=31536000, immutable`).

### Phase 4: Authentication, Admin Panel & Account Creator
- [x] Implement cryptographic login options:
  - NIP-07 extension support (`window.nostr`).
  - NIP-46 Nostr Connect / Bunker support with pairing QR code drawer.
- [x] Implement Admin Gatekeeper:
  - Validate caller against `ADMIN_PUBKEY` via challenge-response signature.
- [x] Build Organization Creator in Admin Panel:
  - Option 1: In-browser keypair generation via `generateSecretKey()` / `getPublicKey()`.
  - Radix UI Modal with secure one-time `nsec` reveal, clipboard copy, and download backup.
  - Option 2: Associate existing `npub`.
  - Broadcast initial Kind 0 metadata event to `wss://relay.emre.xyz` and global relays.

### Phase 5: Lightning Network Monetization (Prepaid Accounts)
- [x] Implement rate enforcement module:
  - Organisation Creation: `100 sats`
  - Event / Album Creation: `100 sats`
  - Image Upload: `21 sats` per image
- [x] Implement Admin Bypass:
  - If authenticated pubkey is `ADMIN_PUBKEY`, action cost evaluates to `0 sats`.
- [x] Build multi-provider Lightning modal (Radix Dialog):
  - WebLN detection (`window.webln.sendPayment(invoice)`).
  - NWC (NIP-47) connection string storage with one-click background payments.
  - Dynamic LNURL-pay / BOLT-11 invoice QR code fallback with WebSocket invoice listener.
- [x] Implement zero-database prepaid credit verification:
  - Verifiable settlement via NIP-57 Zap Receipts broadcasted on `relay.emre.xyz` or signed L402 tokens.

### Phase 6: Frontend Experience, Lightbox & Storybook Polish
- [x] Construct CLS-free dual-section Masonry Layout:
  - Calculate aspect ratios dynamically from `dim` tag (`aspect-ratio: width / height`) to eliminate layout shift during image loading.
  - Section 1: Official Gallery (`pubkey === org.pubkey`).
  - Section 2: Community Uploads (`pubkey !== org.pubkey`).
- [x] Build accessible Lightbox component:
  - Full-screen view using Radix Dialog.
  - EXIF viewer (shutter speed, ISO, aperture, camera model).
  - Deep-linkable URLs (`/album/:id?photo=:hash`).
  - Watermarked high-res download button linking to `/api/download/:hash`.
- [x] Build mobile upload drawer (Radix Sheet/Dialog) with multi-file queue and progress tracking.
- [x] Create Storybook stories for every component state:
  - `PhotoCard` (default, loading, error, community badge).
  - `MasonryGrid` (responsive columns: 1, 2, 3, 4).
  - `Lightbox` (single view, multi-view with arrow keys, EXIF open/closed).
  - `KeypairRevealModal` (masked, revealed, copied).
  - `LightningPaymentModal` (idle, invoice generated, paid).

### Phase 7: Edge Caching, Open Source Packaging & Self-Hosting
- [x] Implement Cloudflare Cache API middleware in Astro SSR:
  - Cache relay query payloads with SWR headers (`s-maxage=60, stale-while-revalidate=300`).
  - Instant edge invalidation upon publishing new Kind 31922 / 1063 events (`/api/cache/invalidate`).
- [x] Document complete self-hosting setup:
  - Deploying `blossom-serverless` to Cloudflare Workers with R2 storage.
  - Deploying `photo.emre.xyz` to Cloudflare Pages via `wrangler.jsonc`.
  - Custom domain configuration, SSL/TLS, and relay mesh tuning.
- [x] Perform security and cryptography audit (XSS sanitization, event signature verification, secret key memory hygiene).

---

## 3. Technology Stack Reference

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Astro 5+ (SSR mode) | Lightning-fast static + server-rendered hybrid, zero-JS by default |
| **Edge Runtime** | Cloudflare Pages + Workers | Global edge execution, sub-50ms latency worldwide |
| **Component Model**| React 19 + Radix UI | Standard, unstyled, accessible interactive components |
| **Styling** | Tailwind CSS | Utility-first, predictable styling with no CSS bloat |
| **Component Docs** | Storybook 8+ | Isolated component development and state testing |
| **Nostr Engine** | `@nostr/tools` | Official, audited TypeScript Nostr library |
| **Media Backend** | Blossom Serverless (`media.emre.xyz`) | Decentralized, content-addressed, NIP-98 authenticated storage |
| **Monetization** | WebLN + NWC (NIP-47) + LNURL | Frictionless Bitcoin Lightning payments |
