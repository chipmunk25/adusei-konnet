```markdown
# adusei-konnet

Monorepo scaffold for a WebRTC chat + voice + video platform.

Stack (initial):

- SFU: LiveKit (self-hosted)
- Signaling / API: Bun 1.3 (TypeScript)
- Frontend: React + TypeScript + Tailwind 4
- DB: Postgres + Drizzle ORM
- TURN: coturn
- Dev / single-host infra: Docker Compose + Traefik for TLS

Guiding principles:

- Strict TypeScript typing. No uses of `any`.
- Start with Docker Compose for single-server self-hosting; later migration to Kubernetes is possible.
- Use host networking for LiveKit and coturn on single-server for best UDP performance (recommended).

Contents:

- server/ — Bun 1.3 signaling and API (TypeScript)
- web/ — React + TypeScript + Tailwind 4 frontend
- infra/ — docker-compose and service config
- .github/ — CI checks (TypeScript typecheck)

How to run locally (dev):

1. Install Bun 1.3 (https://bun.sh).
2. From repo root:
   - Start Postgres & Redis: `docker compose -f infra/docker-compose.yml up -d postgres redis`
   - Start Bun server (dev): `cd server && bun install && bun run dev`
   - Start frontend: `cd web && bun install && bun run dev`

Notes:

- This scaffold is the minimal safe starting point. Next steps: implement auth, Drizzle migrations, signaling message handling, and frontend hooks to use WebRTC + LiveKit when ready.
- For production on a single server, use the infra/docker-compose.yml (read infra/README.md for details).
```
