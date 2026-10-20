# SmartParking

A parking monorepo with a React Native client, a responsive operations/driver portal, and a MongoDB-backed API deployed together on Vercel.

## Applications

| Path                 | Purpose                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `apps/mobile`        | Original React Native 0.61 iOS/Android application, connected to the new API |
| `apps/admin`         | React + Vite administrator workspace and driver web portal                   |
| `apps/api`           | Express 5 + TypeScript API, authentication and transactional bookings        |
| `packages/contracts` | Shared API domain types                                                      |
| `api/index.ts`       | Vercel serverless entry point                                                |
| `scripts`            | Idempotent seed, admin invitation and role management                        |

Production portal: https://smartparking-weld.vercel.app — API health: https://smartparking-weld.vercel.app/api/health

## Requirements recovered from the old project

`master` contains account registration/login, Jaffa Street, six zones at distances 0, 280, 440, 680, 900 and 1050 meters, occupancy/distance display, and an unfinished Book button. The newer `R2` branch adds Firebase-backed prepaid balances, hourly reservations at 2 NIS/hour, arrival confirmation, renewal and booking history. Those flows now run through the server and MongoDB; clients cannot directly mutate balances or bookings.

The migration preserves the native source under `apps/mobile`, removes tracked Android build/Gradle cache output, and retains the original Jaffa map. Existing Git branches and history are preserved.

## Local development

Use Node 24 and npm. The maintained workspace includes API, web portal and shared contracts. The legacy native app installs independently to keep its React 16 / Metro toolchain isolated from React 19.

```sh
npm ci
cp .env.example .env.local
# Configure MONGODB_URI, MONGODB_DB and APP_ORIGIN in .env.local.
npm run db:seed
npm run dev
```

Open http://127.0.0.1:5173. The API listens on 127.0.0.1:3001 and Vite proxies `/api`. MongoDB **must support transactions**: use Atlas or a local replica set. The original code did not specify a city; the seed uses “Unspecified” so the administrator can set it. The seed inserts the original street and zones plus **48 sample spaces**, all initially available. It does not represent live street sensors and never resets existing records. Set `MONGODB_DB=smartparking_development` for an isolated local database.

```sh
npm test       # Real MongoDB replica-set integration tests in an isolated temporary DB
npm run build  # Type-check the API/portal/contracts/scripts and produce the portal bundle
```

The test runner downloads a MongoDB binary on first use. MongoDB is stopped and removed after tests. No production database is used by the tests.

## Accounts and administrators

Drivers can create accounts through the portal or native app. New accounts start with zero parking credit. An administrator adds credit with a required audit reason under **Drivers & credits**. This is an internal prepaid ledger; **no payment gateway or real payment collection is implemented**.

The initial administrator receives a private, email-bound setup link valid for 48 hours. The account remains reserved until that invitation is used; opening the link clears the token from browser history. The user chooses a password, and consuming the invitation and creating the account happen atomically. Never commit setup links or passwords.

Operators with database access can issue an invitation:

```sh
npx tsx --env-file=.env.local scripts/invite-admin.ts email@example.com https://smartparking-weld.vercel.app /absolute/private/setup.md
```

Or grant an existing registered account administrator access:

```sh
npm run admin:promote -- email@example.com
```

## Booking rules

- Reservations start immediately, for 1–24 integer hours. Each driver and each spot can have one active reservation.
- The zone rate is snapshotted at booking. Balances use integer cents. Booking, renewal, reservation locks and ledger entries share MongoDB transactions.
- Insufficient credit, occupied/archived spaces, and disabled streets/zones reject new bookings. Failed bookings do not charge the driver.
- Drivers confirm arrival, renew by 1–24 hours (up to 168 total), finish, or cancel their own reservations. Administrators can end any active reservation.
- Cancelling **before** arrival confirmation refunds the entire prepaid amount once. Confirmed or expired time is non-refundable. Physical occupancy is independent of a reservation; ending one does not falsely mark a physically occupied space free.
- Expired reservations complete and release their lock on availability/reservation reads, new bookings, renewals, confirmation and admin overview refresh. There is no scheduler dependency. The UI refreshes every 15 seconds; there are no push notifications or guaranteed background reminders.
- Streets, zones and spaces can be archived/restored. Existing reservations can still be completed. A reserved space cannot be archived; it can still have its physical occupancy corrected.
- Occupancy is manual admin input. Hardware/sensor ingestion, automatic alternative allocation, email verification/password reset, card payments and native notifications are not implemented.

## API

All endpoints return `{status:"success", ...}` or `{status:"failed", error}`. Authentication is required except register/login. Browser sessions use an HttpOnly, SameSite=Lax cookie (Secure in production). Native clients send the returned token as `Authorization: Bearer <token>`. Sessions expire after 7 days and are revoked on logout. Passwords use salted scrypt; only session-token hashes are stored. JSON-only mutation requests and an explicit `APP_ORIGIN` check protect cookie requests. Login/registration attempts are throttled per normalized email using database counters (20 per 15-minute bucket).

| Method     | Route                                 | Behavior                                           |
| ---------- | ------------------------------------- | -------------------------------------------------- |
| GET        | `/api/health`                         | Service and MongoDB readiness                      |
| POST       | `/api/auth/register`                  | Create driver or consume a valid admin invitation  |
| POST       | `/api/auth/login`, `/api/auth/logout` | Start/revoke session                               |
| GET        | `/api/auth/me`                        | Current user and credit balance                    |
| GET        | `/api/streets`                        | Enabled streets                                    |
| GET        | `/api/zones?streetId=UUID`            | Enabled zones                                      |
| GET        | `/api/spots?zoneId=UUID`              | Enabled spaces and availability                    |
| GET/POST   | `/api/reservations`                   | Own history / create `{spotId,vehiclePlate,hours}` |
| POST       | `/api/reservations/:id/confirm`       | Confirm arrival                                    |
| POST       | `/api/reservations/:id/renew`         | Extend with `{hours}`                              |
| POST       | `/api/reservations/:id/end`           | End with `{status:"completed"\|"cancelled"}`       |
| GET        | `/api/admin/overview`                 | Admin network, drivers and reservation history     |
| POST/PATCH | `/api/admin/streets[/:id]`            | Create/update/archive streets                      |
| POST/PATCH | `/api/admin/zones[/:id]`              | Create/update/archive zones and rates              |
| POST/PATCH | `/api/admin/spots[/:id]`              | Create/update/archive spots and occupancy          |
| POST       | `/api/admin/users/:id/credit`         | Add `{amountCents,reason}` to the audit ledger     |

History is limited to the latest 100 reservations per driver. Admin overview is capped at 1,000 records per collection; this starter is intended for a small parking network. Add pagination before expanding beyond this capacity. Roles are enforced on the server. Parent IDs cannot change after creation, preserving historical relationships.

## MongoDB collections

`users`, `sessions`, `authAttempts`, `streets`, `zones`, `spots`, `reservations`, `ledger`, `invitations`. Unique partial indexes on active reservation `spotId` and `userId` prevent double bookings. Session and throttle expiry use TTL indexes; reservation history is never TTL-deleted. Pool size is limited to 5 per Vercel instance. Index creation is idempotent and runs before API traffic and seeding.

## Native client

```sh
cd apps/mobile
npm ci
# iOS: install pods with the legacy project's supported Ruby/Xcode setup.
npm start
```

Configure `src/constants/ServerConstants.js` for your deployment. Screens now load streets/zones/spaces from the API, authenticate, book with credits, show history, confirm arrival, renew and cancel. The original React Native 0.61 toolchain is retained rather than silently upgrading platform projects. Its dependencies are legacy, and native binaries have not been built or simulator-tested during this migration. Existing AsyncStorage-based session persistence is retained; migrate tokens to Keychain/Keystore and upgrade React Native before distributing a new native release. API/portal tests do not certify the native toolchain. No simulator or emulator is launched.

## Vercel deployment

The single Vercel project serves the portal and `/api` under the same origin. `vercel.json` bundles the API as one function and builds `apps/admin/dist`. `.vercelignore` excludes native source and local secrets from deployment uploads.

Required environment variables: `MONGODB_URI` (Atlas integration), optional `MONGODB_DB` (defaults to `smartparking`), and `APP_ORIGIN` (exact portal origin). The deployed configuration isolates `smartparking`, `smartparking_preview`, and `smartparking_development` databases on the same Atlas cluster. Seed a nonproduction database explicitly before testing its parking UI. Preview cookie requests accept that deployment’s exact Vercel URL; custom preview domains must be added through `APP_ORIGIN`.

```sh
vercel link --project smartparking --scope YOUR_TEAM
vercel env pull .env.local --environment development --scope YOUR_TEAM
vercel deploy --prod --scope YOUR_TEAM
```

Atlas was provisioned on the FREE tier in Frankfurt through the existing Vercel Marketplace integration. Git-triggered production deployment should be enabled only after the monorepo branch is reviewed and merged. Until then production is deployed explicitly from this branch. Local `.env*`, `.vercel` state and setup links stay untracked.
