import type { HTMLAttributes } from "react";

export type EnvironmentVariablesProps = HTMLAttributes<HTMLDivElement> & {
  showValues?: boolean;
  defaultShowValues?: boolean;
  onShowValuesChange?: (show: boolean) => void;
};

export type EnvironmentVariablesHeaderProps = HTMLAttributes<HTMLDivElement>;

export type EnvironmentVariablesTitleProps = HTMLAttributes<HTMLHeadingElement>;

export type EnvironmentVariablesContentProps = HTMLAttributes<HTMLDivElement>;

export type EnvironmentVariableGroupProps = HTMLAttributes<HTMLDivElement>;

export type EnvironmentVariableNameProps = HTMLAttributes<HTMLSpanElement>;

export type EnvironmentVariableValueProps = HTMLAttributes<HTMLSpanElement>;

export type EnvironmentVariableProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  value: string;
};

interface EnvironmentVariablesContextType {
  showValues: boolean;
  setShowValues: (show: boolean) => void;
}

interface EnvironmentVariableContextType {
  name: string;
  value: string;
}

export type {
  EnvironmentVariableContextType,
  EnvironmentVariablesContextType,
};
