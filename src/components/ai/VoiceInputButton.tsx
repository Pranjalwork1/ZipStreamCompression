import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { sarvamSpeechToText } from '../../services/aiApi';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  languageCode?: string;
  keyterms?: string[];
  documentContext?: string;
  disabled?: boolean;
  className?: string;
}

const MAX_RECORDING_SECONDS = 29; // Hard stop before Sarvam's 30s REST STT ceiling

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscript,
  languageCode,
  keyterms,
  documentContext,
  disabled = false,
  className = '',
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<number | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch { /* noop */ }
      });
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Error stopping MediaRecorder:', err);
      }
    }
    cleanupStream();
    setIsRecording(false);
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      cleanupStream();
    };
  }, [cleanupStream]);

  const startRecording = async () => {
    setErrorMessage(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Microphone access is not supported by your browser.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Determine best browser-supported WebM/Ogg audio format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
        else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
        else mimeType = ''; // Let browser choose default
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        cleanupStream();
        setIsRecording(false);

        const chunks = audioChunksRef.current;
        if (!chunks.length) {
          return;
        }

        const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (audioBlob.size === 0) {
          return;
        }

        setIsTranscribing(true);
        try {
          const res = await sarvamSpeechToText(
            audioBlob,
            languageCode,
            keyterms,
            documentContext
          );
          if (res.text && res.text.trim()) {
            onTranscript(res.text.trim());
          }
        } catch (err: any) {
          setErrorMessage(err?.message || 'Voice transcription failed. Please try again.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250); // Request chunks every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            stopRecording();
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);

      // Enforce hard ceiling at MAX_RECORDING_SECONDS * 1000ms
      autoStopTimeoutRef.current = window.setTimeout(() => {
        stopRecording();
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (err: any) {
      cleanupStream();
      setIsRecording(false);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setErrorMessage('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
        setErrorMessage('Unable to start microphone recording.');
      }
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        title={
          isRecording
            ? `Recording... click to stop (${MAX_RECORDING_SECONDS - recordingSeconds}s remaining)`
            : isTranscribing
            ? 'Transcribing speech...'
            : 'Click to speak (Saaras AI voice input)'
        }
        aria-label="Voice input"
        className={`relative p-2 rounded-xl transition-all flex items-center justify-center ${
          isRecording
            ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse ring-2 ring-rose-400'
            : isTranscribing
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 cursor-wait'
            : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-indigo-400 dark:hover:bg-slate-800'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isTranscribing ? (
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
        ) : isRecording ? (
          <MicOff className="w-4 h-4 text-white animate-bounce" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Recording countdown badge */}
      {isRecording && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow whitespace-nowrap animate-fade-in">
          {MAX_RECORDING_SECONDS - recordingSeconds}s
        </span>
      )}

      {/* Error popover */}
      {errorMessage && (
        <div
          role="alert"
          className="absolute bottom-full mb-2 right-0 z-50 p-2 text-xs bg-red-50 dark:bg-red-950/90 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg shadow-md max-w-xs whitespace-normal"
        >
          <div className="flex items-start justify-between gap-1">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-700 text-xs font-bold ml-1"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
