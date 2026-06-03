# Docket Backend - Developer's Guide

This directory contains the Express API backend for Docket. It manages authentication boundaries, processes notes, handles conversational follow-ups via Gemini API integrations, and schedules background alerts.

---

## Directory Structure

- `src/config/`: Configuration templates.
  - `db.js`: Standard MongoDB database connector.
- `src/controllers/`: Route action handlers.
  - `notesController.js`: Manages note creations, edits, and deletion triggers.
  - `notificationController.js`: Handles history queries, read updates, and reply submissions.
  - `authController.js`: Directs registration and credential validation.
- `src/middleware/`: Middleware interceptors.
  - `authMiddleware.js`: Validates JWT session tokens and scopes request bounds to `req.user`.
  - `rateLimiter.js`: Protects backend endpoints using Upstash Redis-based rate limit rules.
- `src/models/`: Database schema configurations.
  - `User.js`, `Note.js`, `Folder.js`, and `Notification.js`.
- `src/routes/`: API endpoint maps.
- `src/services/`: System logic handlers.
  - `aiService.js`: Parses note text for emotional/schedule context, manages active debounces, prompts Gemini API, and structures scheduled alert models.
- `src/workers/`: Background routines.
  - `notificationWorker.js`: Running scheduled poll interval query loops to identify and trigger due notifications.

---

## Technical Workflows

### 1. Conditional Debounce Scheduler
When a note's content or title changes:
1. Existing pending notifications linked to the note are immediately purged.
2. The note is scanned by a regex-based helper `hasTimeIndicator` to look for explicit time keywords.
3. If a time reference is found, the system debounces the analysis for **10 seconds**. If the note is classified as purely emotional (with no time specified), the system debounces for **5 minutes**.
4. After the debounce delay, the Gemini API is called to perform the analysis.

### 2. Timezone Offset Alignment
The backend extracts timezone offsets from the client's `x-client-time` header (e.g. `GMT+0530` parses to `+05:30`).
When scheduled date-times are calculated locally by Gemini, the backend combines the local string with the user's offset string to create a standard, timezone-aware JavaScript Date object. This object is stored as UTC in MongoDB.

### 3. Background Notification worker
The notification worker runs a loop every 10 seconds. It queries the database for pending notifications where the `scheduledAt` timestamp is less than or equal to the current time, and marks them as sent. The client then fetches these due records during its next poll cycle.

---

## Configuration

Create a `.env` file in the `backend` root:

```env
MONGO_URI=mongodb+srv://...
PORT=5001
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
GEMINI_API_KEY=...
JWT_SECRET=your_jwt_secret_here
```

---

## Commands

### Start in Development Mode
Launches the server using nodemon for automatic file reload:
```bash
npm run dev
```

### Start in Production Mode
```bash
npm run start
```
