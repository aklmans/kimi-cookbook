import { T } from "@/components/T";
import { getBuilderPrompt } from "@/content/prompts/builders";
import { PromptBox } from "./blocks";

export function BuilderPrompt({ id }: { id: string }) {
  const artifact = getBuilderPrompt(id);
  return (
    <PromptBox
      model={artifact.model}
      text={<T zh={artifact.prompt} />}
      example={artifact.example ? <T zh={artifact.example} /> : undefined}
    />
  );
}
