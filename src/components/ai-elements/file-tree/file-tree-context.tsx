"use client";

import { createContext } from "react";
import type { SetStateAction, Dispatch } from "react";

export interface FileTreeContextType {
  expandedPaths: Set<string>;
  togglePath: (path: string) => void;
  selectedPath?: string;
  onSelect?: (path: string) => void;
}

// Default noop for context default value
// oxlint-disable-next-line eslint(no-empty-function)
function noop() {}

export const FileTreeContext = createContext<FileTreeContextType>({
  // oxlint-disable-next-line eslint-plugin-unicorn(no-new-builtin)
  expandedPaths: new Set(),
  togglePath: noop,
});

export interface FileTreeFolderContextType {
  path: string;
  name: string;
  isExpanded: boolean;
}

export const FileTreeFolderContext = createContext<FileTreeFolderContextType>({
  isExpanded: false,
  name: "",
  path: "",
});

export interface FileTreeFileContextType {
  path: string;
  name: string;
}

export const FileTreeFileContext = createContext<FileTreeFileContextType>({
  name: "",
  path: "",
});
