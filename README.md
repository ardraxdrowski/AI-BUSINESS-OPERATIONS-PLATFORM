# DareXAI Operations - Multi-Tenant AI CRM & Unified Inbox

DareXAI is a modern, dark-themed, multi-tenant B2B CRM and Operational AI Agent platform. Built using Next.js 14+ (App Router), Tailwind CSS, Prisma, SQLite (zero-config Fallback), jose (JWT signing/rotation), and the Google Gemini API.

---

## Quick Start (Zero-Config Local Run)

Get the application running locally in less than 2 minutes.

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the template file to `.env`:
```bash
cp .env.example .env
```
The application runs out-of-the-box in **Simulated Mock Mode** using heuristics and simulated EventStreams if no third-party keys are added! If you want real AI tool-calling, provide your Gemini API key in `.env`:
```env
JWT_SECRET=some_long_random_jwt_secret_key_minimum_32_chars
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Initialize SQLite Database & Seed Data
Generate Prisma Client types, push the schema, and pre-populate the database with realistic demo threads, deals, tasks, and audit logs:
```bash
npx prisma db push
npx prisma db seed
```

### 4. Run the Test Suite
Execute the Vitest integration test suite verifying Authentication, Tenant Isolation (A vs B), AI Tool Calling schema compliance, and Frontend components:
```bash
npm test
```

### 5. Launch Developer Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Security & Tenant Isolation Architecture

Strict tenant isolation is the core engineering foundation of DareXAI:

1. **Anti-Spoofing Identity Middleware (`src/middleware.ts`)**:
   * Intercepts all incoming requests.
   * Instantly strips any client-provided identity headers (`x-user-id`, `x-tenant-id`, `x-user-role`, `x-user-email`, `x-user-name`) to prevent header injection.
   * Decodes and verifies the secure, HTTP-only JWT `auth_access_token` cookie.
   * Re-injects validated identity headers downstream for routes to consume.
2. **Access Token Rotation (refresh tokens)**:
   * Tokens expire in 15 minutes.
   * A silent `/api/auth/refresh` endpoint exchanges a single-use refresh token from cookies, rotates the token family, and transparently updates session headers.
3. **Developer Bypass Endpoint (`/api/auth/bypass`)**:
   * Gated both on the UI and **strictly enforced on the server-side**.
   * Rejects requests with a `403 Forbidden` if Google OAuth credentials (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) are present in `.env`, ensuring it is only active in local zero-config environments.
4. **Data-Layer Isolation & Parameterization**:
   * All database queries utilize Prisma (generating fully parameterized queries, neutralizing SQL Injection).
   * **Cross-Tenant Validation**: Endpoints (e.g. creating opportunities or scheduling tasks linked to a contact) explicitly verify that the contact belongs to the active tenant in the database before proceeding, preventing ID spoofing.
5. **Immutable Audit Ledger (`src/lib/audit.ts`)**:
   * Scoped strictly by tenant ID.
   * Permanently writes actions (`action`, `targetType`, `targetId`, `metadata`) for every state-altering change or AI-triggered pipeline.

---

##  Database Architecture (SQLite-as-Demo / Postgres-as-Production)

To ensure a frictionless local setup, DareXAI uses **SQLite** by default. However, the database schema and query layers are designed provider-agnostically for **PostgreSQL** in production environments.

### Transitioning to PostgreSQL in Production:
1. **Prisma Provider Update**: Edit `prisma/schema.prisma` to point to PostgreSQL:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. **Environment Variable Configuration**: Change the connection string in your production `.env` file:
   ```env
   DATABASE_URL="postgresql://db_user:db_password@db_host:5432/darex_db?sslmode=require"
   ```
3. **Database Migration**: Push the tables to the PostgreSQL target:
   ```bash
   npx prisma db push
   ```

---

##  Offline Evaluation & Mock Fallback Patterns

To guarantee 100% demo capability in zero-config offline sandboxes, the system implements standard fallback engines:

1. **Gemini AI Intent Parser Fallback**:
   * If `GEMINI_API_KEY` is omitted, the `/api/chat` route shifts to a rule-based regex intent matcher.
   * It simulates identical database actions (creates opportunities, fetches metrics, queries contacts) and streams responses word-by-word using a custom server-side timer, mimicking native streaming.
2. **Mock WhatsApp API Dispatcher**:
   * WhatsApp tool actions write directly to the database message ledger and timeline under `channel: "whatsapp"`. This presents a fully populated timeline in the Unified Inbox without requiring live API keys.
3. **Multi-Channel Ingestion Simulator**:
   * The simulator allows testing of inbound **WhatsApp, Email, and Phone Call** event payloads, executing the identical intent/sentiment pipelines.

---

## Conversational AI Agent (Gemini Function Calling)

The AI Agent acts as an autonomous virtual employee:

* **Native Function-Calling**: Leverages Gemini’s native function calling schemas for 5 core tools:
  1. `search_contacts`: Query contact directories.
  2. `create_task`: Schedule follow-up action items.
  3. `update_opportunity`: Modify sales stages, values, or lead scores.
  4. `send_whatsapp`: Dispatch outbound client communications.
  5. `fetch_business_metrics`: Retrieve active dashboard pipeline statistics.
* **Server-Side Multi-Step Loop**: If the user makes a complex request (e.g., *"Follow up with Rahul tomorrow"*), the route executes a recursive resolution loop (up to 5 turns). It searches for Rahul, gets his contact ID, drafts and sends a WhatsApp message, schedules a reminder task for tomorrow, and logs the actions—all in a **single turn**!
* **Genuine Stream Reading**: Streams tokens token-by-token using Next.js `ReadableStream` (Server-Sent Events) after resolving all intermediate tool calls.
* **Explainability Guarantee**: Every action is accompanied by an explicit explainability suffix explaining why the AI executed the tool and what DB changes resulted, ensuring full transparency.
* **Heuristics Fallback**: If `GEMINI_API_KEY` is missing, a local rule-based intent parser mimics the exact database outcomes (writes, audit logging) and streams a simulated word-by-word EventStream so the app remains 100% testable.

---

##  Unified Inbox & Ingest Simulator

Located under **Conversations** (`/inbox`):

* **Timeline Aggregator**: Combines logs from WhatsApp (real API or mocked), Email (seeded), and Phone Calls (seeded) into a single chronological feed for each client.
* **AI Message Analysis**: Inbound messages are processed via Gemini (or heuristics fallback) to analyze:
  * **Sentiment**: positive, neutral, negative.
  * **Intent**: e.g., meeting request, pricing objection, support complaint.
  * **AI Summary**: A single-sentence summary of the message context.
  * **Recommended Next Action**: Suggested next steps.
* **Ingest Event Simulator**: A dedicated panel that lets you simulate incoming WhatsApps, Emails, or Phone Calls, triggering the exact same AI parsing pipeline and updating the layout, sentiment cards, and timeline in real-time.

---

## Workflow Automation (Lead Qualification)

Located under **Contacts** (`/contacts`) &rarr; **Simulate Lead Automation**:

1. **Lead Ingest (`/api/automation/qualify`)**: Takes a lead's name, email, budget, size, and notes.
2. **AI Lead Score**: Evaluates sales readiness on a scale of 0 to 100 based on budget and notes.
3. **Auto Opportunity**: Instantly spins up a matching pipeline opportunity containing the AI score.
4. **Threshold logic**:
   * **Score > 80**: Triggers an outbound WhatsApp alert (*" High-quality lead ingested..."*) and schedules an immediate followup task for tomorrow.
   * **Score <= 80**: Schedules a standard nurturing task for 3 days later.
5. **Immutable Ledger**: Records audit events for every step in the pipeline.

---

## Integration Test Coverage

The test suite resides in the `__tests__/` directory and is powered by Vitest:

1. **`auth-flow.test.ts`**: Verifies JWT access token creation, claims mapping, signature verification, and corruption rejection.
2. **`tenant-isolation.test.ts`**: Tests validation guards, ensuring cross-tenant queries return empty results when attempting to read data from a separate tenant.
3. **`ai-tool-calling.test.ts`**: Validates schema declarations for the 5 tools and checks that executors filter data strictly by tenant.
4. **`chat-component.test.tsx`**: Tests frontend React helper formatters that parse AI tool execution logs and display styled collapsible cards.

Run the test suite using `npm test`. All tests run locally without external credentials.
