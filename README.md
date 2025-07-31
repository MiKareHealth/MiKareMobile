# 🤖 MiKare – Your Personal Health Companion

**MiKare** is a web and mobile application designed to help patients and caregivers manage complex medical journeys. Built around compassion and control, Mikare empowers users to capture, organise, and understand their health history across appointments, symptoms, medications, and more — all with AI-assisted insights.

## Console Logging Configuration

The application includes a configurable console logging system that can be controlled via environment variables. This allows you to disable logging in production while keeping it available for development and debugging.

### Environment Variables

Create a `.env` file in the root directory with the following variable:

```bash
# Console logging control
# Set to 'true' to enable console logging, 'false' or leave empty to disable
# Default behavior: no logging (false)
VITE_CONSOLE=false
```

### Usage

- **Production**: Set `VITE_CONSOLE=false` or leave it unset to disable all console logging
- **Development**: Set `VITE_CONSOLE=true` to enable console logging for debugging
- **Default**: If the variable is not set, null, or empty, logging is disabled

### Logger Functions

The application uses a centralized logger utility (`src/utils/logger.ts`) that provides the following functions:

```typescript
import { log, warn, error, info, debug } from './utils/logger';

// These functions only log when VITE_CONSOLE is set to 'true'
log('This is a log message');
warn('This is a warning');
error('This is an error');
info('This is info');
debug('This is debug info');
```

### Benefits

- **Security**: No sensitive information is logged to console in production
- **Performance**: Reduces console overhead in production builds
- **Flexibility**: Easy to enable/disable logging without code changes
- **Consistency**: All console logging goes through the same utility

---

## 🌱 About the Name

The name *MiKare* is inspired by a real story — Karen, a mother navigating her daughter Mikaela's diagnosis, built this platform to help others gain clarity and control over long, difficult medical processes. Mikare puts care, knowledge, and support in the hands of the patient.

---

## 🚀 Key Features

- **Patient Profiles**  
  Manage multiple family members, each with their own timeline and records.

- **Diary Timeline**  
  Record appointments, symptoms, diagnoses, and events in a structured, searchable timeline.

- **AI-Transcribed Conversations**  
  Record consultations with doctors and get automatic transcription and summary.

- **Document Repository**  
  Securely upload and store test results, referrals, and discharge letters.

- **Symptom & Medication Tracking**  
  Track symptoms with date ranges and severity, and manage active/inactive medications with dosage and notes.

- **Export to PDF/JSON**  
  Generate structured export packages to share with healthcare professionals.

- **Time Zone Awareness**  
  Ensures accurate timeline tracking across regions.

- **User-Centered Privacy**  
  All data remains in the user's control. Sharing is opt-in and exportable only by the account owner.

---

## ⚙️ Tech Stack

- **Frontend:** React (Web), React Native (Mobile)  
- **Backend:** Supabase (PostgreSQL, Auth, Storage)  
- **AI Services:** Whisper (for transcription), OpenAI (for summarisation and suggestion generation)  
- **Design Language:** TailwindCSS, custom theme based on Teal and Coral palette  
- **Deployment:** Vercel / Expo (recommended)

---
