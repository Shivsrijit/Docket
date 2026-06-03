# Docket Frontend - Developer's Guide

This directory contains the single-page React client application built with Vite. It implements the user interface for note-taking, folder organization, authentication, and the real-time notification sidebar drawer.

---

## Directory Structure

- `src/components/`: Reusable interface components.
  - `NotificationHub.jsx`: The central floating notification bell and sliding drawer panel containing all persona conversation channels.
  - `NoteCard.jsx` & `FolderCard.jsx`: Interactive card items supporting drag-and-drop actions.
  - `RateLimitedUI.jsx`: Adaptive layout displayed when backend requests trigger HTTP 429 rate limit bounds.
- `src/pages/`: Page routing structures.
  - `AuthPage.jsx`: Sliding split-panel registration and login interface.
  - `HomePage.jsx`: The primary workspace dashboard managing sidebar filters and note collections.
  - `CreatePage.jsx` & `NoteDetailPage.jsx`: Notion-style rich-text editing canvases.
- `src/lib/axios.js`: Injected API client instance. Injects the `x-client-time` header dynamically on every request to pass the browser's exact localized clock string to the backend.
- `public/`: Static assets.
  - `favicon.svg`: Customized Docket icon (outline letter D with brand coral dot).

---

## Technical Features

### 1. HTML5 Notification Permission Flow
The client automatically requests native OS notification access on dashboard load and whenever the floating bell is clicked. If granted, the application delivers background system tray alerts even when the browser window is out of focus.

### 2. Timezone Normalization
To prevent server timezone offsets from scheduling notifications at incorrect times, the frontend sends the local date string (`new Date().toString()`) inside the `x-client-time` header. The backend parses this header to evaluate relative durations relative to the user's local clock.

### 3. Event-Driven UI Synchronization
The poller query checks the server for due alerts every 30 seconds. However, to bypass this delay for interactive actions (such as saving notes, creating folders, or submitting replies), the UI triggers a custom window event (`docket-refresh-notifications`) to refresh the notification history timeline instantly.

---

## Configuration

Create a `.env` file in the `frontend` root:

```env
VITE_API_URL=http://localhost:5001/api
```

---

## Commands

### Development Server
Launches the Vite dev server with Hot Module Replacement (HMR):
```bash
npm run dev
```

### Production Build
Checks compilation parameters and compiles output into the static `dist` folder:
```bash
npm run build
```

### Code Formatting / Linting
```bash
npm run lint
```
