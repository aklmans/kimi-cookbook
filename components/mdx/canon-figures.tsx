import type { ReactElement, SVGProps } from "react";
import type { Lang } from "@/components/LangProvider";

// Theme-aware canon diagrams. These stay as inline SVG so their .fig-* paint
// hooks can resolve CSS variables and follow light/dark mode without assets.

export type Loc = { zh: string; en: string };

export type CanonFigure = {
  art: ReactElement<SVGProps<SVGSVGElement>>;
  category: string;
  title: Loc;
  sub: Loc;
  steps: Loc;
};

export type CanonAlbum = { items: CanonFigure[] };

export function localizeFigure(value: Loc, lang: Lang): string {
  return lang === "en" ? value.en : value.zh;
}

const OpenAIEntrances = (
  <svg className="fig-svg" viewBox="0 0 720 380" role="img" aria-label="OpenAI 产品入口地图">
    <rect className="fig-ink" x={44} y={52} width={632} height={276} rx={18} strokeWidth={1.1} />
    {(
      [
        ["聊天框", "CHAT", "01", 64, 82, 204],
        ["上下文", "CONTEXT", "02", 452, 82, 204],
        ["查证 / 动手", "RESEARCH · AGENT", "03", 64, 232, 204],
        ["代码 / 表达", "CODE · MEDIA", "04", 452, 232, 204],
      ] as [string, string, string, number, number, number][]
    ).map(([label, sub, ord, x, y, width]) => (
      <g key={ord}>
        <line className="fig-ink" x1={x < 360 ? x + width : x} y1={y + 35} x2={360} y2={190} strokeWidth={1} />
        <rect className="fig-ink" x={x} y={y} width={width} height={70} rx={10} strokeWidth={1.2} />
        <text className="fig-label" x={x + 20} y={y + 30}>
          {label}
        </text>
        <text className="fig-sub" x={x + 20} y={y + 53}>
          {sub}
        </text>
        <text className="fig-ord" x={x + width - 24} y={y + 31} textAnchor="end">
          {ord}
        </text>
      </g>
    ))}
    <circle className="fig-accent-line" cx={360} cy={190} r={58} strokeWidth={1.8} />
    <text className="fig-label" x={360} y={183} textAnchor="middle">
      订阅
    </text>
    <text className="fig-sub" x={360} y={207} textAnchor="middle">
      SUBSCRIPTION
    </text>
  </svg>
);

const OpenAIContextLayer = (
  <svg className="fig-svg" viewBox="0 0 720 380" role="img" aria-label="OpenAI 上下文层：Memory、Projects、Plugins 与 Apps">
    <line className="fig-spine" x1={96} y1={64} x2={96} y2={316} strokeWidth={1.5} />
    {(
      [
        ["Memory", "自动记住偏好与背景", 92],
        ["Projects", "把文件、指令和对话放在一处", 182],
        ["Plugins / Apps", "装 workflow，并连接外部资料", 272],
      ] as [string, string, number][]
    ).map(([label, sub, y], index) => (
      <g key={label}>
        <circle className="fig-accent" cx={96} cy={y + 28} r={5} />
        <rect
          className={index === 1 ? "fig-accent-line" : "fig-ink"}
          x={132}
          y={y}
          width={456}
          height={56}
          rx={10}
          strokeWidth={index === 1 ? 1.7 : 1.1}
        />
        <text className="fig-label" x={158} y={y + 27}>
          {label}
        </text>
        <text className="fig-sub" x={158} y={y + 45}>
          {sub}
        </text>
        <text className="fig-ord" x={566} y={y + 34} textAnchor="end">{`0${index + 1}`}</text>
      </g>
    ))}
    <rect className="fig-ink" x={612} y={112} width={46} height={156} rx={8} strokeWidth={1} />
    <line className="fig-ink" x1={626} y1={140} x2={644} y2={140} strokeWidth={1} />
    <line className="fig-ink" x1={626} y1={190} x2={644} y2={190} strokeWidth={1} />
    <line className="fig-ink" x1={626} y1={240} x2={644} y2={240} strokeWidth={1} />
  </svg>
);

const OpenAIActionLayer = (
  <svg className="fig-svg" viewBox="0 0 720 380" role="img" aria-label="OpenAI 查证与执行层：Deep Research 和 agent">
    <rect className="fig-ink" x={66} y={70} width={258} height={236} rx={14} strokeWidth={1.2} />
    <text className="fig-label" x={96} y={108}>
      Deep Research
    </text>
    <text className="fig-sub" x={96} y={130}>
      查证 · 引用 · 报告
    </text>
    <line className="fig-ink" x1={96} y1={166} x2={292} y2={166} strokeWidth={1} />
    <line className="fig-ink" x1={96} y1={202} x2={260} y2={202} strokeWidth={1} />
    <line className="fig-accent-line" x1={96} y1={238} x2={292} y2={238} strokeWidth={1.8} />
    <circle className="fig-accent" cx={284} cy={238} r={5} />
    <rect className="fig-ink" x={396} y={70} width={258} height={236} rx={14} strokeWidth={1.2} />
    <text className="fig-label" x={426} y={108}>
      ChatGPT agent
    </text>
    <text className="fig-sub" x={426} y={130}>
      浏览器 · 点击 · 回来交差
    </text>
    <rect className="fig-ink" x={430} y={162} width={190} height={112} rx={10} strokeWidth={1} />
    <line className="fig-ink" x1={430} y1={190} x2={620} y2={190} strokeWidth={1} />
    <circle className="fig-accent" cx={456} cy={176} r={4} />
    <path className="fig-accent-line" d="M512 222 l34 18 -21 7 -10 21 -18 -34 z" strokeWidth={1.6} />
    <text className="fig-sub" x={360} y={330} textAnchor="middle">
      看清楚 → 再动手
    </text>
  </svg>
);

const OpenAIProductionLayer = (
  <svg className="fig-svg" viewBox="0 0 720 380" role="img" aria-label="OpenAI 生产层：Codex、图像、语音与 Sora 退役边界">
    {(
      [
        ["Codex", "代码", 58],
        ["Images", "图像", 222],
        ["Voice", "语音", 386],
        ["Sora ×", "已停用", 550],
      ] as [string, string, number][]
    ).map(([label, sub, x], index) => (
      <g key={label}>
        <rect
          className={index === 0 ? "fig-accent-line" : "fig-ink"}
          x={x}
          y={112}
          width={112}
          height={132}
          rx={13}
          strokeWidth={index === 0 ? 1.7 : 1.1}
        />
        <text className="fig-label" x={x + 18} y={148}>
          {label}
        </text>
        <text className="fig-sub" x={x + 18} y={168}>
          {sub}
        </text>
        {index === 0 && (
          <>
            <line className="fig-ink" x1={x + 22} y1={198} x2={x + 86} y2={198} strokeWidth={1} />
            <line className="fig-ink" x1={x + 22} y1={218} x2={x + 70} y2={218} strokeWidth={1} />
          </>
        )}
        {index === 1 && (
          <>
            <circle className="fig-accent" cx={x + 38} cy={204} r={8} />
            <path className="fig-ink" d={`M${x + 20} 230 l28 -34 20 20 18 -26 24 40 z`} strokeWidth={1} />
          </>
        )}
        {index === 2 && (
          <path className="fig-accent-line" d={`M${x + 20} 210 q14 -44 28 0 t28 0 t28 0`} strokeWidth={1.8} />
        )}
        {index === 3 && (
          <>
            <rect className="fig-ink" x={x + 20} y={190} width={72} height={42} rx={5} strokeWidth={1} />
            <path className="fig-accent" d={`M${x + 52} 202 l20 9 -20 9 z`} />
          </>
        )}
        {index < 3 && <line className="fig-ink" x1={x + 112} y1={178} x2={x + 164} y2={178} strokeWidth={1} />}
      </g>
    ))}
    <text className="fig-sub" x={360} y={294} textAnchor="middle">
      代码、图像、语音可交付 · Sora 是退役边界
    </text>
  </svg>
);

const OpenAIProductCompass = (
  <svg className="fig-svg" viewBox="0 0 860 440" role="img" aria-label="OpenAI 单图产品选择罗盘">
    <text className="fig-sub" x={92} y={40}>
      TASK TO ENTRANCE
    </text>
    <line className="fig-spine" x1={62} y1={70} x2={62} y2={390} strokeWidth={1.5} />
    {(
      [
        ["写作 / 改写", "日常问答、改稿、翻译", "Chat / 模型", "默认聊天 · 选择器", "01", 72],
        ["长期上下文", "同一个项目反复推进", "Projects", "Memory · 文件 · 指令", "02", 158],
        ["查证 / 成品 / 网页", "需要引用、文件或在线动作", "Research / Work / Agent", "报告 · 成品 · 浏览器", "03", 244],
        ["代码 / 表达", "代码、图片、双向语音", "Codex / Media", "仓库 · 图像 · GPT-Live", "04", 330],
      ] as [string, string, string, string, string, number][]
    ).map(([task, taskSub, product, productSub, ord, y], index) => (
      <g key={ord}>
        <circle className="fig-accent" cx={62} cy={y + 34} r={4.8} />
        <rect
          className={index === 0 ? "fig-accent-line" : "fig-ink"}
          x={92}
          y={y}
          width={270}
          height={68}
          rx={10}
          strokeWidth={index === 0 ? 1.7 : 1.1}
        />
        <text className="fig-label" x={116} y={y + 29}>
          {task}
        </text>
        <text className="fig-sub" x={116} y={y + 51}>
          {taskSub}
        </text>
        <line className="fig-ink" x1={362} y1={y + 34} x2={488} y2={y + 34} strokeWidth={1} />
        <path className="fig-accent" d={`M488 ${y + 34} l-13 -5.5 v11 z`} />
        <rect className="fig-ink" x={516} y={y} width={300} height={68} rx={10} strokeWidth={1.1} />
        <text className="fig-label" x={540} y={y + 29}>
          {product}
        </text>
        <text className="fig-sub" x={540} y={y + 51}>
          {productSub}
        </text>
        <text className="fig-ord" x={790} y={y + 31} textAnchor="end">
          {ord}
        </text>
      </g>
    ))}
  </svg>
);

const LadderOverview = (
  <svg
    className="fig-svg"
    viewBox="0 0 640 372"
    role="img"
    aria-label="四层知识结构：表征 → 图式 → 心智模型 → 解释框架"
  >
    {(
      [
        ["解释框架", "FRAMEWORK", "04", 300, true],
        ["心智模型", "MENTAL MODEL", "03", 380, false],
        ["图式", "SCHEMA", "02", 460, false],
        ["表征", "REPRESENTATION", "01", 540, false],
      ] as [string, string, string, number, boolean][]
    ).map(([label, sub, ord, width, accent], index) => {
      const x = (640 - width) / 2;
      const y = 40 + index * 82;
      return (
        <g key={ord}>
          <rect
            className={accent ? "fig-accent-line" : "fig-ink"}
            x={x}
            y={y}
            width={width}
            height={62}
            rx={10}
            strokeWidth={accent ? 1.8 : 1.3}
          />
          <text className="fig-label" x={x + 24} y={y + 31}>
            {label}
          </text>
          <text className="fig-sub" x={x + 24} y={y + 49}>
            {sub}
          </text>
          <text className="fig-ord" x={x + width - 24} y={y + 38} textAnchor="end">
            {ord}
          </text>
          {accent && <circle className="fig-accent" cx={x + width - 62} cy={y + 32} r={5} />}
        </g>
      );
    })}
  </svg>
);

const LayerRep = (
  <svg className="fig-svg" viewBox="0 0 640 360" role="img" aria-label="表征：概念与对象由关系连接">
    <rect className="fig-ink" x={60} y={120} width={190} height={120} rx={10} strokeWidth={1.5} />
    <text className="fig-label" x={80} y={172}>
      概念
    </text>
    <text className="fig-sub" x={80} y={196}>
      CONCEPT
    </text>
    <rect className="fig-ink" x={390} y={120} width={190} height={120} rx={10} strokeWidth={1.5} />
    <text className="fig-label" x={410} y={172}>
      对象
    </text>
    <text className="fig-sub" x={410} y={196}>
      OBJECT
    </text>
    <line className="fig-ink" x1={250} y1={180} x2={390} y2={180} strokeWidth={1.5} />
    <circle className="fig-accent" cx={320} cy={180} r={5.5} />
    <text className="fig-sub" x={320} y={158} textAnchor="middle">
      关系 / RELATION
    </text>
  </svg>
);

const LayerSchema = (
  <svg className="fig-svg" viewBox="0 0 640 360" role="img" aria-label="图式：可复用的模式模板">
    <text className="fig-sub" x={150} y={34}>
      模式模板 / TEMPLATE
    </text>
    <rect className="fig-ink" x={130} y={48} width={380} height={276} rx={12} strokeWidth={1.5} />
    <rect className="fig-ink" x={160} y={76} width={320} height={46} rx={8} strokeWidth={1} />
    <rect className="fig-accent-line" x={160} y={138} width={320} height={46} rx={8} strokeWidth={1.6} />
    <rect className="fig-ink" x={160} y={200} width={320} height={46} rx={8} strokeWidth={1} />
    <rect className="fig-ink" x={160} y={262} width={320} height={46} rx={8} strokeWidth={1} />
    <circle className="fig-accent" cx={455} cy={161} r={5.5} />
  </svg>
);

const LayerModel = (
  <svg className="fig-svg" viewBox="0 0 640 360" role="img" aria-label="心智模型：会动的图式，能推演若 A 则 B">
    <text className="fig-sub" x={320} y={86} textAnchor="middle">
      若 A 则 B / IF · THEN
    </text>
    <rect className="fig-ink" x={56} y={150} width={140} height={90} rx={10} strokeWidth={1.5} />
    <text className="fig-big" x={126} y={206} textAnchor="middle">
      A
    </text>
    <rect className="fig-ink" x={444} y={150} width={140} height={90} rx={10} strokeWidth={1.5} />
    <text className="fig-big" x={514} y={206} textAnchor="middle">
      B
    </text>
    <circle className="fig-accent-line" cx={320} cy={195} r={48} strokeWidth={1.6} />
    <circle className="fig-accent" cx={320} cy={195} r={6} />
    <text className="fig-sub" x={320} y={272} textAnchor="middle">
      推演 / RUN
    </text>
    <line className="fig-ink" x1={196} y1={195} x2={268} y2={195} strokeWidth={1.5} />
    <line className="fig-ink" x1={372} y1={195} x2={430} y2={195} strokeWidth={1.5} />
    <path className="fig-accent" d="M444 195 l-13 -5.5 v11 z" />
  </svg>
);

const LayerFrame = (
  <svg className="fig-svg" viewBox="0 0 640 360" role="img" aria-label="解释框架：对一个领域的系统性判断">
    <text className="fig-sub" x={58} y={32}>
      领域 / DOMAIN
    </text>
    <rect className="fig-ink" x={40} y={42} width={560} height={286} rx={14} strokeWidth={1} />
    <rect className="fig-ink" x={84} y={74} width={150} height={62} rx={8} strokeWidth={1} />
    <rect className="fig-ink" x={406} y={74} width={150} height={62} rx={8} strokeWidth={1} />
    <rect className="fig-ink" x={84} y={234} width={150} height={62} rx={8} strokeWidth={1} />
    <rect className="fig-ink" x={406} y={234} width={150} height={62} rx={8} strokeWidth={1} />
    <line className="fig-ink" x1={234} y1={105} x2={286} y2={158} strokeWidth={1} />
    <line className="fig-ink" x1={406} y1={105} x2={354} y2={158} strokeWidth={1} />
    <line className="fig-ink" x1={234} y1={265} x2={286} y2={212} strokeWidth={1} />
    <line className="fig-ink" x1={406} y1={265} x2={354} y2={212} strokeWidth={1} />
    <circle className="fig-accent-line" cx={320} cy={185} r={46} strokeWidth={1.6} />
    <text className="fig-label" x={320} y={182} textAnchor="middle">
      判断
    </text>
    <text className="fig-sub" x={320} y={202} textAnchor="middle">
      JUDGMENT
    </text>
  </svg>
);

const SpecSchema = (
  <svg
    className="fig-svg"
    viewBox="0 0 760 320"
    role="img"
    aria-label="给 agent 的规格模板：目标 / 约束 / 输入输出 / 样例 / 验收"
  >
    <line className="fig-spine" x1={34} y1={34} x2={34} y2={286} strokeWidth={1.5} />
    {(
      [
        ["目标", "GOAL — 要它达成什么"],
        ["约束", "CONSTRAINTS — 不可逾越的边界"],
        ["输入 / 输出", "I · O — 给什么 / 还什么"],
        ["样例", "EXAMPLES — 好与坏各一例"],
        ["验收", "ACCEPTANCE — 怎样算对"],
      ] as [string, string][]
    ).map(([label, sub], index) => {
      const y = 50 + index * 58;
      return (
        <g key={label}>
          <circle className="fig-accent" cx={34} cy={y} r={4.5} />
          <rect className="fig-ink" x={64} y={y - 22} width={664} height={44} rx={8} strokeWidth={1} />
          <text className="fig-label" x={84} y={y - 1}>
            {label}
          </text>
          <text className="fig-sub" x={84} y={y + 15}>
            {sub}
          </text>
          <text className="fig-ord" x={710} y={y + 4} textAnchor="end">{`0${index + 1}`}</text>
        </g>
      );
    })}
  </svg>
);

export const CANON_FIGURES: Record<string, CanonAlbum> = {
  "openai-product-compass": {
    items: [
      {
        art: OpenAIProductCompass,
        category: "MAP · 单图",
        title: { zh: "一件事，一个入口", en: "One task, one entrance" },
        sub: {
          zh: "把常见任务先分流，再决定该打开哪个 OpenAI 产品。",
          en: "Route the task first, then choose the OpenAI surface.",
        },
        steps: {
          zh: "任务 → 入口 → 交付",
          en: "task → entrance → output",
        },
      },
    ],
  },
  "openai-product-surfaces": {
    items: [
      {
        art: OpenAIEntrances,
        category: "MAP · 总览",
        title: { zh: "OpenAI 产品入口", en: "OpenAI product entrances" },
        sub: {
          zh: "同一份订阅不是一个框，而是一组入口。",
          en: "The subscription is not one box, but a set of entrances.",
        },
        steps: {
          zh: "聊天框 → 上下文 → 查证 / 动手 → 代码 / 表达",
          en: "chat → context → research / action → code / media",
        },
      },
      {
        art: OpenAIContextLayer,
        category: "CONTEXT · 记住",
        title: { zh: "Memory · Projects · Plugins / Apps", en: "Memory · Projects · Plugins / Apps" },
        sub: {
          zh: "先把背景、文件和外部资料放对位置。",
          en: "Put background, files, and outside material in the right place first.",
        },
        steps: {
          zh: "偏好 → 文件 → 外部资料",
          en: "preferences → files → external material",
        },
      },
      {
        art: OpenAIActionLayer,
        category: "ACTION · 执行",
        title: { zh: "Deep Research · Agent", en: "Deep Research · Agent" },
        sub: {
          zh: "一个负责查清楚，一个负责在网页里动手。",
          en: "One finds out; the other acts inside a browser.",
        },
        steps: {
          zh: "问题 → 引用报告 → 浏览器动作",
          en: "question → cited report → browser action",
        },
      },
      {
        art: OpenAIProductionLayer,
        category: "MAKE · 产出",
        title: { zh: "Codex · 图像 · 语音 · Sora 边界", en: "Codex · Images · Voice · the Sora boundary" },
        sub: {
          zh: "代码、图像与语音仍可交付；Sora 是已退役边界。",
          en: "Code, images, and voice remain deliverable; Sora is a retired boundary.",
        },
        steps: {
          zh: "代码 → 图像 → 双向语音 · 视频入口已停用",
          en: "code → image → duplex voice · video entrance retired",
        },
      },
    ],
  },
  "learning-is-compression": {
    items: [
      {
        art: LadderOverview,
        category: "LADDER · 总览",
        title: { zh: "四层知识结构", en: "Four layers of knowledge" },
        sub: {
          zh: "自下而上，把信息压缩成判断。",
          en: "Bottom-up, compressing information into judgment.",
        },
        steps: {
          zh: "表征 → 图式 → 心智模型 → 解释框架",
          en: "representation → schema → mental model → framework",
        },
      },
      {
        art: LayerRep,
        category: "REPRESENTATION · LV.01",
        title: { zh: "表征", en: "Representation" },
        sub: {
          zh: "把世界标记成概念、对象与关系。",
          en: "Marking the world into concepts, objects, relations.",
        },
        steps: { zh: "概念 → 对象 → 关系", en: "concept → object → relation" },
      },
      {
        art: LayerSchema,
        category: "SCHEMA · LV.02",
        title: { zh: "图式", en: "Schema" },
        sub: {
          zh: "可识别、可复用的模式模板。",
          en: "Recognizable, reusable pattern templates.",
        },
        steps: { zh: "模式 → 模板 → 复用", en: "pattern → template → reuse" },
      },
      {
        art: LayerModel,
        category: "MENTAL MODEL · LV.03",
        title: { zh: "心智模型", en: "Mental model" },
        sub: {
          zh: "会动的图式，能推演「若 A 则 B」。",
          en: "A schema that runs, inferring “if A then B”.",
        },
        steps: { zh: "图式 → 推演 → 因果", en: "schema → run → causality" },
      },
      {
        art: LayerFrame,
        category: "FRAMEWORK · LV.04",
        title: { zh: "解释框架", en: "Framework" },
        sub: {
          zh: "对一个领域的系统性判断。",
          en: "A systematic judgment of a whole domain.",
        },
        steps: { zh: "领域 → 系统 → 判断", en: "domain → system → judgment" },
      },
    ],
  },
  "good-spec-for-ai-agents": {
    items: [
      {
        art: SpecSchema,
        category: "SCHEMA · 图式",
        title: { zh: "Agent 规格模板", en: "Spec template for an agent" },
        sub: { zh: "一份好规格的五个部件。", en: "Five parts of a good spec." },
        steps: {
          zh: "目标 → 约束 → 输入 / 输出 → 样例 → 验收",
          en: "goal → constraints → I/O → examples → acceptance",
        },
      },
    ],
  },
};
