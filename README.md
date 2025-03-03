# AI-Powered Clinical Communication Training Tool

A training platform that enables healthcare students to practice clinical communication skills through simulated patient interactions powered by large language models.

## Project Overview

This project is part of an independent study (IT 478) at UMass Boston, supervised by Rosemary Samia. It aims to create an interactive training tool that helps healthcare students develop effective clinical communication skills through AI-simulated patient scenarios.

### Team Members

- David Martinez - Technical Development
- Michael Agbesi - UX/UI Design

## Features

- **Google Single Sign-On**: Secure authentication for students and instructors
- **Customizable Patient Scenarios**: Instructors can create varied clinical scenarios
- **AI-Powered Patient Simulation**: Realistic patient interactions using LLMs
- **Real-time Chat Interface**: Intuitive communication environment
- **Feedback Mechanism**: Automated insights on communication strengths and areas for improvement
- **Conversation Transcripts**: Downloadable records of practice sessions
- **Responsive Design**: Accessible across devices
- **WCAG Compliant**: Designed for accessibility

## Technical Components

- **Frontend**: React-based responsive interface with Next.js
- **Authentication**: Supabase Auth with Google OAuth
- **AI Integration**: API connections to LLMs (GPT/Claude)
- **Database**: Supabase (PostgreSQL)
- **Feedback System**: Automated analysis of communication patterns

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

## Project Objectives

1. Conduct UX research with healthcare students and instructors
2. Develop customizable patient scenario interfaces
3. Create an interactive platform for simulated clinical conversations
4. Implement feedback mechanisms for skill development

## Learning Outcomes

- AI/LLM integration for healthcare simulation
- Advanced web development with React-based frameworks
- Healthcare communication standards knowledge
- UX/UI design with accessibility considerations
- Project management and stakeholder collaboration

## Deliverables

1. Functional prototype with chat interface and LLM integration
2. Basic feedback generation system
3. Technical documentation
4. Final effectiveness report

## License

MIT
