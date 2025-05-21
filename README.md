# Patient Proxy: AI-Powered Clinical Communication Training Tool

A training platform that enables healthcare students to practice clinical communication skills through simulated patient interactions powered by Google Gemini.

## Project Overview

This project is part of an independent study (IT 478) at UMass Boston, supervised by Rosemary Samia. It aims to create an interactive training tool that helps healthcare students develop effective clinical communication skills through AI-simulated patient scenarios.

### Team Members

- David Martinez - Technical Development
- Michael Agbesi - UX/UI Design

## Features

- **Google Single Sign-On**: Secure authentication via Supabase Auth for students.
- **Customizable Patient Profiles**: Users can create and manage detailed patient profiles for chat sessions.
- **Simulation Scenarios**: Engage in pre-defined or user-created (via API) clinical scenarios with specific learning objectives.
- **AI-Powered Patient Simulation**: Realistic patient interactions using Google Gemini.
- **Real-time Chat Interface**: Intuitive environment for text-based communication and performing clinical actions.
- **Dynamic Patient Configuration**: Adjust AI patient parameters like emotion and health literacy for tailored interactions.
- **Feedback Mechanism**: Automated feedback provided at the end of simulation scenarios.
- **Conversation Transcripts**: Downloadable records of practice sessions for both direct chats and scenarios.
- **Responsive Design**: Accessible across various devices.

## Technical Components

- **Frontend**: Next.js (React framework) with TypeScript and Tailwind CSS.
- **Backend**: Next.js API Routes.
- **Authentication**: Supabase Auth utilizing Google OAuth.
- **Database**: Supabase (PostgreSQL) for storing patient profiles, scenarios, and chat sessions.
- **AI Integration**: Google Gemini API for generating patient responses and interactions.
- **State Management**: React Context API and component state.

## Getting Started

To get the project running locally, follow these main steps. For complete and detailed instructions, please refer to the [Setup Instructions](./docs/SETUP_INSTRUCTIONS.md).

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-org/patient-proxy.git # Replace with your repository URL
    cd patient-proxy
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or yarn install / pnpm install
    ```

3.  **Set up Environment Variables:**
    Create a `.env.local` file in the root of the project. Key variables include:

    ```env
    # Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

    # Google OAuth (for user authentication)
    GOOGLE_CLIENT_ID=your-google-cloud-oauth-client-id
    GOOGLE_CLIENT_SECRET=your-google-cloud-oauth-client-secret

    # Google Gemini API Key (for AI features)
    GOOGLE_GEMINI_API_KEY=your-google-gemini-api-key
    ```

    Refer to [Setup Instructions](./docs/SETUP_INSTRUCTIONS.md) for the full list and setup details for these services.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Documentation

Comprehensive documentation is available to help users and developers understand and use Patient Proxy effectively:

- **[User Guide](./docs/USER_GUIDE.md)**

  - **Summary:** A guide for end-users (students and instructors) on how to use the Patient Proxy platform. It covers accessing the application, managing patient profiles, starting chat sessions and simulation scenarios, interacting with the AI, understanding feedback, downloading transcripts, and troubleshooting.

- **[API Documentation](./docs/API_DOCUMENTATION.md)**

  - **Summary:** Technical documentation for developers. It details the backend API endpoints, authentication mechanisms (Supabase JWT), request/response formats, data models (Patient Profiles, Simulation Scenarios, Chat Messages), and common conventions for interacting with Patient Proxy's services programmatically.

- **[Setup Instructions](./docs/SETUP_INSTRUCTIONS.md)**
  - **Summary:** Provides step-by-step instructions for developers to set up the project environment for local development or deployment. It includes prerequisites, cloning the repository, installing dependencies, configuring environment variables (Supabase, Google Cloud OAuth, Google Gemini), database setup, and running/building the application.

## Project Objectives

1. Conduct UX research with healthcare students and instructors.
2. Develop customizable patient scenario and profile interfaces.
3. Create an interactive platform for simulated clinical conversations using LLMs.
4. Implement feedback mechanisms for skill development.

## Learning Outcomes

- AI/LLM (Google Gemini) integration for healthcare simulation.
- Advanced web development with Next.js, React, TypeScript, and Supabase.
- Understanding of healthcare communication standards.
- UX/UI design with accessibility considerations.
- Project management and stakeholder collaboration.

## Deliverables

1. Functional prototype with chat interface and Google Gemini integration.
2. System for generating feedback at the end of scenarios.
3. Comprehensive technical documentation (User Guide, API Documentation, Setup Instructions).
4. Final effectiveness report.
