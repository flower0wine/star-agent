import { createContext } from "react";

export interface TerminalContextType {
  output: string;
  isStreaming: boolean;
  autoScroll: boolean;
  onClear?: () => void;
}

export const TerminalContext = createContext<TerminalContextType>({
  autoScroll: true,
  isStreaming: false,
  output: "",
});
