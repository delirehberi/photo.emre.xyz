# Self-Hosting Guide: photo.emre.xyz

> **photo.emre.xyz** is an open-source, sovereign, zero-database photo gallery and event media platform built on Astro SSR, Cloudflare Pages, Blossom serverless storage, and the Nostr protocol.

This guide provides an end-to-end walkthrough for deploying your own instance of `photo.emre.xyz` and its companion Blossom media server on Cloudflare's global edge infrastructure.

---

## Architectural Overview

```
                      ┌─────────────────────────────────┐
                      │          Custom Domain          │
                      │       (e.g., photo.your.xyz)    │
                      └────────────────┬────────────────┘
                                       │
                                       ▼
                      ┌─────────────────────────────────┐
                      │     Cloudflare Pages (SSR)      │
                      │  - Astro 5 SSR Runtime          │
                      │  - Cloudflare Cache API (SWR)   │
                      │  - Dynamic Edge Watermarking    │
                      └────────┬───────────────┬────────┘
                               │               │
       Nostr Queries & Events  │               │ Media Blobs (PUT/GET)
       (NIP-01/52/94/57)       ▼               ▼ (NIP-98 Auth)
       ┌────────────────────────────┐    ┌────────────────────────────┐
       │      Nostr Relay Mesh      │    │ Blossom Serverless Worker  │
       │ ────────────────────────── │    │ (media.your.xyz)           │
       │ Primary: relay.your.xyz    │    │ ────────────────────────── │
       │ Global:  relay.damus.io    │    │ Backed by Cloudflare R2    │
       │          relay.primal.net  │    └────────────────────────────┘
       │          nos.lol           │
       └────────────────────────────┘
```

---

## 1. Prerequisites

Before starting, ensure you have:

1. **Cloudflare Account**: Free or Paid plan with access to Pages, Workers, and R2.
2. **Domain Name**: Delegated to Cloudflare DNS (for automatic SSL and edge routing).
3. **Nostr Keypair**: An administrator Nostr private/public key (`npub` and `nsec`).
4. **Local Development Tools**:
   - Node.js 22+ (recommended via `nvm`)
   - `wrangler` CLI (`npm install -g wrangler` or via `npx wrangler`)
   - `make` and `git`

---

## 2. Deploying Blossom Serverless Media Storage

`photo.emre.xyz` stores media as content-addressed SHA-256 blobs on a private Blossom server. We recommend [`Nostr-org-tr/blossom-serverless`](https://github.com/Nostr-org-tr/blossom-serverless), which runs as a Cloudflare Worker backed by an R2 bucket.

### Step 2.1: Clone and Configure Blossom Serverless

```bash
git clone https://github.com/Nostr-org-tr/blossom-serverless.git
cd blossom-serverless
npm install
```

### Step 2.2: Create an R2 Storage Bucket

```bash
# Create R2 bucket for raw media blobs
npx wrangler r2 bucket create blossom-media
```

### Step 2.3: Configure `wrangler.toml`

Edit `wrangler.toml` in `blossom-serverless`:

```toml
name = "blossom-serverless"
main = "src/index.ts"
compatibility_date = "2024-09-23"

# Bind Cloudflare R2 bucket
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "blossom-media"

[vars]
# Restrict uploads to your admin pubkey, or leave open for multi-tenant
AUTHORIZED_PUBKEYS = "your_hex_admin_pubkey_here"
PUBLIC_URL = "https://media.yourdomain.xyz"
```

### Step 2.4: Deploy Blossom Worker & Attach Custom Domain

```bash
npx wrangler deploy
```

In the Cloudflare Dashboard:
1. Navigate to **Workers & Pages** -> **blossom-serverless** -> **Settings** -> **Domains & Routes**.
2. Click **Add Custom Domain** and set `media.yourdomain.xyz`.
3. Cloudflare will automatically provision SSL certificates.

---

## 3. Configuring and Deploying photo.emre.xyz

### Step 3.1: Clone the Repository

```bash
git clone https://github.com/delirehberi/photo.emre.xyz.git
cd photo.emre.xyz
```

### Step 3.2: Environment Configuration

Copy the example configuration or set environment variables:

```bash
# Verify Node version using nvm
nvm use

# Install dependencies
npm install
```

Set your instance variables in `wrangler.jsonc`:

```jsonc
{
  "name": "photo-emre-xyz",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": "./dist",
  "vars": {
    // Hex format public key of the instance administrator
    "PUBLIC_ADMIN_PUBKEY": "your_hex_admin_pubkey_here",
    // Base URL of your deployed Blossom server
    "BLOSSOM_SERVER_URL": "https://media.yourdomain.xyz",
    // Comma-separated list of Nostr relays for the mesh
    "PUBLIC_DEFAULT_RELAYS": "wss://relay.yourdomain.xyz,wss://relay.damus.io,wss://relay.primal.net,wss://nos.lol"
  }
}
```

### Step 3.3: Build the Application

Build the Astro SSR production bundle:

```bash
make build
```

This compiles client-side hydration islands and generates the Cloudflare Pages serverless worker at `./dist/_worker.js`.

### Step 3.4: Deploy to Cloudflare Pages

Deploy using `make deploy` or `wrangler`:

```bash
make deploy
# Or directly:
# npx wrangler pages deploy ./dist --project-name=photo-emre-xyz
```

### Step 3.5: Configure Custom Domain for the Gallery

1. In the Cloudflare Dashboard, go to **Workers & Pages** -> **photo-emre-xyz** -> **Custom domains**.
2. Click **Set up a custom domain** (e.g. `photo.yourdomain.xyz`).
3. Cloudflare configures the DNS CNAME record and provisions SSL automatically.

---

## 4. Nostr Relay Mesh Architecture & Tuning

`photo.emre.xyz` uses a **zero-database architecture**: Nostr relays are the single source of truth.

### Topology:
1. **Primary Anchor Relay (`wss://relay.yourdomain.xyz`)**:
   - High-throughput, low-latency relay for your organization.
   - Recommended software: `strfry` or `nostr-rs-relay`.
2. **Federated Global Relays (`wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`)**:
   - Provide redundancy and censorship-resistant discoverability worldwide.

### Event Kinds Checklist:
- **Kind 0**: Organization profile & NIP-05 verification.
- **Kind 31922**: NIP-52 Calendar Event Albums (with parameterized `d` tags).
- **Kind 1063**: NIP-94 File Metadata (SHA-256 content addressing & dimensions).
- **Kind 27235**: NIP-98 HTTP upload authorization.
- **Kind 9735**: NIP-57 Zap Receipts for payment proof.

---

## 5. Edge Caching & Invalidation Architecture

### Edge Cache Policy:
- Public galleries (`/album/*`) and media download endpoints (`/api/download/*`) are cached via Cloudflare Cache API (`caches.default`) with SWR headers:
  ```http
  Cache-Control: public, max-age=0, s-maxage=60, stale-while-revalidate=300
  X-Cache: HIT | MISS
  ```
- Admin endpoints (`/admin/*`, `/api/admin/*`) are strictly non-cached (`Cache-Control: private, no-store`).

### Instant Edge Invalidation:
When new photos or albums are published, the client issues a `POST` to `/api/cache/invalidate`:
```bash
curl -X POST https://photo.yourdomain.xyz/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -H "Authorization: Nostr <base64-signed-event>" \
  -d '{"coordinate": "31922:<pubkey>:<album-slug>"}'
```
This purges Cloudflare's edge cache immediately across global PoPs.

---

## 6. Verification Checklist

After deployment, verify that all systems operate correctly:

- [ ] **Homepage Loads**: Visit `https://photo.yourdomain.xyz` (HTTP 200).
- [ ] **Security Headers**: Inspect response headers for CSP, HSTS, `X-Content-Type-Options: nosniff`.
- [ ] **Edge Caching**: Reload `/album/demo-album` and confirm `X-Cache: HIT`.
- [ ] **Nostr Login**: Authenticate with NIP-07 extension or NIP-46 Bunker.
- [ ] **Admin Gate**: Sign into `/admin` with `ADMIN_PUBKEY` and verify keypair creation.
- [ ] **Blossom Upload**: Upload a test photo; confirm SHA-256 hash and Kind 1063 broadcast.
- [ ] **Dynamic Watermark**: Request `/api/download/:hash` and verify content-owner watermark.
