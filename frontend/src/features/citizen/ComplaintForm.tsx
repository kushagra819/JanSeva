import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../../components/ui/button';
import { LocationPicker } from '../../components/map/LocationPicker';
import { submitGrievance, analyzeGrievance, uploadGrievanceAttachment } from '../../api/grievances';
import { FileUp, Info, AlertTriangle, Mic, MicOff, Send } from 'lucide-react';
import { cn } from '../../utils/utils';
import { janSevaLanguages, languageByCode } from '../../data/languages';
import { PanIndiaSpeechRecognitionProvider, type SpeechRecognitionProvider, type SpeechStatus } from '../speech/SpeechRecognitionProvider';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const complaintSchema = z.object({
  description: z.string()
    .min(10, 'Complaint must contain at least 10 characters.')
    .max(10000, 'Complaint is too long.'),
  language: z.string().min(1, 'Language is required.'),
  district: z.string().min(1, 'District is required.'),
  locality: z.string().min(1, 'Locality or landmark is required.'),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

export function ComplaintForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [speechStatus, setSpeechStatus] = useState<SpeechStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const speechProviderRef = useRef<SpeechRecognitionProvider | null>(null);

  const { control, register, handleSubmit, formState: { errors }, setValue, watch } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      language: 'auto',
    },
  });

  const selectedLanguage = watch('language');
  useEffect(() => () => {
    speechProviderRef.current?.cancel();
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
  }, [attachmentPreview]);

  const toggleVoiceInput = async () => {
    if (speechStatus === 'listening') {
      speechProviderRef.current?.stop();
      return;
    }
    if (speechStatus === 'transcribing') return;
    setVoiceError(null);
    setInterimTranscript('');
    const provider = new PanIndiaSpeechRecognitionProvider();
    speechProviderRef.current = provider;
    try {
      await provider.start(languageByCode(selectedLanguage), {
        onStatus: setSpeechStatus,
        onInterim: setInterimTranscript,
        onFinal: transcript => {
          const current = watch('description')?.trim() || '';
          setValue('description', `${current}${current ? ' ' : ''}${transcript}`.trim(), { shouldValidate: true, shouldDirty: true });
          setInterimTranscript('');
        },
        onError: message => { setSpeechStatus('idle'); setInterimTranscript(''); setVoiceError(message); },
      });
    } catch (reason) {
      setSpeechStatus('idle');
      setVoiceError(reason instanceof Error ? reason.message : 'Voice input could not start.');
    }
  };

  const onLanguageChange = () => {
    if (speechStatus !== 'idle') speechProviderRef.current?.cancel();
    setSpeechStatus('idle');
    setInterimTranscript('');
    setVoiceError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setAttachmentError(null);
    setAttachmentPreview(null);

    if (!file) {
      setAttachment(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setAttachmentError('Invalid file type. Only JPEG, PNG, WebP, and PDF are allowed.');
      setAttachment(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setAttachmentError(`File exceeds 10MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`);
      setAttachment(null);
      return;
    }

    setAttachment(file);

    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setAttachmentPreview(url);
    }
  };

  const onSubmit = async (data: ComplaintFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // 1. & 2. Submit Grievance with idempotency key
      const grievance = await submitGrievance(data, idempotencyKeyRef.current);
      
      // 3. Call Analyze
      await analyzeGrievance(grievance.id, data.description);
      
      // 4. Upload Attachment if present
      if (attachment) {
        await uploadGrievanceAttachment(grievance.id, attachment);
      }
      
      // 5. Navigate
      navigate(`/citizen/complaints/${grievance.id}?new=true`);
      
    } catch (err: any) {
      setIsSubmitting(false);
      if (err.data && err.data.message) {
        setSubmitError(err.data.message);
      } else {
        setSubmitError('Failed to submit grievance. Please try again.');
      }
      // Note: We keep the same idempotency key for retries per planner.md
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Raise a Grievance</h1>
        <p className="text-[var(--muted)]">Please describe your issue in detail. JanDhwani AI will route it to the appropriate department.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 bg-[var(--surface-strong)] p-6 md:p-8 rounded-2xl border border-[var(--border)]">
        {submitError && (
          <div className="p-4 bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-xl text-[var(--danger)] flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <p>{submitError}</p>
          </div>
        )}

        {/* Complaint Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <label className="block text-sm font-medium text-[var(--foreground)]">Complaint Details *</label>
            <div className="w-48">
              <select 
                {...register('language', { onChange: onLanguageChange })}
                className="w-full bg-[var(--background-alt)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-[var(--accent)]"
              >
                {janSevaLanguages.map(language => <option key={language.code} value={language.code}>{language.name} — {language.displayName}</option>)}
              </select>
            </div>
          </div>
          <textarea
            {...register('description')}
            rows={6}
            placeholder="Describe the problem clearly (e.g., 'There is a large pothole in front of...')"
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-white placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] resize-none"
          />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={speechStatus === 'transcribing'} onClick={() => void toggleVoiceInput()} className={cn('gap-2', speechStatus === 'listening' && 'border-red-400/40 bg-red-500/15 text-red-200')}>
              {speechStatus === 'listening' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {speechStatus === 'listening' ? 'Stop and transcribe' : speechStatus === 'transcribing' ? 'Transcribing…' : 'Speak complaint'}
            </Button>
            {speechStatus === 'listening' && <span className="flex items-center gap-2 text-sm text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Listening in {languageByCode(selectedLanguage).name}…</span>}
            {voiceError && <span className="text-sm text-amber-300">{voiceError}</span>}
          </div>
          {interimTranscript && <p className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-100" aria-live="polite"><b>Hearing:</b> {interimTranscript}</p>}
          {errors.description && (
            <p className="text-sm text-[var(--danger)]">{errors.description.message}</p>
          )}
          <p className="text-xs text-[var(--muted)] flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5" />
            All 22 Scheduled Languages remain available for native-script typing. faster-whisper provides final voice text where supported; browser voice is used as a graceful fallback and never silently switches language.
          </p>
        </div>

        <hr className="border-[var(--border)]" />

        {/* Location Section */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-white">Location Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">District / City *</label>
              <input
                {...register('district')}
                type="text"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="E.g. Mumbai Suburban"
              />
              {errors.district && (
                <p className="text-sm text-[var(--danger)]">{errors.district.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--foreground)]">Locality / Landmark *</label>
              <input
                {...register('locality')}
                type="text"
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-[var(--accent)]"
                placeholder="E.g. Near Andheri Station"
              />
              {errors.locality && (
                <p className="text-sm text-[var(--danger)]">{errors.locality.message}</p>
              )}
            </div>
          </div>

          <Controller
            name="latitude"
            control={control}
            render={({ field: latField }) => (
              <Controller
                name="longitude"
                control={control}
                render={({ field: lngField }) => (
                  <LocationPicker
                    onLocationSelect={(lat, lng) => {
                      latField.onChange(lat);
                      lngField.onChange(lng);
                    }}
                  />
                )}
              />
            )}
          />
        </div>

        <hr className="border-[var(--border)]" />

        {/* Evidence Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Optional Evidence</h3>
          
          <div 
            className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-[var(--surface-soft)] transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {attachmentPreview ? (
              <div className="mb-4 relative rounded-lg overflow-hidden border border-[var(--border)] max-w-sm">
                <img src={attachmentPreview} alt="Preview" className="max-h-48 w-auto object-contain" />
              </div>
            ) : attachment ? (
              <div className="mb-4 p-4 bg-[var(--background)] rounded-lg border border-[var(--border)] flex items-center gap-3">
                <FileUp className="h-6 w-6 text-[var(--accent)]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white line-clamp-1">{attachment.name}</p>
                  <p className="text-xs text-[var(--muted)]">{(attachment.size / 1024 / 1024).toFixed(2)} MB • PDF</p>
                </div>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-full bg-[var(--surface)] flex items-center justify-center mb-4">
                <FileUp className="h-8 w-8 text-[var(--accent)]" />
              </div>
            )}
            
            <p className="text-sm font-medium text-white mb-1">
              {attachment ? 'Click to change file' : 'Click to upload a photo or document'}
            </p>
            <p className="text-xs text-[var(--muted)]">JPEG, PNG, WebP or PDF (Max 10MB)</p>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
            />
          </div>
          
          {attachmentError && (
            <p className="text-sm text-[var(--danger)]">{attachmentError}</p>
          )}
        </div>

        <div className="pt-4 flex justify-end">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            className={cn("w-full sm:w-auto", isSubmitting && "opacity-70")}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">Processing <span className="animate-spin text-lg leading-none mt-[-2px]">↻</span></span>
            ) : (
              <span className="flex items-center gap-2">Submit to AI Router <Send className="h-4 w-4" /></span>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
