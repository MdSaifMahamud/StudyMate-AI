# StudyMate AI

An AI-powered PDF study assistant for students. Upload any PDF, select up to 50 pages, and let AI generate explanations, flashcards, cheat sheets, and quizzes — all grounded in your document.

## Features

| Feature | Description |
|---|---|
| AI Chatbot | Ask questions, get page-referenced answers from selected PDF pages |
| Explanation Generator | 8 styles: Simple, Detailed, Exam-focused, Bangla, and more |
| Flashcard Generator | Auto-generated flip cards with Known/Difficult tracking |
| Cheat Sheet Generator | Printable cheat sheets with key facts and exam points |
| Quiz Generator | MCQs, True/False, Fill-in-blank, Short/Long answer, Viva |
| Exam Mode | Timed quizzes with score reports and weak topic analysis |
| Progress Dashboard | Track performance, identify weak topics, view score history |
| PDF Search | Find any keyword across the entire PDF |
| Multi-language | English, Bangla, English+Bangla, Simple English |
| Tutor Modes | Simple, Exam Coach, Socratic, Revision, Teacher, Bangla |

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Google Gemini (default, free) / Groq / OpenAI / OpenRouter / Together AI / Custom LLM
- **PDF Processing**: pdf-parse
- **UI**: Custom components, react-hot-toast, lucide-react, react-markdown

## Quick Start

### 1. Clone and install

```bash
cd "StudyMate AI"
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In the SQL Editor, run the entire contents of `database/schema.sql`
3. Go to **Storage** → Create a new bucket named `pdfs` (set it as private)
4. Add storage policies (see commented SQL at the bottom of `schema.sql`)

### 3. Get a free AI API key

**Google Gemini (Recommended — free, 1M token context, up to 50 pages)**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create an API key
3. Use model: `gemini-2.0-flash-lite` (free tier)

**Groq (Alternative — free, fast)**
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up and create an API key
3. Use model: `llama-3.3-70b-versatile` (12,000 TPM limit → max ~15 pages)

**OpenRouter (Also free models)**
1. Go to [openrouter.ai](https://openrouter.ai)
2. Create account and get API key
3. Set `AI_PROVIDER=openrouter`

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:

**Google Gemini (recommended):**
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

AI_PROVIDER=custom
AI_API_KEY=your-gemini-api-key
AI_MODEL=gemini-2.0-flash-lite
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Groq:**
```env
AI_PROVIDER=groq
AI_API_KEY=your-groq-api-key
AI_MODEL=llama-3.3-70b-versatile
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
studymate-ai/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   └── signup/page.tsx         # Signup page
│   ├── auth/callback/route.ts      # Supabase auth callback
│   ├── dashboard/page.tsx          # PDF management dashboard
│   ├── study/[pdfId]/page.tsx      # Main study workspace
│   ├── flashcards/[setId]/page.tsx # Flashcard viewer
│   ├── quiz/[quizId]/page.tsx      # Quiz interface + results
│   ├── progress/page.tsx           # Progress tracking
│   ├── api/
│   │   ├── auth/                   # Signup, login, logout
│   │   ├── pdf/                    # Upload, list, delete, search
│   │   ├── chat/                   # AI chatbot
│   │   ├── generate/               # Explanation, flashcards, quiz, cheatsheet
│   │   ├── quiz/submit/            # Quiz submission + scoring
│   │   ├── flashcards/             # Flashcard CRUD
│   │   └── progress/               # Progress stats
│   ├── globals.css
│   └── layout.tsx
├── lib/
│   ├── aiService.ts                # AI provider abstraction
│   ├── pdfService.ts               # PDF text extraction and storage
│   ├── prompts.ts                  # All AI prompt templates
│   ├── supabase.ts                 # Supabase client (browser)
│   ├── supabase-server.ts          # Supabase client (server)
│   └── utils.ts                    # Utility functions
├── types/
│   ├── pdf.ts                      # PDF and session types
│   ├── chat.ts                     # Chat message types
│   ├── flashcard.ts                # Flashcard types
│   └── quiz.ts                     # Quiz and question types
├── database/
│   └── schema.sql                  # Full Supabase schema
├── middleware.ts                   # Auth route protection
├── .env.example                    # Environment variable template
└── README.md
```

## AI Providers

The app uses a provider abstraction in `lib/aiService.ts`. Switch providers by changing `AI_PROVIDER` in `.env.local`:

| Provider | `AI_PROVIDER` | Free Tier | Page Limit | Notes |
|---|---|---|---|---|
| Google Gemini | `custom` + `AI_BASE_URL` | Yes | Up to 50 pages | Recommended — 1M token context |
| Groq | `groq` | Yes | ~15 pages | 12,000 TPM cap on free tier |
| OpenRouter | `openrouter` | Some models | Varies | Free models available |
| Together AI | `together` | Some models | Varies | |
| OpenAI | `openai` | No | Up to 50 pages | Paid |
| Local (Ollama) | `custom` | Yes | Varies | Requires local setup |

## Page Range Limit

The app enforces a maximum of **50 pages per request**. This is validated in `lib/utils.ts` (`validatePageRange`). With Google Gemini's 1M token context, large page ranges are handled without errors. Using Groq's free tier, keep ranges under 15 pages to avoid rate limit errors.

## Hallucination Control

StudyMate AI is designed to minimize hallucinations:

1. **PDF-grounded answers**: Every response uses only the selected page range as context
2. **Page citations**: AI is instructed to cite page numbers in every answer
3. **Not-found handling**: If information isn't in selected pages, AI says so
4. **JSON validation**: Flashcards and quiz questions are parsed from structured JSON
5. **Prompt engineering**: System prompts explicitly forbid inventing facts

## Deployment

### Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard.

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Submit a pull request

## License

MIT License — free to use, modify, and distribute.

---

**StudyMate AI** — Built for students, by students. Study smarter, not harder.
