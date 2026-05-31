import { Pinecone } from '@pinecone-database/pinecone'
import type { VideoID, PineconeVideoMetadata } from '@/types'

let client: Pinecone | null = null

function getPinecone(): Pinecone {
  if (!client) {
    client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
  }
  return client
}

export function getNamespace(sessionId: string) {
  return getPinecone()
    .index(process.env.PINECONE_INDEX_NAME!)
    .namespace(sessionId)
}

export async function ensureIndexExists() {
  console.log('[pinecone] Connecting...')
  const pc = getPinecone()
  const name = process.env.PINECONE_INDEX_NAME!
  console.log(`[pinecone] Listing indexes (key: ${process.env.PINECONE_API_KEY?.slice(0, 12)}...)`)
  const list = await pc.listIndexes()
  console.log('[pinecone] Indexes found:', list.indexes?.map((i) => i.name))
  const exists = list.indexes?.some((i) => i.name === name)

  if (!exists) {
    console.log(`[pinecone] Creating index "${name}" with dim=768`)
    await pc.createIndex({
      name,
      dimension: 768,
      metric: 'cosine',
      spec: { serverless: { cloud: 'aws', region: 'us-east-1' } },
    })
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000))
      const desc = await pc.describeIndex(name)
      console.log(`[pinecone] Index status: ${desc.status?.ready ? 'ready' : 'not ready'}`)
      if (desc.status?.ready) break
    }
  } else {
    console.log(`[pinecone] Index "${name}" already exists ✓`)
  }
}

export async function upsertVideoData(
  sessionId: string,
  videoId: VideoID,
  metadata: PineconeVideoMetadata,
  metaEmbedding: number[],
  chunks: { text: string; embedding: number[] }[]
) {
  const ns = getNamespace(sessionId)

  const vectors = [
    {
      id: `${videoId}_meta`,
      values: metaEmbedding,
      metadata: {
        chunk_type: 'metadata',
        ...metadata,
      },
    },
    ...chunks.map((chunk, i) => ({
      id: `${videoId}_chunk_${i}`,
      values: chunk.embedding,
      metadata: {
        chunk_type: 'transcript',
        video_id: metadata.video_id,
        chunk_index: i,
        text: chunk.text,
        title: metadata.title,
        creator: metadata.creator,
        platform: metadata.platform,
        url: metadata.url,
      },
    })),
  ]

  console.log(`[pinecone] Upserting ${vectors.length} vectors for video ${videoId}`)
  for (let i = 0; i < vectors.length; i += 100) {
    await ns.upsert(vectors.slice(i, i + 100))
    console.log(`[pinecone] Upserted batch ${i / 100 + 1}`)
  }
  console.log(`[pinecone] Done upserting video ${videoId}`)
}

export async function searchTranscripts(
  sessionId: string,
  queryEmbedding: number[],
  videoId?: VideoID
) {
  const ns = getNamespace(sessionId)
  const filter: Record<string, unknown> = { chunk_type: { $eq: 'transcript' } }
  if (videoId) filter['video_id'] = { $eq: videoId }

  return ns.query({
    vector: queryEmbedding,
    topK: 6,
    filter,
    includeMetadata: true,
  })
}

export async function fetchVideoMetadata(sessionId: string, videoId?: VideoID) {
  const ns = getNamespace(sessionId)
  const ids = videoId ? [`${videoId}_meta`] : ['A_meta', 'B_meta']
  return ns.fetch(ids)
}
