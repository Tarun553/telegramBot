# AI Khata Bot - Next.js Application

This is the core application for the **AI Khata Bot**, an AI-powered bookkeeping assistant designed for small shop owners. It integrates a Telegram bot with a web dashboard to provide a seamless natural language experience for business tracking.

## 🚀 Key Features

- **Natural Language Input**: Supports Hindi, Hinglish, and English (e.g., "Ramesh ko 250 udhar", "aaj ki sale kitni hui").
- **Intent Parsing**: Uses Google Gemini AI to extract structured data (sales, credits, payments) from messages.
- **Multi-Platform Support**: Telegram integration (MVP) with future plans for WhatsApp.
- **Web Dashboard**: A modern Next.js dashboard for visualizing today's sales, credit lists, and business summaries.
- **AI Insights**: Provides human-friendly Hindi replies and business summaries.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/)
- **Language**: TypeScript
- **Database**: PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Authentication**: [Clerk](https://clerk.com/)
- **AI**: [Google Gemini Pro](https://ai.google.dev/)
- **Styling**: Tailwind CSS 4, Lucide React icons
- **Messaging**: Telegram Bot API
- **Caching/Queue**: [Upstash Redis](https://upstash.com/)

## ⚙️ Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm/yarn/pnpm.
- A PostgreSQL database (e.g., Neon).
- A Clerk account for authentication.
- A Google AI Studio API Key for Gemini.
- A Telegram Bot Token from @BotFather.

### 2. Environment Variables

Create a `.env` file in the `bot/` directory and add the following:

```env
DATABASE_URL="your_postgresql_url"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="your_clerk_publishable_key"
CLERK_SECRET_KEY="your_clerk_secret_key"

GEMINI_API_KEY="your_gemini_api_key"

TELEGRAM_TOKEN="your_telegram_bot_token"

UPSTASH_REDIS_REST_URL="your_upstash_redis_url"
UPSTASH_REDIS_REST_TOKEN="your_upstash_redis_token"
```

### 3. Installation

```bash
cd bot
npm install
```

### 4. Database Migration

```bash
npx prisma db push
```

### 5. Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 📁 Folder Structure

- `app/`: Next.js pages and API route handlers (Telegram webhooks, transactions).
- `components/`: Reusable UI components (Shadcn UI).
- `lib/`: Core logic including Gemini integration, Prisma client, and intent parsing.
- `prisma/`: Database schema definitions.
- `public/`: Static assets.

## 📄 License

This project is private and for internal use only.
