'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { VideoMetadata } from '@/types'

interface VideoCardProps {
  video: VideoMetadata
  index: number
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toLocaleString()
}

function fmtDuration(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(Math.floor(sec)).padStart(2, '0')}`
}

export function VideoCard({ video, index }: VideoCardProps) {
  const engagementPct = Math.min(video.engagement_rate * 10, 100)
  const barColor =
    video.engagement_rate > 5
      ? 'bg-violet-500'
      : video.engagement_rate > 2
      ? 'bg-purple-400'
      : 'bg-pink-500'

  return (
    <motion.div
      initial={{ opacity: 0, x: index === 0 ? -48 : 48 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
      className="flex-1 min-w-0"
    >
      <Card className="h-full border-[#3D2F61] bg-[#141020]/80 backdrop-blur-sm shadow-xl shadow-purple-950/30">
        <CardHeader className="pb-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs border-[#3D2F61] text-gray-300 bg-[#1A1430]">
              Video {video.video_id}
            </Badge>
            <Badge
              className={`text-xs text-white ${
                video.platform === 'youtube'
                  ? 'bg-red-600'
                  : 'bg-gradient-to-r from-purple-600 to-pink-500'
              }`}
            >
              {video.platform === 'youtube' ? 'YouTube' : 'Instagram'}
            </Badge>
          </div>

          {video.thumbnail_url && (
            <div className="relative rounded-xl overflow-hidden aspect-video bg-[#1A1430] ring-1 ring-purple-900/40">
              <img
                src={video.thumbnail_url}
                alt={video.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).parentElement!.style.display = 'none'
                }}
              />
            </div>
          )}

          <div>
            <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-white">
              {video.title}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {video.creator}
              {video.follower_count && (
                <span className="text-gray-600"> · {fmt(video.follower_count)} followers</span>
              )}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Views', value: video.views === 0 && video.platform === 'instagram' ? 'N/A' : fmt(video.views) },
              { label: 'Likes', value: fmt(video.likes) },
              { label: 'Comments', value: fmt(video.comments) },
            ].map(({ label, value }) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="rounded-xl bg-[#1A1430] border border-[#3D2F61] p-2 text-center"
              >
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-white mt-0.5">{value}</p>
              </motion.div>
            ))}
          </div>

          {/* Engagement Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Engagement Rate</span>
              <span className="text-xs font-bold text-gray-300">
                {video.engagement_rate > 0 ? `${video.engagement_rate.toFixed(2)}%` : 'N/A'}
              </span>
            </div>
            {video.engagement_rate > 0 && (
              <div className="h-1.5 rounded-full bg-[#1A1430]">
                <motion.div
                  className={`h-full rounded-full ${barColor}`}
                  initial={{ width: '0%' }}
                  animate={{ width: `${engagementPct}%` }}
                  transition={{ duration: 0.9, delay: 0.4 + index * 0.15, ease: 'easeOut' }}
                />
              </div>
            )}
          </div>

          <Separator className="bg-purple-900/40" />

          {/* Details */}
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Duration</span>
              <span className="text-gray-300">{fmtDuration(video.duration)}</span>
            </div>
            <div className="flex justify-between">
              <span>Uploaded</span>
              <span className="text-gray-300">{video.upload_date}</span>
            </div>
          </div>

          {video.hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {video.hashtags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 rounded-md bg-[#1A1430] border border-[#3D2F61] text-[10px] text-gray-400"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

