# Security Policy

## Supported Versions

| Version | Supported          |
| :------ | :----------------- |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

---

## Reporting a Vulnerability

We take the security of **photo.emre.xyz** (Phoem) seriously. If you believe you have found a security vulnerability, please do not disclose it publicly in issues or pull requests.

Instead, please report it responsibly:

- **Email**: [emre@emre.xyz](mailto:emre@emre.xyz)
- **Nostr DM / NIP-17**: Send an encrypted message to the admin npub:
  `npub1uu6gfkx6u84k2q0d2v9g9x0g242x3f3d9l2r3h3y9g0s4s3d2f1` (`46f3c7bb33cc3019049b76dc89dbb96e34c247bdda68b6ad8632682793ff8a1a`)

Please include:
1. A description of the issue and potential impact.
2. Step-by-step reproduction instructions or a minimal proof of concept.
3. Any affected components (Astro SSR, Cloudflare Edge Cache, Nostr relay client, Blossom uploader).

You will receive an acknowledgement within 48 hours, along with regular progress updates until a fix is deployed.

---

## 🛡️ Security Architecture & Invariants

### 1. Client-Side Cryptographic Isolation
Phoem is designed with a zero-trust server model:
- User secret keys (`nsec`) are processed entirely in the browser memory and are **never** transmitted to server backends or logged in error telemetry.
- Browser extensions adhering to **NIP-07** (e.g., Alby, nos2x) and remote bunkers (**NIP-46**) are the strongly recommended authentication mechanisms.

### 2. Zero-Database Invariant
Because the platform does not utilize a centralized SQL, KV, or document database, SQL injection (SQLi) and centralized database exfiltration vectors are eliminated by architecture.

### 3. Media Integrity & Content Addressing
- All media files stored on Blossom servers are indexed and addressed strictly by their **SHA-256 hash**.
- When serving or downloading images, hashes are validated against strict 64-character hexadecimal patterns (`/^[a-f0-9]{64}$/i`) to prevent directory traversal and SSRF attacks.

### 4. Input Sanitization & Cross-Site Scripting (XSS)
- All untrusted metadata coming from public Nostr relays (organization names, event summaries, image EXIF strings) is sanitized through strict escaping and allowlists prior to insertion in the DOM.

### 5. Edge Caching Boundaries
- Admin verification routes (`/api/admin/*`), cache invalidation endpoints (`/api/cache/*`), and creation workflows (`/events/create`) strictly send `no-store, no-cache, must-revalidate` headers and are never persisted in Cloudflare edge caches.
