import type { BookMeta, Chapter } from "@/lib/types";
import { T } from "@/components/T";
import { StopPunct } from "./StopPunct";
import { Cover } from "./Cover";
import { SectionTitle, H3, Divider, Kicker } from "./structure";
import {
  Quote,
  CodeBlock,
  Tabs,
  Tab,
  Figure,
  Diagram,
  Stats,
  Stat,
  PriceTable,
  Price,
  Timeline,
  Milestone,
  Quadrant,
  Cell,
  BarCompare,
  Bar,
  Callout,
  Steps,
  Step,
  Accordion,
  AccordionItem,
  Kbd,
  C,
  Compare,
  Before,
  After,
  Badge,
  Dl,
  Di,
  Checklist,
  Check,
  LinkCard,
  PromptBox,
  Gallery,
  GalleryItem,
  ShowcaseCard,
} from "./blocks";
import { CanonAlbum } from "./CanonAlbum";
import { Footnote, References, type Reference } from "./footnotes";
import { elementComponents } from "./elements";
import {
  KimiStackDiagram,
  KimiModesDiagram,
  KimiSwarmDiagram,
} from "./diagrams";
import {
  OpenAIProductMap,
  OpenAIPickerLadder,
  OpenAICodexLadder,
  OpenAITierWalls,
} from "./diagrams-openai";

export type { Reference } from "./footnotes";

export type ChapterCtx = {
  book: BookMeta;
  chapter: Chapter;
  number: string;
  references: Reference[];
};

/* The MDX component map. Built per-chapter so the data-bound
   components (Cover / Footnote / References) can close over that
   chapter's meta + frontmatter while staying Server Components. */
export function getMdxComponents(ctx: ChapterCtx) {
  return {
    ...elementComponents,
    T,
    StopPunct,
    SectionTitle,
    H3,
    Divider,
    Kicker,
    Quote,
    CodeBlock,
    Tabs,
    Tab,
    Figure,
    Diagram,
    Stats,
    Stat,
    PriceTable,
    Price,
    Timeline,
    Milestone,
    Quadrant,
    Cell,
    BarCompare,
    Bar,
    Callout,
    Steps,
    Step,
    Accordion,
    AccordionItem,
    Kbd,
    C,
    Compare,
    Before,
    After,
    Badge,
    Dl,
    Di,
    Checklist,
    Check,
    LinkCard,
    PromptBox,
    Gallery,
    GalleryItem,
    ShowcaseCard,
    CanonAlbum,
    KimiStackDiagram,
    KimiModesDiagram,
    KimiSwarmDiagram,
    OpenAIProductMap,
    OpenAIPickerLadder,
    OpenAICodexLadder,
    OpenAITierWalls,
    Cover: () => <Cover chapter={ctx.chapter} number={ctx.number} />,
    Footnote: ({ n }: { n: number }) => (
      <Footnote n={n} references={ctx.references} />
    ),
    References: () => <References references={ctx.references} />,
  };
}
