'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { VideoMetadata } from '@/types'

interface URLInputFormProps {
  onSuccess: (videos: VideoMetadata[], sessionId: string) => void
}

type Platform = 'youtube' | 'instagram'

const STEPS = ['Extracting metadata', 'Chunking transcripts', 'Computing embeddings', 'Storing in Pinecone']

const PLACEHOLDERS: Record<Platform, string> = {
  youtube: 'https://youtube.com/watch?v=...',
  instagram: 'https://instagram.com/reel/...',
}

function PlatformToggle({
  value,
  onChange,
  disabled,
}: {
  value: Platform
  onChange: (p: Platform) => void
  disabled: boolean
}) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[#3D2F61] shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('youtube')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
          value === 'youtube'
            ? 'bg-red-600 text-white'
            : 'bg-[#1A1430] text-gray-400 hover:text-white'
        }`}
      >
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
        YouTube
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange('instagram')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${
          value === 'instagram'
            ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white'
            : 'bg-[#1A1430] text-gray-400 hover:text-white'
        }`}
      >
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
        </svg>
        Instagram
      </button>
    </div>
  )
}

export function URLInputForm({ onSuccess }: URLInputFormProps) {
  const [urlA, setUrlA] = useState('')
  const [urlB, setUrlB] = useState('')
  const [platformA, setPlatformA] = useState<Platform>('youtube')
  const [platformB, setPlatformB] = useState<Platform>('instagram')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!urlA.trim() || !urlB.trim()) return

    setLoading(true)
    setError('')
    setStep(0)

    const sessionId = crypto.randomUUID()
    localStorage.setItem('rag_session_id', sessionId)

    const interval = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }, 2500)

    try {
      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urlA: urlA.trim(), urlB: urlB.trim(), sessionId }),
      })

      const data = await res.json()
      clearInterval(interval)

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
        return
      }

      onSuccess(data.videos, sessionId)
    } catch (err) {
      clearInterval(interval)
      setError(err instanceof Error ? err.message : 'Network error')
      setLoading(false)
    }
  }

  const inputs = [
    { id: 'A', url: urlA, setUrl: setUrlA, platform: platformA, setPlatform: setPlatformA },
    { id: 'B', url: urlB, setUrl: setUrlB, platform: platformB, setPlatform: setPlatformB },
  ] as const

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto relative"
    >
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
        <div className="w-[600px] h-[400px] rounded-full bg-purple-700/10 blur-[120px]" />
      </div>

      <div className="text-center mb-10 space-y-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-700/50 bg-purple-900/20 mb-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs text-purple-300 font-medium">AI-Powered Video Analysis</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-bold text-white tracking-tight"
        >
          Video RAG Analyst
        </motion.h1>
        <p className="text-gray-400 text-sm">
          Compare any two social videos — YouTube or Instagram, any combination
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {['LangChain', 'Pinecone', 'Vercel AI SDK', 'Gemini 2.0 Flash'].map((t) => (
            <Badge
              key={t}
              variant="outline"
              className="text-[10px] border-[#3D2F61] text-gray-300 bg-[#1A1430]"
            >
              {t}
            </Badge>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#3D2F61] bg-[#14102080] backdrop-blur-sm p-6 space-y-5 shadow-2xl shadow-purple-950/50">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5">
            {inputs.map(({ id, url, setUrl, platform, setPlatform }) => (
              <div key={id} className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white font-medium shrink-0">Video {id}</span>
                  <PlatformToggle value={platform} onChange={setPlatform} disabled={loading} />
                </div>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={PLACEHOLDERS[platform]}
                  disabled={loading}
                  className="bg-[#0F0C1A] border-[#3D2F61] text-white placeholder:text-gray-600 font-mono text-sm focus-visible:ring-0 focus-visible:border-purple-500"
                />
              </div>
            ))}
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-rose-300 bg-rose-950/30 border border-rose-800/40 rounded-lg px-3 py-2"
            >
              {error}
            </motion.p>
          )}

          <Button
            type="submit"
            disabled={loading || !urlA.trim() || !urlB.trim()}
            className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-purple-900/40 disabled:opacity-40"
          >
            {loading ? 'Analyzing…' : 'Analyze Videos'}
          </Button>
        </form>

        {loading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-2.5 pt-1 border-t border-[#3D2F61]"
          >
            <p className="text-xs text-gray-500 pt-2">Processing…</p>
            {STEPS.map((s, i) => (
              <motion.div
                key={s}
                className="flex items-center gap-3"
                initial={{ opacity: 0.3 }}
                animate={{ opacity: i <= step ? 1 : 0.3 }}
                transition={{ duration: 0.3 }}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 transition-colors ${
                    i < step
                      ? 'bg-purple-500/20 text-purple-400'
                      : i === step
                      ? 'bg-violet-500/20 text-violet-300'
                      : 'bg-[#1A1430] text-gray-600'
                  }`}
                >
                  {i < step ? '✓' : i === step ? (
                    <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                      ↻
                    </motion.span>
                  ) : '○'}
                </div>
                <span className={`text-sm ${i <= step ? 'text-white' : 'text-gray-600'}`}>{s}</span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
