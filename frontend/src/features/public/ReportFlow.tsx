import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bot, Camera, Check, ChevronLeft, Image as ImageIcon, LocateFixed, MapPin, Mic, MicOff, Plus, RotateCcw, Send, ThumbsUp } from 'lucide-react';
import { analyzePublicDraft, submitPublicReport } from '../../api/public';
import type { AIAnalysis, DepartmentCode, MapIssue } from '../../types';
import { civicDepartments, departmentName } from '../../data/civicCatalog';
import { janSevaLanguages, languageByCode, type JanSevaLanguageCode } from '../../data/languages';
import { PanIndiaSpeechRecognitionProvider, type SpeechRecognitionProvider, type SpeechStatus } from '../speech/SpeechRecognitionProvider';

type Step = 1 | 2 | 3 | 4;

const priorityPresentation = (analysis: AIAnalysis) => {
  if (analysis.priority === 'EMERGENCY') return { label: 'Urgent', classes: 'border-red-400/35 bg-red-500/15 text-red-200 animate-pulse' };
  if (analysis.priority === 'HIGH') return { label: 'High', classes: 'border-orange-400/35 bg-orange-500/15 text-orange-200' };
  if (analysis.confidence < .7) return { label: 'Medium', classes: 'border-amber-400/35 bg-amber-500/15 text-amber-200' };
  return { label: 'Low', classes: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200' };
};

const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export function ReportFlow({ issues, onSubmitted, onSeen }: { issues: MapIssue[]; onSubmitted: () => void; onSeen: (id: string) => void }) {
  const [step, setStep] = useState<Step>(1);
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<JanSevaLanguageCode>('en');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState<number>();
  const [longitude, setLongitude] = useState<number>();
  const [file, setFile] = useState<File>();
  const [preview, setPreview] = useState('');
  const [analysis, setAnalysis] = useState<AIAnalysis>();
  const [overrideDepartment, setOverrideDepartment] = useState<DepartmentCode>();
  const [trackingCode, setTrackingCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [upvotedDuplicate, setUpvotedDuplicate] = useState(false);
  const [publicConsent, setPublicConsent] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const speechProviderRef = useRef<SpeechRecognitionProvider | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    speechProviderRef.current?.cancel();
  }, [preview]);

  const chooseFile = (selected?: File) => {
    setError('');
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Please choose a JPEG, PNG or WebP photo.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Photo must be smaller than 10 MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setStep(2);
  };

  const useMyLocation = () => {
    setError('');
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser. Enter a landmark manually.');
      return;
    }
    navigator.geolocation.getCurrentPosition(position => {
      setLatitude(position.coords.latitude);
      setLongitude(position.coords.longitude);
      setLocationText(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
    }, () => setError('Location permission was denied. Enter a locality or landmark manually.'), { enableHighAccuracy: true, timeout: 10_000 });
  };

  const toggleVoice = async () => {
    if (speechStatus === 'listening') {
      speechProviderRef.current?.stop();
      return;
    }
    if (speechStatus === 'transcribing') return;
    setError('');
    setInterimTranscript('');
    const provider = new PanIndiaSpeechRecognitionProvider();
    speechProviderRef.current = provider;
    try {
      await provider.start(languageByCode(language), {
        onStatus: setSpeechStatus,
        onInterim: setInterimTranscript,
        onFinal: transcript => {
          setDescription(current => `${current}${current.trim() ? ' ' : ''}${transcript}`.trim());
          setInterimTranscript('');
        },
        onError: message => { setSpeechStatus('idle'); setInterimTranscript(''); setError(message); },
      });
    } catch (reason) {
      setSpeechStatus('idle');
      setError(reason instanceof Error ? reason.message : 'Voice input could not start.');
    }
  };

  const changeLanguage = (next: JanSevaLanguageCode) => {
    if (speechStatus !== 'idle') speechProviderRef.current?.cancel();
    setSpeechStatus('idle');
    setInterimTranscript('');
    setLanguage(next);
  };

  const analyze = async () => {
    if (description.trim().length < 10) return setError('Describe the issue in at least 10 characters.');
    setSubmitting(true);
    setError('');
    try {
      const result = await analyzePublicDraft(description);
      setAnalysis(result);
      setOverrideDepartment(result.departmentCode);
      setStep(3);
    } catch (reason: any) {
      setError(reason?.data?.message || 'AI analysis is temporarily unavailable. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const similarIssues = useMemo(() => {
    if (!analysis) return [];
    return issues.filter(issue => {
      if (issue.departmentCode !== analysis.departmentCode || issue.status === 'RESOLVED') return false;
      if (latitude == null || longitude == null) return true;
      return distanceKm(latitude, longitude, issue.publicLatitude, issue.publicLongitude) <= 1;
    });
  }, [analysis, issues, latitude, longitude]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const result = await submitPublicReport({
        text: description,
        latitude,
        longitude,
        idempotencyKey: idempotencyKey.current,
        file,
        departmentOverride: analysis && analysis.confidence < .7 ? overrideDepartment : undefined
      });
      setTrackingCode(result.grievance.trackingCode);
      setStep(4);
      onSubmitted();
    } catch (reason: any) {
      setError(reason?.data?.message || 'Your report could not be submitted. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setStep(1); setDescription(''); setLocationText(''); setLatitude(undefined); setLongitude(undefined);
    setFile(undefined); setPreview(''); setAnalysis(undefined); setTrackingCode(''); setError(''); setUpvotedDuplicate(false); setPublicConsent(false); setInterimTranscript(''); setSpeechStatus('idle');
    idempotencyKey.current = crypto.randomUUID();
  };

  if (step === 1) return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-lg flex-col items-center justify-center px-5 pb-10 text-center">
      <button type="button" onClick={() => cameraRef.current?.click()} className="flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(145deg,#ff7226,#ff334f)] shadow-[0_24px_60px_rgba(255,73,49,.35)] transition hover:scale-105"><Plus className="h-14 w-14" /></button>
      <h1 className="mt-7 text-3xl font-bold">Report an issue</h1>
      <p className="mt-2 text-sm text-slate-400">No login required · no personal details collected</p>
      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => cameraRef.current?.click()} className="flex items-center justify-center gap-2 rounded-2xl bg-[#ff4d38] px-5 py-4 font-semibold transition hover:bg-[#ff654f]"><Camera className="h-5 w-5" />Take a picture</button>
        <button type="button" onClick={() => galleryRef.current?.click()} className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-4 font-semibold transition hover:bg-white/10"><ImageIcon className="h-5 w-5" />Upload gallery</button>
      </div>
      <button type="button" onClick={() => setStep(2)} className="mt-4 text-sm font-medium text-blue-300">Continue without a photo</button>
      <p className="mt-8 max-w-sm text-xs leading-5 text-slate-500">Your exact location and original photo are encrypted. A metadata-stripped image and redacted issue description may appear on the public map. Do not photograph faces, number plates or personal documents.</p>
      <input ref={cameraRef} className="hidden" type="file" accept="image/*" capture="environment" onChange={event => chooseFile(event.target.files?.[0])} />
      <input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0])} />
    </div>
  );

  if (step === 4) return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-lg flex-col items-center justify-center px-5 text-center">
      <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Check className="h-12 w-12" /></span>
      <h1 className="mt-6 text-3xl font-bold">Report submitted</h1>
      <p className="mt-2 text-sm text-slate-400">Save this grievance ID to identify your report.</p>
      <div className="mt-6 w-full rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 font-mono text-2xl font-bold text-blue-200">{trackingCode}</div>
      <p className="mt-4 text-xs text-slate-500">The report is now visible on the public map and department feed.</p>
      <button type="button" onClick={reset} className="mt-8 flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-slate-950"><RotateCcw className="h-4 w-4" />Report another issue</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6">
      <div className="mb-5 flex items-center justify-between"><button type="button" onClick={() => setStep(step === 3 ? 2 : 1)} className="flex items-center gap-1 text-sm text-slate-400"><ChevronLeft className="h-4 w-4" />Back</button><span className="text-xs text-slate-500">Step {step} of 3</span></div>
      {error && <div className="mb-4 flex gap-2 rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-sm text-red-200"><AlertTriangle className="h-5 w-5 shrink-0" />{error}</div>}

      {step === 2 && <div className="space-y-5">
        <div><h1 className="text-2xl font-bold">What happened?</h1><p className="mt-1 text-sm text-slate-400">Write or speak naturally in any Scheduled Indian language.</p></div>
        {preview && <div className="relative overflow-hidden rounded-2xl border border-white/10"><img src={preview} alt="Selected evidence" className="h-52 w-full object-cover" /><button type="button" onClick={() => galleryRef.current?.click()} className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-2 text-xs backdrop-blur">Change photo</button></div>}
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-3"><label htmlFor="public-complaint-language" className="text-xs font-semibold uppercase tracking-wider text-slate-400">Complaint language</label><select id="public-complaint-language" value={language} onChange={event => changeLanguage(event.target.value as JanSevaLanguageCode)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#101927] px-3 text-sm text-white">{janSevaLanguages.map(item => <option key={item.code} value={item.code}>{item.name} — {item.displayName}</option>)}</select><p className="mt-2 text-[11px] leading-4 text-slate-500">{languageByCode(language).fasterWhisperCode === undefined ? 'Voice support depends on this browser for the selected language. Manual native-script typing remains available.' : 'Final voice text is produced by JanDhwani faster-whisper and is never translated.'}</p></div>
        <div className="relative"><textarea value={description} onChange={event => setDescription(event.target.value)} rows={7} maxLength={10000} placeholder="Describe the issue in your selected language. The native script will be preserved." className="w-full resize-none rounded-2xl border border-white/10 bg-white/[.045] p-4 pb-14 text-white outline-none placeholder:text-slate-600 focus:border-blue-400/50" /><button type="button" disabled={speechStatus === 'transcribing'} onClick={() => void toggleVoice()} className={`absolute bottom-3 left-3 flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-60 ${speechStatus === 'listening' ? 'bg-red-500/20 text-red-200' : 'bg-white/8 text-slate-200'}`}>{speechStatus === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}{speechStatus === 'listening' ? 'Stop and transcribe' : speechStatus === 'transcribing' ? 'Transcribing…' : 'Speak'}</button><span className="absolute bottom-4 right-4 text-xs text-slate-600">{description.length}/10000</span></div>
        {interimTranscript && <p className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-xs text-blue-100" aria-live="polite"><b>Hearing:</b> {interimTranscript}</p>}
        <p className="-mt-2 text-[11px] text-slate-500">Audio is used only for transcription and is deleted immediately after processing. Review and edit the text before submission.</p>
        <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><label className="text-sm font-semibold">Issue location</label><div className="mt-3 flex gap-2"><div className="relative flex-1"><MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" /><input value={locationText} onChange={event => setLocationText(event.target.value)} placeholder="Locality, landmark, or coordinates" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none focus:border-blue-400/50" /></div><button type="button" onClick={useMyLocation} className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300" aria-label="Use my location"><LocateFixed className="h-5 w-5" /></button></div>{latitude != null && <p className="mt-2 text-xs text-emerald-300">GPS captured · {latitude.toFixed(5)}, {longitude?.toFixed(5)}</p>}</div>
        <p className="flex gap-2 rounded-xl bg-amber-500/8 p-3 text-xs leading-5 text-amber-100/75"><AlertTriangle className="h-4 w-4 shrink-0" />For immediate danger, also contact the appropriate emergency service.</p>
        <button type="button" disabled={submitting} onClick={() => void analyze()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#2a7fff,#8157ff)] px-5 py-4 font-semibold disabled:opacity-60"><Bot className="h-5 w-5" />{submitting ? 'Analysing…' : 'Analyse issue'}</button>
        <input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => chooseFile(event.target.files?.[0])} />
      </div>}

      {step === 3 && analysis && <div className="space-y-4">
        <div><h1 className="text-2xl font-bold">AI routing recommendation</h1><p className="mt-1 text-sm text-slate-400">Review this suggestion before submitting.</p></div>
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/[.07] p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-blue-300">Detected category</p><h2 className="mt-2 text-lg font-semibold">{analysis.taxonomyCode.replaceAll('_', ' ').replace('.', ' · ')}</h2><p className="mt-1 text-sm text-slate-400">{departmentName(analysis.departmentCode)}</p></div><Bot className="h-7 w-7 text-blue-300" /></div>
          <div className="mt-5 rounded-xl bg-black/20 p-4"><p className="text-xs text-slate-500">Urgency</p><span className={`mt-2 inline-block rounded-full border px-3 py-1.5 text-xs font-bold ${priorityPresentation(analysis).classes}`}>{priorityPresentation(analysis).label}</span></div>
          {analysis.confidence < .7 && <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3"><label className="text-xs font-semibold text-amber-200">Routing needs confirmation — choose the best department</label><select value={overrideDepartment} onChange={event => setOverrideDepartment(event.target.value as DepartmentCode)} className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-[#101927] px-3 text-sm">{civicDepartments.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select><p className="mt-2 text-xs text-slate-400">A department officer will verify your choice before work begins.</p></div>}
        </div>
        {similarIssues.length > 0 && <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[.08] p-4"><div className="flex gap-3"><ThumbsUp className="h-5 w-5 text-violet-300" /><div className="flex-1"><h3 className="font-semibold">{similarIssues.length} similar report{similarIssues.length === 1 ? '' : 's'} nearby</h3><p className="mt-1 text-xs text-slate-400">Confirming an existing issue helps the department see its community impact.</p><button type="button" disabled={upvotedDuplicate} onClick={() => { similarIssues.forEach(item => onSeen(item.id)); setUpvotedDuplicate(true); }} className="mt-3 rounded-full bg-violet-400/15 px-4 py-2 text-xs font-semibold text-violet-200">{upvotedDuplicate ? 'Confirmed — thank you' : "I've seen this too"}</button></div></div></div>}
        <div className="rounded-xl border border-white/10 bg-white/[.035] p-4 text-sm text-slate-300"><p>{analysis.explanation || 'The issue was matched against the governed civic taxonomy.'}</p>{analysis.requiresHumanReview && <p className="mt-2 text-amber-200">A staff member will verify this routing recommendation.</p>}</div>
        <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[.035] p-4 text-xs leading-5 text-slate-300"><input type="checkbox" checked={publicConsent} onChange={event => setPublicConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-blue-500" /><span>I understand that this anonymous report’s redacted description and metadata-stripped photo may be shown publicly. I have not included faces, number plates, contact details or personal documents.</span></label>
        <button type="button" disabled={submitting || !publicConsent} onClick={() => void submit()} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#ff4d38] px-5 py-4 font-semibold transition hover:bg-[#ff6550] disabled:opacity-60"><Send className="h-5 w-5" />{submitting ? 'Submitting report…' : publicConsent ? 'Confirm and submit' : 'Confirm public-sharing notice'}</button>
      </div>}
    </div>
  );
}
