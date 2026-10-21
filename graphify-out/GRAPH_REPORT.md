# Graph Report - yt-bilingual-subtitles-app  (2026-10-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 385 nodes · 597 edges · 30 communities (18 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `af1273b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- page.tsx
- YouTubeService
- BaseRepository
- compilerOptions
- devDependencies
- dependencies
- scripts
- validators.ts
- UserRepository
- UsageRepository
- rateLimiter.ts
- VideoRepository
- alternative/route.ts
- layout.tsx
- Cloudflare WARP SOCKS5 Sidecar
- middleware.ts
- tts/route.ts
- prisma.ts
- Interactive Subtitle Studio
- deploy.sh
- deploy-stage.sh
- eslint.config.mjs
- next.config.ts
- setup-ssl.sh

## God Nodes (most connected - your core abstractions)
1. `getAuthTokenFromRequest()` - 25 edges
2. `CryptoService` - 21 edges
3. `YouTubeService` - 21 edges
4. `compilerOptions` - 16 edges
5. `BaseRepository` - 14 edges
6. `react` - 14 edges
7. `fetchWithAuth()` - 12 edges
8. `POST()` - 12 edges
9. `UsageRepository` - 10 edges
10. `UserRepository` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Deploy Automation Script` --MANAGES_LIFECYCLE_OF--> `Cloudflare WARP SOCKS5 Sidecar`  [EXTRACTED]
  deploy.sh → AGENTS.md
- `Pre-flight Proxy Reachability Check` --VERIFIES_CONNECTIVITY_OF--> `Cloudflare WARP SOCKS5 Sidecar`  [EXTRACTED]
  scripts/extract_subs.py → AGENTS.md
- `Cloudflare WARP SOCKS5 Sidecar` --PROVIDES_PROXY_FOR--> `YT Bilingual Subtitles SaaS`  [EXTRACTED]
  AGENTS.md → README.md
- `SubtitleStudioProps` --references--> `SubtitleSegment`  [EXTRACTED]
  frontend/src/components/SubtitleStudio.tsx → frontend/src/lib/security/repositories/videoRepository.ts
- `YouTubePlayerProps` --references--> `SubtitleSegment`  [EXTRACTED]
  frontend/src/components/YouTubePlayer.tsx → frontend/src/lib/security/repositories/videoRepository.ts

## Import Cycles
- None detected.

## Communities (30 total, 12 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.08
Nodes (26): GET(), POST(), POST(), GET(), POST(), POST(), POST(), DICT_CACHE (+18 more)

### Community 1 - "page.tsx"
Cohesion: 0.07
Nodes (39): HomePage(), AuthModal(), AuthModalProps, ALL_LESSONS, CuratedCatalog(), CuratedCatalogProps, CuratedLesson, CuratedSection (+31 more)

### Community 2 - "YouTubeService"
Cohesion: 0.09
Nodes (18): POST(), HistoryGrid(), HistoryGridProps, VideoRecord, CloudWhisperService, execAsync, WhisperSegment, ActiveJob (+10 more)

### Community 3 - "BaseRepository"
Cohesion: 0.07
Nodes (14): BaseRepository, PaymentRepository, SubscriptionRecord, QuizQuestion, QuizRecord, QuizRepository, GUEST_TRANSLATIONS_BY_IP, QuotaCheckResult (+6 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (28): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+20 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (27): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/turbopack, @types/bcryptjs (+19 more)

### Community 6 - "dependencies"
Cohesion: 0.09
Nodes (23): anki-apkg-export, bcryptjs, dependencies, anki-apkg-export, bcryptjs, jose, lucide-react, next (+15 more)

### Community 7 - "scripts"
Cohesion: 0.09
Nodes (22): author, description, keywords, license, name, private, scripts, build (+14 more)

### Community 8 - "validators.ts"
Cohesion: 0.22
Nodes (8): execAsync, GET(), ALLOWED_YOUTUBE_HOSTS, FORBIDDEN_HOSTS, ProcessVideoSchema, UserLoginSchema, UserRegisterSchema, YOUTUBE_ID_REGEX

### Community 11 - "rateLimiter.ts"
Cohesion: 0.25
Nodes (4): checkRateLimit(), InMemoryRateLimiter, rateLimiter, RateLimitRecord

### Community 13 - "alternative/route.ts"
Cohesion: 0.50
Nodes (4): ALT_CACHE, AltCandidate, execFileAsync, GET()

### Community 14 - "layout.tsx"
Cohesion: 0.40
Nodes (3): inter, metadata, outfit

### Community 15 - "Cloudflare WARP SOCKS5 Sidecar"
Cohesion: 0.50
Nodes (4): Deploy Automation Script, Pre-flight Proxy Reachability Check, Cloudflare WARP SOCKS5 Sidecar, YT Bilingual Subtitles SaaS

## Knowledge Gaps
- **133 isolated node(s):** `TokenPayload`, `AuthModalProps`, `CuratedCatalogProps`, `CuratedLesson`, `CuratedSection` (+128 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `page.tsx` to `YouTubeService`, `scripts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Why does `keywords` connect `scripts` to `page.tsx`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `YouTubeService` connect `YouTubeService` to `validators.ts`, `index.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **What connects `TokenPayload`, `AuthModalProps`, `CuratedCatalogProps` to the rest of the system?**
  _133 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08272859216255443 - nodes in this community are weakly interconnected._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07474600870827286 - nodes in this community are weakly interconnected._
- **Should `YouTubeService` be split into smaller, more focused modules?**
  _Cohesion score 0.09191919191919191 - nodes in this community are weakly interconnected._