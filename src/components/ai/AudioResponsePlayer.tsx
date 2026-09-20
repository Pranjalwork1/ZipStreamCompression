import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, VolumeX, Play, Pause, Loader2 } from 'lucide-react';
import { sarvamTextToSpeech } from '../../services/aiApi';

interface AudioResponsePlayerProps {
  text: string;
  languageCode?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const AudioResponsePlayer: React.FC<AudioResponsePlayerProps> = ({
  text,
  languageCode,
  className = '',
  size = 'sm',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrls, setAudioUrls] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef<string[]>([]);

  // Revoke previous audio object URLs to prevent memory leaks
  const cleanupUrls = useCallback(() => {
    for (const url of audioUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch { /* noop */ }
    }
    audioUrlsRef.current = [];
    setAudioUrls([]);
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      cleanupUrls();
    };
  }, [cleanupUrls]);

  // When text changes, stop any ongoing playback and clear cached audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setIsPlaying(false);
    cleanupUrls();
  }, [text, cleanupUrls]);

  const playChunk = (index: number, urls: string[]) => {
    if (index >= urls.length) {
      setIsPlaying(false);
      setCurrentChunkIndex(0);
      return;
    }

    setCurrentChunkIndex(index);
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = urls[index];

    audio.onended = () => {
      playChunk(index + 1, urls);
    };

    audio.onerror = () => {
      console.warn('Audio playback error on chunk', index);
      setIsPlaying(false);
    };

    audio.play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Playback error:', err);
        setIsPlaying(false);
      });
  };

  const handleTogglePlay = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // If audio is already loaded and paused, resume playback
    if (audioUrls.length > 0 && audioRef.current && audioRef.current.src) {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(console.warn);
      return;
    }

    // Otherwise fetch synthesized audio from backend
    if (!text || !text.trim()) return;

    setIsLoading(true);
    try {
      const response = await sarvamTextToSpeech({
        text: text.slice(0, 5000), // Safe upper bound for UI speech
        languageCode,
      });

      if (!response.audio || response.audio.length === 0) {
        throw new Error('No audio returned by TTS service');
      }

      cleanupUrls();

      // Convert base64 chunks to blob object URLs
      const urls: string[] = response.audio.map(chunk => {
        const byteCharacters = atob(chunk.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: chunk.mimeType || 'audio/wav' });
        return URL.createObjectURL(blob);
      });

      audioUrlsRef.current = urls;
      setAudioUrls(urls);
      playChunk(0, urls);
    } catch (err) {
      console.warn('Sarvam TTS failed; falling back to browser SpeechSynthesis:', err);
      // Fallback to browser SpeechSynthesis if available
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handleTogglePlay}
        disabled={isLoading || !text.trim()}
        title={isPlaying ? 'Pause speech' : 'Listen with Sarvam AI Bulbul'}
        aria-label={isPlaying ? 'Pause speech' : 'Listen with Sarvam AI'}
        className={`inline-flex items-center gap-1 font-medium transition-all rounded-lg ${
          isSmall
            ? 'px-2 py-1 text-xs'
            : 'px-3 py-1.5 text-sm'
        } ${
          isPlaying
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-sm'
            : 'text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isLoading ? (
          <Loader2 className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} animate-spin text-emerald-600`} />
        ) : isPlaying ? (
          <Pause className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} text-emerald-600`} />
        ) : (
          <Volume2 className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'}`} />
        )}
        <span>{isPlaying ? 'Pause' : 'Listen'}</span>
      </button>
    </div>
  );
};
