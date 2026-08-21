import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ONBOARD_SLIDES } from './mockMobileData';

interface OnboardingScreenProps {
  onDone: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onDone }) => {
  const [index, setIndex] = useState(0);
  const slide = ONBOARD_SLIDES[index];

  const next = () => {
    if (index < ONBOARD_SLIDES.length - 1) setIndex(index + 1);
    else onDone();
  };

  return (
    <div className="flex-1 flex flex-col px-7 pt-2 pb-8 min-h-screen">
      <div className="flex justify-end">
        <button
          onClick={onDone}
          className="text-[13px] font-semibold text-slate-500 p-2"
        >
          Skip
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
        <div className={`w-[132px] h-[132px] rounded-full flex items-center justify-center ${slide.iconBg}`}>
          {slide.icon}
        </div>
        <div className="flex flex-col gap-2.5 max-w-[270px]">
          <h1 className="font-display text-[25px] text-slate-900 leading-tight">{slide.title}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{slide.body}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {ONBOARD_SLIDES.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === index ? 'w-[22px] bg-blue-600' : 'w-1.5 bg-slate-300'}`}
            />
          ))}
        </div>
        <button
          onClick={next}
          aria-label="Next"
          className="w-[52px] h-[52px] rounded-full bg-blue-600 flex items-center justify-center shadow-[0_3px_10px_rgba(15,23,42,0.18)]"
        >
          <ChevronRight className="w-[22px] h-[22px] text-white" />
        </button>
      </div>
    </div>
  );
};
