import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Settings as SettingsIcon, Save, Info, Rss, Shield, PlayCircle, Database, Trash2, Download, Plus, RefreshCw, X, Zap } from 'lucide-react';
import { 
  ConfigItem,
  getSources, setSources, getActiveSourceId, setActiveSourceId,
  getCorsProxies, setCorsProxies, getActiveCorsId, setActiveCorsId,
  getPlayers, setPlayers, getActivePlayerId, setActivePlayerId,
  syncFromLunaTV, findBestSource
} from '../services/maccms';
import PocketBaseTest from '../components/PocketBaseTest';

type Tab = 'source' | 'cors' | 'player' | 'storage';

interface TabItem {
  id: Tab;
  label: string;
  icon: any;
  color: string;
}

const TABS: TabItem[] = [
  { id: 'source', label: '订阅源', icon: Rss, color: 'text-rose-500' },
  { id: 'cors', label: 'CORS代理', icon: Shield, color: 'text-blue-500' },
  { id: 'player', label: '播放解析', icon: PlayCircle, color: 'text-emerald-500' },
  { id: 'storage', label: '数据管理', icon: Database, color: 'text-amber-500' },
];

const ConfigItemRow = memo(({ 
  item, 
  activeId, 
  onSetActive, 
  onDelete 
}: { 
  item: ConfigItem; 
  activeId: string; 
  onSetActive: (id: string) => void; 
  onDelete: (id: string) => void;
}) => (
  <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-300 ${activeId === item.id ? 'bg-white/10 border-white/20 shadow-lg' : 'bg-zinc-900/40 border-white/5 hover:border-white/10'}`}>
    <label className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group">
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 ${activeId === item.id ? 'border-white bg-white scale-110' : 'border-zinc-700 group-hover:border-zinc-500'}`}>
        {activeId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
      </div>
      <input
        type="radio"
        checked={activeId === item.id}
        onChange={() => onSetActive(item.id)}
        className="hidden"
      />
      <div className="truncate flex-1">
        <div className="text-sm font-semibold text-white truncate">{item.name}</div>
        <div className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono opacity-60">{item.url || '无 (内置/直连)'}</div>
      </div>
    </label>
    {!['default', 'none'].includes(item.id) && (
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="p-2 text-zinc-600 hover:text-rose-500 transition-colors shrink-0 ml-2"
        title="删除"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
));

ConfigItemRow.displayName = 'ConfigItemRow';

const ConfigSection = memo(({
  title,
  icon: Icon,
  description,
  items,
  activeId,
  onSetActive,
  onAdd,
  onDelete,
  namePlaceholder,
  urlPlaceholder,
  allowEmptyUrl = false,
  extraActions
}: {
  title: string;
  icon: any;
  description: React.ReactNode;
  items: ConfigItem[];
  activeId: string;
  onSetActive: (id: string) => void;
  onAdd: (name: string, url: string) => void;
  onDelete: (id: string) => void;
  namePlaceholder: string;
  urlPlaceholder: string;
  allowEmptyUrl?: boolean;
  extraActions?: React.ReactNode;
}) => {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || (!allowEmptyUrl && !newUrl.trim())) return;
    onAdd(newName.trim(), newUrl.trim());
    setNewName('');
    setNewUrl('');
  };

  const renderedItems = useMemo(() => (
    items.map(item => (
      <ConfigItemRow 
        key={item.id} 
        item={item} 
        activeId={activeId} 
        onSetActive={onSetActive} 
        onDelete={onDelete} 
      />
    ))
  ), [items, activeId, onSetActive, onDelete]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/5 rounded-xl">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        {extraActions}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
            <p className="text-zinc-500 text-sm">暂无自定义项，将使用系统默认设置</p>
          </div>
        ) : renderedItems}
      </div>

      <div className="bg-zinc-900/60 border border-white/5 p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">添加新项目</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={namePlaceholder}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              required
            />
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder={urlPlaceholder}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
              required={!allowEmptyUrl}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-white text-black hover:bg-zinc-200 px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-full justify-center shadow-lg active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            保存并添加
          </button>
        </form>
      </div>

      <div className="pt-2">
        {description}
      </div>
    </div>
  );
});

ConfigSection.displayName = 'ConfigSection';

export default function Settings({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>('source');
  
  // Form states
  const [sourcesState, setSourcesState] = useState<ConfigItem[]>([]);
  const [activeSourceIdState, setActiveSourceIdState] = useState('');

  const [corsProxiesState, setCorsProxiesState] = useState<ConfigItem[]>([]);
  const [activeCorsIdState, setActiveCorsIdState] = useState('');

  const [playersState, setPlayersState] = useState<ConfigItem[]>([]);
  const [activePlayerIdState, setActivePlayerIdState] = useState('');
  
  const [syncing, setSyncing] = useState(false);
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [saved, setSaved] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    setSourcesState(getSources());
    setActiveSourceIdState(getActiveSourceId());

    setCorsProxiesState(getCorsProxies());
    setActiveCorsIdState(getActiveCorsId());

    setPlayersState(getPlayers());
    setActivePlayerIdState(getActivePlayerId());

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Auto-save effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const saveTimeout = setTimeout(() => {
      setSources(sourcesState);
      setActiveSourceId(activeSourceIdState);
      setCorsProxies(corsProxiesState);
      setActiveCorsId(activeCorsIdState);
      setPlayers(playersState);
      setActivePlayerId(activePlayerIdState);

      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }, 500); // Debounce save

    return () => clearTimeout(saveTimeout);
  }, [sourcesState, activeSourceIdState, corsProxiesState, activeCorsIdState, playersState, activePlayerIdState]);

  const handleSync = async (type: 'full' | 'jin18' | 'jingjian') => {
    if (!window.confirm(`确定要从 LunaTV 同步订阅源吗？这将添加约 ${type === 'full' ? '80+' : '30+'} 个新源。`)) return;
    setSyncing(true);
    try {
      const newSources = await syncFromLunaTV(type);
      const existingIds = new Set(sourcesState.map(s => s.id));
      const filteredNew = newSources.filter(s => !existingIds.has(s.id));
      setSourcesState(prev => [...prev, ...filteredNew]);
    } catch (e) {
      alert('同步失败，请检查网络连接');
    } finally {
      setSyncing(false);
    }
  };

  const handleAutoSelect = async () => {
    setTestingSpeed(true);
    try {
      const best = await findBestSource();
      if (best) {
        setActiveSourceIdState(best.id);
        alert(`已为您自动选取最佳线路: ${best.name}`);
      } else {
        alert('测速失败，请检查网络或代理设置');
      }
    } catch (e) {
      alert('测速过程中发生错误');
    } finally {
      setTestingSpeed(false);
    }
  };

  const handleClearData = () => {
    if (window.confirm('确定要清除所有本地数据吗？这包括您的播放历史和收藏记录。')) {
      localStorage.clear();
      setSourcesState(getSources());
      setActiveSourceIdState(getActiveSourceId());
      setCorsProxiesState(getCorsProxies());
      setActiveCorsIdState(getActiveCorsId());
      setPlayersState(getPlayers());
      setActivePlayerIdState(getActivePlayerId());
      alert('本地数据已清除！');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl h-full sm:h-[85vh] bg-zinc-950 border-0 sm:border sm:border-white/10 sm:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-full md:w-72 bg-zinc-900/30 border-b md:border-b-0 md:border-r border-white/5 flex flex-col shrink-0">
          <div className="p-6 sm:p-8 pb-4">
            <div className="flex items-center justify-between md:justify-start gap-3 mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-xl">
                  <SettingsIcon className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-xl font-black text-white tracking-tighter uppercase">Settings</h1>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest ml-1 hidden sm:block">Configuration</p>
          </div>

          <nav className="p-4 space-y-1 overflow-x-auto md:overflow-x-visible flex md:flex-col no-scrollbar border-b border-white/5 md:border-b-0">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group shrink-0 md:shrink ${
                  activeTab === tab.id 
                    ? 'bg-white text-black shadow-xl scale-[1.02]' 
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-black' : 'text-zinc-500 group-hover:text-white'}`} />
                <span className="text-sm font-bold tracking-tight">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-black hidden md:block" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-white/5 hidden md:block mt-auto">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-zinc-500'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${saved ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
              {saved ? 'Auto-Saved' : 'Ready'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-black/20 relative">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-10 p-2 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all active:scale-95 hidden md:block"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar overscroll-contain">
            {activeTab === 'source' && (
              <ConfigSection
                title="订阅源管理"
                icon={Rss}
                items={sourcesState}
                activeId={activeSourceIdState}
                onSetActive={setActiveSourceIdState}
                onAdd={(name, url) => setSourcesState(prev => [...prev, { id: Date.now().toString(), name, url }])}
                onDelete={(id) => {
                  setSourcesState(prev => prev.filter(s => s.id !== id));
                  if (activeSourceIdState === id) setActiveSourceIdState('default');
                }}
                namePlaceholder="源名称 (如: 卧龙资源)"
                urlPlaceholder="接口地址 (需支持 JSON)"
                extraActions={
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleAutoSelect}
                      disabled={testingSpeed}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-2"
                    >
                      {testingSpeed ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Zap className="w-3.5 h-3.5" />
                      )}
                      {testingSpeed ? '测速中...' : '智能选取'}
                    </button>
                    <button
                      onClick={() => handleSync('jin18')}
                      disabled={syncing}
                      className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-xl hover:bg-white/10 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                      精简同步
                    </button>
                    <button
                      onClick={() => handleSync('full')}
                      disabled={syncing}
                      className="px-4 py-2 bg-zinc-900 text-zinc-400 border border-white/5 rounded-xl hover:bg-zinc-800 hover:text-white transition-all disabled:opacity-50 text-xs font-bold"
                    >
                      全量
                    </button>
                  </div>
                }
                description={
                  <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-zinc-500 text-xs leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
                    <p>
                      自定义源将覆盖默认源。接口需支持 JSON 格式，推荐在地址末尾添加 <code className="text-white bg-white/10 px-1.5 py-0.5 rounded">/at/json</code>。
                    </p>
                  </div>
                }
              />
            )}

            {activeTab === 'cors' && (
              <ConfigSection
                title="CORS 代理设置"
                icon={Shield}
                items={corsProxiesState}
                activeId={activeCorsIdState}
                onSetActive={setActiveCorsIdState}
                onAdd={(name, url) => setCorsProxiesState([...corsProxiesState, { id: Date.now().toString(), name, url }])}
                onDelete={(id) => {
                  setCorsProxiesState(corsProxiesState.filter(p => p.id !== id));
                  if (activeCorsIdState === id) setActiveCorsIdState('default');
                }}
                namePlaceholder="代理名称"
                urlPlaceholder="代理地址 (需以 ?url= 结尾)"
                allowEmptyUrl={true}
                description={
                  <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-zinc-500 text-xs leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
                    <p>
                      解决跨域请求拦截问题。若接口请求失败，请尝试切换代理或使用“直连”。
                    </p>
                  </div>
                }
              />
            )}

            {activeTab === 'player' && (
              <ConfigSection
                title="播放器与解析"
                icon={PlayCircle}
                items={playersState}
                activeId={activePlayerIdState}
                onSetActive={setActivePlayerIdState}
                onAdd={(name, url) => setPlayersState([...playersState, { id: Date.now().toString(), name, url }])}
                onDelete={(id) => {
                  setPlayersState(playersState.filter(p => p.id !== id));
                  if (activePlayerIdState === id) setActivePlayerIdState('default');
                }}
                namePlaceholder="播放器名称"
                urlPlaceholder="解析接口地址"
                allowEmptyUrl={true}
                description={
                  <div className="flex items-start gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-zinc-500 text-xs leading-relaxed">
                    <Info className="w-4 h-4 shrink-0 text-zinc-400 mt-0.5" />
                    <p>
                      支持第三方解析接口。系统将通过 iframe 嵌套方式调用外部播放器。
                    </p>
                  </div>
                }
              />
            )}

            {activeTab === 'storage' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/5 rounded-xl">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">数据管理</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <PocketBaseTest />
                  
                  <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">清除缓存</h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">清除所有本地存储的数据，包括播放历史、收藏和自定义设置。此操作不可撤销。</p>
                    </div>
                    <button
                      onClick={handleClearData}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" />
                      立即清除所有数据
                    </button>
                  </div>
                  
                  <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-4 opacity-50">
                    <div>
                      <h3 className="text-sm font-bold text-white">数据备份</h3>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">导出您的配置与历史记录到本地文件，或从备份恢复。</p>
                    </div>
                    <button
                      disabled
                      className="w-full py-3 bg-white/5 text-zinc-500 border border-white/5 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      导出备份 (即将推出)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-10 py-6 border-t border-white/5 bg-zinc-900/50 flex items-center justify-between">
            <p className="text-[10px] text-zinc-600 font-medium max-w-[200px] md:max-w-none">
              Settings are stored locally in your browser.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-white text-black rounded-2xl text-sm font-black hover:bg-zinc-200 transition-all shadow-xl active:scale-95"
            >
              完成并关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
