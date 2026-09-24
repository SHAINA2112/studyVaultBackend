# SHAINA StudyVault — Backend API

Production-style Node.js + Express + MongoDB backend for SHAINA StudyVault.

## Stack
Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs, Multer + Cloudinary, Nodemailer, Helmet, CORS, express-rate-limit, express-validator, express-mongo-sanitize.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then fill in real values
```

Required services:
- A MongoDB instance (local or Atlas) — set `MONGO_URI`
- A Cloudinary account — set `CLOUDINARY_*` (used for note documents, thumbnails, profile images)
- An SMTP account (e.g. Gmail app password, SendGrid, Mailtrap) — set `EMAIL_*` (used for password resets and admin replies). If left blank, emails are logged to the console instead of sent, so the rest of the API still works in local dev.

Create the one and only admin account (never via a public route):
```bash
npm run seed:admin
```
This reads `ADMIN_NAME` / `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`.

Run the server:
```bash
npm run dev     # auto-restart on changes (node --watch)
npm start       # production
```

## Architecture
```
backend/
├── config/db.js              Mongoose connection
├── controllers/               Route handlers (business logic)
├── middleware/                 auth, admin guard, upload, validation, error handling
├── models/                     User, Note, Bookmark, Download, View, ContactMessage
├── routes/                     Express routers, one per resource
├── services/                   emailService (Nodemailer), storageService (Cloudinary)
├── utils/                       generateToken, express-validator chains
├── scripts/seedAdmin.js        controlled, out-of-band admin creation
├── app.js                       Express app + middleware wiring
└── server.js                    entry point — connects DB, starts the HTTP server
```

## Security model (enforced server-side, not just hidden in the UI)
- **Role is never client-controlled.** Registration always creates a `student`; `role` in the request body is ignored. Admin accounts only exist via `npm run seed:admin`.
- **`protect` + `adminOnly`** run on every admin route (`/api/admin/**`, `/api/admin/analytics/**`). `protect` reloads the user from MongoDB on every request — a forged or stale JWT payload can't grant access an account no longer has (e.g. after deactivation or a role change).
- **No note-creation endpoint exists outside `/api/admin/notes`.** There is no student-facing "create note" route anywhere in `noteRoutes.js`.
- **Password reset / contact replies never trust client-supplied recipients** — replies always go to the email stored on the original `ContactMessage` document.
- Passwords are hashed with bcrypt (12 rounds), never returned in API responses (`toJSON` transform strips them).
- `express-mongo-sanitize` strips `$`/`.` keys from input to block NoSQL injection; `express-validator` validates/normalizes every write endpoint.
- `helmet`, `cors` (locked to `CLIENT_URL`), and tiered `express-rate-limit` (tighter on `/api/auth` and `/api/contact`) are applied globally.
- Centralized `errorHandler` normalizes Mongoose/JWT/multer errors into the consistent `{ success, message }` shape and never leaks stack traces outside development.

## API summary
See the full endpoint list in the project brief; in short:

- `POST /api/auth/register|login`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password/:token`
- `GET/PUT /api/users/profile`, `PATCH /api/users/password`, `GET /api/users/bookmarks`
- `GET /api/notes`, `GET /api/notes/:id`, `GET /api/notes/:id/read`, `GET /api/notes/:id/download` (auth), `POST/DELETE /api/notes/:id/bookmark` (auth)
- `POST /api/contact`
- Admin only (`protect` + `adminOnly`): `POST/PUT/DELETE /api/admin/notes[/:id]`, `PATCH /api/admin/notes/:id/publish`, `GET /api/admin/users[/:id]`, `PATCH /api/admin/users/:id/status`, full `GET/PATCH/POST/DELETE /api/admin/messages/**`, `GET /api/admin/analytics/**`

## Connecting the React frontend
In the frontend's `notesService.js`, replace the mock-data functions with `fetch` calls to these endpoints (base URL from an env var, e.g. `VITE_API_URL`). Response shapes (`{ success, message, data }`) are designed to drop in with minimal changes to existing component code.
