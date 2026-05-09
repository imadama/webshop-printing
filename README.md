# Webshop 3D Printing

Medusa.js v2 webshop voor een 3D printing business. Naast een normale e-commerce shop voor eigen ontwerpen kunnen klanten zelf STL/3MF bestanden uploaden en automatisch een prijs krijgen op basis van gewicht × tarief.

**Stack:** Medusa v2 (Node 20) · Next.js 15 storefront · Postgres 16 · Redis 7 · MinIO (S3) · Mollie payments · SMTP email · Coolify deploy.

## Repo-structuur

```
webshop-printing/
├── apps/
│   ├── backend/          # Medusa v2 backend + admin
│   └── storefront/       # Next.js Starter storefront
├── docker-compose.yml    # Lokale dev: postgres, redis, minio
├── .env.example          # Referentie voor alle env vars
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

## Lokale setup

Vereisten: **Node 20**, **pnpm 10**, **Docker Desktop**.

```bash
# 1. Install dependencies (root + alle workspaces)
pnpm install

# 2. Start Postgres, Redis en MinIO
pnpm infra:up

# 3. Run database migrations en seed default data
cd apps/backend
pnpm exec medusa db:migrate
pnpm seed   # eerste keer; maakt Region met EUR aan
cd ../..

# 4. Maak een admin gebruiker
cd apps/backend
pnpm exec medusa user --email admin@example.com --password change-me
cd ../..

# 5. Start backend + storefront
pnpm dev
```

Daarna:
- Admin: <http://localhost:9000/app> — log in met je admin gebruiker
- Storefront: <http://localhost:8000>
- MinIO console: <http://localhost:9101> — login `minioadmin` / `minioadmin`

### Eerste publishable key

Na de eerste backend-start, ga in het admin naar **Settings → Publishable API Keys**, maak een key aan, kopieer hem en zet hem in `apps/storefront/.env.local`:

```
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_xxx...
```

Restart de storefront daarna.

## Scripts (root)

| Script                | Doel                                  |
| --------------------- | ------------------------------------- |
| `pnpm dev`            | Backend + storefront tegelijk         |
| `pnpm backend:dev`    | Alleen backend (admin op `:9000/app`) |
| `pnpm storefront:dev` | Alleen storefront op `:8000`          |
| `pnpm infra:up`       | Postgres + Redis + MinIO via Docker   |
| `pnpm infra:down`     | Stop containers                       |
| `pnpm infra:logs`     | Tail container logs                   |
| `pnpm build`          | Productie-build van alle apps         |

## Roadmap

- **Fase 1 (huidig)** — voorraadshop met Mollie checkout en SMTP mail
- **Fase 2** — STL/3MF upload + auto-prijs flow
- **Fase 3** — B2B met BTW-verlegging + custom print queue admin
