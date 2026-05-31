# Video RAG Analyst

A full-stack RAG chatbot that ingests two social media videos (YouTube + Instagram), embeds their transcripts into Pinecone, and lets you chat with an AI analyst that cites sources and maintains memory across turns.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router) | Full-stack Node.js, zero-config deploys |
| AI Streaming | Vercel AI SDK v6 | Native SSE streaming, tool-calling hooks, `useChat` |
| Orchestration | LangChain.js (`@langchain/textsplitters`) | Battle-tested chunking; used for RecursiveCharacterTextSplitter |
| Embeddings | `text-embedding-3-small` (OpenAI) | $0.02/1M tokens — 5× cheaper than `large`, 95% of the quality |
| Vector DB | Pinecone (serverless) | Managed, 5M-vector free tier, sub-10ms query latency |
| LLM | `gpt-4o-mini` | 60× cheaper than GPT-4o; sufficient accuracy for RAG synthesis |
| Transcripts | `youtube-transcript` (YT) + `yt-dlp` + Whisper (IG) | Free YT captions first; Whisper only when necessary |
| UI | shadcn/ui + Framer Motion | Fast, accessible components; zero-jank animations |

## Architecture

```
User submits 2 URLs
      │
      ▼
POST /api/ingest
  ├── yt-dlp → metadata (views, likes, comments, follower count, duration)
  ├── youtube-transcript / yt-dlp+Whisper → full transcript
  ├── LangChain RecursiveCharacterTextSplitter (512 tokens, 50 overlap)
  ├── OpenAI text-embedding-3-small (batched, 1536 dims)
  └── Pinecone upsert (namespace = sessionId)

User asks question
      │
      ▼
POST /api/chat  (Vercel AI SDK streamText)
  ├── convertToModelMessages(UIMessage[]) → CoreMessage[]
  ├── Tool: searchVideoContent → embed query → Pinecone query → top-6 chunks
  ├── Tool: getVideoMetadata  → Pinecone fetch by ID
  └── gpt-4o-mini generates → toUIMessageStreamResponse()
      │
      ▼
useChat (@ai-sdk/react) streams tokens + tool steps to UI
```

**Agentic RAG**: The LLM decides _when_ and _what_ to retrieve — it's not a fixed retrieve-then-generate pipeline. With `stopWhen: stepCountIs(5)`, it can call multiple tools per turn, enabling multi-hop reasoning (e.g. get metadata → search for hook content → compare → synthesize).

## Setup

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env.local
# Fill in OPENAI_API_KEY and PINECONE_API_KEY

# 3. Create Pinecone index
# In the Pinecone console: dimension=1536, metric=cosine, serverless (AWS us-east-1)
# Name it "video-rag" (or update PINECONE_INDEX_NAME)

# 4. Install yt-dlp (required for Instagram + YT metadata fallback)
# Windows: winget install yt-dlp   OR   pip install yt-dlp
# Mac:     brew install yt-dlp
# Linux:   pip install yt-dlp

# 5. Run
npm run dev
```

Open http://localhost:3000, paste a YouTube URL + Instagram Reel URL, click Analyze.

## Cost at 1,000 creators/day

| Component | Per creator | 1,000/day | Monthly |
|---|---|---|---|
| Transcription (Whisper, ~10 min avg) | $0.06 | $60/day | $1,800 |
| Embeddings (text-embedding-3-small) | $0.0001 | $0.10 | $3 |
| Chat (gpt-4o-mini, 10 turns) | $0.003 | $3/day | $90 |
| Pinecone (Starter → Standard) | — | — | $70 |
| **Total** | **~$0.063** | **~$63/day** | **~$1,963** |

**vs GPT-4o**: Would cost ~$3/creator in chat alone = $3,000/day. Our stack is **47× cheaper** on LLM costs.

**Biggest optimization lever**: YouTube videos already have free captions — Whisper is only called for Instagram. Switching to `faster-whisper` (self-hosted) would cut transcription cost to ~$0.01/min on a cheap GPU server.

**At 10,000 creators/day**: Same cost structure scales linearly. Pinecone Standard plan ($70/mo) handles 50M+ vectors. Main bottleneck is Whisper API throughput — use AssemblyAI's async batch endpoint for 10× throughput at similar cost.

## Chunk strategy rationale

- **512 tokens**: Fits ~3–5 sentences, preserving semantic coherence without diluting relevance signal
- **50 token overlap**: Prevents context breaks at chunk boundaries
- **RecursiveCharacterTextSplitter**: Respects sentence/paragraph structure — cleaner splits than fixed character splitting
- **Why not 1024?**: Longer chunks reduce precision in retrieval; shorter chunks lose context. 512 is the empirically validated sweet spot for RAG on conversational/narrative content.

## Project structure

```
app/
  api/
    ingest/route.ts   # Extraction → chunking → embedding → Pinecone upsert
    chat/route.ts     # streamText with tool calling → UIMessageStream
  page.tsx            # Client page, AnimatePresence form ↔ dashboard
  layout.tsx
components/
  VideoCard.tsx       # Animated metadata card with engagement bar
  ChatPanel.tsx       # useChat + streaming tool step visualization
  URLInputForm.tsx    # URL input with animated progress steps
lib/
  pinecone.ts         # Pinecone client, upsert, search, fetch helpers
  embeddings.ts       # OpenAI embedding + LangChain text chunking
  video-extractor.ts  # yt-dlp + youtube-transcript + Whisper fallback
types/
  index.ts            # Shared TypeScript types
```
