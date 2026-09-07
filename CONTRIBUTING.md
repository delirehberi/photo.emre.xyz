# Contributing to photo.emre.xyz (Phoem)

Thank you for your interest in contributing to **Phoem**! This project is an open-source, sovereign, censorship-resistant photo album platform for communities and organizations, built on the Nostr protocol, Blossom serverless media servers, and the Bitcoin Lightning Network.

---

## 🏛️ Guiding Architectural Principles

Before writing code, please keep these core tenets in mind:

1. **Zero-Database Invariant**: There is no SQL database, KV, or centralized backend state. The Nostr relay network is the single source of truth for all metadata, profiles, and event references. Binary assets reside on content-addressed Blossom servers.
2. **Client-Side Cryptography**: Private keys (`nsec`) must NEVER touch backend servers. Event signing is performed in the user's browser via NIP-07 browser extensions, Nostr Bunker (NIP-46), or client-side keypairs.
3. **Zero Cumulative Layout Shift (Zero-CLS)**: All media events specify image dimensions in NIP-94 tags (`dim`). The UI computes exact aspect ratios prior to image loading.
4. **Resilient Relay Topologies**: The platform connects to multiple federated relays simultaneously using timeout racing and handles relay disconnections gracefully.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v22 (managed via `.nvmrc`)
- **npm**: v10+
- **Make**: Standard GNU make

### Initializing the Workspace
```bash
# Clone the repository
git clone https://github.com/delirehberi/photo.emre.xyz.git
cd photo.emre.xyz

# Switch to the correct Node version
nvm use

# Install dependencies
npm install

# Create local environment config
cp .env.example .env.local
```

---

## 📜 Makefile Workflow

We use a canonical `Makefile` to ensure identical build and test environments across machines:

| Target | Command | Purpose |
| :--- | :--- | :--- |
| `make dev` | `npm run dev` | Start Astro SSR local development server |
| `make test` | `npm test` | Run Vitest unit & integration test suite |
| `make check` | `npx astro check` | Run Astro & TypeScript type diagnostics |
| `make lint` | `npm run lint` | Run ESLint and Prettier style checks |
| `make format`| `npm run format` | Auto-format codebase with Prettier |
| `make build` | `npm run build` | Compile production build for Cloudflare Pages |
| `make preview` | `wrangler pages dev ./dist` | Preview production build locally with Wrangler |
| `make storybook` | `npm run storybook` | Launch Storybook UI component workbench |

> **Always run `make check`, `make lint`, and `make test` before submitting a Pull Request.**

---

## 🌿 Branching and Git Conventions

1. **Branch Naming**:
   - `feature/<description>` for new capabilities
   - `fix/<description>` for bug fixes
   - `perf/<description>` for performance optimizations
   - `refactor/<description>` for structural improvements
2. **Commit Messages**: Follow Conventional Commits:
   - `feat: add Blossom multi-server upload fallback`
   - `fix(gallery): resolve aspect ratio calculation on safari`
   - `test(nostr): add test case for kind 31922 coordinate parser`
   - `docs: update deployment guidelines in README`

---

## 🧪 Testing Standards

- Write unit tests for all new utilities, parsers, and cryptographic routines under `tests/`.
- Ensure mock relays and Blossom test doubles clean up their network sockets after tests finish.
- Code should achieve clean test passes across the entire suite.

---

## 🛡️ Security Best Practices

- Sanitize all text fields retrieved from Nostr events before injecting into the DOM or markdown parsers.
- Never commit private keys, secrets, or production wallet credentials.
- Report security vulnerabilities following the protocol in [SECURITY.md](SECURITY.md).

Thank you for helping build sovereign, decentralized media tools for everyone!
