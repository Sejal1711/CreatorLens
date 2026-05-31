'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { URLInputForm } from '@/components/URLInputForm'
import { VideoCard } from '@/components/VideoCard'
import { ChatPanel } from '@/components/ChatPanel'
import type { VideoMetadata } from '@/types'

export default function Home() {
  const [videos, setVideos] = useState<VideoMetadata[]>([])
  const [sessionId, setSessionId] = useState('')

  function handleIngestSuccess(vids: VideoMetadata[], sid: string) {
    setVideos(vids)
    setSessionId(sid)
  }

  function reset() {
    setVideos([])
    setSessionId('')
  }

  return (
    <main className="min-h-screen bg-[#0D0B14] text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {videos.length === 0 ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -16 }}
              className="flex items-center justify-center min-h-[90vh]"
            >
              <URLInputForm onSuccess={handleIngestSuccess} />
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Top bar */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-lg font-bold text-white">Video RAG Analyst</h1>
                  <p className="text-xs text-purple-500">Session {sessionId.slice(0, 8)}…</p>
                </div>
                <button
                  onClick={reset}
                  className="text-xs text-purple-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-purple-900/50 hover:border-purple-700/60 bg-purple-950/30 hover:bg-purple-900/30"
                >
                  ← New analysis
                </button>
              </div>

              {/* Dashboard: 2 video cards + chat */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.25fr] gap-4 h-[calc(100vh-120px)]">
                {videos.map((v, i) => (
                  <VideoCard key={v.video_id} video={v} index={i} />
                ))}
                <div className="h-full min-h-[500px]">
                  <ChatPanel sessionId={sessionId} videoMetadata={videos} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}
