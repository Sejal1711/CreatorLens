import { streamText, tool, stepCountIs, convertToModelMessages } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { searchTranscripts, fetchVideoMetadata } from '@/lib/pinecone'
import { embedText } from '@/lib/embeddings'
import type { VideoMetadata } from '@/types'

export const maxDuration = 60

export async function POST(req: Request) {
  const { messages, sessionId, videoMetadata } = (await req.json()) as {
    messages: any[]
    sessionId: string
    videoMetadata: VideoMetadata[]
  }

  if (!sessionId) {
    return new Response('sessionId required', { status: 400 })
  }

  const [vidA, vidB] = videoMetadata ?? []

  const system = `You are an expert social media analytics consultant.

You have access to two ingested videos:
- Video A: "${vidA?.title ?? 'Unknown'}" by ${vidA?.creator ?? 'Unknown'} (${vidA?.platform ?? 'unknown'})
- Video B: "${vidB?.title ?? 'Unknown'}" by ${vidB?.creator ?? 'Unknown'} (${vidB?.platform ?? 'unknown'})

RULES:
1. Always call tools to get real data — never invent or guess numbers.
2. For content questions (hooks, topics, narrative), call searchVideoContent.
3. For metrics (views, likes, engagement), call getVideoMetadata.
4. Cite sources explicitly: e.g. "Video A chunk 3 states: '...'".
5. Be data-driven, specific, and actionable.`

  // convertToModelMessages is async in v6
  const modelMessages = await convertToModelMessages(messages)

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system,
    messages: modelMessages,
    stopWhen: stepCountIs(5),
    tools: {
      searchVideoContent: tool({
        description:
          'Search transcript chunks for relevant content, topics, or phrases. Always call this before answering questions about what was said in a video.',
        inputSchema: z.object({
          query: z.string().describe('What to look for in the transcript'),
          videoId: z
            .enum(['A', 'B', 'both'])
            .describe('Which video to search'),
        }),
        execute: async (input) => {
          const { query, videoId } = input as { query: string; videoId: 'A' | 'B' | 'both' }
          const embedding = await embedText(query)
          const targetId = videoId === 'both' ? undefined : videoId
          const res = await searchTranscripts(sessionId, embedding, targetId)

          if (!res.matches?.length) {
            return { found: false, message: 'No matching content.' }
          }

          return {
            found: true,
            results: res.matches.map((m) => ({
              video_id: m.metadata?.video_id,
              chunk_index: m.metadata?.chunk_index,
              text: m.metadata?.text,
              score: Number((m.score ?? 0).toFixed(3)),
              title: m.metadata?.title,
              creator: m.metadata?.creator,
            })),
          }
        },
      }),

      getVideoMetadata: tool({
        description:
          'Retrieve video metadata: views, likes, comments, engagement rate, creator, follower count, duration, upload date, hashtags.',
        inputSchema: z.object({
          videoId: z
            .enum(['A', 'B', 'both'])
            .describe('Which video to get metadata for'),
        }),
        execute: async (input) => {
          const { videoId } = input as { videoId: 'A' | 'B' | 'both' }
          const targetId = videoId === 'both' ? undefined : videoId
          const res = await fetchVideoMetadata(sessionId, targetId)
          const records = res.records ?? {}

          const ids = videoId === 'both' ? ['A_meta', 'B_meta'] : [`${videoId}_meta`]

          const videos = ids
            .map((id) => records[id]?.metadata)
            .filter(Boolean)
            .map((m: any) => ({
              video_id: m.video_id,
              title: m.title,
              creator: m.creator,
              platform: m.platform,
              follower_count: m.follower_count === -1 ? null : m.follower_count,
              views: m.views,
              likes: m.likes,
              comments: m.comments,
              engagement_rate: m.engagement_rate,
              upload_date: m.upload_date,
              duration: m.duration,
              hashtags: m.hashtags,
              url: m.url,
            }))

          return videos.length
            ? { videos }
            : { error: 'Metadata not found. Ensure videos were ingested.' }
        },
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
