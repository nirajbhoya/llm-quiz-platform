# LLM Quiz & Contest Platform

A comprehensive platform for quizzes and contests, empowering students, parents, and admins with AI-driven insights and content generation. This project uses an AI LLM to dynamically generate syllabus-aware quiz questions, explanations, and context for users.

## 🚀 Key Features

### Role-Based Access
- **Admin**: Create and manage boards/syllabuses, manage contests (draft, schedule, live, completed), view leaderboards, and system settings.
- **Student**: Take quizzes based on syllabus selection (Learning Mode), participate in live contests, review detailed explanations, and track learning progress with analytics.
- **Parent**: Monitor the performance, accuracy, and analytics of their linked children.

### AI-Powered Dynamic Content Focus
- Intelligent generation of syllabus-aware quiz questions using external LLM Providers (e.g., Groq using Llama models).
- High-quality, context-aware explanations for all quiz solutions.

### Contests & Quizzes
- **Contest Mode**: Live execution with leaderboards, timed participation, and scheduled availability.
- **Learning Mode**: On-demand practice quizzes based on explicit board -> class -> subject -> chapter hierarchy.

### Analytics
- Custom dashboards detailing accuracy, correct answers, total attempts on a per-chapter, per-subject basis for rigorous granular tracking.

---

## 🛠️ Tech Stack & Architecture

### Backend Stack
- **Environment**: Node.js (v18+) uses TypeScript.
- **Framework**: Express.js with `express-validator` and `cors`.
- **Database**: MongoDB utilizing `mongoose` ODM.
- **Authentication**: JWT based endpoint security, `bcryptjs` for secure password caching.
- **External Services**: Integrates heavily with OpenAI APIs/Groq LLM models and uses `nodemailer` for SMTP emails.

### Frontend Stack
- **Framework**: React 19+ built with Vite.
- **Styling**: TailwindCSS & PostCSS for a fully responsive, modern look.
- **State Management**: Modern React Hooks and Contexts.
- **Routing**: `react-router-dom` v7+.
- **Charts/Dashboard**: `recharts` for scalable visual insights.

---

## 📦 Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- [MongoDB](https://www.mongodb.com/) (Local installation or MongoDB Atlas cluster)
- Git

### 1. Clone the repository
```bash
git clone <your-github-repo-url>
cd llm-quiz-platform
```

### 2. Backend Configuration
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory relying on the variables found in `backend/.env.example`:
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/llm_quiz_platform
JWT_SECRET=super_secret_jwt_signature_key

# AI Configuration (e.g. using Groq)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-8b-instant

# Email Notifications Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password
MAIL_FROM="LLM Quiz Platform <no-reply@example.com>"
```

Start the backend environment:
```bash
npm run dev
```

### 3. Frontend Configuration
Open a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory (to point to the backend):
```env
VITE_API_URL=http://localhost:4000/api
```

Start the React client:
```bash
npm run dev
```

---

## 🏗️ Core Application Entities

### Data Models
1. **User (Student/Admin)**: Holds platform credentials, standard, and linked parent details.
2. **Parent**: Allows account tracking and bundles array of child student accounts.
3. **Board**: Defines the overarching hierarchy `Board → Standard → Subject → Chapter`.
4. **Contest & Quiz**: Quizzes generated via templates. Tracking questions, standard options, correctly indexed answers, and LLM text explanations.
5. **Submission**: Audits how students responded to each prompt, timing factors, and calculated score/accuracy markers.

---

## 🔐 Auth & Endpoints Highlights

- `/api/auth/register-student`, `/api/auth/register-parent`, `/api/auth/register-admin`
- `/api/boards`: Full CRUD mapping out educational domains.
- `/api/learning/quiz`: Hit by students referencing their syllabus path to spawn dynamic study tests.
- `/api/contests`: Lifecycle (Admin sets up template `->` User attempts mapped test `->` Evaluated endpoints calculate rank leaderboard).
- `/api/submissions/:quizId/submit`: Process student answers, returning score data dynamically comparing selections against `correctOptionIndex`.
- `/api/analytics`: Pull customized reporting payload depending on JWT inferred role (`student` individual map, `parent` nested aggregation).

---
## 💡 Troubleshooting & Diagnostics
Check the `/health` payload to ensure backend services (API + MongoDB) are connected, or test LLM api key validity via `/api/diagnostics/llm` ensuring your active `.env` configuration is actively recognized by the Express runtime.
