# API Documentation: Patient Proxy

## Table of Contents

1.  [Overview](#overview)
2.  [Authentication](#authentication)
    - [Supabase Auth](#supabase-auth)
    - [API Key for AI Services](#api-key-for-ai-services)
    - [Session Management](#session-management)
3.  [Base URL](#base-url)
4.  [Common Conventions](#common-conventions)
    - [Request/Response Format](#requestresponse-format)
    - [Error Handling](#error-handling)
    - [Pagination (where applicable)](#pagination-where-applicable)
5.  [Core Endpoints](#core-endpoints)
    - [Patient Profiles](#patient-profiles)
    - [Simulation Scenarios](#simulation-scenarios)
    - [Chat Interactions](#chat-interactions)
    - [AI Processing](#ai-processing)
6.  [Utility & Other Endpoints](#utility--other-endpoints)
    - [User Management](#user-management)
    - [Sample Data](#sample-data)
    - [Bug Reports](#bug-reports)
7.  [Data Models](#data-models)
    - [PatientProfile](#patientprofile)
    - [ChecklistItem](#checklistitem)
    - [SimulationScenario](#simulationscenario)
    - [SimulationChatMessage](#simulationchatmessage)
    - [PatientConfigOptions](#patientconfigoptions)
    - [ChatMessage (for AI)](#chatmessage-for-ai)
8.  [Rate Limiting](#rate-limiting)
9.  [Versioning](#versioning)

## Overview

This API documentation provides details for the backend services of Patient Proxy. The API is built using Next.js API routes and interacts with Supabase for database and authentication, and Google Gemini for AI-powered chat responses.

## Authentication

### Supabase Auth

User authentication is primarily handled by Supabase Auth, utilizing Google OAuth 2.0.

- Client-side applications should use the Supabase client library to manage sign-in, sign-up, and session handling.
- Most authenticated API endpoints require a valid Supabase session (JWT) to be implicitly handled by server-side Supabase client or passed as a Bearer token in the `Authorization` header for specific routes like `/api/init-chat` and `/api/chat-session`.

```
Authorization: Bearer <SUPABASE_JWT_TOKEN>
```

### API Key for AI Services

- Interactions with the Google Gemini API require a `GOOGLE_GEMINI_API_KEY`. This key is configured on the server-side via environment variables and is not directly exposed to or required by the client calling Patient Proxy's API endpoints.

### Session Management

- User sessions are managed by Supabase.
- The `/api/auth/sync` route might be used internally by Supabase SSR helpers for session synchronization.

## Base URL

All API routes are prefixed relative to the application's deployment URL.
Example: `https://your-app-domain.com/api/...`

## Common Conventions

### Request/Response Format

- All requests and responses use JSON.
- `Content-Type` header for POST/PUT requests should be `application/json`.

### Error Handling

Standard HTTP status codes are used to indicate the success or failure of an API request.

- `200 OK`: Request successful.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: The request was malformed (e.g., missing parameters, invalid JSON).
- `401 Unauthorized`: Authentication failed or was not provided.
- `403 Forbidden`: The authenticated user does not have permission to access the resource.
- `404 Not Found`: The requested resource does not exist.
- `500 Internal ServerError`: An unexpected error occurred on the server.

Error responses typically include a JSON body with more details:

```json
{
  "error": "A human-readable error message",
  "details": "Optional: More specific details about the error"
}
```

### Pagination

Some GET endpoints returning lists may support pagination query parameters (e.g., `page`, `limit`), though this is not explicitly detailed for all list endpoints in the current search.

## Core Endpoints

### Patient Profiles

These endpoints manage patient profile data stored in the `patient_profiles` Supabase table. Profiles consist of a main `profile_data` JSONB field and other metadata like `id`, `user_id`, `is_global`.

#### `GET /api/patient-profiles`

Retrieves a specific patient profile by its ID.

- **Query Parameters:**
  - `id` (string, required): The ID of the patient profile to retrieve.
- **Authentication:**
  - Authenticated users can access their own profiles and global profiles.
  - Anonymous users can only access global profiles.
- **Response:** `200 OK`
  ```json
  {
    "profile": {
      // Spread of profile_data from PatientProfile model
      "id": "string",
      "isGlobal": "boolean"
    },
    "success": true
  }
  ```
- **Error Responses:** `400`, `404`, `500`

_(Note: The codebase also shows a `GET /api/patient-profiles-by-id` with similar functionality. It's recommended to consolidate or clarify if there's a distinction.)_

_(Note: POST, PUT, DELETE operations for patient profiles seem to be handled client-side directly with Supabase or via library functions like `saveProfile` in `app/lib/storage.ts`, rather than dedicated API routes beyond GET. Documentation should clarify how profiles are managed if not through specific backend API routes for CUD operations.)_

### Simulation Scenarios

Endpoints for managing simulation scenarios, stored in the `simulation_scenarios` Supabase table.

#### `GET /api/simulation-scenarios`

Retrieves a list of simulation scenarios or a specific scenario by ID.

- **Query Parameters (Optional):**
  - `id` (string): If provided, fetches a specific scenario by ID.
- **Authentication:**
  - If `id` is provided: Fetches specific scenario if user has access.
  - If `id` is NOT provided:
    - Authenticated users see their own scenarios and global scenarios.
    - Anonymous users see only global scenarios.
- **Response (List):** `200 OK`
  ```json
  {
    "scenarios": [
      {
        "id": "string",
        "title": "string",
        "estimated_time_minutes": "number",
        "guided_reflection_time_minutes": "number",
        "target_group": "string",
        "brief_summary": "string",
        "created_at": "string",
        "updated_at": "string",
        "is_global": "boolean"
        // ... other summary fields
      }
    ]
  }
  ```
- **Response (Single by ID):** `200 OK`
  ```json
  {
    "scenario": {
      // Full SimulationScenario object
      "id": "string",
      "title": "string",
      // ... all fields from SimulationScenario model
      "patient_profile": {
        // Optional, if linked
        // Spread of profile_data
        "id": "string",
        "isGlobal": "boolean"
      }
    }
  }
  ```
- **Error Responses:** `500`

#### `POST /api/simulation-scenarios`

Creates a new simulation scenario.

- **Authentication:** Required (Supabase session).
- **Request Body:** `SimulationScenario` object (subset of fields allowed for creation).
  - `created_by` will be set to the authenticated user's ID.
  - `is_global` will be set to `false`.
- **Response:** `201 Created`
  ```json
  {
    "scenario": {
      // Full SimulationScenario object of the created scenario
      "id": "string"
      // ...
    }
  }
  ```
- **Error Responses:** `401`, `500`

#### `PUT /api/simulation-scenarios`

Updates an existing simulation scenario.

- **Authentication:** Required. User must be the `created_by` owner, and the scenario must not be `is_global`.
- **Query Parameters:**
  - `id` (string, required): The ID of the scenario to update.
- **Request Body:** `SimulationScenario` object with fields to update. `created_by` and `is_global` cannot be changed via this route.
- **Response:** `200 OK`
  ```json
  {
    "scenario": {
      // Full updated SimulationScenario object
      "id": "string"
      // ...
    }
  }
  ```
- **Error Responses:** `400`, `401`, `403`, `404`, `500`

#### `DELETE /api/simulation-scenarios`

Deletes a simulation scenario.

- **Authentication:** Required. User must be the `created_by` owner, and the scenario must not be `is_global`.
- **Query Parameters:**
  - `id` (string, required): The ID of the scenario to delete.
- **Response:** `200 OK`
  ```json
  {
    "success": true
  }
  ```
- **Error Responses:** `400`, `401`, `403`, `404`, `500`

### Chat Interactions

#### `POST /api/init-chat`

Initializes a new chat session with a patient profile.

- **Authentication:** Required (Bearer token - Supabase JWT).
- **Request Body:**
  ```json
  {
    "patientId": "string" // ID of the patient profile to chat with
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "sessionId": "string", // Unique ID for the chat session
    "initialMessage": "string", // AI-generated greeting from the patient
    "patientProfile": {
      // PatientProfile object used for the chat
      // ...
    }
  }
  ```
- **Error Responses:** `400`, `401`, `404`, `500`

#### `POST /api/chat-session`

Sends a message within an existing chat session and gets an AI response.

- **Authentication:** Required (Bearer token - Supabase JWT).
- **Request Body:**
  ```json
  {
    "sessionId": "string",
    "message": "string", // User's message
    "patientConfig": {
      // PatientConfigOptions object
      "emotion": "string",
      "healthLiteracy": "string"
    }
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "response": "string", // AI patient's response message
    "sessionId": "string" // The session ID, echoed back
  }
  ```
- **Error Responses:** `400`, `401`, `404`, `500`

### AI Processing

#### `POST /api/ai/simulation-chat`

Handles AI responses for messages and actions within a patient simulation. This is the core AI interaction endpoint during simulations.

- **Authentication:** Implicitly relies on server-side Supabase client if called from other server components, or would need appropriate auth if exposed directly.
- **Request Body:**
  ```json
  {
    "message": "string", // User's message or action description
    "context": {
      "scenarioId": "string",
      "patientProfile": {}, // PatientProfileData object
      "patientConfig": {
        // PatientConfigOptions object
        "emotion": "string",
        "healthLiteracy": "string"
      }
      // ... other scenario-related context
    },
    "messageHistory": [], // Array of ChatMessage (for AI) objects
    "isAction": "boolean" // True if the "message" is a clinical action, false for a chat message
  }
  ```
- **Response:** `200 OK`
  ```json
  {
    "response": "string", // AI patient's textual response
    "observations": ["string"], // Optional: AI-generated observations about student performance
    "senderName": "string" // Name of the patient responding
  }
  ```
- **Error Responses:** `400`, `500`

## Utility & Other Endpoints

#### `POST /api/ensure-sample-profile`

Ensures a default sample patient profile exists in the database. Creates it if not present.

- **Response:** `200 OK`
  ```json
  {
    "created": "boolean", // True if a new profile was created
    "message": "string",
    "profile": {} // Optional: The created or existing sample PatientProfile
  }
  ```

#### `POST /api/ensure-sample-scenario`

Ensures a default sample simulation scenario exists.

- _(Details would be similar to ensure-sample-profile, specific to scenarios)_

#### `GET /api/get-user-id`

Retrieves the user ID of the currently authenticated user.

- **Authentication:** Required.
- **Response:** `200 OK`
  ```json
  {
    "userId": "string"
  }
  ```
- **Error Responses:** `401`

#### `POST /api/bug-reports`

Submits a bug report.

- **Request Body:**
  ```json
  {
    "report": {
      "description": "string",
      "stepsToReproduce": "string",
      "email": "string" // Optional
      // ... other relevant fields
    }
  }
  ```
- **Response:** `201 Created` or `200 OK`
  ```json
  {
    "message": "Bug report submitted successfully",
    "reportId": "string" // Optional
  }
  ```

## Data Models

_(This section defines the main data structures used in API requests/responses. Many are derived from `app/types/` files.)_

### `PatientProfile`

(Based on `app/types/patient.ts`)

```typescript
interface PatientProfile {
  id: string;
  patientName: string;
  age?: number | null;
  gender?: string;
  allergies?: string;
  unit: string;
  majorSupport: string;
  phone: string;
  immunizations: string;
  case: string;
  diagnosis?: string;
  history?: string;
  operationType: string;
  height: string;
  consultation: string;
  consentObtained: boolean;
  weight: string;
  physician: string;
  advancedDirectives: string;
  diet?: string;
  fallPrecautions: string;
  restraints: string;
  isolationPrecautions: string;
  raceReligion: string;
  medicationFromHome: string;
  dischargePlanning: string;
  isGlobal?: boolean; // Indicates if it's a system-wide profile
  // ChecklistItem arrays
  monitoringItems: ChecklistItem[];
  medicationItems?: ChecklistItem[];
  respiratoryItems: ChecklistItem[];
  diagnosticItems: ChecklistItem[];
  socialHistoryItems: ChecklistItem[];
  activityItems: ChecklistItem[];
  drainItems: ChecklistItem[];
  medicationFromHomeItems: ChecklistItem[];
  // Supabase specific fields often include:
  // user_id?: string; // Who created it, if not global
  // created_at?: string;
  // updated_at?: string;
  // profile_data?: any; // The JSONB field in Supabase often holds most of the above
}

interface ChecklistItem {
  id: number | string; // Can be number or string based on usage
  title: string;
  details: string;
  checked: boolean;
}
```

### `SimulationScenario`

(Based on `app/types/simulation.ts` or `app/types/patient-simulation.ts`)

```typescript
interface SimulationScenario {
  id: string;
  title: string;
  description?: string;
  brief_summary?: string;
  student_report?: string; // Briefing for the student
  patient_profile_id?: string; // ID of a linked PatientProfile
  patient_profile?: PatientProfileData; // Embedded patient profile data for the scenario
  estimated_time_minutes?: number;
  guided_reflection_time_minutes?: number;
  target_group?: string;
  learning_objectives?: Array<{ id: string; objective: string }>;
  // Medical details for the scenario
  medical_history_prior?: string;
  medical_history_recent?: string;
  nursing_diagnosis?: string[];
  symptoms?: Record<string, string>;
  vital_signs?: Record<string, string>; // e.g., { "BP": "120/80 mmHg", "HR": "70 bpm" }
  lab_results?: Record<string, string>;
  expected_treatment_steps?: Array<{
    id: string;
    step: string;
    completed: boolean;
  }>;
  scenario_chart?: any; // Can be complex, array or object
  ai_patient_prompts?: Array<{ trigger: string; response: string }>; // Specific AI instructions
  // Metadata
  created_at?: string;
  updated_at?: string;
  created_by?: string; // User ID of creator
  is_global?: boolean; // True if system-wide scenario
  // Fields for AI interaction context (from PatientProfileData in simulation context)
  detailed_patient_data?: {
    dob?: string;
    mrNumber?: string;
    [key: string]: any;
  };
}

// PatientProfileData is a subset/variant of PatientProfile used within simulation contexts
interface PatientProfileData {
  id: string;
  patientName: string;
  age?: string | number;
  gender?: string;
  diagnosis?: string;
  // ... other relevant fields from PatientProfile, especially arrays like medicationItems etc.
  isGlobal?: boolean;
}
```

### `SimulationChatMessage` (for storing chat history in sessions)

```typescript
interface SimulationChatMessage {
  role: "user" | "assistant" | "system" | "action"; // 'assistant' is the AI patient
  content: string;
  timestamp: string; // ISO date string
  senderName?: string; // e.g., Patient's name for assistant messages
}
```

### `PatientConfigOptions`

```typescript
interface PatientConfigOptions {
  emotion: string; // e.g., "Calm", "Anxious"
  healthLiteracy: string; // e.g., "1" (low) to "5" (high)
}
```

### `ChatMessage` (for AI - Gemini)

(As used in `/api/ai/simulation-chat`)

```typescript
interface ChatMessage {
  role: "user" | "model"; // 'model' is the AI
  parts: string; // The textual content of the message
}
```

## Rate Limiting

- Currently, no explicit rate limiting is defined in the API documentation snippets. If implemented (e.g., via Supabase or a gateway), this section should be updated.

## Versioning

- API versioning is not explicitly stated (e.g., no `/v1/` in paths found). Assume unversioned or versioned through deployment strategies.

_(Note: This is a comprehensive draft based on the codebase exploration. Some details, especially around specific fields in POST/PUT bodies for creation/update and exact error code nuances, might require further refinement by cross-referencing with frontend usage and more granular backend logic.)_
