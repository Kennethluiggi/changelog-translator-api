# Change Intelligence Frontend Skeleton

This folder is the Phase 1 public-facing shell for Change Intelligence.

## Included routes
- `/` home
- `/docs` public documentation shell
- `/pricing` informational pricing
- `/login` login / request-access shell

## Why this exists
The backend already exists. Phase 1 needs a docs-first product surface that people can understand and trust.

## Start locally
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Notes
- This is intentionally lightweight.
- Branding and visual refinement can happen later.
- The docs content is currently seeded from the existing backend repo docs.
- Real auth, dashboard internals, partner uploads, and notifications are later phases.
