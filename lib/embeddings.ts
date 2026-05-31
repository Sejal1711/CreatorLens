import { GoogleGenerativeAI } from '@google/generative-ai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export const DIMS = 768
const CHUNK_SIZE = 512
const CHUNK_OVERLAP = 50

let genAI: GoogleGenerativeAI | null = null

function getModel() {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!)
  return genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
}

export async function embedText(text: string): Promise<number[]> {
  const result = await getModel().embedContent({
    content: { role: 'user', parts: [{ text: text.slice(0, 8000) }] },
    outputDimensionality: 768,
  } as any)
  return result.embedding.values
}

// 5 parallel per batch, 4s between batches = 75 RPM — under 100 RPM free tier
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5)
    console.log(`[embeddings] ${i + 1}-${Math.min(i + 5, texts.length)}/${texts.length}`)
    const embeddings = await Promise.all(batch.map((t) => embedWithRetry(t)))
    results.push(...embeddings)
    if (i + 5 < texts.length) {
      await new Promise((r) => setTimeout(r, 4000))
    }
  }

  return results
}

async function embedWithRetry(text: string, attempts = 8): Promise<number[]> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await embedText(text)
    } catch (err: any) {
      if (i === attempts - 1) throw err
      const is429 = err.status === 429 || err.message?.includes('429')
      if (!is429) throw err
      // Parse suggested retry delay from API response, add 5s buffer
      const match = err.message?.match(/retry in (\d+(?:\.\d+)?)s/i)
      const delay = (match ? Math.ceil(parseFloat(match[1])) + 5 : 65) * 1000
      console.log(`[embeddings] Rate limited — waiting ${delay / 1000}s (attempt ${i + 1}/${attempts})`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw new Error('Embedding failed after retries')
}

export async function chunkText(text: string): Promise<string[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ['\n\n', '\n', '. ', '! ', '? ', ', ', ' ', ''],
  })
  const chunks = await splitter.splitText(text)
  return chunks.filter((c) => c.trim().length > 30)
}
