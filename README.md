# photo.emre.xyz

> **A sovereign, decentralized event photo album platform built on the Nostr protocol, Blossom serverless media servers, and Bitcoin Lightning Network.**

---

## 📸 Overview

`photo.emre.xyz` is an open-source organisation album application designed for meetups, hackathons, conferences, and sovereign communities. Organizations can establish their cryptographic identity, publish time-based event albums, upload high-resolution media, and allow attendees to crowdsource event photos directly to the gallery with cryptographic provenance.

```
+-----------------------------------------------------------------------------------------+
|                                    photo.emre.xyz                                       |
|                                                                                         |
|   +-----------------------+     +------------------------+     +--------------------+   |
|   |  Nostr Relays (Mesh)  |     |  Blossom Media Servers |     | Lightning Network  |   |
|   |  - Kind 0 (Org Meta)  |     |  - media.emre.xyz      |     |  - WebLN & NWC     |   |
|   |  - Kind 31922 (Albums)|     |  - SHA-256 Blobs       |     |  - LUD-16 Tips     |   |
|   |  - Kind 1063 (Photos) |     |  - NIP-98 HTTP Auth    |     |  - 0-sats Admin    |   |
|   +-----------------------+     +------------------------+     +--------------------+   |
|              ▲                              ▲                             ▲             |
|              │                              │                             │             |
|   +---------------------------------------------------------------------------------+   |
|   |                     Astro SSR + Cloudflare Pages Edge Runtime                   |   |
|   |                     - Zero database (No SQL, No KV, No D1)                      |   |
|   |                     - Zero-CLS Dynamic Aspect Ratio Masonry                     |   |
|   |                     - Stale-While-Revalidate Edge Caching                       |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

## 🏛️ Architectural Pillars

### 1. Zero-Database Invariant
There is **no SQL database, no KV store, and no D1 database**. The Nostr relay network serves as the single source of truth for all metadata, profiles, event calendars, and photo references.

### 2. Blossom Serverless Storage
Binary assets (high-resolution JPEG, PNG, WEBP) are stored on content-addressed Blossom servers (`media.emre.xyz`).
- Each blob is named by its **SHA-256 hash**.
- Upload authorization uses **NIP-98** signed HTTP Authorization headers (`kind: 27235`).
- EXIF metadata (shutter, aperture, camera model, ISO) is preserved.

### 3. Relay Topology & Write Protection
- **Primary Anchor Relay (`wss://relay.emre.xyz`)**: Write-protected for platform admin operations; serves as high-speed read cache.
- **Federated Relay Pool (`wss://relay.damus.io`, `wss://relay.primal.net`, `wss://nos.lol`)**: Open federated relays where community organisations broadcast their Kind 0 profiles and Kind 31922 event albums.
- The platform queries both the anchor and federated relays simultaneously using timeout racing.

### 4. Zero-CLS Dynamic Masonry
Every photo event stores image dimensions in its NIP-94 `dim` tag (e.g. `1600x1067`). The frontend calculates exact CSS aspect ratios before images load, completely eliminating Cumulative Layout Shift (CLS).

### 5. Bitcoin Lightning Monetization
Spam prevention and micro-monetization are enforced via Lightning rails (WebLN, NWC, and QR code invoices):
- Create Organisation: **100 sats**
- Create Event Album: **100 sats**
- Upload Photo: **21 sats**
- **Admin Exemption**: The configured `PUBLIC_ADMIN_PUBKEY` bypasses all fees (0 sats).

---

## 📜 Nostr Event Schemas

| Event Kind | Protocol Standard | Description | Key Tags |
| :--- | :--- | :--- | :--- |
| **Kind 0** | NIP-01 | Organization / User Metadata | `name`, `display_name`, `about`, `picture`, `nip05`, `lud16` |
| **Kind 31922** | NIP-52 | Calendar Event Album | `d` (slug), `title`, `summary`, `start`, `end`, `location`, `t: event-album` |
| **Kind 1063** | NIP-94 | File Metadata (Photo) | `url`, `x` (sha256), `m` (mime), `dim`, `a` (`31922:<pubkey>:<d-tag>`), `exif` |
| **Kind 27235** | NIP-98 | HTTP Request Authorization | `u` (URL), `method` (`PUT`/`GET`), `payload` (sha256) |

---

## 🚀 Quick Start & Development

### Prerequisites
- Node.js v22 (managed via `.nvmrc`)
- npm

### Commands via Makefile

Always use the included `Makefile` to run tasks:

```bash
# Start local development server
make dev

# Run unit and integration test suite
make test

# Run Astro TypeScript diagnostics
make check

# Lint and check formatting
make lint

# Automatically format code
make format

# Build for Cloudflare Pages
make build

# Preview production build locally with Wrangler
make preview

# Deploy to Cloudflare Pages
make deploy
```

---

## 🛡️ Security & Privacy

- **Client-Side Cryptography**: Secret keys (`nsec`) are never sent over the wire or stored on backend servers.
- **NIP-07 / Bunker Support**: Browser extensions (Alby, nos2x) and remote signers (Nostr Bunker) handle all event signing securely.
- **XSS Sanitization**: All content from Nostr relays (Kind 0 text, titles, EXIF tags) is sanitized through strict allowlists before rendering.
- **Content Addressing**: Media integrity is verified against SHA-256 hashes matching the Blossom storage specification.

---

## 📄 License

MIT License. Open source and self-hostable.
