"use client";

import { createContext, useContext } from "react";

import type { HttpMethod, SchemaDisplayContextType } from "./types";

export const SchemaDisplayContext = createContext<SchemaDisplayContextType>({
  method: "GET" as HttpMethod,
  path: "",
});

export const useSchemaDisplayContext = useContext;
