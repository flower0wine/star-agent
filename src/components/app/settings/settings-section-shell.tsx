import { motion } from "motion/react";

import { Separator } from "@/components/ui/separator";

interface SettingsSectionShellProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function SettingsSectionShell({ title, description, children }: SettingsSectionShellProps) {
  return (
    <motion.section
      key={title}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator />
      {children}
    </motion.section>
  );
}
