# ZIPSTREAM PRODUCTION HARDENING — CHANGELOG & SAFE CHANGE STRATEGY

**Branch:** `production-hardening`  
**Base Commit / Branch:** `main`  
**Strategy:** Wrap existing functionality, preserve all working algorithms and user flows, add defensive validation, distributed rate limiting, cryptographic room authorization, and clean SEO structured data.

---

## 1. BACKUP & ROLLBACK STRATEGY

1. **Git Isolation:**
   - Active branch: `production-hardening`.
   - In case of critical regression:
     ```bash
     git checkout main
     # or discard branch changes
     git checkout main && git branch -D production-hardening
     ```
2. **Atomic Verification:**
   - After each subsystem modification:
     - Run `npm run lint` or `tsc --noEmit`
     - Run `npm test`
     - Run `npm run build`
     - Run `tsx scripts/test_compression_engine.ts` (Compression regression gate)
3. **Environment Safety:**
   - No production secrets committed.
   - All server environment variables validated with default safe fallbacks.

---

## 2. PLANNED FILE MODIFICATIONS & RISK ASSESSMENT

| File | Reason for Change | Expected Behavior | Risk Level | Rollback Approach | Tests Required |
|---|---|---|---|---|---|
| `server/config/env.ts` (NEW) | Centralized, validated environment configuration | Validate required and optional variables on boot, enforce production defaults without leaking secrets | Low | Delete file / revert import | Unit tests for config validator |
| `server/security/cors.ts` (NEW) | Harden CORS policy against arbitrary origins | Restrict CORS origins to `zipstream.online` in production; allow dev hosts in dev | Low | Allow fallback to previous origins | CORS preflight & origin test |
| `server/security/rateLimiter.ts` (NEW) | Redis-backed distributed rate limiter with memory fallback | Tiered rate limits (General API, Uploads, Compression, AI, P2P Rooms) | Medium | Fallback to in-memory window | Rate limiter unit & abuse test |
| `server/security/p2pAuth.ts` (NEW) | Cryptographic capability token for P2P rooms | Require secret token for room document upload/download; prevent unauthorized access | Medium | Maintain optional token fallback if legacy client | P2P room authorization test |
| `server/security/validation.ts` (NEW) | File path safety, magic byte verification, upload safety | Sanitize filenames against path traversal (`../`, absolute paths), verify headers | Low | Pass-through valid files | Path traversal & magic byte test |
| `server/security/orphanCleanup.ts` (NEW) | Background cleanup for stale temp directories | Periodically remove orphaned `zipstream-*` directories older than 2 hours | Low | Disable interval timer | Unit test for orphan cleanup |
| `server.ts` | Wire in env, CORS, security headers, rate limiting, room token checks, graceful shutdown, and ready check | Harden HTTP & WebSocket server without changing business logic | Medium | Revert via Git `git checkout HEAD -- server.ts` | Server health, readiness, integration test |
| `server/ai/sarvamRouter.ts` | Connect Redis rate limiting and input length limits | Prevent Sarvam AI cost overrun and abuse | Low | Revert to previous in-memory limiter | AI rate limit test |
| `server/ai/aiOrchestrator.ts` | Enforce timeout and cost limit safeguards | Standardize timeout and error handling | Low | Revert to previous handler | AI orchestrator test |
| `index.html` | Remove fake review schema, fix LocalBusiness schema to Organization, correct privacy claims | Accurate SEO structured data, zero Google manual action risk | Low | Revert HTML tags | Schema validator & SEO test |
| `src/utils/analytics.ts` | Fix TypeScript error on `import.meta.env` | Clean type-check on `npm run lint` | Very Low | Revert change | `npm run lint` passes |
| `src/components/views/CollaborateToolsView.tsx` | Propagate room capability token in share links and API requests | Seamless P2P sharing with cryptographically authorized document sync | Medium | Keep backward-compatible parameter parsing | P2P end-to-end sync test |
| `Dockerfile` | Switch container runtime to non-root user | Run Node.js as `node` user with safe directory permissions | Low | Revert Dockerfile | Docker build test |
| `scripts/verify_security.ts` | Expand security script to scan for all secret patterns | Comprehensive pre-deployment secret scan | Low | Revert script | Run script directly |
