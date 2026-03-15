"use client";

import { useEffect, memo } from "react";
import type { ReactNode } from "react";
import type { Rive } from "@rive-app/webgl2";
import {
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceColor,
} from "@rive-app/react-webgl2";
import { useTheme } from "./hooks";
import type { sources } from "./config";

interface PersonaWithModelProps {
  rive: Rive | null;
  source: (typeof sources)[keyof typeof sources];
  children: ReactNode;
}

export const PersonaWithModel = memo(
  async ({ rive, source, children }: PersonaWithModelProps) => {
    const theme = useTheme(source.dynamicColor);
    const viewModel = useViewModel(rive, { useDefault: true });
    const viewModelInstance = useViewModelInstance(viewModel, {
      rive,
      useDefault: true,
    });
    const viewModelInstanceColor = useViewModelInstanceColor(
      "color",
      viewModelInstance
    );

    useEffect(() => {
      if (!(viewModelInstanceColor && source.dynamicColor)) {
        return;
      }

      const [r, g, b] = theme === "dark" ? [255, 255, 255] : [0, 0, 0];
      viewModelInstanceColor.setRgb(r, g, b);
    }, [viewModelInstanceColor, theme, source.dynamicColor]);

    return children;
  }
);

PersonaWithModel.displayName = "PersonaWithModel";
