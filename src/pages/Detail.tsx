import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Play, Calendar, MapPin, Star, Search, ChevronRight, Heart, Copy } from 'lucide-react';
import { getVideoDetail, parsePlayUrls, searchAllSources } from '../services/maccms';
import { MacCMSVideo, PlaySource, Episode } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import { isFavorited, toggleFavorite, saveHistory, getHistoryByVodId, isUserLoggedIn } from '../services/pocketbase';
import AuthModal from '../components/AuthModal';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get('source') || undefined;
  
  const navigate = useNavigate();
  const [video, setVideo] = useState<MacCMSVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sources, setSources] = useState<PlaySource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [activeTab, setActiveTab] = useState<'episodes' | 'sources'>('episodes');
  
  const [alternativeSources, setAlternativeSources] = useState<{ sourceId: string; sourceName: string; list: MacCMSVideo[], ping?: number }[]>([]);
  const [searchingAlternatives, setSearchingAlternatives] = useState(false);
  
  const [isFav, setIsFav] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const lastSavedRef = useRef<string | null>(null);
  const [initialProgress, setInitialProgress] = useState(0);
  const progressRef = useRef({ progress: 0, duration: 0 });

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    setAlternativeSources([]);
    setError(null);
    
    const fetchData = async () => {
      try {
        // Fetch history first so we have the name if video fetch fails
        const historyRecord = await getHistoryByVodId(id).catch(() => null);
        
        let data: MacCMSVideo;
        try {
          data = await getVideoDetail(Number(id), sourceId);
        } catch (err: any) {
          // If video fetch fails, but we have history with a name, try to find it elsewhere
          if (historyRecord && historyRecord.vod_name) {
            console.log(`[Detail] Video not found on source ${sourceId || 'default'}, searching by history name: ${historyRecord.vod_name}`);
            const results = await searchAllSources(historyRecord.vod_name);
            const alternatives = results.filter(r => r.list.some(v => v.vod_name === historyRecord.vod_name));
            
            if (alternatives.length > 0) {
              const bestAlt = alternatives[0];
              const matchedVideo = bestAlt.list.find(v => v.vod_name === historyRecord.vod_name);
              if (matchedVideo) {
                console.log(`[Detail] Found alternative on source ${bestAlt.sourceName}, redirecting...`);
                navigate(`/video/${matchedVideo.vod_id}?source=${bestAlt.sourceId}`, { replace: true });
                return; // Stop execution, let the new route handle it
              }
            }
          }
          throw err; // Re-throw if no alternatives found or no history
        }

        setVideo(data);
        const parsedSources = parsePlayUrls(data.vod_play_from, data.vod_play_url);
        setSources(parsedSources);
        
        if (parsedSources.length > 0) {
          // Find the first source that has episodes
          const firstValidSourceIndex = parsedSources.findIndex(s => s.episodes.length > 0);
          
          if (firstValidSourceIndex !== -1) {
            let targetEpisode = parsedSources[firstValidSourceIndex].episodes[0];
            let targetSourceIndex = firstValidSourceIndex;
            
            // Restore from history if available
            if (historyRecord) {
              // Find the source index if the history record has a different source
              for (let i = 0; i < parsedSources.length; i++) {
                const ep = parsedSources[i].episodes.find(e => e.name === historyRecord.episode_name);
                if (ep) {
                  targetEpisode = ep;
                  targetSourceIndex = i;
                  setInitialProgress(historyRecord.progress || 0);
                  progressRef.current = { progress: historyRecord.progress || 0, duration: historyRecord.duration || 0 };
                  break;
                }
              }
            }
            
            setActiveSourceIndex(targetSourceIndex);
            setActiveEpisode(targetEpisode);
          }
        }

        // Check favorite status
        isFavorited(id).then(setIsFav);
        
        // Search for alternative sources
        setSearchingAlternatives(true);
        searchAllSources(data.vod_name)
          .then(results => {
            // Filter out the current source and sources that don't have an exact match
            const alternatives = results.filter(r => 
              r.sourceId !== data.source_id && 
              r.list.some(v => v.vod_name === data.vod_name)
            );
            setAlternativeSources(alternatives);

            // 自动按延迟选择最合适的渠道：如果当前渠道延迟过高且有更快的渠道，自动跳转
            // 只有在没有手动指定 sourceId 的情况下才自动切换，避免死循环
            if (!sourceId && alternatives.length > 0) {
              const bestAlt = alternatives[0];
              const currentPing = data._ping || 9999;
              
              // 如果备选渠道延迟明显更低（快 500ms 以上且总延迟小于 1000ms），则自动切换
              if (bestAlt.ping < 1000 && (currentPing - bestAlt.ping) > 500) {
                const matchedVideo = bestAlt.list.find(v => v.vod_name === data.vod_name);
                if (matchedVideo) {
                  console.log(`[Detail] Auto-switching to faster source: ${bestAlt.sourceName} (${bestAlt.ping}ms vs ${currentPing}ms)`);
                  navigate(`/video/${matchedVideo.vod_id}?source=${bestAlt.sourceId}`, { replace: true });
                }
              }
            }
          })
          .catch(console.error)
          .finally(() => setSearchingAlternatives(false));
          
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, sourceId, navigate]);

  useEffect(() => {
    if (video && activeEpisode && isUserLoggedIn()) {
      // Defensive check for required fields
      if (!id || !video.vod_name) return;

      // Save immediately on episode change, then periodically
      const saveCurrentProgress = () => {
        saveHistory({
          vod_id: String(id),
          vod_name: video.vod_name,
          vod_pic: video.vod_pic || '',
          source_id: video.source_id || sourceId || 'default',
          episode_name: activeEpisode.name || '正片',
          progress: progressRef.current.progress,
          duration: progressRef.current.duration
        }).catch(err => {
          if (err.name !== 'AbortError' && !err.message?.includes('autocancelled')) {
            console.error('[Detail] Failed to save history:', err);
          }
        });
      };

      // Save once initially when episode loads
      saveCurrentProgress();

      // Then save every 10 seconds
      const interval = setInterval(saveCurrentProgress, 10000);
      
      return () => clearInterval(interval);
    }
  }, [video, activeEpisode, id, sourceId]);

  const handleProgress = (progress: number, duration: number) => {
    progressRef.current = { progress, duration };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-bg-accent animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-text-main mb-4">出错了</h2>
        <p className="text-text-muted mb-8">{error || '影片不存在'}</p>
        <div className="flex gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-bg-card hover:bg-bg-card/80 text-text-main rounded-full transition-colors border border-border-main"
          >
            返回上一页
          </button>
          <button 
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-bg-accent hover:opacity-90 text-white rounded-full transition-colors"
          >
            回到首页
          </button>
        </div>
      </div>
    );
  }

  const handleToggleFavorite = async () => {
    if (!isUserLoggedIn()) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!video || !id) return;
    try {
      const result = await toggleFavorite({
        vod_id: id,
        vod_name: video.vod_name,
        vod_pic: video.vod_pic,
        source_id: video.source_id || sourceId || 'default'
      });
      setIsFav(result);
    } catch (e: any) {
      console.error(e.message);
    }
  };

  const activeSource = sources[activeSourceIndex];

  return (
    <div className="min-h-screen">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-bg-main/80 backdrop-blur-xl border-b border-border-main h-20 flex items-center px-6">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={() => {
                if (window.history.length > 2) {
                  navigate(-1);
                } else {
                  navigate('/');
                }
              }}
              className="p-2.5 bg-bg-card/50 border border-border-main rounded-xl text-text-muted hover:text-text-main transition-all"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-text-main line-clamp-1 tracking-tight">{video.vod_name}</h1>
          </div>
          <button
            onClick={handleToggleFavorite}
            className={`p-2.5 rounded-xl transition-all active:scale-90 border ${
              isFav 
                ? 'bg-bg-accent border-bg-accent text-white shadow-lg shadow-bg-accent/20' 
                : 'bg-bg-card/50 border-border-main text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
            title={isFav ? '取消收藏' : '加入收藏'}
          >
            <Heart className={`w-6 h-6 ${isFav ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      <div className="max-w-7xl mx-auto sm:px-4 pt-0 sm:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 sm:gap-8">
          
          {/* Left Column: Player & Metadata */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Player */}
            {activeEpisode ? (
              <div className="space-y-4">
                <div className="sm:rounded-xl overflow-hidden">
                  <VideoPlayer 
                    key={activeEpisode.url} 
                    url={`/api/proxy/m3u8?url=${encodeURIComponent(activeEpisode.url)}`} 
                    poster={video.vod_pic}
                    initialProgress={initialProgress}
                    onProgress={handleProgress}
                  />
                </div>
                <div className="flex items-center justify-between px-4 sm:px-0">
                  <h2 className="text-lg sm:text-xl font-bold text-text-main">
                    正在播放: <span className="text-bg-accent">{activeEpisode.name}</span>
                  </h2>
                  <button 
                    onClick={() => {
                        navigator.clipboard.writeText(activeEpisode.url);
                    }}
                    className="text-[10px] sm:text-xs text-text-muted hover:text-text-main flex items-center gap-1 bg-bg-card px-3 py-1.5 rounded-full transition-colors border border-border-main"
                  >
                    <padding className="w-3 h-3" /> 复制地址
                  </button>
                </div>
                <div className="mx-4 sm:mx-0 text-[10px] sm:text-xs text-text-muted font-mono break-all bg-bg-card/50 p-3 rounded-lg border border-border-main">
                    {activeEpisode.url}
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-bg-card sm:rounded-xl flex items-center justify-center border border-border-main">
                <p className="text-text-muted">暂无播放源</p>
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-6 px-4 sm:px-0">
              <div className="flex gap-6">
                <div className="w-1/4 sm:w-1/5 shrink-0">
                  <div className="aspect-[3/4] rounded-xl overflow-hidden bg-bg-card border border-border-main shadow-2xl">
                    <img 
                      src={video.vod_pic || null} 
                      alt={video.vod_name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-text-main leading-tight">
                    {video.vod_name}
                  </h1>
                  {video.vod_remarks && (
                    <span className="inline-block bg-bg-accent/10 text-bg-accent text-xs px-2.5 py-1 rounded-md font-medium">
                      {video.vod_remarks}
                    </span>
                  )}
                  
                  <div className="space-y-2 text-sm text-text-muted pt-2">
                    {video.vod_score && video.vod_score !== '0.0' && (
                      <div className="flex items-center gap-2 text-amber-400 font-medium">
                        <Star className="w-4 h-4 fill-current" />
                        {video.vod_score}
                      </div>
                    )}
                    {video.vod_year && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {video.vod_year}
                      </div>
                    )}
                    {video.vod_area && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        {video.vod_area}
                      </div>
                    )}
                    {video.type_name && (
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4" />
                        {video.vod_class || video.type_name}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-main">
                {video.vod_director && (
                  <div>
                    <h4 className="text-text-muted text-sm mb-1">导演</h4>
                    <p className="text-text-main text-sm">{video.vod_director}</p>
                  </div>
                )}
                {video.vod_actor && (
                  <div>
                    <h4 className="text-text-muted text-sm mb-1">主演</h4>
                    <p className="text-text-main text-sm leading-relaxed">{video.vod_actor}</p>
                  </div>
                )}
                {video.vod_content && (
                  <div>
                    <h4 className="text-text-muted text-sm mb-2">剧情简介</h4>
                    <div 
                      className="text-text-muted text-sm leading-relaxed prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: video.vod_content }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Episodes & Sources */}
          <div className="space-y-6 px-4 sm:px-0 pb-12">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-border-main mb-6">
              <button
                onClick={() => setActiveTab('episodes')}
                className={`pb-3 text-lg font-medium transition-colors relative ${
                  activeTab === 'episodes' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
                }`}
              >
                选集
                {activeTab === 'episodes' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-bg-accent rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('sources')}
                className={`pb-3 text-lg font-medium transition-colors relative flex items-center gap-2 ${
                  activeTab === 'sources' ? 'text-text-main' : 'text-text-muted hover:text-text-main'
                }`}
              >
                换源
                {searchingAlternatives && <Loader2 className="w-4 h-4 text-bg-accent animate-spin" />}
                {activeTab === 'sources' && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-bg-accent rounded-t-full" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'episodes' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Source Selection (Internal lines) */}
                {sources.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    {sources.map((source, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveSourceIndex(idx);
                          setActiveEpisode(source.episodes[0]);
                          setInitialProgress(0);
                          progressRef.current = { progress: 0, duration: 0 };
                        }}
                        className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                          activeSourceIndex === idx
                            ? 'bg-bg-accent text-white'
                            : 'bg-bg-card text-text-muted hover:bg-bg-card/80 hover:text-text-main border border-border-main'
                        }`}
                      >
                        {source.sourceName}
                      </button>
                    ))}
                  </div>
                )}

                {/* Episode Grid */}
                {activeSource && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {activeSource.episodes.map((ep, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveEpisode(ep);
                          setInitialProgress(0);
                          progressRef.current = { progress: 0, duration: 0 };
                        }}
                        className={`px-3 py-2.5 rounded-lg text-xs font-medium transition-all truncate ${
                          activeEpisode?.url === ep.url
                            ? 'bg-bg-accent/20 text-bg-accent border border-bg-accent/50'
                            : 'bg-bg-card text-text-muted border border-border-main hover:bg-bg-card/80 hover:text-text-main'
                        }`}
                        title={ep.name}
                      >
                        {ep.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sources' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-text-muted">
                    {searchingAlternatives ? '正在全网测速寻源...' : '已按测速结果排序，推荐使用最快的源'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {/* Current Source */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-bg-accent/10 border border-bg-accent/30">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-bg-accent animate-pulse" />
                      <span className="text-bg-accent font-medium text-xs">当前: {video.source_name || '默认源'}</span>
                    </div>
                    <span className="text-[10px] text-bg-accent/70">使用中</span>
                  </div>

                  {/* Alternative Sources */}
                  {!searchingAlternatives && alternativeSources.length === 0 ? (
                    <div className="p-4 text-center text-text-muted text-xs bg-bg-card/50 rounded-xl border border-border-main">
                      暂无其他可用来源
                    </div>
                  ) : (
                    alternativeSources.map((alt) => {
                      const matchedVideo = alt.list.find(v => v.vod_name === video.vod_name);
                      if (!matchedVideo) return null;
                      
                      let pingColor = 'text-emerald-400';
                      if (alt.ping && alt.ping > 1000) pingColor = 'text-amber-400';
                      if (alt.ping && alt.ping > 3000) pingColor = 'text-bg-accent';

                      return (
                        <Link
                          key={alt.sourceId}
                          to={`/video/${matchedVideo.vod_id}?source=${alt.sourceId}`}
                          className="flex items-center justify-between p-3 rounded-xl bg-bg-card border border-border-main hover:bg-bg-card/80 hover:border-text-muted/30 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <Search className="w-4 h-4 text-text-muted group-hover:text-text-main transition-colors" />
                            <span className="text-text-muted group-hover:text-text-main text-xs font-medium transition-colors">
                              {alt.sourceName}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {alt.ping !== undefined && (
                              <span className={`text-[10px] font-mono ${pingColor}`}>
                                {alt.ping}ms
                              </span>
                            )}
                            <ChevronRight className="w-4 h-4 text-text-muted/50 group-hover:text-text-muted" />
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
