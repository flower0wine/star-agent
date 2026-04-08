import { TemplateEditor } from "@/components/ai-elements/editors/template-editor";
import type { TemplateVariableOption } from "@/components/ai-elements/editors/template-editor";

interface TemplateVariableTextareaProps {
  value: string;
  onChange: (value: string) => void;
  variables: Array<string | TemplateVariableOption>;
  rows?: number;
  placeholder?: string;
}

export function TemplateVariableTextarea({
  value,
  onChange,
  variables,
  rows = 4,
  placeholder,
}: TemplateVariableTextareaProps) {
  return (
    <TemplateEditor
      value={value}
      onChange={onChange}
      variables={variables}
      rows={rows}
      placeholder={placeholder}
      showVariableHint
    />
  );
}
