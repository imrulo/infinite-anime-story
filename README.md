# Infinite Interactive Anime Story

An original branching narrative experience where your choices shape an epic shōnen anime story. This is **not a game**—it's an interactive story with continuity, where your decisions create real narrative divergence.

## Features

- **6 Preset Dreams**: Choose your character's driving motivation
- **Branching Narrative**: Your choices create meaningful story divergence
- **Story Panel**: Track Key Items, Current Thread, People, Abilities, and Continuity Flags
- **Anime-Style Images**: Automatically generated illustrations for each story beat
- **Persistence**: Your story progress is saved locally
- **Back Navigation**: Return to previous story beats
- **Original Universe**: Completely original shōnen anime world (no existing IP)

## Tech Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Google Gemini API** (server-side story generation via @google/generative-ai)
  - **FREE TIER ONLY**: Uses free tier models (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash)
  - **Rate limiting**: Built-in protection to stay within free tier limits
- **Pollinations** (client-side image generation)

## Setup

### Prerequisites

- Node.js 18+ and npm
- A Gemini API key (free tier available at [Google AI Studio](https://aistudio.google.com/apikey))

### Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory:
```bash
cp .env.example .env.local
```

4. Add your Gemini API key to `.env.local`:
```
GEMINI_API_KEY=your_gemini_api_key_here
```

### Running Locally

Start the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Manual Vercel Deployment

1. **Push to GitHub**: Ensure your code is in a GitHub repository

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository

3. **Configure Environment Variables**:
   - In the Vercel project settings, go to "Environment Variables"
   - Add `GEMINI_API_KEY` with your Gemini API key value
   - Select all environments (Production, Preview, Development)

4. **Deploy**:
   - Vercel will automatically detect Next.js
   - Click "Deploy"
   - Your app will be live at `your-project.vercel.app`

## Project Structure

```
infinite-anime-story/
├── app/
│   ├── api/
│   │   └── story/
│   │       └── next/
│   │           └── route.ts      # API route for story generation
│   ├── story/
│   │   └── page.tsx               # Story view page
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Home page with Dream selection
│   └── globals.css                # Global styles
├── components/
│   └── StoryPanel.tsx             # Story panel sidebar component
├── lib/
│   ├── pollinations.ts            # Pollinations image URL generator
│   └── storage.ts                 # localStorage utilities
├── types/
│   └── story.ts                   # TypeScript type definitions
├── .env.example                   # Environment variables template
└── README.md                      # This file
```

## How It Works

1. **Dream Selection**: Choose one of 6 preset dreams on the home page
2. **Story Generation**: The server calls Gemini API with a detailed system prompt to generate the next story beat
3. **JSON Validation**: Responses are validated with Zod to ensure strict schema compliance (with retry on invalid JSON)
4. **Image Generation**: Each beat includes an image prompt that's converted to a Pollinations URL
5. **State Management**: Story state (history, current beat, story panel) is saved to localStorage
6. **Continuity**: The story panel tracks items, people, abilities, and flags that persist across beats

## API Route Details

The `/api/story/next` endpoint:
- Accepts: `dream`, `choiceId`, `history`, `storyPanel`
- Returns: `beat`, `storyPanel`, `imagePrompt`, `recapLine`, `nextSignal`
- Uses Google's Gemini API (`gemini-1.5-flash` - FREE TIER ONLY)
- **Rate limiting**: Enforces 10 RPM and 200 daily requests to stay within free tier
- Implements retry logic for invalid JSON responses
- Validates output with Zod schemas
- **Stops immediately** if quota is reached to prevent any charges

## Story Constraints

The system enforces:
- Original universe (no copying existing anime IP)
- Teen-level shōnen tone (danger, rivalry, sacrifice, humor; no explicit gore)
- Anime pacing: Hook → Choice → Turn → Cliffhanger
- Formatting: Inner thoughts in *italics*, techniques in ALL CAPS
- Real choice divergence (not cosmetic changes)

## Environment Variables

- `GEMINI_API_KEY`: Your Gemini API key (required)

## License

This project is open source and available for personal and commercial use.

## FREE TIER PROTECTION ⚠️

**IMPORTANT: This application is configured to use ONLY the free tier and will NEVER charge you.**

### Built-in Protections:
- ✅ **Rate Limiting**: Maximum 10 requests per minute (free tier allows 15)
- ✅ **Daily Limits**: Maximum 200 requests per day (conservative limit)
- ✅ **Model Selection**: Only uses free tier models (gemini-1.5-flash)
- ✅ **Error Handling**: Stops immediately if quota is reached to prevent charges
- ✅ **No Billing**: App will fail gracefully if free tier is exhausted

### Free Tier Limits (Gemini 1.5 Flash):
- **Requests Per Minute (RPM)**: 15 (we use max 10 for safety)
- **Tokens Per Minute (TPM)**: 1,000,000
- **Daily Requests**: Varies by account (we limit to 200 for safety)

### What Happens When Limits Are Reached:
- The app will show a clear error message
- **No charges will occur** - the app stops working instead
- Wait until the quota resets (usually daily) to continue using

### Notes:
- Story generation requires an active internet connection
- Images are generated client-side via Pollinations (no API key needed)
- Story state persists in browser localStorage (cleared on restart)
- **Common "Unauthorized" errors**: Ensure `GEMINI_API_KEY` is set in both `.env.local` (local) and Vercel environment variables (deployment)
- **The app is designed to fail rather than charge you** - this is intentional and protects you from unexpected costs
