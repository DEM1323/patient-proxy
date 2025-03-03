# Patient Proxy

A secure platform that enables patients to authorize trusted individuals to access their healthcare information and make decisions on their behalf.

## Features

- **Google Single Sign-On**: Secure authentication using Google OAuth
- **Role-Based Access**: Different permissions for patients, proxies, and healthcare providers
- **Secure Data Handling**: Built with privacy and security in mind
- **Modern Tech Stack**: Next.js, TypeScript, Tailwind CSS, and Supabase

## Getting Started

First, set up your environment variables:

```bash
# Create a .env.local file with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Authentication Flow

This project uses Supabase Authentication with Google OAuth. The authentication flow is:

1. User clicks "Sign in with Google" button
2. User is redirected to Google for authentication
3. After successful authentication, user is redirected back to the application
4. User is then redirected to their dashboard

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Authentication**: Supabase Auth, Google OAuth
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel (recommended)

## License

MIT
