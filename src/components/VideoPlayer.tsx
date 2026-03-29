import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import { getCustomPlayerUrl, getCorsProxies } from '../services/maccms';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  key?: string | number;
  initialProgress?: number;
  onProgress?: (progress: number, duration: number) => void;
}

export default function VideoPlayer({ url, poster, initialProgress, onProgress }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const customPlayerUrl = getCustomPlayerUrl();
  const proxies = getCorsProxies();
  const defaultProxy = proxies.find(p => p.id === 'default')?.url || '';
  const cfCdn2Proxy = proxies.find(p => p.id === 'cf-cdn2')?.url || '';
  
  const [error, setError] = useState<string | null>(null);
  const [proxyMode, setProxyMode] = useState<'default' | 'cf-cdn2'>('default');

  const getActiveProxy = () => {
    if (proxyMode === 'default') return defaultProxy;
    if (proxyMode === 'cf-cdn2') return cfCdn2Proxy;
    return defaultProxy;
  };

  const videoUrl = React.useMemo(() => {
    if (!url) return '';
    // 如果 URL 已经是代理 URL，则不再重复代理
    if (url.includes('video-api.250221.xyz') || url.includes('takaosakuma.dpdns.org')) {
      return url;
    }
    const currentProxy = getActiveProxy();
    return currentProxy ? `${currentProxy}${encodeURIComponent(url)}` : url;
  }, [url, proxyMode, defaultProxy, cfCdn2Proxy]);

  const handleRetry = () => {
    setError(null);
    if (proxyMode === 'default') {
      console.log('[VideoPlayer] Switching to CF-CDN2...');
      setProxyMode('cf-cdn2');
    } else {
      console.log('[VideoPlayer] Switching back to CF-CDN1...');
      setProxyMode('default');
    }
  };

  useEffect(() => {
    if (customPlayerUrl) return;
    if (!containerRef.current || !videoUrl) return;

    setError(null);
    console.log('[VideoPlayer] Initializing with ArtPlayer URL:', videoUrl);

    const art = new Artplayer({
      container: containerRef.current,
      url: videoUrl,
      poster: poster,
      autoplay: true,
      autoSize: true,
      autoMini: true,
      loop: false,
      flip: true,
      playbackRate: true,
      aspectRatio: true,
      setting: true,
      hotkey: true,
      pip: true,
      mutex: true,
      fullscreen: true,
      fullscreenWeb: true,
      subtitleOffset: true,
      miniProgressBar: true,
      lock: true,
      fastForward: true,
      autoPlayback: true,
      theme: theme === 'dark' ? '#f43f5e' : 
             theme === 'day' ? '#2563eb' : 
             theme === 'night' ? '#8b5cf6' : 
             theme === 'girl' ? '#ec4899' : 
             theme === 'sunset' ? '#f59e0b' : 
             theme === 'ocean' ? '#0ea5e9' : 
             theme === 'forest' ? '#10b981' : '#f43f5e',
      volume: 0.7,
      isLive: false,
      autoOrientation: true,
      airplay: true,
      customType: {
        m3u8: playHls,
        hls: playHls,
        'application/x-mpegURL': playHls,
        'application/vnd.apple.mpegurl': playHls,
      },
      settings: [
        {
          html: '画质',
          width: 150,
          selector: [
            {
              default: true,
              html: '自动',
            },
            {
              html: '1080P',
            },
            {
              html: '720P',
            },
            {
              html: '480P',
            },
          ],
          onSelect: function (item) {
            console.info('Quality switched to', item.html);
            return item.html;
          },
        },
      ],
      moreVideoAttr: {
        crossOrigin: 'anonymous',
      },
    });

    function playHls(video: HTMLVideoElement, url: string) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          enableWorker: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          }
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('[VideoPlayer] HLS Fatal Error', data);
            setError('播放失败，正在尝试切换代理...');
            handleRetry();
          }
        });

        art.on('destroy', () => {
          hls.destroy();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      }
    }

    art.on('ready', () => {
      if (initialProgress && initialProgress > 0) {
        art.currentTime = initialProgress;
      }
    });

    art.on('video:error', (e: any) => {
      console.error('[VideoPlayer] ArtPlayer Error:', e);
      setError('播放失败，正在尝试切换代理...');
      handleRetry();
    });

    if (onProgress) {
      art.on('video:timeupdate', () => {
        if (art.currentTime > 0 && art.duration > 0) {
          onProgress(art.currentTime, art.duration);
        }
      });
    }

    return () => {
      if (art && art.destroy) {
        art.destroy();
      }
    };
  }, [videoUrl, poster, customPlayerUrl]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10">
      {customPlayerUrl ? (
        <iframe
          src={`${customPlayerUrl}${encodeURIComponent(url)}${initialProgress ? `&time=${initialProgress}&t=${initialProgress}` : ''}`}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; fullscreen"
        />
      ) : (
        <>
          <div ref={containerRef} className="w-full h-full" />
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center animate-in fade-in duration-300">
              <AlertCircle className="w-12 h-12 text-bg-accent mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">播放失败</h3>
              <p className="text-text-muted text-sm mb-6 max-w-xs">{error}</p>
              <div className="flex flex-wrap justify-center gap-4">
                <button 
                  onClick={() => {
                    const errorInfo = {
                      url,
                      videoUrl,
                      proxyMode,
                      userAgent: navigator.userAgent,
                      error
                    };
                    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
                    alert('错误详情已复制到剪贴板');
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-bg-card hover:bg-bg-card/80 text-text-main rounded-full text-sm font-medium transition-all border border-border-main"
                >
                  复制错误
                </button>
                <button 
                  onClick={() => {
                    setProxyMode('default');
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-6 py-2 bg-bg-card hover:bg-bg-card/80 text-text-main rounded-full text-sm font-medium transition-all border border-border-main"
                >
                  <RefreshCw className="w-4 h-4" />
                  重置播放
                </button>
                <button 
                  onClick={() => handleRetry()}
                  className="flex items-center gap-2 px-6 py-2 bg-bg-accent hover:opacity-90 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-bg-accent/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  切换代理
                </button>
              </div>
              <p className="mt-6 text-xs text-text-muted/50">提示: 正在使用 {proxyMode === 'default' ? 'CF-CDN1 (默认)' : 'CF-CDN2'} 代理模式</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
