# Travel App – Next.js, Prisma, Neon, and Amadeus

## Overview

This is a full‑stack travel web application built using Next.js, Prisma ORM, Neon PostgreSQL, and the Amadeus Travel API. The application allows users to search travel data, store information in a database, and generate travel‑related features.

This project uses modern web development tools and follows industry best practices for database management, API integration, and environment configuration.

---

## Tech Stack

Frontend:

* Next.js
* React
* TypeScript / JavaScript

Backend:

* Next.js API routes
* Prisma ORM

Database:

* Neon PostgreSQL

External APIs:

* Amadeus Travel API

Optional:

* OpenAI API for itinerary generation

---

## Prerequisites

Before running the project, make sure you have:

* Node.js (v18 or newer recommended)
* npm installed
* Neon database account
* Amadeus developer account
* Git

Check versions:

```bash
node -v
npm -v
```

---

## Installation

Clone the repository:

```bash
git clone <your-repository-url>
```

Navigate into the project folder:

```bash
cd your-project-name
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables Setup

Create a new file in the root folder:

```
.env.local
```

Copy contents from:

```
.env.example
```

Fill in the values.

Example:

```env
# Neon / Prisma
DATABASE_URL="postgresql://username:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://username:password@host/dbname?sslmode=require"

# Amadeus
AMADEUS_CLIENT_ID="your_client_id"
AMADEUS_CLIENT_SECRET="your_client_secret"
AMADEUS_BASE_URL="https://test.api.amadeus.com"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional OpenAI
OPENAI_API_KEY=""
```

---

## Neon Database Setup

1. Go to:

[https://console.neon.tech](https://console.neon.tech)

2. Create a project

3. Copy the PostgreSQL connection string

4. Paste it into:

```
DATABASE_URL
DIRECT_URL
```

---

## Run Prisma Migration

This creates your database tables.

Run:

```bash
npm run prisma:migrate -- --name init
```

Expected output:

```
Migration applied successfully
```

---

## Run the Application

Start development server:

```bash
npm run dev
```

Open browser:

```
http://localhost:3000
```

---

## Useful Prisma Commands

Generate Prisma client:

```bash
npx prisma generate
```

View database in Prisma Studio:

```bash
npx prisma studio
```

Reset database:

```bash
npx prisma migrate reset
```

---

## Amadeus API Setup

1. Go to:

[https://developers.amadeus.com](https://developers.amadeus.com)

2. Create an account

3. Create a new App

4. Copy:

* Client ID
* Client Secret

5. Paste into `.env.local`

---

## Project Structure

```
project-root/

├── prisma/
│   └── schema.prisma
│
├── pages/
│   ├── api/
│   └── index.js
│
├── public/
│
├── .env.local
├── .env.example
├── package.json
├── README.md
```

---

## Development Workflow

Typical startup process:

```bash
npm install
npm run prisma:migrate -- --name init
npm run dev
```

---

## Deployment Notes

When deploying:

* Set environment variables in hosting platform
* Run Prisma migrations
* Use production database URL

Examples:

* Vercel
* Render
* Railway

---

## Troubleshooting

If database fails to connect:

* Check DATABASE_URL
* Ensure Neon database is active
* Ensure SSL is enabled

If Prisma fails:

```bash
npx prisma generate
```

---

## Author

Jaspreet Gakhal, Hiren Patel, Gopichand & Fenil
Conestoga College

---

## License

This project is for educational and development purposes.

---

## Status

Active development in progress. Currently the MVP check ins. Immediate step in further development is database intergration, UI enhancements and backend logic.
