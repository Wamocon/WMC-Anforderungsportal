'use client';

// Web Speech API type declarations
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

declare let SpeechRecognition: {
  new (): SpeechRecognition;
  prototype: SpeechRecognition;
};

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { polishTextClient } from '@/lib/polish-text-client';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  onAudioBlob?: (blob: Blob) => void;
  compact?: boolean;
  locale?: string;
}

export function VoiceRecorder({ onTranscript, onAudioBlob, compact, locale }: VoiceRecorderProps) {
  const t = useTranslations('form');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  function getSpeechRecognitionApi() {
    if (typeof window === 'undefined') return null;
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function resolveSpeechLocale() {
    const normalized = (locale || document.documentElement.lang || 'de').toLowerCase();
    const localeMap: Record<string, string> = {
      bg: 'bg-BG',
      cs: 'cs-CZ',
      da: 'da-DK',
      de: 'de-DE',
      el: 'el-GR',
      en: 'en-US',
      es: 'es-ES',
      et: 'et-EE',
      fi: 'fi-FI',
      fr: 'fr-FR',
      hr: 'hr-HR',
      hu: 'hu-HU',
      it: 'it-IT',
      lt: 'lt-LT',
      lv: 'lv-LV',
      nl: 'nl-NL',
      no: 'no-NO',
      pl: 'pl-PL',
      pt: 'pt-PT',
      ro: 'ro-RO',
      ru: 'ru-RU',
      sk: 'sk-SK',
      sl: 'sl-SI',
      sv: 'sv-SE',
      tr: 'tr-TR',
    };
    return localeMap[normalized] || locale || document.documentElement.lang || 'de-DE';
  }

  async function startRecording() {
    const SpeechRecognitionAPI = getSpeechRecognitionApi();
    const canCaptureAudio =
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined';

    if (!SpeechRecognitionAPI && !canCaptureAudio) {
      toast.error(t('voiceNotSupported'));
      return;
    }

    if (!SpeechRecognitionAPI && !onAudioBlob) {
      toast.error(t('voiceNotSupported'));
      return;
    }

    // Start MediaRecorder for audio blob capture
    if (canCaptureAudio) {
      try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Audio level visualization
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      function updateLevel() {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      }
      updateLevel();

      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      const mediaRecorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        if (blob.size > 0 && onAudioBlob) onAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setAudioLevel(0);
        audioCtx.close();
      };
      mediaRecorder.start(250); // collect data every 250ms
      mediaRecorderRef.current = mediaRecorder;
      } catch {
        if (!SpeechRecognitionAPI) {
          toast.error(t('voiceError'));
          return;
        }
      }
    }

    if (!SpeechRecognitionAPI) {
      setIsRecording(true);
      return;
    }

    // Start Speech Recognition for real-time transcription
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = resolveSpeechLocale();

    let finalTranscript = '';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      // Show live transcription while speaking
      setLiveTranscript(finalTranscript + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setLiveTranscript('');
      if (event.error !== 'aborted') {
          toast.error(t('voiceError'));
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (finalTranscript.trim()) {
        setIsTranscribing(true);
        polishTextClient(finalTranscript.trim(), locale || document.documentElement.lang || 'de')
          .then((polished) => {
            onTranscript(polished || finalTranscript.trim());
            setIsTranscribing(false);
            setLiveTranscript('');
          })
          .catch(() => {
            onTranscript(finalTranscript.trim());
            setIsTranscribing(false);
            setLiveTranscript('');
          });
      } else {
        setLiveTranscript('');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }

  function stopRecording() {
    if (recognitionRef.current) recognitionRef.current.stop();
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }

  if (isTranscribing) {
    return (
      <Button variant="ghost" size={compact ? 'icon' : 'sm'} disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        {!compact && <span>{t('voiceTranscribing')}</span>}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isRecording ? 'destructive' : 'ghost'}
          size={compact ? 'icon' : 'sm'}
          onClick={isRecording ? stopRecording : startRecording}
          className={`gap-2 ${isRecording ? 'animate-pulse' : ''}`}
          title={isRecording ? t('voiceStop') : t('voiceRecord')}
        >
          {isRecording ? (
            <>
              <Square className="h-4 w-4" />
              {!compact && <span>{t('voiceStop')}</span>}
            </>
          ) : (
            <>
              <Mic className="h-4 w-4" />
              {!compact && <span>{t('voiceRecord')}</span>}
            </>
          )}
        </Button>
        {isRecording && (
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-[#FE0404] transition-all duration-75"
                style={{ height: `${Math.max(4, audioLevel * (12 + i * 4))}px` }}
              />
            ))}
          </div>
        )}
      </div>
      {isRecording && liveTranscript && (
        <p className="text-xs text-muted-foreground italic max-w-[200px] truncate">
          {liveTranscript}
        </p>
      )}
    </div>
  );
}
