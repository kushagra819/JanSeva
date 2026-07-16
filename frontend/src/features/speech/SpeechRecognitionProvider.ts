import type { JanSevaLanguage } from '../../data/languages';
import { transcribePublicAudio, type SpeechTranscription } from '../../api/public';

export type SpeechStatus = 'idle' | 'listening' | 'transcribing';

export interface SpeechRecognitionCallbacks {
  onStatus(status: SpeechStatus): void;
  onInterim(text: string): void;
  onFinal(text: string, metadata?: SpeechTranscription): void;
  onError(message: string): void;
}

export interface SpeechRecognitionProvider {
  start(language: JanSevaLanguage, callbacks: SpeechRecognitionCallbacks): Promise<void>;
  stop(): void;
  cancel(): void;
}

type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: any) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

const browserRecognitionConstructor = () => {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: new () => BrowserRecognition;
    webkitSpeechRecognition?: new () => BrowserRecognition;
  };
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
};

export class BrowserSpeechRecognitionProvider implements SpeechRecognitionProvider {
  private recognition?: BrowserRecognition;

  static isAvailable() { return Boolean(browserRecognitionConstructor()); }

  async start(language: JanSevaLanguage, callbacks: SpeechRecognitionCallbacks) {
    if (!language.speechLocale) throw new Error('Choose the language you are about to speak.');
    const Recognition = browserRecognitionConstructor();
    if (!Recognition) throw new Error('Live browser voice recognition is unavailable here.');
    const recognition = new Recognition();
    this.recognition = recognition;
    recognition.lang = language.speechLocale;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onstart = () => callbacks.onStatus('listening');
    recognition.onend = () => callbacks.onStatus('idle');
    recognition.onerror = event => callbacks.onError(
      event.error === 'language-not-supported'
        ? `${language.name} voice recognition is not supported by this browser. You can still type in ${language.name}.`
        : 'Browser voice recognition stopped. Your typed text is unchanged.'
    );
    recognition.onresult = event => {
      let interim = '';
      let final = '';
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) final += text;
        else interim += text;
      }
      if (interim) callbacks.onInterim(interim.trim());
      if (final) callbacks.onFinal(final.trim());
    };
    recognition.start();
  }

  stop() { this.recognition?.stop(); }
  cancel() { this.recognition?.abort(); this.recognition = undefined; }
}

export class FasterWhisperSpeechRecognitionProvider implements SpeechRecognitionProvider {
  private recorder?: MediaRecorder;
  private stream?: MediaStream;
  private chunks: Blob[] = [];
  private callbacks?: SpeechRecognitionCallbacks;
  private language?: JanSevaLanguage;
  private cancelled = false;

  static isAvailable() {
    return Boolean(window.MediaRecorder && navigator.mediaDevices?.getUserMedia);
  }

  async start(language: JanSevaLanguage, callbacks: SpeechRecognitionCallbacks) {
    if (language.fasterWhisperCode === undefined) {
      throw new Error(`${language.name} is not supported by faster-whisper. Browser voice may still be available; manual native-script typing always remains available.`);
    }
    if (!FasterWhisperSpeechRecognitionProvider.isAvailable()) throw new Error('Audio recording is unavailable in this browser.');
    this.cancelled = false;
    this.callbacks = callbacks;
    this.language = language;
    this.chunks = [];
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const preferred = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
    this.recorder = new MediaRecorder(this.stream, preferred ? { mimeType: preferred } : undefined);
    this.recorder.ondataavailable = event => { if (event.data.size) this.chunks.push(event.data); };
    this.recorder.onstop = () => void this.finish();
    this.recorder.start(500);
    callbacks.onStatus('listening');
  }

  stop() {
    if (this.recorder?.state === 'recording') {
      this.callbacks?.onStatus('transcribing');
      this.recorder.stop();
    }
    this.stopTracks();
  }

  cancel() {
    this.cancelled = true;
    if (this.recorder?.state === 'recording') this.recorder.stop();
    this.stopTracks();
    this.callbacks?.onStatus('idle');
  }

  private async finish() {
    if (this.cancelled || !this.callbacks || !this.language) return;
    try {
      if (!this.chunks.length) throw new Error('No audio was captured. Please allow microphone access and try again.');
      const recorderType = this.recorder?.mimeType || this.chunks[0]?.type || 'audio/webm';
      const type = recorderType.split(';', 1)[0].toLowerCase();
      const recording = new Blob(this.chunks, { type });
      const result = await transcribePublicAudio(recording, this.language.fasterWhisperCode ?? 'auto');
      this.callbacks.onFinal(result.text, result);
    } catch (error) {
      this.callbacks.onError(error instanceof Error ? error.message : 'Voice transcription failed.');
    } finally {
      this.callbacks.onStatus('idle');
      this.stopTracks();
    }
  }

  private stopTracks() { this.stream?.getTracks().forEach(track => track.stop()); this.stream = undefined; }
}

/** Uses faster-whisper for the final transcript and browser recognition only for live interim feedback. */
export class PanIndiaSpeechRecognitionProvider implements SpeechRecognitionProvider {
  private server?: FasterWhisperSpeechRecognitionProvider;
  private browser?: BrowserSpeechRecognitionProvider;
  private browserFallback = '';
  private callbacks?: SpeechRecognitionCallbacks;
  private serverActive = false;

  async start(language: JanSevaLanguage, callbacks: SpeechRecognitionCallbacks) {
    this.callbacks = callbacks;
    this.browserFallback = '';
    this.serverActive = language.fasterWhisperCode !== undefined && FasterWhisperSpeechRecognitionProvider.isAvailable();

    if (this.serverActive) {
      this.server = new FasterWhisperSpeechRecognitionProvider();
      await this.server.start(language, {
        ...callbacks,
        onFinal: (text, metadata) => callbacks.onFinal(text, metadata),
        onError: message => {
          if (this.browserFallback) callbacks.onFinal(this.browserFallback);
          else callbacks.onError(message);
        },
      });
    }

    if (language.speechLocale && BrowserSpeechRecognitionProvider.isAvailable()) {
      this.browser = new BrowserSpeechRecognitionProvider();
      try {
        await this.browser.start(language, {
          onStatus: status => { if (!this.serverActive) callbacks.onStatus(status); },
          onInterim: callbacks.onInterim,
          onFinal: text => {
            this.browserFallback = `${this.browserFallback} ${text}`.trim();
            if (this.serverActive) callbacks.onInterim(this.browserFallback);
            else callbacks.onFinal(text);
          },
          onError: message => { if (!this.serverActive) callbacks.onError(message); },
        });
      } catch (error) {
        if (!this.serverActive) throw error;
      }
    }

    if (!this.serverActive && !this.browser) {
      throw new Error(`${language.name} voice input is not supported in this browser. Manual native-script typing remains available.`);
    }
  }

  stop() { this.browser?.stop(); this.server?.stop(); }
  cancel() { this.browser?.cancel(); this.server?.cancel(); this.callbacks?.onStatus('idle'); }
}
