"use client";

import { useEffect, useRef, useState } from "react";
import type {
  SpeechRecognition,
  SpeechRecognitionEvent,
} from "./types";

interface UseSpeechRecognitionOptions {
  lang: string;
  onTranscriptChange: (transcript: string) => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isReady: boolean;
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition({
  lang,
  onTranscriptChange,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onTranscriptChangeRef = useRef(onTranscriptChange);

  // Keep ref in sync
  onTranscriptChangeRef.current = onTranscriptChange;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognitionAPI
      = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      return;
    }

    const speechRecognition = new SpeechRecognitionAPI();

    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = lang;

    const handleStart = () => {
      setIsListening(true);
    };

    const handleEnd = () => {
      setIsListening(false);
    };

    const handleResult = (event: Event) => {
      const speechEvent = event as SpeechRecognitionEvent;
      let finalTranscript = "";

      for (
        let i = speechEvent.resultIndex;
        i < speechEvent.results.length;
        i += 1
      ) {
        const result = speechEvent.results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript ?? "";
        }
      }

      if (finalTranscript) {
        onTranscriptChangeRef.current(finalTranscript);
      }
    };

    const handleError = () => {
      setIsListening(false);
    };

    speechRecognition.addEventListener("start", handleStart);
    speechRecognition.addEventListener("end", handleEnd);
    speechRecognition.addEventListener("result", handleResult);
    speechRecognition.addEventListener("error", handleError);

    recognitionRef.current = speechRecognition;
    setIsReady(true);

    return () => {
      speechRecognition.removeEventListener("start", handleStart);
      speechRecognition.removeEventListener("end", handleEnd);
      speechRecognition.removeEventListener("result", handleResult);
      speechRecognition.removeEventListener("error", handleError);
      speechRecognition.stop();
      recognitionRef.current = null;
      setIsReady(false);
    };
  }, [lang]);

  const start = () => {
    recognitionRef.current?.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
  };

  return {
    isListening,
    isReady,
    recognitionRef,
    start,
    stop,
  };
}
