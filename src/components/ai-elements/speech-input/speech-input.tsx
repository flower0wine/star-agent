"use client";

import { useCallback, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import { detectSpeechInputMode } from "./utils";
import { useSpeechRecognition } from "./use-speech-recognition";
import { useMediaRecorder } from "./use-media-recorder";
import { PulseRings } from "./pulse-rings";
import { SpeechButton } from "./speech-button";

export type SpeechInputProps = ComponentProps<"button"> & {
  onTranscriptionChange?: (text: string) => void;
  /**
   * Callback for when audio is recorded using MediaRecorder fallback.
   * This is called in browsers that don't support the Web Speech API (Firefox, Safari).
   * The callback receives an audio Blob that should be sent to a transcription service.
   * Return the transcribed text, which will be passed to onTranscriptionChange.
   */
  onAudioRecorded?: (audioBlob: Blob) => Promise<string>;
  lang?: string;
};

export function SpeechInput({
  className,
  onTranscriptionChange,
  onAudioRecorded,
  lang = "en-US",
  disabled,
  ...props
}: SpeechInputProps) {
  const [mode] = useState(detectSpeechInputMode);

  const handleTranscriptChange = useCallback(
    (text: string) => {
      onTranscriptionChange?.(text);
    },
    [onTranscriptionChange]
  );

  const {
    isListening: isSpeechListening,
    isReady: isSpeechReady,
    start: startSpeech,
    stop: stopSpeech,
  } = useSpeechRecognition({
    lang,
    onTranscriptChange: handleTranscriptChange,
  });

  const {
    isListening: isMediaListening,
    isProcessing: isMediaProcessing,
    startRecording: startMediaRecorder,
    stopRecording: stopMediaRecorder,
  } = useMediaRecorder({
    onAudioRecorded: onAudioRecorded ?? (async () => ""),
    onTranscriptChange: handleTranscriptChange,
  });

  const isListening = isSpeechListening || isMediaListening;
  const isProcessing = isMediaProcessing;

  const toggleListening = useCallback(() => {
    if (mode === "speech-recognition") {
      if (isListening) {
        stopSpeech();
      } else {
        startSpeech();
      }
    } else if (mode === "media-recorder") {
      if (isListening) {
        stopMediaRecorder();
      } else {
        startMediaRecorder();
      }
    }
  }, [mode, isListening, startSpeech, stopSpeech, startMediaRecorder, stopMediaRecorder]);

  const isDisabled = useMemo(() => {
    if (disabled || isProcessing) {
      return true;
    }
    if (mode === "none") {
      return true;
    }
    if (mode === "speech-recognition" && !isSpeechReady) {
      return true;
    }
    if (mode === "media-recorder" && !onAudioRecorded) {
      return true;
    }
    return false;
  }, [disabled, isProcessing, mode, isSpeechReady, onAudioRecorded]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <PulseRings isVisible={isListening} />
      <SpeechButton
        className={className}
        disabled={isDisabled}
        isListening={isListening}
        isProcessing={isProcessing}
        onClick={toggleListening}
        {...props}
      />
    </div>
  );
}
