import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlayCircle, Loader2, AlertCircle, Play, Star, ChevronRight, Search } from 'lucide-react';
import { getVideos, getCategories, searchAllSources, getVideoDetail } from '../services/maccms';
import { MacCMSVideo, MacCMSCategory } from '../types';
import { getHistory, getFavorites, isUserLoggedIn } from '../services/pocketbase';

const VideoCard: React.FC<{ video: MacCMSVideo }> = ({ video }) => (
  <Link 
    to={`/video/${video.vod_id}${video.source_id ? `?source=${video.source_id}` : ''}`}
    target="_blank"
    className="group relative flex flex-col gap-3 w-full"
  >
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-bg-card border border-border-main">
      <img 
        src={video.vod_pic || null} 
        alt={video.vod_name}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <PlayCircle className="w-12 h-12 text-white drop-shadow-lg scale-90 group-hover:scale-100 transition-transform duration-300" />
      </div>
      {video.vod_remarks && (
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-medium">
          {video.vod_remarks}
        </div>
      )}
      {video.source_name && (
        <div className="absolute top-2 left-2 bg-bg-accent/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-medium flex items-center gap-1">
          {video.source_name}
          {video._ping && <span className="opacity-60 font-mono">| {video._ping}ms</span>}
        </div>
      )}
    </div>
    <div>
      <h3 className="text-text-main font-medium text-sm md:text-base line-clamp-1 group-hover:text-bg-accent transition-colors">
        {video.vod_name}
      </h3>
      <p className="text-text-muted text-xs mt-1 line-clamp-1">
        {video.vod_year} • {video.vod_class || video.type_name}
      </p>
    </div>
  </Link>
);

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  
  const [categories, setCategories] = useState<MacCMSCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  const [settingsVersion, setSettingsVersion] = useState(0);
  
  // Home Mode State (Carousel)
  const [groupedVideos, setGroupedVideos] = useState<Record<string, MacCMSVideo[]>>({});
  const [featuredVideo, setFeaturedVideo] = useState<MacCMSVideo | null>(null);
  const [isHomeLoading, setIsHomeLoading] = useState(true);

  // Grid Mode State
  const [gridVideos, setGridVideos] = useState<MacCMSVideo[]>([]);
  const [gridLoading, setGridLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Recommendations State
  const [recommendedVideos, setRecommendedVideos] = useState<MacCMSVideo[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false);

  const isHomeMode = !activeCategory && !searchQuery;

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettingsVersion(v => v + 1);
    };
    window.addEventListener('maccms_settings_changed', handleSettingsChange);
    return () => window.removeEventListener('maccms_settings_changed', handleSettingsChange);
  }, []);

  useEffect(() => {
    getCategories()
      .then(cats => {
        if (cats) setCategories(cats);
      })
      .catch(console.error);
  }, [settingsVersion]);

  // Fetch Recommendations
  useEffect(() => {
    if (!isHomeMode || !isUserLoggedIn()) return;
    
    let isMounted = true;
    setIsRecommendationsLoading(true);

    const fetchRecommendations = async () => {
      try {
        const [historyRes, favRes] = await Promise.all([
          getHistory(1, 5),
          getFavorites(1, 5)
        ]);
        
        const recentItems = [...historyRes.items, ...favRes.items];
        if (recentItems.length === 0) {
          if (isMounted) setIsRecommendationsLoading(false);
          return;
        }

        const uniqueVodIds = Array.from(new Set(recentItems.map(item => item.vod_id)));
        
        const detailsPromises = uniqueVodIds.slice(0, 3).map(id => 
          getVideoDetail(Number(id)).catch(() => null)
        );
        const details = (await Promise.all(detailsPromises)).filter(Boolean) as MacCMSVideo[];
        
        if (details.length === 0) {
          if (isMounted) setIsRecommendationsLoading(false);
          return;
        }

        const typeIds = details.map(d => d.type_id).filter(Boolean);
        const uniqueTypeIds = Array.from(new Set(typeIds));
        
        if (uniqueTypeIds.length === 0) {
          if (isMounted) setIsRecommendationsLoading(false);
          return;
        }

        const recPromises = uniqueTypeIds.map(typeId => getVideos(1, typeId));
        const recResults = await Promise.all(recPromises);
        
        let allRecs = recResults.flatMap(r => r.list || []);
        allRecs = Array.from(new Map(allRecs.map(v => [v.vod_id, v])).values());
        allRecs = allRecs.filter(v => !uniqueVodIds.includes(String(v.vod_id)));
        allRecs = allRecs.sort(() => 0.5 - Math.random()).slice(0, 12);
        
        if (isMounted) {
          setRecommendedVideos(allRecs);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations:", err);
      } finally {
        if (isMounted) setIsRecommendationsLoading(false);
      }
    };

    fetchRecommendations();
    
    return () => { isMounted = false; };
  }, [isHomeMode, settingsVersion]);

  // Fetch for Home Mode
  useEffect(() => {
    if (!isHomeMode) return;
    let isMounted = true;
    setIsHomeLoading(true);

    Promise.all([getVideos(1), getVideos(2)])
      .then(results => {
        if (!isMounted) return;
        const allVideos = results.flatMap(r => r.list || []);
        const uniqueVideos = Array.from(new Map(allVideos.map(v => [v.vod_id, v])).values());

        if (uniqueVideos.length > 0) {
          const featured = uniqueVideos.find(v => v.vod_pic && v.vod_content) || uniqueVideos[0];
          setFeaturedVideo(featured);
        }

        const groups: Record<string, MacCMSVideo[]> = {};
        uniqueVideos.forEach(v => {
          if (!groups[v.type_name]) groups[v.type_name] = [];
          groups[v.type_name].push(v);
        });
        setGroupedVideos(groups);
      })
      .catch(err => {
        if (isMounted) setError(err.message);
      })
      .finally(() => {
        if (isMounted) setIsHomeLoading(false);
      });

    return () => { isMounted = false; };
  }, [isHomeMode, settingsVersion]);

  // Fetch for Grid Mode
  useEffect(() => {
    if (isHomeMode) return;
    let isMounted = true;
    setGridLoading(true);

    if (searchQuery) {
      searchAllSources(searchQuery)
        .then(results => {
          if (!isMounted) return;
          
          // 整合搜索结果：按名称去重，保留延迟最低（最快）的渠道
          // results 已经按 ping 升序排列，所以先遇到的名称即为最快渠道
          const consolidated: MacCMSVideo[] = [];
          const seenNames = new Set<string>();
          
          results.forEach(sourceResult => {
            sourceResult.list.forEach(video => {
              const cleanName = video.vod_name.trim();
              if (!seenNames.has(cleanName)) {
                seenNames.add(cleanName);
                consolidated.push(video);
              }
            });
          });
          
          setGridVideos(consolidated);
          setHasMore(false);
        })
        .catch(err => {
          if (!isMounted) setError(err.message);
        })
        .finally(() => {
          if (isMounted) setGridLoading(false);
        });
    } else {
      getVideos(page, activeCategory)
        .then(res => {
          if (!isMounted) return;
          if (page === 1) {
            setGridVideos(res.list || []);
          } else {
            setGridVideos(prev => [...prev, ...(res.list || [])]);
          }
          setHasMore(res.page < res.pagecount);
        })
        .catch(err => {
          if (!isMounted) setError(err.message);
        })
        .finally(() => {
          if (isMounted) setGridLoading(false);
        });
    }

    return () => { isMounted = false; };
  }, [page, activeCategory, searchQuery, isHomeMode, settingsVersion]);

  // Reset page when search query or category changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, activeCategory]);

  const handleCategoryClick = (id?: number) => {
    setActiveCategory(id);
    if (searchQuery) {
      setSearchParams({});
    }
    setPage(1);
  };

  return (
    <div className={`min-h-screen bg-bg-main ${!isHomeMode ? 'pt-20' : ''}`}>
      {isHomeMode && featuredVideo && (
        <div className="relative w-full h-[70vh] md:h-[85vh] mb-8">
          <div className="absolute inset-0">
            <img 
              src={featuredVideo.vod_pic || null} 
              alt={featuredVideo.vod_name} 
              className="w-full h-full object-cover opacity-50" 
              referrerPolicy="no-referrer" 
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-main via-bg-main/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-bg-main via-bg-main/50 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-12 md:px-20 lg:px-32 md:pb-24 max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-text-main mb-4 drop-shadow-lg">{featuredVideo.vod_name}</h1>
            <div className="flex items-center gap-4 text-sm text-text-muted mb-6 drop-shadow">
              {featuredVideo.vod_score && featuredVideo.vod_score !== '0.0' && (
                <span className="flex items-center gap-1 text-bg-accent font-medium"><Star className="w-4 h-4 fill-current" /> {featuredVideo.vod_score}</span>
              )}
              <span>{featuredVideo.vod_year}</span>
              <span>{featuredVideo.vod_class || featuredVideo.type_name}</span>
            </div>
            <p className="text-text-muted text-sm md:text-base line-clamp-3 mb-8 max-w-2xl drop-shadow" dangerouslySetInnerHTML={{ __html: featuredVideo.vod_content?.replace(/<[^>]+>/g, '') || '' }} />
            <div className="flex gap-4">
              <Link 
                to={`/video/${featuredVideo.vod_id}`} 
                target="_blank"
                className="flex items-center gap-2 bg-text-main text-bg-main px-8 py-3 rounded-full font-bold hover:opacity-90 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" /> 立即播放
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4">
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide snap-x mb-4">
            <button
              onClick={() => handleCategoryClick(undefined)}
              className={`snap-start whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === undefined && !searchQuery
                  ? 'bg-bg-accent text-white border-bg-accent'
                  : 'bg-bg-card/50 text-text-muted border-border-main hover:bg-bg-card hover:text-text-main'
              }`}
            >
              首页推荐
            </button>
            {categories.map(cat => (
              <button
                key={cat.type_id}
                onClick={() => handleCategoryClick(cat.type_id)}
                className={`snap-start whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === cat.type_id
                    ? 'bg-bg-accent text-white border-bg-accent'
                    : 'bg-bg-card/50 text-text-muted border-border-main hover:bg-bg-card hover:text-text-main'
                }`}
              >
                {cat.type_name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-bg-accent mb-4" />
            <h3 className="text-xl font-medium text-text-main mb-2">获取数据失败</h3>
            <p className="text-text-muted max-w-md">{error}</p>
          </div>
        )}

        {/* Content Rendering */}
        {!error && isHomeMode ? (
          /* Home Mode: Carousels */
          isHomeLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-bg-accent animate-spin" /></div>
          ) : (
            <div className="space-y-10">
              {/* Personalized Recommendations */}
              {recommendedVideos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-bg-accent to-orange-400">猜你喜欢</h2>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {recommendedVideos.map(video => (
                      <div key={`rec-${video.source_id || 'default'}-${video.vod_id}`} className="snap-start shrink-0 w-36 md:w-48">
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.entries(groupedVideos).map(([categoryName, vids]) => (
                <div key={categoryName}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-text-main">{categoryName}</h2>
                    <button
                      onClick={() => {
                        const cat = categories.find(c => c.type_name === categoryName);
                        if (cat) handleCategoryClick(cat.type_id);
                      }}
                      className="text-sm text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                    >
                      查看全部 <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {(vids as MacCMSVideo[]).map(video => (
                      <div key={`${video.source_id || 'default'}-${video.vod_id}`} className="snap-start shrink-0 w-36 md:w-48">
                        <VideoCard video={video} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Grid Mode */
          <>
            {searchQuery && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-text-main">
                  搜索结果: <span className="text-bg-accent">{searchQuery}</span>
                </h2>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {gridVideos.map((video) => (
                <VideoCard key={`${video.source_id || 'default'}-${video.vod_id}`} video={video} />
              ))}
            </div>

            {gridLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-bg-accent animate-spin" />
              </div>
            )}

            {!gridLoading && gridVideos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="w-16 h-16 text-text-muted/30 mb-4" />
                <h3 className="text-xl font-medium text-text-main mb-2">未找到相关内容</h3>
                <p className="text-text-muted max-w-sm">
                  尝试更换关键词或在设置中切换其他订阅源。
                </p>
                <button 
                  onClick={() => {
                    setSearchParams({});
                    setActiveCategory(undefined);
                  }}
                  className="mt-6 px-6 py-2 bg-bg-card/50 hover:bg-bg-card text-text-main rounded-full transition-colors border border-border-main"
                >
                  返回首页推荐
                </button>
              </div>
            )}

            {!gridLoading && hasMore && gridVideos.length > 0 && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 rounded-full border border-border-main text-text-main hover:bg-bg-card/50 transition-colors font-medium"
                >
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
