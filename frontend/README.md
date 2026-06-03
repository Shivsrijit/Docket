# Docket Frontend - Developer's Guide

This directory houses the React single-page application (SPA) client for Docket, powered by Vite. It contains the Notion-style canvas editor, folder organization sidebar, credentials panel, and the real-time notification drawer.

---

## Directory Structure & Components

```text
frontend/
├── public/                 # Static assets
│   ├── favicon.svg         # Stylized D and coral dot brand icon
│   └── icons.svg           # Sprite vector files
│
├── src/
│   ├── components/         # Reusable UI layout elements
│   │   ├── ColorPaletteSelector.jsx   # Note card color chooser
│   │   ├── FolderCard.jsx             # Category cards with drop targets
│   │   ├── Navbar.jsx                 # Dashboard header & session control
│   │   ├── NoteCard.jsx               # Text cards with pin & delete buttons
│   │   ├── NotesNotFound.jsx          # Zero-state empty views
│   │   ├── NotificationHub.jsx        # Float bell & sliding AI drawer
│   │   └── RateLimitedUI.jsx          # Overlay for HTTP 429 errors
│   │
│   ├── lib/                # Shared utilities and configurations
│   │   ├── axios.js        # Custom Axios client with time headers
│   │   └── utils.js        # Helper functions
│   │
│   ├── pages/              # Primary route views
│   │   ├── AuthPage.jsx            # Sliding login and registration card
│   │   ├── CreatePage.jsx          # Notion-style new note editor
│   │   ├── HomePage.jsx            # Main dashboard and folder filter view
│   │   └── NoteDetailPage.jsx      # Note viewer and modifier canvas
│   │
│   ├── App.css             # Component custom transitions & style rules
│   ├── App.jsx             # Core router and session manager
│   ├── index.css           # Global Tailwind and font definitions
│   └── main.jsx            # React root renderer
│
├── postcss.config.js       # CSS post-processors
├── tailwind.config.js      # Utility-first utility layout overrides
├── vercel.json             # Vercel SPA routing redirects
└── vite.config.js          # Vite configurations
```

---

## Authentication & Form Validation Specifications

Docket enforces strict validation rules on the frontend to ensure database sanitization and clean user inputs before making API requests:

### 1. Registration Field Verification
* **Email Address**: Tested against `emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` to ensure syntactical validity.
* **Full Name**: Cannot be blank, must be at least 2 characters long, and is limited strictly to letters, spaces, and hyphens (`nameRegex = /^[a-zA-Z\s\-]+$/`).
* **Password Complexity**: Evaluated against four security conditions:
  - Must be at least 8 characters in length.
  - Contains at least one uppercase letter (`/[A-Z]/`).
  - Contains at least one lowercase letter (`/[a-z]/`).
  - Contains at least one number (`/[0-9]/`).
  - Contains at least one special character from the set `@$!%*?&#` (`/[@$!%*?&#]/`).

### 2. Login Field Verification
* Ensures both email and password inputs are present and formatted correctly before dispatching authorization requests.

### 3. Google OAuth 2.0 Client Flow
* **Script Integration**: Loads Google Identity Services asynchronously via a script tag inside `index.html`.
* **Initialization**: Inside `AuthPage.jsx`, reads `import.meta.env.VITE_GOOGLE_CLIENT_ID` to configure `window.google.accounts.id.initialize`.
* **Custom UI Button Rendering**: Draws Google's official Sign-In button within the `#real-google-btn` container using `window.google.accounts.id.renderButton`, adjusting visual parameters automatically based on whether the dark or light theme is active.
* **Callback Interception**: The verification callback captures the user's encoded JWT credentials and forwards them directly to the backend endpoint `/auth/google` to obtain a session token.

---

## UI Design & Styling System (TailwindCSS & DaisyUI)

The user interface leverages **TailwindCSS** for atomic utility styling and **DaisyUI** for premium, pre-built component abstractions, styled in a cohesive monochromatic layout:

### 1. Monochromatic Theme Palette
* **Light Theme**: Dominated by soft slates (`#F8FAFC`) and clean whites (`#FFFFFF`).
* **Dark Theme**: Incorporates deep slate-blacks (`#09090B` and `#0E0E10`) with dark border grids (`#1E1E24`).
* **Brand Accent**: Utilizes a warm coral highlight (`#FF9E79` / `#FF8A5B`) to draw focus to interactive dots, unread bells, and typing indicators.

### 2. Component Abstractions (DaisyUI)
* **Drawer Panels**: The `NotificationHub.jsx` utilizes DaisyUI's drawer structure to implement the slide-out AI timeline conversation pane.
* **Tabs**: Used in the sidebar drawer to filter between distinct assistant channels (Doctor, Companion, Secretary, Friend, Teacher).
* **Toggle Switches & Theme Selectors**: The theme toggler injects either the `"light"` or `"dark"` values into the `data-theme` attribute on the global `<html>` element, which DaisyUI automatically registers to flip core component palettes.
* **Inputs & Cards**: Text editing forms, folder creation boxes, and note cards leverage DaisyUI utility states (e.g. `input-bordered`, `card-compact`) with custom Tailwind utility extensions to enforce standard border radii and hover scale animations.

---

## Routing & SPA Configurations

* **Client-Side Router**: Manages routing paths dynamically using React Router Dom's routing components.
* **Authentication Guard**: Directs route access dynamically. If the user session is active (validated by a token stored in `localStorage`), the client mounts the dashboard views (`/`, `/create`, `/note/:id`); if the token is missing or invalid, the client automatically redirects the browser back to `/auth`.
* **Vercel SPA Path Redirects**: To prevent 404 errors when users refresh client-side routed paths in production, the [vercel.json](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Documents/Projects/notes_app/frontend/vercel.json) file redirects all requests back to `/index.html`:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

---

## Error Handling, Notifications, & Limit Overlays

* **Toast Feedback Alerts**: Uses `react-hot-toast` to render visual status boxes for all form submissions, note saves, folder mutations, and API failures.
* **API Error Capture**: Intercepts Axios responses. In the event of backend validation failures (HTTP 400) or authorization denials (HTTP 401), the frontend extracts the specific `{ message }` payload returned by the API and alerts the user on-screen.
* **429 Rate Limiting Overlay**: If request frequencies exceed Upstash Redis limits, the server returns an HTTP 429 status code. The Axios client intercepts this code and triggers an application-wide state shift, displaying the [RateLimitedUI.jsx](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Documents/Projects/notes_app/frontend/src/components/RateLimitedUI.jsx) glassmorphic block panel. This panel suspends further requests and displays a cooldown timer to protect backend services.

---

## UI Themes & Configurations

* **Light/Dark Modes**: Manages theme transitions dynamically using React state, writing the custom `data-theme` attribute directly onto the HTML tag. Colors adapt automatically using Tailwind and DaisyUI tokens.
* **Base URL Resolution**: Resolves the backend endpoint in [axios.js](file:///c:/Users/SSN/OneDrive%20-%20Shiv%20Nadar%20University%20-%20Chennai/Documents/Projects/notes_app/frontend/src/lib/axios.js) using the `VITE_API_URL` environment variable:
  ```javascript
  const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api");
  ```

---

## Commands

### Development Server
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Code Quality Check
```bash
npm run lint
```
