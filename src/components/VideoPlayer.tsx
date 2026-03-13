import React, { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import DPlayer from 'dplayer';
import { getCustomPlayerUrl } from '../services/maccms';

interface VideoPlayerProps {
  url: string;
  poster?: string;
}

export default function VideoPlayer({ url, poster }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const customPlayerUrl = getCustomPlayerUrl();

  useEffect(() => {
    if (customPlayerUrl) return;
    if (!containerRef.current || !url) return;

    const dp = new DPlayer({
      container: containerRef.current,
      video: {
        url: url,
        pic: poster,
        type: url.includes('.m3u8') ? 'customHls' : 'auto',
        customType: {
          customHls: function (video: HTMLVideoElement, player: any) {
            const hls = new Hls({
              maxBufferLength: 30,
              maxMaxBufferLength: 600,
            });
            hls.loadSource(video.src);
            hls.attachMedia(video);
            player.events.on('destroy', () => {
              hls.destroy();
            });
          },
        },
      },
      autoplay: true,
      theme: '#f43f5e', // rose-500
      hotkey: true,
      preload: 'auto',
    });

    return () => {
      dp.destroy();
    };
  }, [url, poster, customPlayerUrl]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      {customPlayerUrl ? (
        <iframe
          src={`${customPlayerUrl}${encodeURIComponent(url)}`}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      ) : (
        <div ref={containerRef} className="w-full h-full" />
      )}
    </div>
  );
}
