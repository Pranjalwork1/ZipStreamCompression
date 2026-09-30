# ZipStream Scalability Architecture & Sizing Guide

This document specifies the horizontal and vertical scaling architecture for ZipStream.online, including workload concurrency, Redis coordination, worker sizing, and memory management.

---

## 1. System Scaling Overview

```text
                                Internet
                                   │
                           Cloudflare CDN / WAF
                        (Edge Caching, DDoS Filter)
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
          https://zipstream.online       wss://zipstream.online
                    │                             │
          Express API Cluster (N Instances)   Socket.IO Relay Cluster
          - Dynamic SSR Meta Injection        - WebRTC Signaling
          - Rate Limiting (Redis-backed)      - Bandwidth-Throttled Relay
          - Authentication & Validation       - 256-bit Token Validation
                    │                             │
                    └──────────────┬──────────────┘
                                   │
                         Redis Cluster / Sentinel
                         - Sliding Window Rate Limits
                         - BullMQ Job Queues
                         - Room State & Capability Tokens
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
             PDF Worker Pool               Office/Media Worker Pool
             (Ghostscript & Sharp)         (LibreOffice & FFmpeg)
             - Concurrency: 4 / Core       - Concurrency: 2 / Core
             - Max Memory: 1.5GB / Worker  - Max Memory: 2GB / Worker
             - Ephemeral Temp Volumes      - Ephemeral Temp Volumes
```

---

## 2. Resource & Concurrency Profiles

| Subsystem | Primary Bottleneck | Max Safe Concurrency (per 4-core, 8GB Node) | Worker / Thread Model | Memory Overhead Target |
| :--- | :--- | :--- | :--- | :--- |
| **API Web Tier** | Event Loop / Network I/O | 2,500 req/sec | Node.js Cluster (PM2 or Kubernetes) | ~150 MB RSS per process |
| **Ghostscript PDF Engine** | CPU & Disk I/O | 8 concurrent jobs | BullMQ Workers with `execFile` | 250 MB – 800 MB per job |
| **In-Stream PDF Optimizer** | CPU & Heap Memory | 12 concurrent jobs | Thread Pool / Async I/O | 100 MB – 400 MB per job |
| **LibreOffice Engine** | RAM & Process Startup | 4 concurrent conversions | Dedicated LibreOffice Worker | 500 MB – 1.2 GB per instance |
| **AI Reverse Proxy** | Upstream Provider Quota | 50 concurrent requests | Async HTTP client (non-blocking) | < 50 MB RSS |
| **Socket.IO & P2P Signaling** | Socket descriptors & Network | 10,000 concurrent sockets | Redis Adapter for multi-node | 30 KB per connected socket |
| **P2P Relay Fallback** | Outbound Bandwidth | 50 concurrent relay rooms | Streamed chunks (128 KB limit) | Capped at 500 MB total per room |

---

## 3. Redis Requirements & Topology

- **Minimum Version:** Redis 6.2+ or 7.x
- **Configuration Recommendations:**
  - `maxmemory-policy: volatile-lru`
  - Persistence: RDB snapshots every 15 minutes (AOF optional, as jobs and rate-limits are ephemeral)
  - Dedicated connection pools:
    - Connection 1: BullMQ Queue Manager (`pdf-jobs`, `office-jobs`)
    - Connection 2: Rate Limiter (`ioredis` client with key prefix `zl:`)
    - Connection 3: Socket.IO Redis Adapter
- **Memory Footprint:**
  - Rate limiting (100,000 active IPs): ~25 MB RAM
  - BullMQ Queue state (10,000 jobs in buffer): ~40 MB RAM
  - P2P active room metadata (1,000 concurrent rooms): ~15 MB RAM
  - Total Redis RAM sizing: **256 MB minimum, 1 GB recommended**.

---

## 4. Storage Architecture & Ephemeral File Lifecycle

1. **Client-Side Processing (Default):**
   - 28 out of 35 tools execute 100% on-device in WebAssembly / HTML5 Canvas.
   - **Zero server storage consumption.**

2. **Server-Assisted Processing:**
   - Temporary uploads land in isolated directories: `/tmp/zipstream-<random-uuid>/`
   - Files are processed strictly via streamed or localized file descriptors.
   - **Immediate Deletion:** Files are unlinked in `try ... finally` blocks immediately after the response stream completes or the worker finishes.
   - **Orphan Sweeper Daemon:** A background scheduler scans `/tmp/zipstream-*` every 60 minutes and sweeps any directory older than 120 minutes.

---

## 5. Horizontal Scaling Strategy

### Web Tier (Stateless)
- Horizontal scale via container replicas (Kubernetes Deployment or AWS ECS).
- Auto-scaling metric: Average CPU utilization > 70% or average latency > 250ms.
- Health endpoints:
  - `/api/health`: Lightweight HTTP 200 liveness probe.
  - `/api/ready`: Readiness probe verifying Redis connectivity, worker state, and configuration.

### Worker Tier (Independent Scaling)
- Separate worker containers from API web containers in high-traffic deployments:
  - `npm run start:server` runs the web API and socket signaling.
  - `npm run start:worker` runs the BullMQ background job processor.
- BullMQ worker scaling triggered by queue backlog depth (`queue.getWaitingCount() > 20`).

---

## 6. Recommended Production Infrastructure

| Scale Tier | Concurrent Active Users | Web API Nodes | Worker Nodes | Redis Tier | Monthly Est. |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Starter / MVP** | Up to 500 | 1 × (2 vCPU, 4GB RAM) | Unified with API | 256MB Redis Cloud Free/Basic | ~$15 - $30 |
| **Growth Production** | 500 – 5,000 | 2 × (2 vCPU, 4GB RAM) | 2 × (4 vCPU, 8GB RAM) | 1GB Managed Redis | ~$80 - $150 |
| **Enterprise / Peak** | 5,000 – 50,000+ | 4 × (4 vCPU, 8GB RAM) | 6 × (8 vCPU, 16GB RAM) | Multi-AZ High-Availability Redis | ~$300 - $600 |
