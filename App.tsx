
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { IdeaList } from './components/IdeaList';
import { ScriptViewer } from './components/ScriptViewer';
import { VideoIdea, ScriptSection, ScriptType } from './types';
import { generateVideoIdeas, generateScript } from './services/geminiService';
import { User, Loader2, Lightbulb, Zap, FileText, Search, Key, AlertCircle, ShieldCheck, Lock, ChevronRight, TrendingUp, CheckCircle2 } from 'lucide-react';

const DEFAULT_NAME = "경제";

function App() {
  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [isCheckingKey, setIsCheckingKey] = useState(true);

  // App State
  const [step, setStep] = useState<'ideas' | 'script'>('ideas');
  const [protagonistName, setProtagonistName] = useState(DEFAULT_NAME);
  const [scriptType, setScriptType] = useState<ScriptType>('shorts');
  const [keyword, setKeyword] = useState("");
  const [ideas, setIdeas] = useState<VideoIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<VideoIdea | null>(null);
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);
  
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);

  // Initialize API Key Check
  useEffect(() => {
    // Check localStorage first
    const storedKey = localStorage.getItem("GEMINI_API_KEY");
    if (storedKey) {
      setHasApiKey(true);
    }
    setIsCheckingKey(false);
  }, []);

  const handleSaveApiKey = () => {
    if (!apiKeyInput.trim()) {
      setError("API 키를 입력해주세요.");
      return;
    }
    if (!apiKeyInput.startsWith("AIza")) {
      setError("유효하지 않은 API 키 형식입니다. 'AIza'로 시작하는 키를 입력해주세요.");
      return;
    }
    localStorage.setItem("GEMINI_API_KEY", apiKeyInput.trim());
    setHasApiKey(true);
    setError(null);
  };

  const handleResetApiKey = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    setHasApiKey(false);
    setApiKeyInput("");
    setIsQuotaExceeded(false);
  };

  const handleError = (err: any) => {
    const msg = err.message || JSON.stringify(err);
    if (msg.includes("401") || msg.includes("API key not valid") || msg.includes("Requested entity was not found")) {
      // 키가 유효하지 않으면 로그인 화면으로 리셋
      handleResetApiKey();
      setError("API 키가 만료되었거나 유효하지 않습니다. 다시 입력해주세요.");
      return;
    }
    setError(msg || "작업을 수행하는 도중 문제가 발생했습니다.");
    if (err.isQuotaError) setIsQuotaExceeded(true);
  };

  const handleGenerateIdeas = async () => {
    setLoadingIdeas(true);
    setError(null);
    setIsQuotaExceeded(false);
    try {
      const newIdeas = await generateVideoIdeas(keyword);
      setIdeas(Array.isArray(newIdeas) ? newIdeas : []);
    } catch (err: any) {
      handleError(err);
      setIdeas([]);
    } finally {
      setLoadingIdeas(false);
    }
  };

  const handleSelectIdea = async (idea: VideoIdea) => {
    setSelectedIdea(idea);
    setLoadingScript(true);
    setStep('script');
    setError(null);
    setIsQuotaExceeded(false);
    try {
      const response = await generateScript(idea.title, protagonistName, scriptType);
      if (response && Array.isArray(response.sections)) {
        setScriptSections(response.sections);
      } else {
        throw new Error("Invalid script response");
      }
    } catch (err: any) {
      handleError(err);
      setStep('ideas');
    } finally {
      setLoadingScript(false);
    }
  };

  const reset = () => {
    setStep('ideas');
    setScriptSections([]);
    setSelectedIdea(null);
    setError(null);
    setIsQuotaExceeded(false);
  };

  if (isCheckingKey) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-slate-500 font-medium">설정 불러오는 중...</p>
        </div>
      </Layout>
    );
  }

  // Welcome / API Key Input Screen
  if (!hasApiKey) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <div className="relative z-10">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg transform rotate-3">
                  <TrendingUp className="text-white" size={32} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                  경제 유튜버 데뷔, <br/>
                  <span className="text-emerald-400">지금 바로 시작하세요</span>
                </h2>
                <p className="text-slate-400 font-medium text-lg">
                  "세상에 공짜 점심은 없다지만, <br/>API 키만 있다면 AI가 대본부터 영상까지 떠먹여 드립니다."
                </p>
              </div>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3 text-emerald-700 font-bold">
                    <Lightbulb size={20} />
                    <h3>킬러 콘텐츠 발굴</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    조회수가 터지는 금융 키워드와 훅(Hook)을 AI가 분석하여 제안합니다.
                  </p>
                </div>
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-3 text-indigo-700 font-bold">
                    <Zap size={20} />
                    <h3>원스톱 제작</h3>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    대본 작성, 스토리보드 구성, TTS 및 영상 미리보기까지 한 번에 끝내세요.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8 space-y-4">
                <div className="space-y-3">
                  <label className="block text-sm font-bold text-slate-700 ml-1">
                    Google Gemini API 키 입력
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Key className="text-slate-400" size={18} />
                    </div>
                    <input
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      placeholder="AIzaSy... 로 시작하는 키를 입력하세요"
                      className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                    />
                  </div>
                  {error && <p className="text-red-500 text-xs font-bold ml-1">{error}</p>}
                </div>
                
                <button
                  onClick={handleSaveApiKey}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white text-lg font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  시작하기
                  <ChevronRight size={20} className="text-slate-500 group-hover:translate-x-1 transition-transform" />
                </button>
                
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 mt-4">
                  <Lock size={12} />
                  <span>입력한 키는 브라우저 로컬 스토리지에만 안전하게 저장됩니다.</span>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-bold"
                  >
                    API 키 발급받기
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Main App Interface
  return (
    <Layout>
      <div className="space-y-8">
        {step === 'ideas' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
               <h2 className="text-lg font-bold text-slate-800">새로운 영상 기획</h2>
               <button onClick={handleResetApiKey} className="text-xs text-slate-400 hover:text-red-500 underline">
                 API 키 변경
               </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  주인공 이름 (유튜버 페르소나)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={protagonistName}
                    onChange={(e) => setProtagonistName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    placeholder="예: 경제"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">
                  대본 유형 선택
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setScriptType('shorts')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${scriptType === 'shorts' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Zap size={16} /> 쇼츠 (1200자 엄수)
                  </button>
                  <button 
                    onClick={() => setScriptType('longform')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-md transition-all ${scriptType === 'longform' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileText size={16} /> 롱폼 (5000자 권장)
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">
                원하는 주제 또는 키워드 (선택 사항)
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="예: 삼성전자 주가, 사회초년생 재테크 등"
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerateIdeas()}
                />
              </div>
              <p className="text-[10px] text-slate-400">키워드를 입력하면 해당 주제와 관련된 아이디어를 우선적으로 구상합니다.</p>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={handleGenerateIdeas}
                disabled={loadingIdeas}
                className="w-full md:w-1/2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
              >
                {loadingIdeas ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    아이디어 구상 중...
                  </>
                ) : (
                  <>
                    <Lightbulb size={20} />
                    아이디어 생성하기
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3 animate-slideUp">
             <AlertCircle className="shrink-0 mt-0.5" size={18} />
             <div>
               <p className="font-bold text-sm">오류가 발생했습니다</p>
               <p className="text-sm opacity-90">{error}</p>
             </div>
          </div>
        )}

        {isQuotaExceeded && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-4 animate-slideUp">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-amber-600" size={24} />
              <div>
                <h4 className="font-bold text-amber-900 text-sm">무료 사용량 초과</h4>
                <p className="text-xs text-amber-800">안정적인 생성을 위해 본인의 API 키를 다시 확인해주세요.</p>
              </div>
            </div>
            <button 
              onClick={handleResetApiKey}
              className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors whitespace-nowrap"
            >
              키 다시 연결
            </button>
          </div>
        )}

        {step === 'ideas' && ideas && Array.isArray(ideas) && (
          <IdeaList 
            ideas={ideas} 
            onSelect={handleSelectIdea} 
            loading={loadingIdeas} 
          />
        )}

        {step === 'script' && loadingScript && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl animate-pulse">📝</span>
              </div>
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">
              닉의 대본 구조를 적용하고 있습니다...
            </h3>
            <p className="mt-2 text-slate-500 max-w-md flex flex-col items-center gap-2">
              <span className="flex items-center gap-1.5 text-emerald-600 font-bold"><Zap size={14} /> 오프닝 훅 및 상식 파괴 구간 구성 중</span>
              <span className="text-xs text-slate-400 font-medium">({protagonistName}의 독설 섞인 친절한 말투 반영 중)</span>
            </p>
          </div>
        )}

        {step === 'script' && !loadingScript && scriptSections.length > 0 && selectedIdea && (
          <ScriptViewer 
            initialSections={scriptSections} 
            title={selectedIdea.title} 
            protagonistName={protagonistName} 
            scriptType={scriptType}
            onBack={reset}
            onResetKey={handleResetApiKey}
          />
        )}
      </div>
    </Layout>
  );
}

export default App;
