import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import DPlayer from 'dplayer';
import { getCustomPlayerUrl, getCorsProxies } from '../services/maccms';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  key?: string | number;
  initialProgress?: number;
  onProgress?: (progress: number, duration: number) => void;
}

export default function VideoPlayer({ url, poster, initialProgress, onProgress }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const customPlayerUrl = getCustomPlayerUrl();
  const proxies = getCorsProxies();
  const defaultProxy = proxies.find(p => p.id === 'default')?.url || '';
  const shuntProxy = proxies.find(p => p.id === 'shunt')?.url || '';
  
  const [error, setError] = useState<string | null>(null);
  const [proxyMode, setProxyMode] = useState<'direct' | 'default' | 'shunt'>('direct');
  const [retryCount, setRetryCount] = useState(0);

  const getActiveProxy = () => {
    if (proxyMode === 'default') return defaultProxy;
    if (proxyMode === 'shunt') return shuntProxy;
    return '';
  };

  const currentProxy = getActiveProxy();
  const videoUrl = currentProxy ? `${currentProxy}${encodeURIComponent(url)}` : url;

  const handleRetry = async () => {
    setError(null);
    if (proxyMode === 'direct') {
      console.log('[VideoPlayer] Retrying with default proxy...');
      setProxyMode('default');
    } else if (proxyMode === 'default') {
      console.log('[VideoPlayer] Retrying with shunt proxy...');
      setProxyMode('shunt');
    } else if (proxyMode === 'shunt') {
      console.log('[VideoPlayer] Retrying with default proxy again...');
      setProxyMode('default');
      setRetryCount(prev => prev + 1);
    }
  };

  useEffect(() => {
    if (customPlayerUrl) return;
    if (!containerRef.current || !videoUrl) return;

    setError(null);
    console.log('[VideoPlayer] Initializing with URL:', videoUrl);

    const dp = new DPlayer({
      container: containerRef.current,
      video: {
        url: videoUrl,
        pic: poster,
        type: videoUrl.includes('.m3u8') || videoUrl.includes('m3u8') ? 'customHls' : 'auto',
        customType: {
          customHls: function (video: HTMLVideoElement, player: any) {
            if (Hls.isSupported()) {
              const hls = new Hls({
                maxBufferLength: 30,
                maxMaxBufferLength: 600,
                enableWorker: true,
                xhrSetup: (xhr) => {
                  xhr.withCredentials = false;
                }
              });
              hls.loadSource(videoUrl);
              hls.attachMedia(video);
              player.events.on('destroy', () => {
                hls.destroy();
              });
              
              hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                  switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                      console.error('[VideoPlayer] HLS Network Error', data);
                      if (retryCount < 3) {
                        setError('网络连接失败，正在尝试自动切换代理...');
                        setTimeout(() => {
                          handleRetry();
                        }, 1000);
                      } else {
                        setError('多次尝试切换代理失败，请检查网络或尝试换源。');
                      }
                      hls.startLoad();
                      break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                      console.error('[VideoPlayer] HLS Media Error', data);
                      setError('媒体解码失败，请尝试换源');
                      hls.recoverMediaError();
                      break;
                    default:
                      console.error('[VideoPlayer] HLS Fatal Error', data);
                      setError('播放器发生致命错误，请尝试换源');
                      hls.destroy();
                      break;
                  }
                }
              });
            } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
              video.src = videoUrl;
            }
          },
        },
      },
      autoplay: true,
      theme: '#f43f5e',
      hotkey: true,
      preload: 'auto',
    });

    dp.on('error', (e: any) => {
      console.error('[VideoPlayer] DPlayer Error:', e);
      const video = containerRef.current?.querySelector('video');
      let details = '';
      if (video?.error) {
        switch (video.error.code) {
          case 1: details = ' (用户终止)'; break;
          case 2: details = ' (网络错误)'; break;
          case 3: details = ' (解码错误)'; break;
          case 4: details = ' (资源不支持)'; break;
        }
      }
      setError(`播放器加载失败${details}，正在尝试自动切换代理...`);
      setTimeout(() => {
        handleRetry();
      }, 1000);
    });

    if (initialProgress && initialProgress > 0) {
      dp.on('loadedmetadata', () => {
        // Seek if duration is not available yet (NaN/Infinity) or if progress is less than duration
        if (!dp.video.duration || !isFinite(dp.video.duration) || initialProgress < dp.video.duration - 2) {
          dp.seek(initialProgress);
        }
      });
    }

    if (onProgress) {
      dp.on('timeupdate', () => {
        if (dp.video.currentTime > 0 && dp.video.duration > 0) {
          onProgress(dp.video.currentTime, dp.video.duration);
        }
      });
    }

    return () => {
      dp.destroy();
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
                  onClick={() => handleRetry()}
                  className="flex items-center gap-2 px-6 py-2 bg-bg-accent hover:opacity-90 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-bg-accent/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试播放
                </button>
              </div>
              <p className="mt-6 text-xs text-text-muted/50">提示: 正在使用 {proxyMode === 'direct' ? '直连' : proxyMode === 'default' ? '默认代理' : '分流代理'} 模式</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
