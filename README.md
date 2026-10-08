# Patient Proxy: AI-Powered Clinical Communication Training Tool

A training platform that enables healthcare students to practice clinical communication skills through simulated patient interactions powered by Google Gemini.

The alpha runs on Vite, TanStack Router, React, Convex, WorkOS, and Cloudflare Workers. An Institutional Admin manages Members, Learning Groups, and Scenario availability; an approved Learner completes a simulated PACU encounter and receives evidence-linked Formative Feedback; authorized Faculty review the saved Ended Attempt.

```bash
npm ci
npm run dev:backend
# In a second terminal:
npm run dev
```

Open `http://localhost:5173/deployment-check`, then `/` to sign in. See:

- [AGENTS.md](./AGENTS.md): working guide shared by Codex, Claude Code, and Cursor
- [CONTEXT.md](./CONTEXT.md): domain vocabulary and product boundaries
- [Deployment](./docs/alpha/DEPLOYMENT.md): local setup, production, and the database-roster cutover
- [Current status](./docs/alpha/WAYFINDER.md)

The earlier Next.js/Supabase prototype was removed after the alpha journey passed its checks; it remains in Git history at `b6619b7`.

## Project background

This project began as an independent study (IT 478) at UMass Boston, supervised by Rosemary Samia.

- David Martinez - Technical Development
- Michael Agbesi - UX/UI Design

### Objectives

1. Conduct UX research with healthcare students and instructors.
2. Develop customizable patient scenario and profile interfaces.
3. Create an interactive platform for simulated clinical conversations using LLMs.
4. Implement feedback mechanisms for skill development.
