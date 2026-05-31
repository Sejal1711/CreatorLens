export type Platform = 'youtube' | 'instagram'
export type VideoID = 'A' | 'B'

export interface VideoMetadata {
  video_id: VideoID
  url: string
  platform: Platform
  title: string
  creator: string
  follower_count: number | null
  views: number
  likes: number
  comments: number
  upload_date: string
  duration: number
  hashtags: string[]
  description: string
  engagement_rate: number
  thumbnail_url: string | null
}

export interface IngestRequest {
  urlA: string
  urlB: string
  sessionId: string
}

export interface IngestResponse {
  success: boolean
  videos: VideoMetadata[]
  error?: string
}

export interface ChatRequest {
  messages: UIMessage[]
  sessionId: string
  videoMetadata: VideoMetadata[]
}

export interface UIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  parts?: MessagePart[]
}

export type MessagePart = TextPart | ToolPart

export interface TextPart {
  type: 'text'
  text: string
}

export interface ToolPart {
  type: string // 'tool-{toolName}'
  toolCallId: string
  state: 'input-streaming' | 'input-available' | 'output-streaming' | 'output-available' | 'output-error'
  input?: unknown
  output?: unknown
  errorText?: string
}

export interface PineconeVideoMetadata {
  video_id: string
  platform: string
  title: string
  creator: string
  follower_count: number
  views: number
  likes: number
  comments: number
  engagement_rate: number
  upload_date: string
  duration: number
  hashtags: string[]
  description: string
  url: string
  thumbnail_url: string
}
