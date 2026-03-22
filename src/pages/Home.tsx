import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PlayCircle, Loader2, AlertCircle, Play, Star, ChevronRight } from 'lucide-react';
import { getVideos, getCategories, searchAllSources } from '../services/maccms';
import { MacCMSVideo, MacCMSCategory } from '../types';

const VideoCard: React.FC<{ video: MacCMSVideo }> = ({ video }) => (
  <Link 
    to={`/video/${video.vod_id}${video.source_id ? `?source=${video.source_id}` : ''}`}
    target="_blank"
    className="group relative flex flex-col gap-3 w-full"
  >
    <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
      <img 
        src={video.vod_pic} 
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
        <div className="absolute top-2 left-2 bg-rose-600/80 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md font-medium">
          {video.source_name}
        </div>
      )}
    </div>
    <div>
      <h3 className="text-white font-medium text-sm md:text-base line-clamp-1 group-hover:text-rose-400 transition-colors">
        {video.vod_name}
      </h3>
      <p className="text-zinc-500 text-xs mt-1 line-clamp-1">
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
          const allVideos = results.flatMap(r => r.list);
          setGridVideos(allVideos);
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
    <div className="min-h-screen pb-20 bg-[#0a0a0a]">
      {isHomeMode && featuredVideo && (
        <div className="relative w-full h-[70vh] md:h-[85vh] mb-8">
          <div className="absolute inset-0">
            <img src={featuredVideo.vod_pic} alt={featuredVideo.vod_name} className="w-full h-full object-cover opacity-50" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 w-full px-4 pb-12 md:px-12 md:pb-24 max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">{featuredVideo.vod_name}</h1>
            <div className="flex items-center gap-4 text-sm text-zinc-200 mb-6 drop-shadow">
              {featuredVideo.vod_score && featuredVideo.vod_score !== '0.0' && (
                <span className="flex items-center gap-1 text-amber-400 font-medium"><Star className="w-4 h-4 fill-current" /> {featuredVideo.vod_score}</span>
              )}
              <span>{featuredVideo.vod_year}</span>
              <span>{featuredVideo.vod_class || featuredVideo.type_name}</span>
            </div>
            <p className="text-zinc-300 text-sm md:text-base line-clamp-3 mb-8 max-w-2xl drop-shadow" dangerouslySetInnerHTML={{ __html: featuredVideo.vod_content?.replace(/<[^>]+>/g, '') || '' }} />
            <div className="flex gap-4">
              <Link 
                to={`/video/${featuredVideo.vod_id}`} 
                target="_blank"
                className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors"
              >
                <Play className="w-5 h-5 fill-current" /> 立即播放
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 ${!isHomeMode ? 'pt-24' : ''}`}>
        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide snap-x mb-4">
            <button
              onClick={() => handleCategoryClick(undefined)}
              className={`snap-start whitespace-nowrap px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                activeCategory === undefined && !searchQuery
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-white'
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
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-zinc-900/50 text-zinc-400 border-white/5 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                {cat.type_name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">获取数据失败</h3>
            <p className="text-zinc-400 max-w-md">{error}</p>
          </div>
        )}

        {/* Content Rendering */}
        {!error && isHomeMode ? (
          /* Home Mode: Carousels */
          isHomeLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-rose-500 animate-spin" /></div>
          ) : (
            <div className="space-y-10">
              {Object.entries(groupedVideos).map(([categoryName, vids]) => (
                <div key={categoryName}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-white">{categoryName}</h2>
                    <button
                      onClick={() => {
                        const cat = categories.find(c => c.type_name === categoryName);
                        if (cat) handleCategoryClick(cat.type_id);
                      }}
                      className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
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
                <h2 className="text-xl font-bold text-white">
                  搜索结果: <span className="text-rose-500">{searchQuery}</span>
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
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
              </div>
            )}

            {!gridLoading && gridVideos.length === 0 && (
              <div className="text-center py-20 text-zinc-500">
                没有找到相关影片
              </div>
            )}

            {!gridLoading && hasMore && gridVideos.length > 0 && (
              <div className="flex justify-center mt-12">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-8 py-3 rounded-full border border-white/10 text-white hover:bg-white/5 transition-colors font-medium"
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
