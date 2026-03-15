"use client";

import type { ReactNode } from "react";
import { memo } from "react";

interface PersonaWithoutModelProps {
  children: ReactNode;
}

export const PersonaWithoutModel = memo(
  async ({ children }: PersonaWithoutModelProps) => children
);

PersonaWithoutModel.displayName = "PersonaWithoutModel";
