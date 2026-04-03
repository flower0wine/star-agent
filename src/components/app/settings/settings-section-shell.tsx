import { motion } from "motion/react";
import { cn } from "@/lib/utils";

import { Separator } from "@/components/ui/separator";

interface SettingsSectionShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}

export function SettingsSectionShell({
  title,
  description,
  children,
  className,
}: SettingsSectionShellProps) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("space-y-3", className)}
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </motion.section>
  );
}
