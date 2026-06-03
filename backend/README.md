# Docket Backend - Developer's Guide

This directory houses the backend Express API server for Docket. It coordinates user authentication, note processing, category management, rate-limiting, and the background AI scheduling loops powered by the Google Gemini API.

---

## Technical Architecture & Directory Structure

```text
backend/
├── src/
│   ├── config/             # Environment connection instances
│   │   ├── db.js           # Mongoose MongoDB connector
│   │   └── upstash.js      # Upstash Redis rate-limiter instance
│   │
│   ├── controllers/        # Route action logic
│   │   ├── authController.js        # Signup, login, and Google OAuth decoding
│   │   ├── foldersController.js     # Category management & color indicators
│   │   ├── notesController.js       # Notion-style note CRUD & debounce triggers
│   │   └── notificationController.js# Notification logs, unread status, & replies
│   │
│   ├── middleware/         # Request interceptors
│   │   ├── authMiddleware.js        # Session verification & JWT decoding
│   │   └── rateLimiter.js           # IP-partitioned sliding window regulator
│   │
│   ├── models/             # Mongoose schemas & data types
│   │   ├── Folder.js       # Note category mappings
│   │   ├── Note.js         # Text, colors, folders, and pins
│   │   ├── Notification.js # Alarms, statuses, personas, and dialogue history
│   │   └── User.js         # Credentials, Google ID, avatars, and hooks
│   │
│   ├── routes/             # Express API endpoint maps
│   │   ├── authRoutes.js
│   │   ├── foldersRoutes.js
│   │   ├── notesRoutes.js
│   │   └── notificationRoutes.js
│   │
│   ├── services/           # Natural language processing services
│   │   └── aiService.js    # Gemini prompts, debouncing timers, & fallback regex
│   │
│   ├── workers/            # Independent system tasks
│   │   └── notificationWorker.js    # Background DB poller for due alarms
│   │
│   └── server.js           # Application entry point & service coordinator
```

---

## Authentication & Security Specifications

### 1. Token-Based Sessions (JWT)
All protected routes require client requests to send a JWT bearer token in the `Authorization` header.
* **Token Signatures**: Signed using `jsonwebtoken` with the server's `JWT_SECRET` (auto-generated as a 64-byte random hex string in production if not explicitly configured in `.env`). Tokens expire in 7 days.
* **Session Verification Middleware**: `authMiddleware.js` extracts the header, decodes the token signature, fetches the corresponding user from the database (masking the password field), and binds the profile to `req.user`. All downstream controllers query database operations relative to `req.user._id` for isolation.

### 2. Google OAuth Integration
* **Token Decoding**: The `/api/auth/google` route accepts the client-side Google JWT token in the `credential` payload body. The backend decodes this token natively via `jwt.decode()` to retrieve the verified profile details: `email`, `name`, `sub` (Google user ID), and `picture`.
* **Profile Synchronization**:
  - If a user with that email exists but has no `googleId`, the system links the Google ID and updates the profile avatar.
  - If no user exists, it creates a new record.
  - Upon successful verification or registration, it auto-provisions two default folders ("Personal" and "Ideas") for the user and generates a standard Docket JWT to authenticate subsequent client sessions.

### 3. IP-Partitioned Sliding Window Rate Limiting (Upstash Redis)
To protect server resources and maintain system availability, Docket integrates a serverless Redis rate-limiting middleware:
* **Infrastructure**: Connects to **Upstash Redis** using `@upstash/redis` and `@upstash/ratelimit`. Upstash Redis runs queries over REST/HTTP instead of maintaining persistent TCP sockets. This enables stateless, lightweight hosting on Render/Vercel with low connection overhead and zero pool exhaustion issues.
* **Algorithmic Flow**: 
  1. The client sends a request. The middleware `rateLimiter.js` extracts the client's IP address by querying `req.headers['x-forwarded-for']` (supporting reverse proxy chaining) or falling back to `req.socket.remoteAddress`.
  2. The middleware calls `@upstash/ratelimit`'s sliding window function using the key format `ratelimit:<client_ip>`.
  3. Upstash Redis increments the count within the current sliding window. It evaluates if the request exceeds **30 requests per 10 seconds** per IP address.
  4. If the rate limit is exceeded, Upstash returns `success: false`. The middleware immediately blocks the request and returns an HTTP `429 Too Many Requests` status code with the JSON payload `{ "message": "Too many requests, please try again after some time!" }`.
  5. The client captures this HTTP 429 status code and displays the cooldown overlay timer.

### 4. NoSQL Injection Prevention
* **Schema Casting**: Mongoose schemas cast input variables strictly to defined types (e.g. `String`, `Boolean`). Object-based queries targeting parameters are flattened to string matches, preventing attackers from injecting Mongo search operations (like `{ "$gt": "" }`).

---

## Database Schemas & Models

### User Schema (`User.js`)
Stores user profiles and credentials.
* `name` (String, required): Display name.
* `email` (String, required, unique, lowercase, trimmed): Authentication email.
* `password` (String, required if standard registration): Bcrypt-hashed credentials.
* `googleId` (String, default: ""): Google account identifier.
* `avatar` (String): Profile picture link.
* **Presave Hook**: Intercepts modifications to password fields and hashes them with `bcryptjs` using a salt work factor of 10.
* **Methods**: `matchPassword(enteredPassword)` compares typed passwords with the hashed database password.

### Note Schema (`Note.js`)
Stores the rich-text notes and workspace attributes.
* `title` (String, required): Note header.
* `content` (String, required): Notion-style note text.
* `color` (String, default: "#FDB851"): UI background hex color token.
* `isPinned` (Boolean, default: false): Sticky status at the top of the board.
* `folder` (String, default: ""): Name of the assigned folder.
* `user` (ObjectId, ref: "User", required): Owner constraint.

### Folder Schema (`Folder.js`)
Stores note categories.
* `name` (String, required): Category name.
* `color` (String, default: "#B386FF"): Visual color identifier.
* `user` (ObjectId, ref: "User", required): Owner constraint.
* **Indexes**: A compound unique index `{ name: 1, user: 1 }` guarantees that category names are unique per user while allowing identical names across different user accounts.

### Notification Schema (`Notification.js`)
Manages scheduled alarms and AI dialogue logs.
* `user` (ObjectId, ref: "User", required): Target user constraint.
* `note` (ObjectId, ref: "Note", default: null): Linked source note.
* `message` (String, required): Text content of the notification.
* `persona` (String, required): The assigned AI assistant persona.
* `scheduledAt` (Date, required): UTC timestamp when the notification triggers.
* `status` (String, enum: `["pending", "sent", "replied"]`, default: `"pending"`): Current state.
* `quickReplies` (Array of Strings, default: `["Yes", "No"]`): Dynamic choices for client button selection.
* `userResponse` (String, default: ""): Text replies submitted by the client.
* `isRead` (Boolean, default: false): Unread indicator.
* **Indexes**: A compound index `{ status: 1, scheduledAt: 1 }` optimizes the background worker poller queries.

---

## Controllers & API Routes

### 1. Auth (`authController.js` -> `/api/auth`)
* `POST /signup`: Registers new profiles, hashes passwords, provisions default folders, and returns a JWT token.
* `POST /login`: Validates standard credentials and returns a session token.
* `POST /google`: Validates Google OAuth client credential tokens, logs in, or registers accounts.
* `GET /me`: Returns profile details of the currently authenticated session (using JWT verification middleware).

### 2. Notes (`notesController.js` -> `/api/notes`)
* `GET /`: Retrieves all notes owned by the session.
* `POST /`: Saves new note records and triggers the AI analysis.
* `PUT /:id`: Updates a note's text or properties and re-schedules pending notifications if changes are detected.
* `DELETE /:id`: Removes a note and deletes its associated pending notifications.

### 3. Folders (`foldersController.js` -> `/api/folders`)
* `GET /`: Retrieves all folders owned by the session.
* `POST /`: Creates custom category folders.
* `DELETE /:id`: Deletes folder records and resets matching notes to have `folder: ""`.

### 4. Notifications (`notificationController.js` -> `/api/notifications`)
* `GET /`: Returns the historical log of sent or replied notifications (capped at the recent 30 entries).
* `GET /due`: Background endpoint polled by the client to fetch pending notifications that are due. Marks items as read.
* `POST /:id/reply`: Accepts user responses and schedules immediate AI dialogue responses.
* `DELETE /clear`: Purges the notification log history.

---

## Error Handling, Status Codes, & Debugging

The backend uses a structured pattern for monitoring and error dispatching:
* **Controller Wrappers**: All controller methods are enclosed in `try-catch` blocks.
* **System Logging**: When an exception occurs (e.g. database disconnect, Gemini API timeout), the catch-block logs the full stack trace and error message directly to the server logs via `console.error("Context error:", error.message)`. This provides deep debugging visibility.
* **Masked Client Responses**: Standardized JSON responses are sent to the client to avoid leaking schema paths or model configuration variables:
  - `400 Bad Request`: Validation failures (e.g. invalid emails, name length mismatches, password strength failures).
  - `401 Unauthorized`: Returned when authentication checks fail (e.g., missing bearer headers, expired JWTs, invalid passwords).
  - `404 Not Found`: Triggered if a database request yields no results, or if the user tries to mutate a resource owned by another session.
  - `429 Too Many Requests`: Exceeding Upstash Redis rate limiter bounds.
  - `500 Internal Server Error`: Generic catch-all message sent to the client while the server log maintains the developer-facing trace.

---

## Configuration & Setup

1. Copy env variables into `backend/.env`:
   ```env
   PORT=5001
   MONGO_URI=mongodb+srv://...
   GEMINI_API_KEY=AIzaSy...
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   JWT_SECRET=your_jwt_secret_here
   ```
2. Start Dev server:
   ```bash
   npm run dev
   ```
3. Start Prod server:
   ```bash
   npm run start
   ```
