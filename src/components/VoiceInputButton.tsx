import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { Language } from '../i18n';

interface SpeechAlternativeLike { transcript: string }
interface SpeechResultLike { 0: SpeechAlternativeLike; isFinal: boolean }
interface SpeechEventLike { results: ArrayLike<SpeechResultLike> }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor { new(): SpeechRecognitionLike }
declare global { interface Window { SpeechRecognition?: SpeechRecognitionConstructor; webkitSpeechRecognition?: SpeechRecognitionConstructor } }

export function VoiceInputButton({ language, onTranscript }: { language: Language; onTranscript: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const [available] = useState(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition));
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptHandler = useRef(onTranscript);

  useEffect(() => {
    transcriptHandler.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) return;
    const instance = new Constructor();
    instance.interimResults = false;
    instance.maxAlternatives = 1;
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) transcriptHandler.current(transcript);
    };
    instance.onend = () => setListening(false);
    instance.onerror = () => setListening(false);
    recognitionRef.current = instance;
    return () => {
      instance.stop();
      recognitionRef.current = null;
    };
  }, []);

  const toggle = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) { recognition.stop(); setListening(false); return; }
    recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
    setListening(true);
    try { recognition.start(); } catch { setListening(false); }
  };
  return <button type="button" className={`voice-button ${listening ? 'voice-button-active' : ''}`} onClick={toggle} disabled={!available} aria-label={available ? listening ? 'Stop voice input' : 'Start voice input' : 'Voice input unavailable; type your message instead'} title={available ? listening ? 'Stop voice input' : 'Dictate a message' : 'Voice input is unavailable in this browser; typed input still works.'}>{listening ? <MicOff size={16} /> : <Mic size={16} />}{listening ? 'Listening…' : 'Voice input'}</button>;
}
