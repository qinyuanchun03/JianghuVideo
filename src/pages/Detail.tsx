import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Play, Calendar, MapPin, Star } from 'lucide-react';
import { getVideoDetail, parsePlayUrls } from '../services/maccms';
import { MacCMSVideo, PlaySource, Episode } from '../types';
import VideoPlayer from '../components/VideoPlayer';

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<MacCMSVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [sources, setSources] = useState<PlaySource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);

  useEffect(() => {
    if (!id) return;
    
    setLoading(true);
    getVideoDetail(Number(id))
      .then(data => {
        setVideo(data);
        const parsedSources = parsePlayUrls(data.vod_play_from, data.vod_play_url);
        setSources(parsedSources);
        
        if (parsedSources.length > 0 && parsedSources[0].episodes.length > 0) {
          setActiveEpisode(parsedSources[0].episodes[0]);
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-2xl font-bold text-white mb-4">出错了</h2>
        <p className="text-zinc-400 mb-8">{error || '影片不存在'}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
        >
          返回上一页
        </button>
      </div>
    );
  }

  const activeSource = sources[activeSourceIndex];

  return (
    <div className="min-h-screen pb-20">
      {/* Top Navigation */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-lg font-medium text-white line-clamp-1">{video.vod_name}</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Player & Episodes */}
          <div className="lg:col-span-2 space-y-8">
            {/* Player */}
            {activeEpisode ? (
              <div className="space-y-4">
                <VideoPlayer url={activeEpisode.url} poster={video.vod_pic} />
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    正在播放: <span className="text-rose-400">{activeEpisode.name}</span>
                  </h2>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center border border-white/5">
                <p className="text-zinc-500">暂无播放源</p>
              </div>
            )}

            {/* Source Selection */}
            {sources.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                  <h3 className="text-lg font-medium text-white">播放源</h3>
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {sources.map((source, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveSourceIndex(idx);
                          setActiveEpisode(source.episodes[0]);
                        }}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          activeSourceIndex === idx
                            ? 'bg-rose-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                        }`}
                      >
                        {source.sourceName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Episode Grid */}
                {activeSource && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {activeSource.episodes.map((ep, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveEpisode(ep)}
                        className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all truncate ${
                          activeEpisode?.url === ep.url
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                            : 'bg-zinc-900 text-zinc-400 border border-white/5 hover:bg-zinc-800 hover:text-white'
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
          </div>

          {/* Right Column: Metadata */}
          <div className="space-y-6">
            <div className="flex gap-6">
              <div className="w-1/3 shrink-0">
                <div className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shadow-2xl">
                  <img 
                    src={video.vod_pic} 
                    alt={video.vod_name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                  {video.vod_name}
                </h1>
                {video.vod_remarks && (
                  <span className="inline-block bg-white/10 text-white text-xs px-2.5 py-1 rounded-md font-medium">
                    {video.vod_remarks}
                  </span>
                )}
                
                <div className="space-y-2 text-sm text-zinc-400 pt-2">
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

            <div className="space-y-4 pt-4 border-t border-white/10">
              {video.vod_director && (
                <div>
                  <h4 className="text-zinc-500 text-sm mb-1">导演</h4>
                  <p className="text-zinc-300 text-sm">{video.vod_director}</p>
                </div>
              )}
              {video.vod_actor && (
                <div>
                  <h4 className="text-zinc-500 text-sm mb-1">主演</h4>
                  <p className="text-zinc-300 text-sm leading-relaxed">{video.vod_actor}</p>
                </div>
              )}
              {video.vod_content && (
                <div>
                  <h4 className="text-zinc-500 text-sm mb-2">剧情简介</h4>
                  <div 
                    className="text-zinc-400 text-sm leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: video.vod_content }}
                  />
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
