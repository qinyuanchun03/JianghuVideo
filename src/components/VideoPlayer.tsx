import React, { useEffect, useRef, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
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
  const [proxyMode, setProxyMode] = useState<'direct' | 'default' | 'shunt' | 'server'>('direct');
  const [retryCount, setRetryCount] = useState(0);

  const getActiveProxy = () => {
    if (proxyMode === 'default') return defaultProxy;
    if (proxyMode === 'shunt') return shuntProxy;
    if (proxyMode === 'server') return '/api/proxy/m3u8?url=';
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
      console.log('[VideoPlayer] Retrying with server-side M3U8 proxy...');
      setProxyMode('server');
    } else if (proxyMode === 'server') {
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
      theme: '#f43f5e',
      customType: {
        m3u8: playHls,
        hls: playHls,
        'application/x-mpegURL': playHls,
        'application/vnd.apple.mpegurl': playHls,
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
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.error('[VideoPlayer] HLS Network Error', data);
                if (retryCount < 4) {
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
      setError(`播放器加载失败，正在尝试自动切换代理...`);
      setTimeout(() => {
        handleRetry();
      }, 1000);
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
                  onClick={() => handleRetry()}
                  className="flex items-center gap-2 px-6 py-2 bg-bg-accent hover:opacity-90 text-white rounded-full text-sm font-medium transition-all shadow-lg shadow-bg-accent/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  重试播放
                </button>
              </div>
              <p className="mt-6 text-xs text-text-muted/50">提示: 正在使用 {proxyMode === 'direct' ? '直连' : proxyMode === 'default' ? '默认代理' : proxyMode === 'server' ? '服务器代理' : '分流代理'} 模式</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
