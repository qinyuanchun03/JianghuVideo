import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Save, Info, Rss, Shield, PlayCircle, Database, Trash2, Download, Plus, RefreshCw } from 'lucide-react';
import { 
  ConfigItem,
  getSources, setSources, getActiveSourceId, setActiveSourceId,
  getCorsProxies, setCorsProxies, getActiveCorsId, setActiveCorsId,
  getPlayers, setPlayers, getActivePlayerId, setActivePlayerId,
  syncFromLunaTV
} from '../services/maccms';
import { useNavigate } from 'react-router-dom';

type Tab = 'source' | 'cors' | 'player' | 'storage';

function ConfigSection({
  title,
  description,
  items,
  activeId,
  onSetActive,
  onAdd,
  onDelete,
  namePlaceholder,
  urlPlaceholder,
  allowEmptyUrl = false
}: {
  title: string;
  description: React.ReactNode;
  items: ConfigItem[];
  activeId: string;
  onSetActive: (id: string) => void;
  onAdd: (name: string, url: string) => void;
  onDelete: (id: string) => void;
  namePlaceholder: string;
  urlPlaceholder: string;
  allowEmptyUrl?: boolean;
}) {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || (!allowEmptyUrl && !newUrl.trim())) return;
    onAdd(newName.trim(), newUrl.trim());
    setNewName('');
    setNewUrl('');
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
        <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {items.map(item => (
            <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${activeId === item.id ? 'bg-rose-500/10 border-rose-500/50' : 'bg-zinc-950 border-white/10 hover:border-white/20'}`}>
              <label className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer">
                <input
                  type="radio"
                  checked={activeId === item.id}
                  onChange={() => onSetActive(item.id)}
                  className="w-4 h-4 text-rose-500 bg-zinc-900 border-zinc-700 focus:ring-rose-500 focus:ring-offset-zinc-900"
                />
                <div className="truncate flex-1">
                  <div className="text-sm font-medium text-white truncate">{item.name}</div>
                  <div className="text-xs text-zinc-500 truncate mt-0.5">{item.url || '无 (内置/直连)'}</div>
                </div>
              </label>
              {!['default', 'none'].includes(item.id) && (
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors shrink-0 ml-2"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="bg-zinc-950/50 border border-white/5 p-4 rounded-xl space-y-4">
          <h3 className="text-sm font-medium text-zinc-300">添加新项</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={namePlaceholder}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              required
            />
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder={urlPlaceholder}
              className="w-full sm:col-span-2 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              required={!allowEmptyUrl}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-fit"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </form>
      </div>
      <div className="mt-auto pt-6">
        {description}
      </div>
    </div>
  );
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>('source');
  
  // Form states
  const [sourcesState, setSourcesState] = useState<ConfigItem[]>([]);
  const [activeSourceIdState, setActiveSourceIdState] = useState('');

  const [corsProxiesState, setCorsProxiesState] = useState<ConfigItem[]>([]);
  const [activeCorsIdState, setActiveCorsIdState] = useState('');

  const [playersState, setPlayersState] = useState<ConfigItem[]>([]);
  const [activePlayerIdState, setActivePlayerIdState] = useState('');
  
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);
  const isInitialMount = useRef(true);
  const navigate = useNavigate();

  useEffect(() => {
    setSourcesState(getSources());
    setActiveSourceIdState(getActiveSourceId());

    setCorsProxiesState(getCorsProxies());
    setActiveCorsIdState(getActiveCorsId());

    setPlayersState(getPlayers());
    setActivePlayerIdState(getActivePlayerId());
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSources(sourcesState);
    setActiveSourceId(activeSourceIdState);
    setCorsProxies(corsProxiesState);
    setActiveCorsId(activeCorsIdState);
    setPlayers(playersState);
    setActivePlayerId(activePlayerIdState);

    setSaved(true);
    const timer = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [sourcesState, activeSourceIdState, corsProxiesState, activeCorsIdState, playersState, activePlayerIdState]);

  const handleSync = async (type: 'full' | 'jin18' | 'jingjian') => {
    if (!window.confirm(`确定要从 LunaTV 同步订阅源吗？这将添加约 ${type === 'full' ? '80+' : '30+'} 个新源。`)) return;
    setSyncing(true);
    try {
      const newSources = await syncFromLunaTV(type);
      // Merge with existing, avoiding duplicates by ID
      const existingIds = new Set(sourcesState.map(s => s.id));
      const filteredNew = newSources.filter(s => !existingIds.has(s.id));
      setSourcesState([...sourcesState, ...filteredNew]);
      alert(`成功同步 ${filteredNew.length} 个新订阅源！`);
    } catch (e) {
      alert('同步失败，请检查网络连接');
    } finally {
      setSyncing(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有本地数据吗？这包括您的播放历史和收藏记录。')) {
      localStorage.clear();
      // Restore default settings
      setSourcesState(getSources());
      setActiveSourceIdState(getActiveSourceId());
      setCorsProxiesState(getCorsProxies());
      setActiveCorsIdState(getActiveCorsId());
      setPlayersState(getPlayers());
      setActivePlayerIdState(getActivePlayerId());
      alert('本地数据已清除！');
    }
  };

  const tabs = [
    { id: 'source', label: '订阅源', icon: Rss },
    { id: 'cors', label: 'CORS 设置', icon: Shield },
    { id: 'player', label: '播放器设置', icon: PlayCircle },
    { id: 'storage', label: '本地数据', icon: Database },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 pt-24">
      <div className="flex items-center gap-3 mb-8">
        <SettingsIcon className="w-8 h-8 text-rose-500" />
        <h1 className="text-3xl font-bold text-white tracking-tight">站点设置</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-2 backdrop-blur-xl flex flex-row md:flex-col gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-rose-500/10 text-rose-400' 
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-rose-500' : 'text-zinc-500'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 md:p-8 backdrop-blur-xl min-h-[500px]">
            <div className="space-y-6 h-full flex flex-col">
              
              {/* Tab Content */}
              <div className="flex-1">
                {activeTab === 'source' && (
                  <div className="space-y-6 flex flex-col h-full">
                    <div className="flex flex-wrap gap-3 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                      <div className="w-full mb-1 flex items-center gap-2 text-indigo-400 font-medium text-sm">
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        从 LunaTV 同步订阅源
                      </div>
                      <button
                        onClick={() => handleSync('full')}
                        disabled={syncing}
                        className="px-4 py-2 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded-xl hover:bg-indigo-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        同步全量 (80+)
                      </button>
                      <button
                        onClick={() => handleSync('jin18')}
                        disabled={syncing}
                        className="px-4 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-xl hover:bg-emerald-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        同步精简 (30+)
                      </button>
                      <button
                        onClick={() => handleSync('jingjian')}
                        disabled={syncing}
                        className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl hover:bg-rose-600/30 transition-colors disabled:opacity-50 text-sm font-medium"
                      >
                        同步精简+ (40+)
                      </button>
                    </div>
                    
                    <ConfigSection
                      title="订阅源设置"
                      items={sourcesState}
                      activeId={activeSourceIdState}
                      onSetActive={setActiveSourceIdState}
                      onAdd={(name, url) => setSourcesState([...sourcesState, { id: Date.now().toString(), name, url }])}
                      onDelete={(id) => {
                        setSourcesState(sourcesState.filter(s => s.id !== id));
                        if (activeSourceIdState === id) setActiveSourceIdState('default');
                      }}
                      namePlaceholder="例如: 卧龙资源"
                      urlPlaceholder="例如: https://wolongzy.net/api.php/provide/vod/at/json"
                      description={
                        <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200/80 text-sm">
                          <Info className="w-5 h-5 shrink-0 text-rose-400" />
                          <p>
                            请确保填写的接口支持 JSON 格式输出。通常接口路径以 <code>/api.php/provide/vod/</code> 结尾。推荐使用 <code>/at/json</code> 强制输出 JSON。
                          </p>
                        </div>
                      }
                    />
                  </div>
                )}

                {activeTab === 'cors' && (
                  <ConfigSection
                    title="CORS 代理设置"
                    items={corsProxiesState}
                    activeId={activeCorsIdState}
                    onSetActive={setActiveCorsIdState}
                    onAdd={(name, url) => setCorsProxiesState([...corsProxiesState, { id: Date.now().toString(), name, url }])}
                    onDelete={(id) => {
                      setCorsProxiesState(corsProxiesState.filter(p => p.id !== id));
                      if (activeCorsIdState === id) setActiveCorsIdState('default');
                    }}
                    namePlaceholder="例如: 我的代理"
                    urlPlaceholder="例如: https://my-proxy.com/?url="
                    allowEmptyUrl={true}
                    description={
                      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-200/80 text-sm">
                        <Info className="w-5 h-5 shrink-0 text-blue-400" />
                        <p>
                          由于浏览器的安全策略，直接请求第三方接口可能会被拦截。使用 CORS 代理可以解决跨域问题。请确保代理地址以 <code>?url=</code> 结尾。
                        </p>
                      </div>
                    }
                  />
                )}

                {activeTab === 'player' && (
                  <ConfigSection
                    title="播放器设置"
                    items={playersState}
                    activeId={activePlayerIdState}
                    onSetActive={setActivePlayerIdState}
                    onAdd={(name, url) => setPlayersState([...playersState, { id: Date.now().toString(), name, url }])}
                    onDelete={(id) => {
                      setPlayersState(playersState.filter(p => p.id !== id));
                      if (activePlayerIdState === id) setActivePlayerIdState('default');
                    }}
                    namePlaceholder="例如: 外部解析"
                    urlPlaceholder="例如: https://jx.player.com/?url="
                    allowEmptyUrl={true}
                    description={
                      <div className="flex items-start gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200/80 text-sm">
                        <Info className="w-5 h-5 shrink-0 text-emerald-400" />
                        <p>
                          如果内置播放器无法播放某些源，您可以引入第三方的解析播放器。系统将使用该接口通过 iframe 嵌套播放。
                        </p>
                      </div>
                    }
                  />
                )}

                {activeTab === 'storage' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div>
                      <h2 className="text-xl font-semibold text-white mb-4">本地化数据存储</h2>
                      <p className="text-zinc-400 text-sm mb-6">
                        您的播放历史、收藏记录以及各项设置都保存在浏览器的本地存储 (LocalStorage) 中。
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                          type="button"
                          onClick={handleClearData}
                          className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-4 rounded-xl font-medium transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                          清除所有本地数据
                        </button>
                        
                        {/* 占位按钮，未来可实现导入导出功能 */}
                        <button
                          type="button"
                          className="flex items-center justify-center gap-2 bg-zinc-800/50 text-zinc-500 border border-white/5 px-4 py-4 rounded-xl font-medium cursor-not-allowed"
                          disabled
                        >
                          <Download className="w-5 h-5" />
                          导出数据 (开发中)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-4 pt-6 mt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                  {saved ? (
                    <span className="flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      设置已自动保存
                    </span>
                  ) : (
                    <span className="text-zinc-500 font-normal">所有更改将实时保存</span>
                  )}
                </div>
                
                <div className="flex-1"></div>

                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-zinc-400 hover:text-white px-4 py-3 font-medium transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
