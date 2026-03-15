"use client";

import { cn } from "@/lib/utils";
import type { RiveParameters } from "@rive-app/react-webgl2";
import {
  useRive,
  useStateMachineInput,
} from "@rive-app/react-webgl2";
import type { FC } from "react";
import { memo, useEffect, useMemo, useRef } from "react";
import { sources, stateMachine } from "./config";
import type { PersonaProps } from "./types";
import { useStrictModeSafeInit } from "./hooks";
import { PersonaWithModel } from "./persona-with-model";
import { PersonaWithoutModel } from "./persona-without-model";

export const Persona: FC<PersonaProps> = memo(
  ({
    variant = "obsidian",
    state = "idle",
    onLoad,
    onLoadError,
    onReady,
    onPause,
    onPlay,
    onStop,
    className,
  }) => {
    const source = sources[variant];

    if (!source) {
      throw new Error(`Invalid variant: ${variant}`);
    }

    // Stabilize callbacks to prevent useRive from reinitializing
    const callbacksRef = useRef({
      onLoad,
      onLoadError,
      onPause,
      onPlay,
      onReady,
      onStop,
    });

    useEffect(() => {
      callbacksRef.current = {
        onLoad,
        onLoadError,
        onPause,
        onPlay,
        onReady,
        onStop,
      };
    }, [onLoad, onLoadError, onPause, onPlay, onReady, onStop]);

    const stableCallbacks = useMemo(
      () => ({
        onLoad: ((loadedRive) =>
          callbacksRef.current.onLoad?.(
            loadedRive
          )) as RiveParameters["onLoad"],
        onLoadError: ((err) =>
          callbacksRef.current.onLoadError?.(
            err
          )) as RiveParameters["onLoadError"],
        onPause: ((event) =>
          callbacksRef.current.onPause?.(event)) as RiveParameters["onPause"],
        onPlay: ((event) =>
          callbacksRef.current.onPlay?.(event)) as RiveParameters["onPlay"],
        onReady: () => callbacksRef.current.onReady?.(),
        onStop: ((event) =>
          callbacksRef.current.onStop?.(event)) as RiveParameters["onStop"],
      }),
      []
    );

    // Delay initialisation by one frame to avoid creating (and leaking)
    // a WebGL2 context during React Strict Mode's first throw-away mount.
    const ready = useStrictModeSafeInit();

    const { rive, RiveComponent } = useRive(
      ready
        ? {
            autoplay: true,
            onLoad: stableCallbacks.onLoad,
            onLoadError: stableCallbacks.onLoadError,
            onPause: stableCallbacks.onPause,
            onPlay: stableCallbacks.onPlay,
            onRiveReady: stableCallbacks.onReady,
            onStop: stableCallbacks.onStop,
            src: source.source,
            stateMachines: stateMachine,
          }
        : null
    );

    const listeningInput = useStateMachineInput(
      rive,
      stateMachine,
      "listening"
    );
    const thinkingInput = useStateMachineInput(rive, stateMachine, "thinking");
    const speakingInput = useStateMachineInput(rive, stateMachine, "speaking");
    const asleepInput = useStateMachineInput(rive, stateMachine, "asleep");

    // Rive state machine inputs are mutable objects that must be set via direct
    // property assignment — this is the intended Rive API, not a React anti-pattern.
    useEffect(() => {
      if (listeningInput) {
        listeningInput.value = state === "listening";
      }
      if (thinkingInput) {
        thinkingInput.value = state === "thinking";
      }
      if (speakingInput) {
        speakingInput.value = state === "speaking";
      }
      if (asleepInput) {
        asleepInput.value = state === "asleep";
      }
    }, [state, listeningInput, thinkingInput, speakingInput, asleepInput]);

    const Component = source.hasModel ? PersonaWithModel : PersonaWithoutModel;

    return (
      <Component rive={rive} source={source}>
        <RiveComponent className={cn("size-16 shrink-0", className)} />
      </Component>
    );
  }
);

Persona.displayName = "Persona";
