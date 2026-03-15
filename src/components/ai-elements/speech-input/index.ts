"use client";

export { PulseRings } from "./pulse-rings";
export { SpeechButton } from "./speech-button";
export { SpeechInput, type SpeechInputProps } from "./speech-input";
export type {
  SpeechInputMode,
  SpeechRecognition,
  SpeechRecognitionAlternative,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionResult,
  SpeechRecognitionResultList,
} from "./types";
export { useMediaRecorder } from "./use-media-recorder";
export { useSpeechRecognition } from "./use-speech-recognition";
export { detectSpeechInputMode } from "./utils";
