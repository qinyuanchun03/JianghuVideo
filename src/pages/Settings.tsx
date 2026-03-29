import React, { useState, useEffect, useRef, memo, useMemo } from 'react';
import { Settings as SettingsIcon, Save, Info, Rss, Shield, PlayCircle, Database, Trash2, Download, Plus, RefreshCw, X, Zap, Sun, Moon, Palette, Sparkles, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { storage } from '../utils/storage';
import { 
  ConfigItem,
  getSources, setSources, getActiveSourceId, setActiveSourceId,
  getCorsProxies, setCorsProxies, getActiveCorsId, setActiveCorsId,
  getPlayers, setPlayers, getActivePlayerId, setActivePlayerId,
  syncFromLunaTV, findBestSource, getEffectiveSources
} from '../services/maccms';
import { runDeepTest } from '../services/speedTest';

type Tab = 'source' | 'cors' | 'player' | 'storage' | 'theme';

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
  { id: 'theme', label: '主题外观', icon: Palette, color: 'text-violet-500' },
  { id: 'storage', label: '数据管理', icon: Database, color: 'text-amber-500' },
];

const ConfigItemRow = memo(({ 
  item, 
  activeId, 
  onSetActive, 
  showDelete = false,
  onDelete 
}: { 
  item: ConfigItem; 
  activeId: string; 
  onSetActive: (id: string) => void; 
  showDelete?: boolean;
  onDelete?: (id: string) => void;
}) => (
  <div className={`flex items-center justify-between p-2 sm:p-3 rounded-xl border transition-all duration-300 ${activeId === item.id ? 'bg-bg-main/20 border-bg-accent/20 shadow-lg' : 'bg-bg-card/40 border-border-main hover:border-text-muted/20'}`}>
    <label className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer group py-1 pl-1">
      <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${activeId === item.id ? 'border-bg-accent bg-bg-accent scale-110' : 'border-text-muted/30 group-hover:border-text-muted/50'}`}>
        {activeId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
      <input
        type="radio"
        checked={activeId === item.id}
        onChange={() => onSetActive(item.id)}
        className="hidden"
      />
      <div className="truncate flex-1">
        <div className="text-sm font-semibold text-text-main flex items-center gap-2">
          <span className="truncate">{item.name}</span>
          {item.deepTestResult && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
              item.deepTestResult.score > 80 ? 'bg-emerald-500/20 text-emerald-400' :
              item.deepTestResult.score > 50 ? 'bg-amber-500/20 text-amber-400' :
              'bg-rose-500/20 text-rose-400'
            }`}>
              {item.deepTestResult.score}分
            </span>
          )}
        </div>
        <div className="text-[10px] text-text-muted truncate mt-0.5 font-mono opacity-60 flex items-center gap-2">
          <span className="truncate">{item.url || '无 (内置/直连)'}</span>
        </div>
      </div>
    </label>
    {showDelete && onDelete && !['default', 'none', 'dplayer', 'dbzy99'].includes(item.id) && (
      <button
        type="button"
        onClick={() => onDelete(item.id)}
        className="p-3 text-text-muted/50 hover:text-bg-accent transition-colors shrink-0 ml-1 -mr-1"
        title="删除"
      >
        <Trash2 className="w-4 h-4" />
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
          <div className="p-2 bg-bg-card/50 rounded-xl">
            <Icon className="w-5 h-5 text-text-main" />
          </div>
          <h2 className="text-xl font-bold text-text-main tracking-tight">{title}</h2>
        </div>
        {extraActions}
      </div>

      <div className="grid grid-cols-1 gap-2">
        {items.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border-main rounded-2xl bg-bg-card/20">
            <p className="text-text-muted text-sm">暂无自定义项，将使用系统默认设置</p>
          </div>
        ) : renderedItems}
      </div>

      <div className="bg-bg-card/60 border border-border-main p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">添加新项目</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={namePlaceholder}
              className="w-full bg-bg-main/40 border border-border-main rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/20 transition-all"
              required
            />
            <input
              type="url"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              placeholder={urlPlaceholder}
              className="w-full bg-bg-main/40 border border-border-main rounded-xl px-4 py-2.5 text-sm text-text-main placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-bg-accent/20 transition-all"
              required={!allowEmptyUrl}
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-text-main text-bg-main hover:opacity-90 px-4 py-2.5 rounded-xl text-sm font-bold transition-all w-full justify-center shadow-lg active:scale-[0.98]"
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

export default function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('cors');
  
  // Form states
  const [sourcesState, setSourcesState] = useState<ConfigItem[]>([]);
  const [activeSourceIdState, setActiveSourceIdState] = useState('');

  const [corsProxiesState, setCorsProxiesState] = useState<ConfigItem[]>([]);
  const [activeCorsIdState, setActiveCorsIdState] = useState('');

  const [playersState, setPlayersState] = useState<ConfigItem[]>([]);
  const [activePlayerIdState, setActivePlayerIdState] = useState('');
  
  const [syncing, setSyncing] = useState(false);
  const [testingSpeed, setTestingSpeed] = useState(false);
  const [deepTesting, setDeepTesting] = useState(false);
  const [deepTestProgress, setDeepTestProgress] = useState('');
  const [saved, setSaved] = useState(false);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Always use effective sources instead of custom sources
    setSourcesState(getEffectiveSources());
    setActiveSourceIdState(getActiveSourceId());

    setCorsProxiesState(getCorsProxies());
    setActiveCorsIdState(getActiveCorsId());

    setPlayersState(getPlayers());
    setActivePlayerIdState(getActivePlayerId());
  }, []);

  const handleSaveAndBack = () => {
    setSources(sourcesState);
    setActiveSourceId(activeSourceIdState);
    setCorsProxies(corsProxiesState);
    setActiveCorsId(activeCorsIdState);
    setPlayers(playersState);
    setActivePlayerId(activePlayerIdState);
    window.dispatchEvent(new Event('maccms_settings_changed'));
    
    setSaved(true);
    setTimeout(() => {
      navigate(-1);
    }, 500);
  };

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
      window.dispatchEvent(new Event('maccms_settings_changed'));

      setSaved(true);
      const timer = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(timer);
    }, 1000); // Debounce save

    return () => clearTimeout(saveTimeout);
  }, [sourcesState, activeSourceIdState, corsProxiesState, activeCorsIdState, playersState, activePlayerIdState]);

  const handleAutoSelect = async () => {
    setTestingSpeed(true);
    try {
      const best = await findBestSource();
      if (best) {
        setActiveSourceIdState(best.id);
      }
    } catch (e) {
      console.error('测速失败', e);
    } finally {
      setTestingSpeed(false);
    }
  };

  const handleDeepTestAll = async () => {
    setDeepTesting(true);
    try {
      const currentSources = getEffectiveSources();
      const newSources = [...currentSources];
      
      for (let i = 0; i < newSources.length; i++) {
        setDeepTestProgress(`正在测试 ${i + 1}/${newSources.length}: ${newSources[i].name}`);
        const result = await runDeepTest(newSources[i]);
        newSources[i] = { ...newSources[i], deepTestResult: result };
        setSourcesState([...newSources]); // Update UI progressively
      }
      
      // Sort by latency (searchTime + detailTime + streamTime)
      newSources.sort((a, b) => {
        const timeA = (a.deepTestResult?.searchTime || 9999) + (a.deepTestResult?.detailTime || 9999) + (a.deepTestResult?.streamTime || 9999);
        const timeB = (b.deepTestResult?.searchTime || 9999) + (b.deepTestResult?.detailTime || 9999) + (b.deepTestResult?.streamTime || 9999);
        if (timeA !== timeB) return timeA - timeB;
        return (b.deepTestResult?.score || 0) - (a.deepTestResult?.score || 0);
      });
      setSourcesState(newSources);
      
      if (newSources.length > 0 && newSources[0].deepTestResult && newSources[0].deepTestResult.score > 0) {
        setActiveSourceIdState(newSources[0].id);
        console.log(`深度测速完成！已为您自动选取综合评分最高的线路: ${newSources[0].name}`);
      } else {
        console.log('深度测速完成，但似乎没有找到可用的线路。');
      }
    } catch (e) {
      console.error('测速过程中发生错误');
    } finally {
      setDeepTesting(false);
      setDeepTestProgress('');
    }
  };

  const handleClearData = () => {
    localStorage.clear();
    setSourcesState(getEffectiveSources());
    setActiveSourceIdState(getActiveSourceId());
    setCorsProxiesState(getCorsProxies());
    setActiveCorsIdState(getActiveCorsId());
    setPlayersState(getPlayers());
    setActivePlayerIdState(getActivePlayerId());
    console.log('本地数据已清除！');
  };

  const { theme: currentTheme, setTheme } = useTheme();

  return (
    <div className="max-w-7xl mx-auto px-4 pt-20 sm:pt-24 pb-8 h-[100dvh] md:h-auto flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 rounded-2xl bg-bg-card/50 border border-border-main text-text-muted hover:text-text-main hover:bg-bg-card transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-text-main tracking-tighter uppercase">Settings</h1>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Configuration</p>
          </div>
        </div>
        
        <button 
          onClick={handleSaveAndBack}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-500 active:scale-95 ${
            saved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-bg-accent text-white shadow-lg shadow-bg-accent/20'
          }`}
        >
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? '已保存' : '完成'}
        </button>
      </div>

      <div className="bg-bg-main/80 backdrop-blur-3xl border border-border-main rounded-[2rem] md:rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden flex-1 md:h-[calc(100dvh-8rem)] min-h-0">
        {/* Sidebar */}
        <div className="w-full md:w-72 bg-bg-card/30 border-b md:border-b-0 md:border-r border-border-main flex flex-col shrink-0 z-10 overflow-x-auto md:overflow-x-visible">
          <nav className="p-4 md:p-6 space-x-2 md:space-x-0 md:space-y-1 flex md:flex-col shrink-0 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group shrink-0 ${
                  activeTab === tab.id 
                    ? 'bg-text-main text-bg-main shadow-xl scale-[1.02]' 
                    : 'text-text-muted hover:bg-bg-card/50 hover:text-text-main'
                }`}
              >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-bg-main' : 'text-text-muted group-hover:text-text-main'}`} />
                <span className="text-sm font-bold tracking-tight whitespace-nowrap">{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-bg-main hidden md:block" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-border-main mt-auto hidden md:block">
            <button 
              onClick={handleSaveAndBack}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-bg-accent text-white rounded-2xl text-sm font-bold shadow-xl shadow-bg-accent/20 hover:opacity-90 transition-all active:scale-95 mb-4"
            >
              <Save className="w-4 h-4" />
              保存并返回
            </button>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${saved ? 'bg-emerald-500/10 text-emerald-400' : 'bg-bg-card/50 text-text-muted'}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${saved ? 'bg-emerald-500 animate-pulse' : 'bg-text-muted/30'}`} />
              {saved ? 'Auto-Saved' : 'Ready'}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-bg-main/20 relative">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar overscroll-contain">
            {activeTab === 'theme' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-card/50 rounded-xl">
                    <Palette className="w-5 h-5 text-text-main" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main tracking-tight">主题外观</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: 'dark', label: '深邃夜空', icon: Moon, desc: '经典暗黑模式，保护视力', color: 'bg-[#0a0a0a]' },
                    { id: 'day', label: '简约蓝白', icon: Sun, desc: '清爽蓝白设计，简约而不简单', color: 'bg-white' },
                    { id: 'night', label: '幻彩紫夜', icon: Palette, desc: '迷人渐变紫，科技感十足', color: 'bg-[#0f0c29]' },
                    { id: 'girl', label: '甜美粉红', icon: Sparkles, desc: '温馨少女粉，甜美可爱', color: 'bg-[#fff1f2]' },
                    { id: 'sunset', label: '日落余晖', icon: Sun, desc: '温暖橙黄，如沐夕阳', color: 'bg-[#fff7ed]' },
                    { id: 'ocean', label: '蔚蓝海洋', icon: Palette, desc: '深邃海蓝，心旷神怡', color: 'bg-[#f0f9ff]' },
                    { id: 'forest', label: '森之呼吸', icon: Sparkles, desc: '清新翠绿，自然气息', color: 'bg-[#f0fdf4]' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id as any)}
                      className={`flex items-start gap-4 p-5 rounded-3xl border transition-all duration-300 text-left group ${
                        currentTheme === t.id 
                          ? 'bg-bg-accent/10 border-bg-accent shadow-lg shadow-bg-accent/10' 
                          : 'bg-bg-card/40 border-border-main hover:border-text-muted/30'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${t.color}`}>
                        <t.icon className={`w-6 h-6 ${t.id === 'day' ? 'text-blue-600' : t.id === 'girl' ? 'text-pink-600' : t.id === 'night' ? 'text-violet-400' : 'text-white'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-text-main">{t.label}</h3>
                          {currentTheme === t.id && (
                            <div className="w-2 h-2 rounded-full bg-bg-accent animate-pulse" />
                          )}
                        </div>
                        <p className="text-[10px] text-text-muted mt-1 leading-relaxed">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'source' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-bg-card/50 rounded-xl">
                      <Rss className="w-5 h-5 text-text-main" />
                    </div>
                    <h2 className="text-xl font-bold text-text-main tracking-tight">订阅源管理</h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleDeepTestAll}
                      disabled={deepTesting}
                      className="px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-2"
                    >
                      {deepTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {deepTesting ? deepTestProgress || '测速中...' : '深度测速'}
                    </button>
                    <button
                      onClick={handleAutoSelect}
                      disabled={testingSpeed}
                      className="px-4 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all disabled:opacity-50 text-xs font-bold flex items-center gap-2"
                    >
                      {testingSpeed ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      {testingSpeed ? '测速中...' : '快速选取'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {sourcesState.map(item => (
                    <ConfigItemRow 
                      key={item.id} 
                      item={item} 
                      activeId={activeSourceIdState} 
                      onSetActive={setActiveSourceIdState} 
                    />
                  ))}
                </div>

                <div className="flex items-start gap-4 p-4 bg-bg-card/20 border border-border-main rounded-2xl text-text-muted text-xs leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 text-text-muted/50 mt-0.5" />
                  <p>
                    系统已为您预设了优质的采集源。您可以使用“深度测速”自动选取当前网络环境下最快的线路。
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'cors' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-card/50 rounded-xl">
                    <Shield className="w-5 h-5 text-text-main" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main tracking-tight">CORS 代理设置</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {corsProxiesState.map(item => (
                    <ConfigItemRow 
                      key={item.id} 
                      item={item} 
                      activeId={activeCorsIdState} 
                      onSetActive={setActiveCorsIdState} 
                    />
                  ))}
                </div>
                <div className="flex items-start gap-4 p-4 bg-bg-card/20 border border-border-main rounded-2xl text-text-muted text-xs leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 text-text-muted/50 mt-0.5" />
                  <p>
                    解决跨域请求拦截问题。若接口请求失败，请尝试切换代理或使用“直连”。
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'player' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-card/50 rounded-xl">
                    <PlayCircle className="w-5 h-5 text-text-main" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main tracking-tight">播放器与解析</h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {playersState.map(item => (
                    <ConfigItemRow 
                      key={item.id} 
                      item={item} 
                      activeId={activePlayerIdState} 
                      onSetActive={setActivePlayerIdState} 
                    />
                  ))}
                </div>
                <div className="flex items-start gap-4 p-4 bg-bg-card/20 border border-border-main rounded-2xl text-text-muted text-xs leading-relaxed">
                  <Info className="w-4 h-4 shrink-0 text-text-muted/50 mt-0.5" />
                  <p>
                    支持第三方解析接口。系统将通过 iframe 嵌套方式调用外部播放器。
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-card/50 rounded-xl">
                    <Database className="w-5 h-5 text-text-main" />
                  </div>
                  <h2 className="text-xl font-bold text-text-main tracking-tight">数据管理</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 bg-bg-card/40 border border-border-main rounded-2xl space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-text-main">清除缓存</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">清除所有本地存储的数据，包括播放历史、收藏和自定义设置。此操作不可撤销。</p>
                    </div>
                    <button
                      onClick={handleClearData}
                      className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" />
                      立即清除所有数据
                    </button>
                  </div>
                  
                  <div className="p-6 bg-bg-card/40 border border-border-main rounded-2xl space-y-4 opacity-50">
                    <div>
                      <h3 className="text-sm font-bold text-text-main">数据备份</h3>
                      <p className="text-xs text-text-muted mt-1 leading-relaxed">导出您的配置与历史记录到本地文件，或从备份恢复。</p>
                    </div>
                    <button
                      disabled
                      className="w-full py-3 bg-bg-card/50 text-text-muted border border-border-main rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      导出备份 (即将推出)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
