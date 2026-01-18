import React from 'react';
import { VideoIdea } from '../types';
import { Sparkles, ArrowRight } from 'lucide-react';

interface IdeaListProps {
  ideas: VideoIdea[];
  onSelect: (idea: VideoIdea) => void;
  loading: boolean;
}

export const IdeaList: React.FC<IdeaListProps> = ({ ideas, onSelect, loading }) => {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white rounded-xl border border-slate-200 shadow-sm animate-pulse p-5">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-slate-100 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
          </div>
        ))}
      </div>
    );
  }

  if (ideas.length === 0) return null;

  return (
    <div className="space-y-4 animate-fadeIn">
      <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
        <Sparkles className="text-yellow-500" size={20} />
        추천 영상 아이디어
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => (
          <button
            key={idea.id}
            onClick={() => onSelect(idea)}
            className="group relative bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl p-5 text-left transition-all shadow-sm hover:shadow-md"
          >
            <h3 className="font-bold text-lg text-slate-900 mb-2 group-hover:text-emerald-700">
              {idea.title}
            </h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-4">
              {idea.premise}
            </p>
            <div className="flex items-center text-emerald-600 text-sm font-medium">
              대본 작성하기 <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
