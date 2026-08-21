import React, { useState } from 'react';
import { ArrowLeft, Camera, Check, Mic, MapPin, Sparkles, Upload, X } from 'lucide-react';
import { CreateScreen } from './types';
import { WIZARD_CONTENT_TYPES, WIZARD_DRAFT, WIZARD_GOALS } from './mockMobileData';

interface CreateOverlayProps {
  onClose: () => void;
}

const TITLES: Record<Exclude<CreateScreen, null>, string> = {
  wizard: 'AI Wizard',
  capture: 'Quick Capture',
  voice: 'Voice Note',
  upload: 'Upload Media',
};

export const CreateOverlay: React.FC<CreateOverlayProps> = ({ onClose }) => {
  const [screen, setScreen] = useState<CreateScreen>(null);
  const [locationOn, setLocationOn] = useState(true);
  const [wizardType, setWizardType] = useState<string>(WIZARD_CONTENT_TYPES[0]);
  const [wizardGoal, setWizardGoal] = useState<string>(WIZARD_GOALS[1]);
  const [wizardGenerated, setWizardGenerated] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceHasResult, setVoiceHasResult] = useState(false);
  const [uploadSelected, setUploadSelected] = useState<Record<number, boolean>>({});

  const openScreen = (s: CreateScreen) => {
    setScreen(s);
    if (s === 'wizard') setWizardGenerated(false);
    if (s === 'voice') {
      setVoiceRecording(false);
      setVoiceHasResult(false);
    }
    if (s === 'upload') setUploadSelected({});
  };

  const toggleUpload = (i: number) => setUploadSelected((prev) => ({ ...prev, [i]: !prev[i] }));
  const selectedCount = Object.values(uploadSelected).filter(Boolean).length;

  const waveformHeights = [6, 14, 22, 12, 28, 18, 24, 10, 20, 15, 9, 17];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      <div className="px-5 pt-3.5 pb-10">
        <div className="flex items-center gap-2.5 mb-[22px]">
          {screen && (
            <button
              onClick={() => setScreen(null)}
              aria-label="Back"
              className="w-[34px] h-[34px] rounded-full bg-slate-100 flex items-center justify-center flex-none"
            >
              <ArrowLeft className="w-[18px] h-[18px] text-slate-900" />
            </button>
          )}
          <h2 className="m-0 flex-1 font-display text-xl text-slate-900">{screen ? TITLES[screen] : 'Create'}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-[34px] h-[34px] rounded-full bg-slate-100 flex items-center justify-center flex-none"
          >
            <X className="w-[18px] h-[18px] text-slate-900" />
          </button>
        </div>

        {!screen && (
          <div className="flex flex-col gap-3">
            <button onClick={() => openScreen('wizard')} className="flex items-center gap-3.5 p-4 rounded-[20px] bg-slate-100 text-left">
              <div className="w-[42px] h-[42px] rounded-2xl bg-blue-50 flex items-center justify-center flex-none">
                <Sparkles className="w-[18px] h-[18px] text-blue-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">AI Wizard</div>
                <div className="text-[11.5px] text-slate-500">Zero-prompt content generator</div>
              </div>
            </button>
            <button onClick={() => openScreen('capture')} className="flex items-center gap-3.5 p-4 rounded-[20px] bg-slate-100 text-left">
              <div className="w-[42px] h-[42px] rounded-2xl bg-blue-100 flex items-center justify-center flex-none">
                <Camera className="w-[26px] h-[26px] text-blue-700" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Quick Capture</div>
                <div className="text-[11.5px] text-slate-500">Snap a photo or clip, tag your location</div>
              </div>
            </button>
            <button onClick={() => openScreen('voice')} className="flex items-center gap-3.5 p-4 rounded-[20px] bg-slate-100 text-left">
              <div className="w-[42px] h-[42px] rounded-2xl bg-emerald-50 flex items-center justify-center flex-none">
                <Mic className="w-[18px] h-[18px] text-emerald-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Voice Note</div>
                <div className="text-[11.5px] text-slate-500">Dictate a caption or script idea</div>
              </div>
            </button>
            <button onClick={() => openScreen('upload')} className="flex items-center gap-3.5 p-4 rounded-[20px] bg-slate-100 text-left">
              <div className="w-[42px] h-[42px] rounded-2xl bg-slate-50 flex items-center justify-center flex-none">
                <Upload className="w-[18px] h-[18px] text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900">Upload Media</div>
                <div className="text-[11.5px] text-slate-500">Bring in existing photos or clips</div>
              </div>
            </button>
          </div>
        )}

        {screen === 'capture' && (
          <div className="flex flex-col gap-3">
            <div className="h-[170px] rounded-2xl bg-[repeating-linear-gradient(135deg,#cbd5e1,#cbd5e1_8px,#94a3b8_8px,#94a3b8_16px)] flex items-center justify-center">
              <span className="font-mono text-[10px] text-slate-700 bg-white/85 px-2 py-1 rounded-md">camera preview</span>
            </div>
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-700" />
                <span className="text-[12.5px] font-semibold text-slate-900">
                  {locationOn ? 'Current location on' : 'Location off'}
                </span>
              </div>
              <button
                onClick={() => setLocationOn((v) => !v)}
                aria-pressed={locationOn}
                className={`w-11 h-[26px] rounded-full relative flex-none ${locationOn ? 'bg-blue-600' : 'bg-slate-300'}`}
              >
                <div
                  className={`absolute top-[3px] w-5 h-5 rounded-full bg-white transition-all ${locationOn ? 'left-[21px]' : 'left-[3px]'}`}
                />
              </button>
            </div>
            <button onClick={onClose} className="h-[46px] text-[13px] w-full rounded-full bg-blue-600 text-white font-bold">
              Save to Media Library
            </button>
          </div>
        )}

        {screen === 'wizard' && (
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2">Content type</div>
              <div className="flex gap-2 flex-wrap">
                {WIZARD_CONTENT_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setWizardType(t)}
                    className={`px-3.5 py-2 rounded-full text-[12.5px] font-bold ${
                      wizardType === t ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-2">Goal</div>
              <div className="flex gap-2 flex-wrap">
                {WIZARD_GOALS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setWizardGoal(g)}
                    className={`px-3.5 py-2 rounded-full text-[12.5px] font-bold ${
                      wizardGoal === g ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1.5" htmlFor="wizard-topic">
                Topic
              </label>
              <input
                id="wizard-topic"
                type="text"
                placeholder="Fall menu launch, new loyalty program…"
                className="w-full min-h-[46px] px-4 rounded-full border border-slate-200 bg-slate-100 text-sm text-slate-900"
              />
            </div>
            <button
              onClick={() => setWizardGenerated(true)}
              className="h-[46px] text-[13px] w-full rounded-full bg-blue-600 text-white font-bold"
            >
              Generate
            </button>
            {wizardGenerated && (
              <div className="bg-slate-100 rounded-[18px] p-4 flex flex-col gap-2">
                <span className="self-start text-[10px] font-bold tracking-wide px-2.5 py-[3px] rounded-full uppercase bg-blue-50 text-blue-700">
                  Draft ready
                </span>
                <h3 className="m-0 text-[15px] text-slate-900">{WIZARD_DRAFT.headline}</h3>
                <p className="m-0 text-[12.5px] text-slate-600 leading-relaxed">{WIZARD_DRAFT.body}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {WIZARD_DRAFT.hashtags.map((h) => (
                    <span key={h} className="text-[11px] text-blue-600 font-semibold">
                      {h}
                    </span>
                  ))}
                </div>
                <button onClick={onClose} className="mt-1.5 h-[42px] text-[13px] w-full rounded-full bg-slate-900 text-white font-bold">
                  Use this draft
                </button>
              </div>
            )}
          </div>
        )}

        {screen === 'voice' && (
          <div className="flex flex-col items-center gap-[18px] pt-3 pb-1.5">
            <button
              onClick={() => {
                if (voiceRecording) {
                  setVoiceRecording(false);
                  setVoiceHasResult(true);
                } else {
                  setVoiceRecording(true);
                  setVoiceHasResult(false);
                }
              }}
              className={`w-[88px] h-[88px] rounded-full flex items-center justify-center shadow-[0_3px_12px_rgba(15,23,42,0.18)] ${
                voiceRecording ? 'bg-blue-700' : 'bg-blue-600'
              }`}
            >
              <Mic className="w-[34px] h-[34px] text-white" />
            </button>
            <div className="font-display text-lg text-slate-900">
              {voiceRecording ? '00:12' : voiceHasResult ? '00:14' : '00:00'}
            </div>
            <div className="flex items-center gap-[3px] h-8">
              {waveformHeights.map((h, i) => (
                <div
                  key={i}
                  style={{ height: h }}
                  className={`w-[3px] rounded-sm ${voiceRecording ? 'bg-blue-600' : 'bg-slate-300'}`}
                />
              ))}
            </div>
            {voiceHasResult && (
              <>
                <div className="w-full bg-slate-100 rounded-2xl p-3.5">
                  <div className="text-[11px] font-bold tracking-wide uppercase text-slate-500 mb-1.5">Transcript</div>
                  <p className="m-0 text-[12.5px] text-slate-700 leading-relaxed">
                    Fall is here and so is our new pumpkin spice latte — cozy vibes, warm drinks, and 10% off your
                    first order this week.
                  </p>
                </div>
                <button onClick={onClose} className="w-full h-[46px] text-[13px] rounded-full bg-blue-600 text-white font-bold">
                  Save note
                </button>
              </>
            )}
          </div>
        )}

        {screen === 'upload' && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => {
                const selected = !!uploadSelected[i];
                return (
                  <button
                    key={i}
                    onClick={() => toggleUpload(i)}
                    className="relative h-[76px] rounded-xl p-0 bg-[repeating-linear-gradient(135deg,#cbd5e1,#cbd5e1_6px,#94a3b8_6px,#94a3b8_12px)]"
                  >
                    {selected && (
                      <>
                        <div className="absolute inset-0 rounded-xl border-[2.5px] border-blue-600 bg-blue-600/15" />
                        <div className="absolute top-[5px] right-[5px] w-[18px] h-[18px] rounded-full bg-blue-600 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={onClose} className="h-[46px] text-[13px] w-full rounded-full bg-blue-600 text-white font-bold">
              {selectedCount > 0 ? `Upload ${selectedCount} selected` : 'Upload media'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
