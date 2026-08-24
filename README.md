# OxStore

Premium fashion commerce app built with Express, MongoDB, React and Stripe.

## Start locally

1. Copy `backend/.env.example` to `backend/.env` and fill the secrets.
2. `docker compose up --build`
3. Visit http://localhost:4000.

For a first administrator, set a registered user's `role` to `admin` in MongoDB. Stripe webhooks should target `POST /api/payments/webhook`; use `stripe listen --forward-to localhost:5001/api/payments/webhook` in development.

Production requirements: HTTPS, strong 32+ character JWT secrets, Stripe/Cloudinary credentials, a real SMTP provider, secure cookie settings, and a MongoDB replica set if transactions are required. The local API runs on port 5001 and the storefront on port 4000.
