"use client";

import {
  createContext,
} from "react";

import type { EnvironmentVariablesContextType, EnvironmentVariableContextType } from "./types";

// Default noop for context default value
// oxlint-disable-next-line eslint(no-empty-function)
function noop() {}

const EnvironmentVariablesContext = createContext<EnvironmentVariablesContextType>({
  setShowValues: noop,
  showValues: false,
});

const EnvironmentVariableContext = createContext<EnvironmentVariableContextType>({
  name: "",
  value: "",
});

export {
  EnvironmentVariableContext,
  EnvironmentVariablesContext,
};
