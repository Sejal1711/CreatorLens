import { NextRequest, NextResponse } from 'next/server'
import { extractVideoData } from '@/lib/video-extractor'
import { chunkText, embedBatch } from '@/lib/embeddings'
import { ensureIndexExists, upsertVideoData } from '@/lib/pinecone'
import type { VideoMetadata, PineconeVideoMetadata } from '@/types'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const { urlA, urlB, sessionId } = await req.json()

    if (!urlA || !urlB || !sessionId) {
      return NextResponse.json(
        { error: 'urlA, urlB, and sessionId are required' },
        { status: 400 }
      )
    }

    await ensureIndexExists()

    // Extract both videos in parallel
    const [dataA, dataB] = await Promise.all([
      extractVideoData(urlA, 'A'),
      extractVideoData(urlB, 'B'),
    ])

    // Sequential to respect Gemini free-tier rate limits
    await processAndStore(sessionId, dataA)
    await processAndStore(sessionId, dataB)

    return NextResponse.json({
      success: true,
      videos: [dataA.metadata, dataB.metadata],
    })
  } catch (err) {
    console.error('[/api/ingest]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Processing failed' },
      { status: 500 }
    )
  }
}

async function processAndStore(
  sessionId: string,
  data: { metadata: VideoMetadata; transcript: string }
) {
  const { metadata, transcript } = data

  const chunks = await chunkText(transcript)

  // Single batched embedding call: metadata summary + all chunks
  const metaSummary = `${metadata.title} by ${metadata.creator}. Platform: ${metadata.platform}. Engagement: ${metadata.engagement_rate.toFixed(2)}%. Views: ${metadata.views}, Likes: ${metadata.likes}, Comments: ${metadata.comments}.`

  const [metaEmbedding, ...chunkEmbeddings] = await embedBatch([
    metaSummary,
    ...chunks,
  ])

  const pineconeMetadata: PineconeVideoMetadata = {
    video_id: metadata.video_id,
    platform: metadata.platform,
    title: metadata.title,
    creator: metadata.creator,
    follower_count: metadata.follower_count ?? -1,
    views: metadata.views,
    likes: metadata.likes,
    comments: metadata.comments,
    engagement_rate: metadata.engagement_rate,
    upload_date: metadata.upload_date,
    duration: metadata.duration,
    hashtags: metadata.hashtags,
    description: metadata.description,
    url: metadata.url,
    thumbnail_url: metadata.thumbnail_url ?? '',
  }

  await upsertVideoData(
    sessionId,
    metadata.video_id,
    pineconeMetadata,
    metaEmbedding,
    chunks.map((text, i) => ({ text, embedding: chunkEmbeddings[i] }))
  )
}
