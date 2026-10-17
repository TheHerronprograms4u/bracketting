# ARENA — Dynamic Tournament Bracketing Platform

> **"Every Match Matters."**

ARENA is a tournament bracketing platform designed for esports events, gaming competitions, and sports leagues.

Unlike traditional bracketing software that forces organizers into rigid 8, 16, 32, or 64-team presets, ARENA operates on a **dynamic-first principle**: **users determine the participants; the application calculates the bracket.**

---

## ⚡ Key Highlights & Core Capabilities

- **Truly Dynamic Participant Counts:** Supports any eligible count ($N \ge 2$, e.g., 2, 3, 5, 7, 9, 13, 20, 27, 50, 100+).
- **Exact Mathematical Bracket Engine:** Automatically calculates logical bracket capacity $S = 2^{\lceil \log_2(N) \rceil}$, round counts, and bye allocations. The number of actual competitive matches to determine a champion is strictly $N - 1$.
- **Transparent Bye Allocation:** Byes advance top seeds automatically into Round 2 without fake opponents, fake scores, or elimination animations.
- **Signature Cinematic Winner-Crushing-Loser Animation:** When a match is decided, a full-screen overlay triggers where the winner's card surges forward and crushes the defeated competitor's card into geometric digital shards, accompanied by a procedural Web Audio API bass-and-crystal impact sound and a bold victory announcement. Includes an instant **Skip** button (`ESC`) and a sound mute toggle.
- **Interactive Bracket Canvas:** Horizontally organized elimination tree with responsive cubic-bezier SVG connector lines, zoom in/out, fit-to-screen, and round-by-round mobile navigation.
- **Safe Result Correction & Recalculation:** Organizers can correct prior results with explicit confirmation. Downstream matches that depended on the old winner are safely reset so no invalid state persists.
- **Championship Finale:** When the final match is won, a gold/violet championship coronation modal reveals the champion with trophy artwork, celebratory confetti particles, and JSON/CSV export tools.
- **Roster & Bulk Participant Entry:** Add competitors individually, inline-edit participant display names without breaking internal IDs or match links, or paste multiline rosters with real-time validation and duplicate detection.
- **Dual-Layer Persistence:** Works completely out of the box with zero external configuration via persistent local storage, and connects cleanly to PostgreSQL through Supabase when environment variables are supplied.

---

## 📐 Mathematical Bracket Architecture

Let $N$ be the number of confirmed participants ($N \ge 2$):

1. **Logical Bracket Capacity:**
   $$S = 2^{\lceil \log_2(N) \rceil}$$
2. **Total Elimination Rounds:**
   $$R = \lceil \log_2(N) \rceil = \log_2(S)$$
3. **Bye Allocation:**
   $$B = S - N$$
4. **Competitive Matches Required to Crown 1 Champion:**
   $$\text{Matches} = N - 1$$

### Verification Matrix

| Registered ($N$) | Logical Capacity ($S$) | Byes ($B = S - N$) | Rounds ($R$) | Competitive Matches ($N - 1$) |
|:---:|:---:|:---:|:---:|:---:|
| **2** | 2 | 0 | 1 | 1 |
| **3** | 4 | 1 | 2 | 2 |
| **5** | 8 | 3 | 3 | 4 |
| **7** | 8 | 1 | 3 | 6 |
| **8** | 8 | 0 | 3 | 7 |
| **13** | 16 | 3 | 4 | 12 |
| **20** | 32 | 12 | 5 | 19 |
| **27** | 32 | 5 | 5 | 26 |
| **50** | 64 | 14 | 6 | 49 |
| **100** | 128 | 28 | 7 | 99 |

---

## 🛠 Technology Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS with custom dark esports palette (`#0B0B0F`, `#111116`, `#17171F`, `#292932`, `#8B5CF6`, `#A78BFA`)
- **Animation:** Framer Motion (`framer-motion`) & `canvas-confetti`
- **Audio:** Web Audio API procedural synthesizer (zero external mp3 assets)
- **Database / Backend:** Dual-layer: Browser Persistent Storage + Supabase PostgreSQL schema with Row-Level Security
- **Icons:** Lucide React
- **Testing:** Vitest

---

## 🚀 Quickstart & Setup

### 1. Install Dependencies
```bash
npm install --legacy-peer-deps
```

### 2. Run Automated Test Suite
To verify the bracket calculations, progression logic, boundary conditions, and bye handling:
```bash
npm test
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Optional Supabase Cloud Integration
To connect a remote PostgreSQL Supabase database:
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Fill in your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Execute the SQL migration script located in `supabase/schema.sql` in the Supabase SQL editor.

---

## 🧪 Testing Verification

The project includes 30 automated test cases in `src/lib/__tests__/`:
- Tests all benchmark sizes: 0, 1, 2, 3, 5, 7, 8, 9, 13, 20, 27, 50, 100
- Tests powers of two, odd numbers, and boundary counts (15, 17, 31, 33, 63, 65, 127, 129)
- Simulates complete multi-round tournament tournaments from Round 1 to Championship
- Verifies downstream match invalidation when results are corrected
