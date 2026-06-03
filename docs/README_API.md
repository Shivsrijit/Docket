# Docket - API Reference & Dependency Manual

This document provides the complete API specification, database configurations, and dependency listings for both the frontend client and backend server.

---

## 1. Authentication & Security Headers

### JWT Authorization
All protected routes require an `Authorization` header containing a JSON Web Token (JWT) as a Bearer token:
```http
Authorization: Bearer <jwt_token>
```

### Timezone Context Header
To sync date-time offsets between the client and server, requests should inject the local date string in the `x-client-time` header:
```http
x-client-time: Wed Jun 03 2026 02:47:18 GMT+0530 (India Standard Time)
```

### Rate Limiting
Endpoints are rate-limited via Upstash Redis. Limits allow **30 requests per 10 seconds** per client IP address. Exceeding this limit returns:
- Status Code: `429 Too Many Requests`
- Body: `{ "message": "Too many requests, please try again after some time!" }`

---

## 2. API Endpoint Specification

### System Health Routes

#### Server Health Check
- **Method**: `GET`
- **URL**: `/health` or `/api/health`
- **Description**: Returns the system status and current timestamp. This route bypasses rate limits to accommodate continuous status check pings.
- **Responses**:
  - `200 OK`:
    ```json
    {
      "status": "OK",
      "timestamp": "2026-06-03T09:15:00.000Z"
    }
    ```

### Authentication Routes

#### Sign Up User
- **Method**: `POST`
- **URL**: `/api/auth/signup`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "janedoe@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `201 Created`: Returns user object with session token.
  - `400 Bad Request`: If validation fails (e.g. invalid name characters, weak password, duplicate email).

#### Log In User
- **Method**: `POST`
- **URL**: `/api/auth/login`
- **Request Body**:
  ```json
  {
    "email": "janedoe@example.com",
    "password": "SecurePassword123!"
  }
  ```
- **Responses**:
  - `200 OK`: Returns authenticated user profile and token.
  - `401 Unauthorized`: Invalid credentials.

#### Google OAuth Authenticate
- **Method**: `POST`
- **URL**: `/api/auth/google`
- **Request Body**:
  ```json
  {
    "credential": "<Google_JWT_Id_Token>"
  }
  ```
- **Responses**:
  - `200 OK`: Decodes profile, creates user if first-time oauth login, returns user data and session token.

#### Get Current Session
- **Method**: `GET`
- **URL**: `/api/auth/me`
- **Headers**: Requires Bearer token.
- **Responses**:
  - `200 OK`: Returns profile of authenticated user.

---

### Notes Routes (Protected)

#### Fetch All Notes
- **Method**: `GET`
- **URL**: `/api/notes`
- **Responses**:
  - `200 OK`: Returns list of notes sorted by most recently modified.

#### Create Note
- **Method**: `POST`
- **URL**: `/api/notes`
- **Request Body**:
  ```json
  {
    "title": "Study Plan",
    "content": "Prepare for history exam tomorrow evening.",
    "color": "#B386FF",
    "isPinned": false,
    "folder": "Ideas"
  }
  ```
- **Responses**:
  - `201 Created`: Returns saved note object. Triggers asynchronous scheduler.

#### Update Note
- **Method**: `PUT`
- **URL**: `/api/notes/:id`
- **Request Body**: Same schema as Create Note.
- **Responses**:
  - `200 OK`: Returns updated note object. Triggers re-scheduling if text has changed.
  - `404 Not Found`: If note is not found or user is not authorized.

#### Delete Note
- **Method**: `DELETE`
- **URL**: `/api/notes/:id`
- **Responses**:
  - `200 OK`: Note deleted. Purges pending notifications associated with the note.

---

### Folder Categories Routes (Protected)

#### Fetch Folders
- **Method**: `GET`
- **URL**: `/api/folders`
- **Responses**:
  - `200 OK`: Returns list of folder structures.

#### Create Folder
- **Method**: `POST`
- **URL**: `/api/folders`
- **Request Body**:
  ```json
  {
    "name": "Ideas",
    "color": "#FDB851"
  }
  ```
- **Responses**:
  - `201 Created`: Returns created folder.
  - `400 Bad Request`: If folder name already exists for this user.

#### Delete Folder
- **Method**: `DELETE`
- **URL**: `/api/folders/:id`
- **Responses**:
  - `200 OK`: Folder deleted. Updates all notes in this folder to have `folder: ""`.

---

### Notification Hub Routes (Protected)

#### Fetch Notification History
- **Method**: `GET`
- **URL**: `/api/notifications`
- **Responses**:
  - `200 OK`: Returns recent 30 notifications with status `sent` or `replied`.

#### Fetch Due Notifications (Polling Endpoint)
- **Method**: `GET`
- **URL**: `/api/notifications/due`
- **Responses**:
  - `200 OK`: Returns array of unread notifications with status `sent` that are due for delivery. Marks them as read.

#### Submit Persona Reply
- **Method**: `POST`
- **URL**: `/api/notifications/:id/reply`
- **Request Body**:
  ```json
  {
    "response": "Yes, I will study now."
  }
  ```
- **Responses**:
  - `200 OK`: Updates record to `replied` and triggers follow-up dialogue generator.

#### Clear History
- **Method**: `DELETE`
- **URL**: `/api/notifications/clear`
- **Responses**:
  - `200 OK`: Purges notification log.

---

## 3. Database Indexes

To support database operations, the following indexes are applied:
- **`User` Schema**: `email: 1` (unique).
- **`Folder` Schema**: `name: 1, user: 1` (unique index per user).
- **`Notification` Schema**: `status: 1, scheduledAt: 1` (compound index to optimize the background worker queries).

---

## 4. Dependencies & Version Manifest

### Backend Project (`backend/package.json`)
- **Node Environment**: ES Modules (`"type": "module"`)
- **Dependencies**:
  - `@google/generative-ai` (`^0.24.1`): Invokes Gemini model operations.
  - `@upstash/ratelimit` (`^2.0.5`) & `@upstash/redis` (`^1.34.9`): Enforces IP-based sliding window rate-limiting.
  - `bcryptjs` (`^3.0.3`): Hashes and validates passwords.
  - `jsonwebtoken` (`^9.0.3`): Signs and decodes bearer token sessions.
  - `mongoose` (`^9.6.3`): Directs MongoDB connections and queries.
  - `express` (`^4.18.2`): Directs route configurations.
  - `cors` (`^2.8.5`): Manages cross-origin access lists.
  - `dotenv` (`^17.4.2`): Loads environment configuration.
- **Dev Dependencies**:
  - `nodemon` (`^3.1.14`): Refreshes process on code changes.

### Frontend Project (`frontend/package.json`)
- **Framework**: React 18 / Vite
- **Dependencies**:
  - `axios` (`^1.6.8`): Directs HTTP request configurations.
  - `lucide-react` (`^0.378.0`): Icon vector structures.
  - `react-hot-toast` (`^2.4.1`): Screen toast alerts.
  - `react-router-dom` (`^6.23.0`): URL path mappings.
- **Dev Dependencies**:
  - `@vitejs/plugin-react` (`^4.2.1`): Compiles React templates.
  - `tailwindcss` (`^3.4.3`) & `daisyui` (`^4.12.24`): CSS layout systems.
  - `vite` (`^5.2.10`): Dev server and build environment.
