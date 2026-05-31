import ytDlp from 'yt-dlp-exec'
import { YoutubeTranscript } from 'youtube-transcript'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import path from 'path'
import os from 'os'
import type { VideoMetadata, VideoID } from '@/types'

function detectPlatform(url: string): 'youtube' | 'instagram' {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/instagram\.com/.test(url)) return 'instagram'
  throw new Error(`Unsupported URL. Use a YouTube or Instagram link.`)
}

function extractYouTubeId(url: string): string | null {
  return url.match(/(?:v=|youtu\.be\/|\/embed\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null
}

function formatDate(raw: string): string {
  if (!raw) return 'Unknown'
  if (raw.length === 8) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'en' })
    return items.map((t) => t.text).join(' ')
  } catch {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId)
      return items.map((t) => t.text).join(' ')
    } catch {
      return ''
    }
  }
}

function parseVTT(content: string): string {
  return content
    .split('\n')
    .filter(
      (l) =>
        l.trim() &&
        !l.startsWith('WEBVTT') &&
        !l.includes('-->') &&
        !/^\d+$/.test(l.trim()) &&
        !l.startsWith('NOTE')
    )
    .join(' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function getInstagramTranscript(url: string): Promise<string> {
  const tmpBase = path.join(os.tmpdir(), `reel_${Date.now()}`)

  // Attempt 1: auto-generated subtitles via yt-dlp
  try {
    await (ytDlp as any)(url, {
      writeAutoSub: true,
      subLang: 'en',
      subFormat: 'vtt',
      skipDownload: true,
      output: tmpBase,
      noWarnings: true,
    })
    const vttPath = `${tmpBase}.en.vtt`
    if (existsSync(vttPath)) {
      const { readFile } = await import('fs/promises')
      const vtt = await readFile(vttPath, 'utf-8')
      await unlink(vttPath).catch(() => {})
      const parsed = parseVTT(vtt)
      if (parsed.length > 50) return parsed
    }
  } catch {
    // No subtitles available
  }

  return '' // Falls back to description
}

export async function extractVideoData(
  url: string,
  videoId: VideoID
): Promise<{ metadata: VideoMetadata; transcript: string }> {
  const platform = detectPlatform(url)

  const info = await (ytDlp as any)(url, {
    dumpSingleJson: true,
    noWarnings: true,
    skipDownload: true,
    noCallHome: true,
  })

  const views = info.view_count ?? info.play_count ?? info.repost_count ?? 0
  const likes = info.like_count ?? 0
  const comments = info.comment_count ?? 0
  const followerCount = info.channel_follower_count ?? 0

  const rawTags: string[] = Array.isArray(info.tags) ? info.tags : []
  const descTags: string[] = typeof info.description === 'string'
    ? (info.description.match(/#\w+/g) ?? [])
    : []
  const hashtags = [...new Set([...rawTags, ...descTags])].slice(0, 15)

  const metadata: VideoMetadata = {
    video_id: videoId,
    url,
    platform,
    title: info.title ?? 'Untitled',
    creator: info.channel ?? info.uploader ?? info.creator ?? 'Unknown',
    follower_count: followerCount || null,
    views,
    likes,
    comments,
    upload_date: formatDate(info.upload_date),
    duration: info.duration ?? 0,
    hashtags,
    description: (info.description ?? '').slice(0, 500),
    engagement_rate:
      views > 0
        ? parseFloat(((likes + comments) / views * 100).toFixed(4))
        : followerCount > 0
        ? parseFloat(((likes + comments) / followerCount * 100).toFixed(4))
        : 0,
    thumbnail_url: info.thumbnail ?? null,
  }

  let transcript = ''

  if (platform === 'youtube') {
    const ytId = extractYouTubeId(url)
    if (ytId) transcript = await getYouTubeTranscript(ytId)
  } else {
    transcript = await getInstagramTranscript(url)
  }

  // Fallback: use title + description as semantic context
  if (!transcript.trim()) {
    transcript = `Video Title: ${metadata.title}\nCreator: ${metadata.creator}\n\n${info.description ?? ''}`
  }

  return { metadata, transcript }
}
