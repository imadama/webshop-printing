# Coolify deploy — Popify

Status na de bootstrap-sessie: alle resources staan klaar, env vars gezet, GitHub deploy key gekoppeld. Je hoeft alleen nog 3 dingen handmatig in te stellen voordat je voor het eerst kunt deployen.

## Resources op Coolify

Project **Popify** (UUID `ewckgs0c4go808wwgo8go8sw`) op de localhost server.

| Resource | UUID | Type | Status |
| --- | --- | --- | --- |
| popify-postgres | `z0wg4k0sg48koc80skkcgs0c` | Postgres 16 | running |
| popify-redis | `a8woswwc4gk4w4c0404gkg8k` | Redis 7 | running |
| popify-minio | `oo0owc8sg0ogc844wcc4wwk8` | MinIO service | created (deploy needed) |
| popify-backend | `xk88gkswckw4kg808s8o0sgc` | Application | created (deploy needed) |
| popify-storefront | `gggkscg4gs8cc8osoccsossw` | Application | created (deploy needed) |

## Wat je nog moet doen

### 1. DNS-records in Cloudflare voor `popify.nl`

Voeg deze A-records toe in Cloudflare:

| Type | Name | Content | Proxy |
| --- | --- | --- | --- |
| A | `@` (popify.nl) | `185.96.45.63` | DNS only (grijze wolk) |
| A | `www` | `185.96.45.63` | DNS only |
| A | `app` | `185.96.45.63` | DNS only |
| A | `files` | `185.96.45.63` | DNS only |

**Belangrijk**: zet de Cloudflare proxy uit (DNS only / grijze wolk), anders breekt de Let's Encrypt DNS-challenge die Traefik gebruikt — dezelfde opzet als bij `energx.nl`.

### 2. Dockerfile-locatie instellen per app (Coolify UI)

Coolify weet nog niet waar de Dockerfiles staan in de monorepo. Doe dit in de UI:

**popify-backend**:
1. Open de app in Coolify → tabblad **Configuration → Build**
2. Bij *Dockerfile Location* → vul in: `/apps/backend/Dockerfile`
3. Bij *Base Directory* → laat staan: `/`
4. Save

**popify-storefront**:
1. Open de app in Coolify → tabblad **Configuration → Build**
2. Bij *Dockerfile Location* → vul in: `/apps/storefront/Dockerfile`
3. Bij *Base Directory* → laat staan: `/`
4. Save

### 3. MinIO custom domain `files.popify.nl`

De MinIO service heeft nu een tijdelijke sslip.io domain. Wijs hem toe aan `files.popify.nl`:

1. Open de **popify-minio** service in Coolify
2. Onder *Domains* (of *Magic env vars*) — zet de FQDN voor port 9000 (de S3 API):
   `https://files.popify.nl`
3. Save → de service genereert nieuwe Traefik labels

(Je kunt later ook de MinIO console (`SERVICE_FQDN_MINIO_CONSOLE_9001`) op een eigen subdomein zetten zoals `console.files.popify.nl`, optioneel.)

## Deploy-volgorde (eerste keer)

Volg deze volgorde — backend MOET als eerste live, want hij genereert de publishable key die de storefront nodig heeft tijdens de build.

```
1. DNS records aan         (stap 1 hierboven)
2. Dockerfile locations    (stap 2)
3. MinIO domain            (stap 3)
4. Deploy MinIO            (Coolify UI → popify-minio → Deploy)
5. Deploy backend          (Coolify UI → popify-backend → Deploy)
   ↳ run migrations + seed in admin
   ↳ create admin user via Coolify terminal:
     `pnpm exec medusa user --email <jij>@popify.nl --password <kies>`
   ↳ Pak de publishable key:
     SSH → in postgres container:
     `psql -U medusa -d medusa -t -c "SELECT token FROM api_key WHERE type='publishable';"`
6. Update storefront env var
   NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY = <key uit stap 5>
7. Deploy storefront
8. Update Mollie webhook URL in dashboard:
   https://app.popify.nl/store/payment/mollie/webhook
```

## Productie-secrets

Alle secrets zijn al ingesteld als env vars op de Coolify-apps en lokaal opgeslagen in `.secrets.local` (gitignored). Backup deze file ergens veilig.

## Hercaptcha / migrations bij elke deploy

Het backend Dockerfile draait `medusa db:migrate` automatisch bij elke container start, dus nieuwe migraties komen vanzelf mee bij een redeploy.

## Live → switch Mollie naar production

Als je live gaat:
1. Mollie dashboard → vraag live API key op (`live_xxxxx`)
2. Update env var `MOLLIE_API_KEY` op de backend → redeploy
3. Update Mollie webhook URL als nodig
