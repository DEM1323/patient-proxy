# User Guide: Patient Proxy

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
   - [Accessing the Platform](#accessing-the-platform)
   - [First-Time Setup](#first-time-setup)
3. [User Roles](#user-roles)
   - [Student](#student)
   - [Instructor](#instructor)
4. [Managing Patient Profiles](#managing-patient-profiles)
   - [Creating a New Patient Profile](#creating-a-new-patient-profile)
   - [Editing an Existing Patient Profile](#editing-an-existing-patient-profile)
5. [Features and Functionality](#features-and-functionality)
   - [Starting a Chat Session](#starting-a-chat-session)
   - [Starting a Simulation Scenario](#starting-a-simulation-scenario)
   - [Interacting with the AI Patient (Chat Interface)](#interacting-with-the-ai-patient-chat-interface)
   - [Simulation Phases (for Scenarios)](#simulation-phases-for-scenarios)
   - [Feedback System](#feedback-system)
   - [Transcript Management](#transcript-management)
6. [Troubleshooting](#troubleshooting)

## Introduction

Patient Proxy is designed to help healthcare students practice and improve their clinical communication skills through simulated patient interactions. This guide will help you navigate and make the most of the platform.

## Getting Started

### Accessing the Platform

1. Visit the application URL: patient-proxy.vercel.app
2. Click "Sign in with Google"
3. Use your institutional Google account to log in

### First-Time Setup

Upon your first login, you will be presented with a default patient profile. You can review this profile to understand the type of information you can include. You may also choose to create your own patient profiles immediately.

## User Roles

The platform is primarily designed for student use, but instructors may also interact with it to understand its capabilities or guide students.

### Student

- Create and manage custom patient profiles.
- Start chat sessions with selected patient profiles.
- Participate in pre-defined simulation scenarios.
- Interact with the AI patient through a chat interface.
- Receive feedback at the end of simulation scenarios.
- Download conversation transcripts from chat sessions and simulation scenarios.

### Instructor

- (Future) Create and manage scenarios.
- (Future) Monitor student progress.
- (Future) Generate reports.
- (Future) Customize feedback parameters.
  (Currently, instructor-specific functionalities are largely under development. Instructors can use the platform as a student would to explore its features.)

## Managing Patient Profiles

You can create and manage patient profiles to tailor your practice sessions.

### Creating a New Patient Profile

1. Navigate to the "Manage Patient Profiles" section from the main dashboard or navigation menu.
2. Click on the "Create New Profile" option.
3. You will be presented with the `PatientForm`. Fill in the necessary fields, which include:
   - Basic Information: Patient Name, Age, Gender.
   - Medical Details: Allergies, Unit, Major Support, Phone, Immunizations, Case, Diagnosis, History, Operation Type, Height, Consultation, Consent Obtained, Weight, Physician, Advanced Directives, Diet, Fall Precautions, Restraints, Isolation Precautions, Race/Religion, Medication From Home, Discharge Planning.
   - Checklist Items: You can add specific items for Monitoring, Medications, Respiratory care, Diagnostics, Social History, Activity, and Drains. Each item can have a title, details, and a checked status.
4. Once all desired information is entered, click the "Create Patient Profile" button at the bottom of the form.
5. You will receive a confirmation, and the new profile will be available for selection.

### Editing an Existing Patient Profile

1. Navigate to the "Manage Patient Profiles" section.
2. Click on the "Edit Existing Profile" option.
3. A list of available patient profiles will be displayed. Select the profile you wish to edit.
   - Note: Some profiles might be "default" or "global" profiles and cannot be edited. These will be clearly marked.
4. The `PatientForm` will appear, pre-filled with the selected profile's information.
5. Modify the fields as needed. You can update any of the information entered during creation.
6. After making your changes, click the "Update Patient Profile" button.
7. A confirmation message will indicate that the profile has been updated.

## Features and Functionality

### Starting a Chat Session

This mode allows you to have a free-form chat with an AI patient based on a patient profile you select.

1. From the main navigation, choose "Patient Interactions" and then "Start Patient Chat."
2. A list of available patient profiles will be displayed.
3. For each profile, you can see some summary information. Click on a profile card to select it.
4. Click the "Start Chat" button associated with your chosen profile.
5. This will take you to the chat interface, where you can begin conversing with the AI patient representing the selected profile. You may also find a "Configure Patient" option to adjust parameters like emotion or health literacy during the chat.

### Starting a Simulation Scenario

This mode guides you through a pre-defined clinical scenario with specific learning objectives and patient details.

1. From the main navigation, choose "Patient Interactions" and then "Select Patient."
2. A list of available simulation scenarios will be displayed.
3. Each scenario will have a title and a brief description. Click on a scenario card to select it.
4. Click the "Start Simulation" (or a similarly named button like "Begin Scenario") button.
5. You will be taken to the simulation interface.

### Interacting with the AI Patient (Chat Interface)

Whether in a direct chat or a simulation scenario, you'll use a similar chat interface:

1. **Message Display Area:** This central part of the screen shows the conversation history between you and the AI patient. Your messages and the AI's responses will appear here.
2. **Input Area:** Below the message display, you'll find a text box where you can type your messages.
   - Press `Enter` to send your message.
   - Press `Shift+Enter` to create a new line within your message.
3. **Simulation Actions (Tab):** In some views, particularly during simulation scenarios, there might be a tab or section for "Simulation Actions." This allows you to perform specific clinical actions (e.g., "Check Vitals," "Administer Medication").
   - Clicking an action may reveal sub-options (e.g., under "Check Vitals," you might find "Blood Pressure," "Temperature").
   - Performing an action will be logged in the chat and may elicit a response from the AI patient.
4. **Patient Information:** Often, there's an option (e.g., a button or tab) to view the current Patient Profile details during the interaction. This might open a modal or a side panel.
5. **Patient Configuration:** In both direct chat (often via a button in the header like "Configure Patient") and before starting the active part of a simulation scenario, you can adjust the AI patient's parameters. This typically includes settings like the patient's emotional state and health literacy level, which can influence how the AI patient responds during the interaction.

### Simulation Phases (for Scenarios)

When you start a Simulation Scenario, the interaction typically progresses through a few phases:

1.  **Briefing Phase:**
    - Upon entering the scenario, you'll first see a "student report" or "scenario brief." This provides context, patient background, and your objectives for the simulation.
    - Review this information carefully.
    - When you click the "Start Simulation" button to proceed, a "Patient Configuration" modal will appear. This allows you to set parameters like the patient's initial emotion or health literacy level before the active simulation begins.
2.  **Simulation Phase:**
    - This is the active interaction phase where you communicate with the AI patient using the chat interface and perform simulation actions.
    - The AI will respond based on the scenario's programming and the information you provide or request.
    - A timer may be active during this phase.
3.  **Debriefing Phase:**
    - After you choose to "End Simulation," you will enter the debriefing phase.
    - This phase provides a summary of the interaction and feedback on your performance during the scenario.
    - You will have the option to download a transcript of the conversation during this phase.

### Feedback System

- At the end of each simulation scenario, the system provides a feedback report.
- This report includes an analysis of your communication, identifying strengths and areas for improvement.
- It may also highlight best practices demonstrated or missed during the interaction.

### Transcript Management

- You can download a full transcript of your conversation with the AI patient.
- This option is available at the end of a simulation scenario (during the debriefing phase).
- It is also available at the end of a direct chat session (usually when you choose to exit the chat).
- Transcripts are helpful for reviewing your interactions and sharing them with instructors if needed.

## Troubleshooting

### Common Issues

1. **Login Problems**

   - Ensure you're using the correct Google account
   - Clear browser cache and cookies
   - Try incognito/private browsing mode

2. **Chat Interface Issues**

   - Refresh the page
   - Check your internet connection
   - Clear browser cache

3. **Scenario Loading Problems**
   - Verify your internet connection
   - Try a different browser
   - Contact support if persistent

### Getting Help

- Contact your instructor
- Submit a bug report on the "Report a Bug" Page

## Best Practices

1. **Before Starting**

   - Review the scenario brief thoroughly
   - Prepare your approach

2. **During Practice**

   - Maintain professional communication
   - Use appropriate medical terminology
   - Follow clinical communication protocols

3. **After Practice**
   - Review feedback carefully
   - Note areas for improvement

## Privacy and Security

- Conversation Data is deleted every two hours

For additional support or questions, please contact your instructor.
