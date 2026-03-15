"use client";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "lucide-react";
import { useCallback, useContext, useMemo } from "react";
import { FileTreeContext, FileTreeFolderContext } from "./file-tree-context";
import { FileTreeIcon } from "./file-tree-icon";
import { FileTreeName } from "./file-tree-name";
import { cn } from "@/lib/utils";

export type FileTreeFolderProps = React.HTMLAttributes<HTMLDivElement> & {
  path: string;
  name: string;
};

export function FileTreeFolder({
  path,
  name,
  className,
  children,
  ...props
}: FileTreeFolderProps) {
  const { expandedPaths, togglePath, selectedPath, onSelect }
    = useContext(FileTreeContext);
  const isExpanded = expandedPaths.has(path);
  const isSelected = selectedPath === path;

  const handleOpenChange = useCallback(() => {
    togglePath(path);
  }, [togglePath, path]);

  const handleSelect = useCallback(() => {
    onSelect?.(path);
  }, [onSelect, path]);

  const folderContextValue = useMemo(
    () => ({ isExpanded, name, path }),
    [isExpanded, name, path]
  );

  return (
    <FileTreeFolderContext.Provider value={folderContextValue}>
      <Collapsible onOpenChange={handleOpenChange} open={isExpanded}>
        <div
          className={cn("", className)}
          role="treeitem"
          tabIndex={0}
          {...props}
        >
          <div
            className={cn(
              "flex w-full items-center gap-1 rounded px-2 py-1 text-left transition-colors hover:bg-muted/50",
              isSelected && "bg-muted"
            )}
          >
            <CollapsibleTrigger asChild>
              <button
                className="flex shrink-0 cursor-pointer items-center border-none bg-transparent p-0"
                type="button"
              >
                <ChevronRightIcon
                  className={cn(
                    "size-4 shrink-0 text-muted-foreground transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <button
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left"
              onClick={handleSelect}
              type="button"
            >
              <FileTreeIcon>
                {isExpanded ? (
                  <FolderOpenIcon className="size-4 text-blue-500" />
                ) : (
                  <FolderIcon className="size-4 text-blue-500" />
                )}
              </FileTreeIcon>
              <FileTreeName>{name}</FileTreeName>
            </button>
          </div>
          <CollapsibleContent>
            <div className="ml-4 border-l pl-2">{children}</div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </FileTreeFolderContext.Provider>
  );
}
