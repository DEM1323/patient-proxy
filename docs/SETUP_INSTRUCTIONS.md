# Setup Instructions: Patient Proxy

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Development](#development)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- Node.js 18.x or higher
- npm 9.x or higher (or yarn/pnpm)
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Required Accounts

- Google Cloud Platform account
- Supabase account
- OpenAI API account (for AI features)

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/patient-proxy.git
cd patient-proxy
```

### 2. Install Dependencies

```bash
npm install
# or if using yarn:
# yarn install
# or if using pnpm:
# pnpm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory and add the following variables. Obtain the values from your respective service dashboards.

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google OAuth (for user authentication)
GOOGLE_CLIENT_ID=your-google-cloud-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-cloud-oauth-client-secret

# Google Gemini API Key (for AI features)
GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key

# (Optional) OpenAI API Key (if using OpenAI in addition to/instead of Gemini)
# OPENAI_API_KEY=your-openai-api-key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Installation

### 1. Database Setup (Supabase)

1. Go to [Supabase](https://supabase.com/) and create a new project if you haven't already.
2. In your Supabase project dashboard, navigate to the SQL Editor.
3. You may need to run SQL scripts to set up your database schema (e.g., for tables like `profiles`, `scenarios`, `conversations`). Refer to any schema files or migration scripts if they are present in the project (e.g., in a `supabase/migrations` directory if using Supabase CLI locally, though this project doesn't show a direct `db:migrate` script in `package.json`). If no migration scripts are provided, you might need to define the schema manually based on application needs.
4. Ensure Row Level Security (RLS) policies are appropriately configured for your tables to secure data access.

### 2. Google OAuth Setup (Google Cloud Console)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Navigate to "APIs & Services" > "OAuth consent screen". Configure it as required (User Type: External/Internal, App information).
4. Navigate to "APIs & Services" > "Credentials".
5. Click "+ CREATE CREDENTIALS" and choose "OAuth client ID".
6. Select "Web application" as the application type.
7. Add Authorized JavaScript origins: `http://localhost:3000` (for development) and your production URL.
8. Add Authorized redirect URIs: `http://localhost:3000/api/auth/callback` (or the equivalent callback path your Supabase/NextAuth setup uses) and the production equivalent.
9. Copy the generated Client ID and Client Secret into your `.env.local` file.

### 3. AI Service Setup (Google Gemini)

1. Go to [Google AI Studio](https://aistudio.google.com/) or Google Cloud Console to obtain a Gemini API key.
2. Ensure the API key has the necessary permissions for the Gemini models you intend to use.
3. Add the API key to your `.env.local` file as `GOOGLE_GEMINI_API_KEY`.

## Configuration

### 1. Supabase Configuration (In-app)

- Within your application code (likely in a Supabase client initialization file, e.g., `utils/supabase/client.ts` or similar), ensure that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correctly used to initialize the Supabase client.
- Review Supabase dashboard settings for Authentication providers (ensure Google is enabled) and any specific rules for user sign-ups or data access.

### 2. Next.js Application Configuration (`next.config.ts`)

Your `next.config.ts` file should look something like this, including any specific configurations needed for your project (like ESLint or image domains):

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    // Add other environment variables that need to be exposed to the browser client-side
    // Prefix them with NEXT_PUBLIC_ if they are not already.
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true, // Set to false if you want builds to fail on ESLint errors
  },
  images: {
    domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"], // Add any other domains for images
  },
  // Add other Next.js specific configurations here if needed
};

export default nextConfig;
```

Ensure this file is at the root of your project.

### 3. Tailwind CSS Configuration (`tailwind.config.ts`)

Your `tailwind.config.ts` file configures Tailwind CSS. A typical setup looks like this:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Ensure this covers all files using Tailwind classes
  ],
  theme: {
    extend: {
      // Add your custom theme extensions here
      // e.g., colors, fontFamily, spacing, etc.
    },
  },
  plugins: [
    require("tailwindcss-animate"), // If you use animations
    // Add other Tailwind plugins here
  ],
};
export default config;
```

Make sure the `content` paths correctly point to all files where you use Tailwind CSS classes.

## Development

### 1. Start Development Server

```bash
npm run dev
# or yarn dev / pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### 2. Linting

To check for code style and potential errors:

```bash
npm run lint
# This typically runs: next lint
```

### 3. Testing

The `package.json` does not specify a root-level test script like `npm test`.
If you have testing set up (e.g., with Jest, Playwright, or Cypress), run the respective commands for those tools.
Example for Jest (if configured):

```bash
# npm run test
# or yarn test / pnpm test
```

If tests are not configured, consider adding them to ensure code quality.

## Deployment

### 1. Build the Application

```bash
npm run build
# or yarn build / pnpm build
```

This command creates an optimized production build of your application.

### 2. Production Deployment

Deployment will vary based on your chosen hosting platform (e.g., Vercel, Netlify, AWS, Google Cloud Run).

1. Ensure all production environment variables (from your `.env.local`, but securely managed by your host) are set up in your hosting provider's settings.
2. Configure your production database settings if different from development.
3. Follow your hosting provider's instructions for deploying a Next.js application. For platforms like Vercel (from the creators of Next.js), deployment is often as simple as connecting your Git repository.

Generic steps might involve:

- Setting up a server or serverless functions.
- Ensuring Node.js is available in the production environment.
- Running `npm run start` (or `yarn start` / `pnpm start`) after a successful build, if managing your own server.

### 3. CI/CD Setup (Optional but Recommended)

1. Configure GitHub Actions (or other CI/CD tools like GitLab CI, Jenkins) to automate testing, building, and deploying your application.
2. Set up deployment pipelines for different environments (e.g., staging, production).
3. Securely manage environment secrets within your CI/CD system.

## Troubleshooting

### Common Issues

#### 1. Authentication Issues

- Verify Google OAuth configuration
- Check Supabase authentication settings
- Ensure correct redirect URIs

#### 2. Database Connection Issues

- Verify Supabase credentials
- Check database policies
- Ensure proper network access

#### 3. Build Issues

- Clear `.next` directory
- Remove `node_modules` and reinstall
- Check for conflicting dependencies

### Debugging

#### 1. Development Mode

```bash
# Enable debug logging
DEBUG=* npm run dev
```

#### 2. Production Debugging

- Check application logs
- Monitor error tracking
- Review performance metrics

## Maintenance

### 1. Regular Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit
```

### 2. Database Maintenance

- Regular backups
- Performance optimization
- Index maintenance

### 3. Monitoring

- Set up error tracking
- Configure performance monitoring
- Implement logging

## Security Considerations

1. **API Keys**

   - Never commit API keys to version control
   - Rotate keys regularly
   - Use environment variables

2. **Authentication**

   - Implement rate limiting
   - Use secure session management
   - Enable 2FA where possible

3. **Data Protection**
   - Encrypt sensitive data
   - Implement proper access controls
   - Regular security audits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request
4. Follow the contribution guidelines
