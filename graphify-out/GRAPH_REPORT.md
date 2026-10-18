# Graph Report - yt-bilingual-subtitles-app  (2026-10-18)

## Corpus Check
- Corpus is ~32,989 words - fits in a single context window. You may not need a graph.

## Summary
- 318 nodes · 488 edges · 24 communities (15 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Subtitle Processing API Routes
- Frontend Web UI & Modals
- Stripe Billing & Payment Routes
- TypeScript Compiler Options
- ESLint & Build Dependencies
- Diagnostic & Execution Routes
- Production Node Dependencies
- Auth & Vocabulary API Routes
- Package Metadata Configuration
- Job Queue & Video Processing
- User Repository & Password Hashing
- Session & Auth Cookie Service
- Usage Limits & Plan Quotas
- VPS & WARP Proxy Infrastructure
- Root Layout & Metadata
- Edge Middleware & Security
- Prisma Database Client
- Subtitle Studio & VEVO Player
- Host Deploy Automation
- ESLint Tooling Config
- Next.js Standalone Config

## God Nodes (most connected - your core abstractions)
1. `getAuthTokenFromCookies()` - 20 edges
2. `CryptoService` - 19 edges
3. `YouTubeService` - 16 edges
4. `compilerOptions` - 16 edges
5. `BaseRepository` - 15 edges
6. `react` - 11 edges
7. `checkRateLimit()` - 10 edges
8. `UserRepository` - 10 edges
9. `POST()` - 9 edges
10. `getClientIp()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Deploy Automation Script` --MANAGES_LIFECYCLE_OF--> `Cloudflare WARP SOCKS5 Sidecar`  [EXTRACTED]
  deploy.sh → AGENTS.md
- `Pre-flight Proxy Reachability Check` --VERIFIES_CONNECTIVITY_OF--> `Cloudflare WARP SOCKS5 Sidecar`  [EXTRACTED]
  scripts/extract_subs.py → AGENTS.md
- `HistoryGridProps` --references--> `VideoRecord`  [EXTRACTED]
  frontend/src/components/HistoryGrid.tsx → frontend/src/lib/security/repositories/videoRepository.ts
- `Cloudflare WARP SOCKS5 Sidecar` --PROVIDES_PROXY_FOR--> `YT Bilingual Subtitles SaaS`  [EXTRACTED]
  AGENTS.md → README.md
- `POST()` --calls--> `getAuthTokenFromCookies()`  [EXTRACTED]
  frontend/src/app/api/subtitles/process/route.ts → frontend/src/lib/security/cookies.ts

## Import Cycles
- None detected.

## Communities (24 total, 9 thin omitted)

### Community 0 - "Subtitle Processing API Routes"
Cohesion: 0.07
Nodes (12): JWT_SECRET, TokenPayload, BaseRepository, PaymentRepository, SubscriptionRecord, QuotaCheckResult, UsageRecord, SafeUser (+4 more)

### Community 1 - "Frontend Web UI & Modals"
Cohesion: 0.10
Nodes (24): AuthModal(), AuthModalProps, HistoryGrid(), HistoryGridProps, LegalModal(), LegalModalProps, LegalModalTab, Navbar() (+16 more)

### Community 2 - "Stripe Billing & Payment Routes"
Cohesion: 0.12
Nodes (19): GET(), POST(), POST(), POST(), GET(), setAuthCookieOnResponse(), checkRateLimit(), getClientIp() (+11 more)

### Community 3 - "TypeScript Compiler Options"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 4 - "ESLint & Build Dependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/bcryptjs (+19 more)

### Community 5 - "Diagnostic & Execution Routes"
Cohesion: 0.13
Nodes (12): execAsync, GET(), DICT_CACHE, GET(), CloudWhisperService, execAsync, WhisperSegment, execAsync (+4 more)

### Community 6 - "Production Node Dependencies"
Cohesion: 0.09
Nodes (23): anki-apkg-export, bcryptjs, dependencies, anki-apkg-export, bcryptjs, jose, lucide-react, next (+15 more)

### Community 7 - "Auth & Vocabulary API Routes"
Cohesion: 0.19
Nodes (10): GET(), POST(), POST(), DELETE(), GET(), DELETE(), GET(), POST() (+2 more)

### Community 8 - "Package Metadata Configuration"
Cohesion: 0.11
Nodes (17): author, description, keywords, license, name, private, scripts, build (+9 more)

### Community 9 - "Job Queue & Video Processing"
Cohesion: 0.24
Nodes (6): VideoRecord, ActiveJob, JobListener, JobProgress, JobQueueServiceSingleton, JobStatus

### Community 11 - "Session & Auth Cookie Service"
Cohesion: 0.40
Nodes (4): POST(), AUTH_COOKIE_NAME, clearAuthCookieOnResponse(), COOKIE_MAX_AGE

### Community 13 - "VPS & WARP Proxy Infrastructure"
Cohesion: 0.50
Nodes (4): Deploy Automation Script, Pre-flight Proxy Reachability Check, Cloudflare WARP SOCKS5 Sidecar, YT Bilingual Subtitles SaaS

## Knowledge Gaps
- **109 isolated node(s):** `deploy.sh script`, `eslintConfig`, `nextConfig`, `name`, `version` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Frontend Web UI & Modals` to `Package Metadata Configuration`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Why does `keywords` connect `Package Metadata Configuration` to `Frontend Web UI & Modals`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `BaseRepository` connect `Subtitle Processing API Routes` to `User Repository & Password Hashing`, `Usage Limits & Plan Quotas`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `deploy.sh script`, `eslintConfig`, `nextConfig` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Subtitle Processing API Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.06829268292682927 - nodes in this community are weakly interconnected._
- **Should `Frontend Web UI & Modals` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Stripe Billing & Payment Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.12043010752688173 - nodes in this community are weakly interconnected._