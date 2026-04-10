# Nomatic OS — Full Product Specification
### AI Agency Operating System for Deepak | Nomatic AI
**Version:** 1.0 — Phase 1  
**Stack:** React + Vite + TailwindCSS + SQLite (via better-sqlite3) + Express.js backend  
**Runs:** Fully local on system. No cloud dependencies.

---

## 1. PROJECT OVERVIEW

Build a full-stack web application called **Nomatic OS** — a personal agency operating system for a digital marketing agency founder. It replaces tools like Notion, Trello, and spreadsheets with one unified app to manage clients, tasks, and daily workflow.

The app runs locally (localhost) with a React frontend and an Express backend using SQLite as the local database. All data is stored in a local `.db` file on the machine.

---

## 2. TECH STACK

### Frontend
- **React 18** with **Vite**
- **TailwindCSS v3** for styling
- **React Router v6** for navigation
- **Axios** for API calls
- **Google Fonts:** `Syne` (headings) + `DM Sans` (body) — import via index.html

### Backend
- **Node.js + Express.js**
- **better-sqlite3** for local SQLite database
- **cors** middleware
- **nodemon** for dev server auto-reload

### Database
- SQLite file stored at `./database/nomatic.db`
- Managed via `better-sqlite3` (synchronous, no async needed)

### Project Structure
```
nomatic-os/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── ClientAvatar.jsx
│   │   │   ├── MultiSelect.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── EODModal.jsx
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Clients.jsx
│   │   │   └── Tasks.jsx
│   │   ├── hooks/
│   │   │   └── useTheme.js
│   │   ├── lib/
│   │   │   ├── api.js          # Axios instance + all API calls
│   │   │   └── claude.js       # Claude API helper
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
├── server/
│   ├── index.js               # Express entry point
│   ├── db.js                  # SQLite setup + schema
│   └── routes/
│       ├── clients.js
│       └── tasks.js
├── database/
│   └── .gitkeep               # nomatic.db created here on first run
├── package.json               # Root package with scripts
└── README.md
```

---

## 3. SETUP & RUN INSTRUCTIONS (include in README.md)

```bash
# Install all dependencies
npm install
cd client && npm install && cd ..

# Run both frontend and backend together
npm run dev

# Frontend runs on: http://localhost:5173
# Backend API runs on: http://localhost:3001
```

Root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon server/index.js",
    "client": "cd client && npm run dev"
  }
}
```

---

## 4. DATABASE SCHEMA (SQLite)

Run these on first boot inside `server/db.js`:

```sql
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  payout INTEGER DEFAULT 0,
  website TEXT,
  location TEXT,
  services TEXT,         -- JSON array stored as string
  checklist TEXT,        -- JSON array stored as string
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  client_name TEXT,
  title TEXT NOT NULL,
  date TEXT NOT NULL,    -- YYYY-MM-DD format
  status TEXT DEFAULT 'To Do',
  category TEXT DEFAULT 'General',
  source TEXT DEFAULT 'manual',   -- 'manual' or 'ai'
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);
```

---

## 5. BACKEND API ROUTES

### Base URL: `http://localhost:3001/api`

#### Clients

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/clients` | Get all clients |
| POST | `/clients` | Create a new client |
| GET | `/clients/:id` | Get single client |
| PUT | `/clients/:id` | Update client (incl. checklist) |
| DELETE | `/clients/:id` | Delete client + cascade tasks |

**POST /clients body:**
```json
{
  "id": "uuid",
  "name": "Client Name",
  "company": "Company Name",
  "payout": 25000,
  "website": "https://example.com",
  "location": "Bengaluru, India",
  "services": ["Social Media Marketing (SMM)", "SEO"],
  "checklist": [
    { "id": "uuid", "label": "Meta Business Suite", "granted": false, "note": "" }
  ]
}
```

#### Tasks

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/tasks` | Get all tasks (supports ?client_id=&status=&date=) |
| POST | `/tasks` | Create a single task |
| POST | `/tasks/bulk` | Create multiple tasks (for AI plan) |
| PUT | `/tasks/:id` | Update task |
| DELETE | `/tasks/:id` | Delete task |

**GET /tasks query params:** `?client_id=xxx&status=In Progress&date=2026-04-02`

---

## 6. FRONTEND PAGES & COMPONENTS

---

### 6.1 THEME SYSTEM

The app supports **Dark Mode** (default) and **Light Mode** with a toggle button always visible in the sidebar footer.

**Implementation:**
- Use a `useTheme` hook that stores preference in `localStorage` with key `nomatic_theme`
- Toggle adds/removes `class="dark"` on the `<html>` element
- Use Tailwind's `dark:` variant for all color classes
- The toggle button shows a Sun icon (☀️) in dark mode and Moon icon (🌙) in light mode

**Color Tokens — Dark Mode:**
```
Background primary:   #080c14
Background surface:   #0d1320
Background card:      #111827
Background input:     #1a2236
Border default:       #1e2d45
Border hover:         #253550
Text primary:         #e2e8f0
Text secondary:       #94a3b8
Text muted:           #64748b
Accent (gold):        #f59e0b
Blue:                 #3b82f6
Green:                #22c55e
Red:                  #ef4444
Purple:               #a855f7
```

**Color Tokens — Light Mode:**
```
Background primary:   #f8fafc
Background surface:   #ffffff
Background card:      #f1f5f9
Background input:     #ffffff
Border default:       #e2e8f0
Border hover:         #cbd5e1
Text primary:         #0f172a
Text secondary:       #475569
Text muted:           #94a3b8
Accent (gold):        #d97706
Blue:                 #2563eb
Green:                #16a34a
Red:                  #dc2626
Purple:               #9333ea
```

**Tailwind config (tailwind.config.js):**
```js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        head: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        accent: { DEFAULT: '#f59e0b', light: '#d97706' },
        surface: {
          dark: '#0d1320',
          light: '#ffffff',
        }
      }
    }
  }
}
```

---

### 6.2 SIDEBAR

**Always visible** fixed left sidebar (220px wide).

**Contains:**
- Logo at top: "**Nomatic** OS" — "Nomatic" in amber/accent color, "OS" in default text color. Subtitle: "Agency Operating System" in muted small text.
- Nav items (icon + label): Dashboard, Clients, Tasks
- Bottom section: quick stats (X clients · X open tasks)
- **Theme Toggle Button** at the very bottom of the sidebar above the stats. Shows Sun icon when in dark mode (click to go light), Moon icon when in light mode (click to go dark). Style: ghost button with border, full width.

**Nav item active state:** amber background tint with amber text and amber left border.

---

### 6.3 DASHBOARD PAGE

**Route:** `/`

**Header:** "Good [morning/afternoon/evening], Deepak 👋" with today's full date below it. A "View All Tasks →" ghost button on the right.

**Stats Row (4 cards):**
1. Total Clients — accent color value
2. Today's Tasks — blue value
3. Completed Today — green value
4. Pending Today — red value

**Two-column grid below stats:**

**Left card — Today's Tasks:**
- Lists tasks where `date === today`
- Each row: checkbox (clicking toggles Done/To Do) + task title + client name in accent color + status badge
- Empty state if no tasks

**Right card — Active Clients:**
- Lists all clients with avatar, name, company, payout per month
- Show open task count per client
- Empty state if no clients

---

### 6.4 CLIENTS PAGE

**Route:** `/clients`

**Header:** "Clients" + "Add Client" primary button

**Search bar** (max-width 340px) to filter by name or company.

**Client Cards Grid** (auto-fill, min 320px):

Each card shows:
- Client avatar (colored initials circle — color derived from first char of name)
- Name (heading font, bold) + company (muted)
- Monthly payout (accent/gold, top right)
- Service chips (show first 3, then "+N more")
- Onboarding checklist progress bar with percentage
- Task count
- Two action buttons: "Generate Plan" (ghost with zap icon) + Delete (danger icon button)
- Clicking the card opens the View Client modal

**Add Client Modal:**
Form fields:
1. Client Name (required)
2. Company Name
3. Monthly Payout (₹) — number input
4. Location
5. Website URL
6. Services Opted For — **multi-select dropdown** with checkboxes

**Services list:**
- Social Media Marketing (SMM)
- Search Engine Optimization (SEO)
- Performance Marketing
- Website Development
- Branding
- Graphic Design
- Email Marketing
- Content Marketing
- LinkedIn Marketing

After selecting services, show a **preview box** listing the auto-generated checklist items (first 5 + "X more").

On save: generate checklist from selected services (see logic in Section 7), create client via POST `/api/clients`.

**View Client Modal (large):**
- Avatar + name + company + location header
- 3 mini stat cards: Payout / Total Tasks / Services count
- Website link (clickable)
- Services chips
- Full onboarding checklist with progress bar
  - Each checklist item has a checkbox (click to toggle granted/not granted)
  - Toggling calls PUT `/api/clients/:id` with updated checklist
- Footer: "Generate Monthly Plan" button

**Generate Monthly Plan Modal:**
- Shows client name in header
- Info box: "AI will create a day-wise task plan based on your goal"
- Month picker (input type="month")
- Monthly Goal textarea (required) — e.g. "Grow Instagram to 5K, generate 50 leads"
- Shows selected services as read-only chips
- On submit: calls Claude API (see Section 8), saves tasks via POST `/api/tasks/bulk`
- Loading state with spinner while AI generates
- Error state if API fails

---

### 6.5 TASKS PAGE

**Route:** `/tasks`

**Header:** "Tasks" + View toggle (Table/Kanban tabs) + "Add Task" button

**Filter Bar:**
- Client dropdown (All Clients + each client)
- Status dropdown (All + To Do / In Progress / Done / Blocked)
- Date picker
- Clear Filters button (shown when any filter active)
- Task count on the right

#### Table View

Columns: Date | Client | Task | Category | Status | Actions

- Date: formatted as "02 Apr 2026"
- Client: colored avatar + name
- Task: task title. If `source === 'ai'` show "⚡ AI generated" label below in purple
- Category: amber chip
- Status: colored badge — click to cycle to next status (To Do → In Progress → Done → Blocked → To Do)
- Actions: Edit button + Delete (trash) button

Sorted by date ascending by default.

#### Kanban View

4 columns: To Do | In Progress | Done | Blocked

Each column:
- Header: status name in its color + count badge
- Task cards with: client name (accent), task title, date, edit + delete icon buttons

#### Add/Edit Task Modal

Fields:
1. Client (dropdown — required)
2. Task description (textarea — required)
3. Date (date picker)
4. Status (dropdown)

---

### 6.6 EOD (END OF DAY) BUTTON

**Fixed position:** bottom-right corner, always visible across all pages.

**Style:** Rounded pill button with gradient (amber → orange), shadow glow, "🌙 Finish the Day" text with sun icon.

**On click:** Opens EOD Modal.

**EOD Modal:**

Shows:
- Header: "🌙 End of Day Report"
- 3 stat cards: Total Today / Completed (green) / Pending (red)
- Completed tasks list (with client name)
- Pending tasks list (with client name)
- Tomorrow's tasks preview (up to 5, then "+X more")
- "Send Report" button

**Send Report action:**
- Composes a plain-text email report
- Uses Claude API to simulate/log the send to `nomaticai1@gmail.com`
- Shows success or error message
- In a future version this will use a real email API (Resend/Nodemailer)

---

## 7. CHECKLIST GENERATION LOGIC

When a client is added with services, auto-generate their onboarding checklist by mapping services to required accesses:

```js
const SERVICE_ACCESSES = {
  "Social Media Marketing (SMM)": [
    "Meta Business Suite",
    "Facebook Page Admin",
    "Instagram Account",
    "LinkedIn Page",
    "Twitter/X Account"
  ],
  "Search Engine Optimization (SEO)": [
    "Google Analytics (GA4)",
    "Google Search Console",
    "Google Tag Manager",
    "Website Admin (CMS)",
    "Screaming Frog / Semrush Access"
  ],
  "Performance Marketing": [
    "Google Ads Account",
    "Meta Ads Manager",
    "Google Analytics (GA4)",
    "Google Tag Manager",
    "Google Merchant Center"
  ],
  "Website Development": [
    "Website Admin Access",
    "Hosting cPanel / FTP",
    "Domain Registrar Access",
    "GitHub / GitLab Repository",
    "Staging Environment URL"
  ],
  "Branding": [
    "Brand Asset Drive / Folder",
    "Previous Brand Guidelines",
    "Canva Account (if any)"
  ],
  "Graphic Design": [
    "Brand Asset Drive / Folder",
    "Canva Account (if any)",
    "Adobe Creative Cloud (if any)"
  ],
  "Email Marketing": [
    "Email Platform (Klaviyo/Mailchimp/etc.)",
    "Domain DNS Access",
    "Google Analytics (GA4)"
  ],
  "Content Marketing": [
    "Blog / CMS Admin Access",
    "Google Analytics (GA4)",
    "Google Search Console",
    "Brand Asset Drive"
  ],
  "LinkedIn Marketing": [
    "LinkedIn Page Admin",
    "LinkedIn Ads Account",
    "Meta Business Suite (if cross-posting)"
  ]
};
```

**Deduplication rule:** If two services require the same access (e.g. GA4 appears in SEO + Performance Marketing), add it only once to the checklist.

Each checklist item shape:
```json
{
  "id": "unique-uuid",
  "label": "Google Analytics (GA4)",
  "granted": false,
  "note": ""
}
```

---

## 8. CLAUDE AI INTEGRATION

### Setup
```js
// client/src/lib/claude.js
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-20250514';

export async function callClaude(userPrompt, systemPrompt) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt || 'Return only valid JSON. No markdown, no explanation.',
      messages: [{ role: 'user', content: userPrompt }]
    })
  });
  const data = await response.json();
  const text = data.content?.map(b => b.text || '').join('') || '';
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
```

> **Note for builder:** The Claude API key should be entered by the user in a Settings page or via `.env` file as `VITE_CLAUDE_API_KEY`. Do not hardcode any key.

### AI Monthly Plan Generation

**Trigger:** User sets a goal in the Generate Monthly Plan modal and clicks "Generate with AI"

**Prompt template:**
```
Generate a monthly marketing task plan for:
Client: {client.name} ({client.company})
Services: {services.join(', ')}
Monthly Goal: {goal}
Month: {YYYY-MM} ({totalDays} days in month)

Return a JSON array of tasks. Each task: 
{ "title": string, "dayOfMonth": number (1-{totalDays}), "category": string }

Rules:
- Generate 2-4 tasks per week spread across the month
- Tasks must be specific and actionable (not generic)
- Match tasks to the services and goal
- Working days only (Monday–Saturday)
- Return ONLY the JSON array, no other text
```

**On success:** Map each returned task to a full task object and POST to `/api/tasks/bulk`

---

## 9. COMPONENT DETAILS

### ClientAvatar
- Circle with colored background derived from first character of name
- Shows first 2 letters uppercase
- Color palette (pick by `name.charCodeAt(0) % 7`):
  `['#f59e0b', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#06b6d4', '#f97316']`

### StatusBadge
Colors per status:
```js
const STATUS_COLORS = {
  'To Do':       { bg: '#1e293b', text: '#94a3b8', border: '#334155' },
  'In Progress': { bg: '#1e3a5f', text: '#60a5fa', border: '#2563eb' },
  'Done':        { bg: '#14532d', text: '#4ade80', border: '#16a34a' },
  'Blocked':     { bg: '#450a0a', text: '#f87171', border: '#dc2626' },
};
// Light mode: use softer versions of same colors (increase bg lightness)
```

### MultiSelect
- Custom dropdown that allows selecting multiple services
- Selected items shown as dismissable tag chips inside the input
- Options show a checkbox next to each item
- Clicking outside closes dropdown

### ThemeToggle
```jsx
// In sidebar footer
<button onClick={toggleTheme}>
  {isDark ? <SunIcon /> : <MoonIcon />}
  {isDark ? 'Light Mode' : 'Dark Mode'}
</button>
```

---

## 10. UI DESIGN TOKENS

### Typography
```css
/* Headings */
font-family: 'Syne', sans-serif;
font-weight: 700 or 800;

/* Body */  
font-family: 'DM Sans', sans-serif;
font-weight: 400 or 500;
```

### Spacing & Radius
- Border radius cards: 14px
- Border radius inputs/buttons: 10px
- Border radius small (badges): 20px (pill)
- Page padding: 28px 32px
- Card padding: 20px 24px
- Gap between grid cards: 16px

### Sidebar
- Width: 220px
- Fixed/sticky left
- Same height as viewport

### Buttons
- **Primary:** amber background `#f59e0b`, black text, font-weight 600
- **Ghost:** transparent, border, secondary text color
- **Danger:** red tint background, red text, red border

### Animations
- Card hover: border color transition 200ms + subtle box shadow
- Button active: scale(0.97)
- Checklist checkbox: background + border transition 150ms
- EOD button: translateY(-2px) on hover + shadow glow
- Progress bar fill: width transition 400ms ease

---

## 11. EMPTY STATES

Every list/grid should have a friendly empty state when no data exists:

- **No Clients:** Icon 👥 + "No clients yet" + "Add your first client to get started" + Add Client button
- **No Tasks:** Icon 🎯 + "No tasks yet" + description based on filter state
- **Today No Tasks:** "Nothing scheduled for today. Have a great day! 🎉"

---

## 12. ERROR HANDLING

- All API calls wrapped in try/catch
- API errors shown as red inline error messages inside modals (not toast popups)
- Claude API failure: show message "AI generation failed. Check your API key and try again."
- Network errors: show "Could not connect to server. Make sure the backend is running on port 3001."
- Empty required fields: highlight input border in red, show inline validation message

---

## 13. SETTINGS PAGE (OPTIONAL — Phase 1.5)

Simple settings page accessible from sidebar bottom:

- **Claude API Key** — password input, saved to localStorage as `nomatic_claude_key`
- **Your Name** — default "Deepak", used in dashboard greeting
- **EOD Email** — default `nomaticai1@gmail.com`
- **Default Currency Symbol** — default ₹

---

## 14. FUTURE PHASES (DO NOT BUILD NOW — for reference)

### Phase 2 — Financials
- Invoices: create, send, track payment status
- Monthly revenue tracker
- Expense logging
- P&L overview per client

### Phase 3 — Proposals & Contracts
- Proposal builder (drag-drop sections)
- E-sign contract module
- Proposal status tracking (Draft → Sent → Viewed → Signed)

### Phase 4 — Communication (Superhuman-style)
- Unified inbox connected to Gmail API
- AI-drafted reply suggestions
- Keyboard shortcuts for every action
- Snooze, follow-up reminders
- Thread-based view per client

### Phase 5 — Reporting
- Monthly client performance reports
- Auto-generated slides/PDF
- Task completion analytics
- Time tracking per client

---

## 15. PACKAGE.JSON DEPENDENCIES

### Root
```json
{
  "dependencies": {
    "concurrently": "^8.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

### Server
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "better-sqlite3": "^9.0.0",
    "cors": "^2.8.5",
    "uuid": "^9.0.0"
  }
}
```

### Client
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 16. VITE CONFIG

```js
// client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
```

---

## 17. KEY BEHAVIOURS SUMMARY

| Feature | Behaviour |
|---|---|
| Client add | Auto-generates checklist from services selected |
| Checklist toggle | Saves to DB via PUT /api/clients/:id immediately |
| AI plan generate | Calls Claude API → bulk inserts tasks to DB |
| Task status click | Cycles: To Do → In Progress → Done → Blocked → To Do |
| Finish the Day | Shows EOD report + sends email summary |
| Theme toggle | Persists in localStorage, applies dark/light Tailwind class |
| Delete client | Cascades to delete all their tasks (DB foreign key) |
| Data persistence | All data in local SQLite file at ./database/nomatic.db |
| Filters | Client + Status + Date filters work together (AND logic) |
| Kanban | Drag-and-drop is NOT required in Phase 1. Click-to-cycle status is enough. |

---

## 18. WHAT TO BUILD — STEP BY STEP FOR AI BUILDER

1. Scaffold the project with the folder structure above
2. Set up Express server with SQLite (server/index.js + server/db.js) — create tables on first run
3. Create all API routes (clients CRUD + tasks CRUD + bulk create)
4. Set up React + Vite + Tailwind client
5. Implement useTheme hook + dark/light mode toggle
6. Build Sidebar component with nav + theme toggle
7. Build reusable components: ClientAvatar, MultiSelect, Modal, StatusBadge, EODModal
8. Build Dashboard page
9. Build Clients page with Add/View/Generate Plan modals
10. Build Tasks page with Table + Kanban views
11. Wire EOD button and modal
12. Connect all frontend calls to backend API via axios
13. Implement Claude AI integration for monthly plan generation
14. Add empty states and error handling everywhere
15. Test full flow: Add client → Generate checklist → Set goal → Generate AI plan → View tasks → Finish the Day

---

*Built for Deepak | Nomatic AI | nomaticai1@gmail.com*  
*Phase 1 of Nomatic OS — Agency Operating System*
