import type { ComponentProps } from "react";
import { T } from "@/components/T";
import { Diagram } from "./blocks";

/* Book-specific themed diagrams for the OpenAI guide. Same .dgm-* vocabulary as
   the Kimi diagrams (globals.css Round-33) — token-driven, theme-aware, print-
   safe, squared corners (rx=0). This book is bilingual, so labels switch with
   the language toggle via <DT>: it emits a zh and an en <text> at the same spot
   and the verbatim [lang] CSS display:none's the inactive one (same mechanism as
   <T>). Rendered inline (not via <img>) so the CSS vars resolve. viewBox 16:9. */

/* Bilingual SVG label — both langs at one position; CSS hides the inactive. */
function DT({
  zh,
  en,
  ...rest
}: { zh: string; en?: string } & ComponentProps<"text">) {
  return (
    <>
      <text lang="zh" {...rest}>
        {zh}
      </text>
      <text lang="en" {...rest}>
        {en ?? zh}
      </text>
    </>
  );
}

/* ch1 引子 — one subscription fans out to a cabinet of products. */
export function OpenAIProductMap() {
  const cells: {
    x: number;
    y: number;
    cx: number;
    cy: number;
    zh: string;
    en: string;
    role: string;
    enRole: string;
  }[] = [
    { x: 80, y: 125, cx: 255, cy: 207, zh: "模型选择器", en: "Model picker", role: "挑脑子：换更重的思考", enRole: "Pick the brain" },
    { x: 465, y: 125, cx: 640, cy: 207, zh: "Memory · Projects", en: "Memory · Projects", role: "攒上下文、钉住文件", enRole: "Hold context, pin files" },
    { x: 850, y: 125, cx: 1025, cy: 207, zh: "Plugins / Apps", en: "Plugins / Apps", role: "装 workflow、连接资料", enRole: "Workflows and data" },
    { x: 80, y: 322, cx: 255, cy: 404, zh: "Deep Research", en: "Deep Research", role: "带引用的长报告", enRole: "A cited long report" },
    { x: 850, y: 322, cx: 1025, cy: 404, zh: "自建 GPT", en: "Custom GPTs", role: "把流程封成助手", enRole: "Wrap a workflow" },
    { x: 80, y: 519, cx: 255, cy: 601, zh: "Work · agent", en: "Work · agent", role: "交成品、在网页上动手", enRole: "Deliver and act" },
    { x: 465, y: 519, cx: 640, cy: 601, zh: "Codex", en: "Codex", role: "终端、编辑器里写码", enRole: "Code in terminal & editor" },
    { x: 850, y: 519, cx: 1025, cy: 601, zh: "图像 · 语音 · Sora边界", en: "Images · Voice · Sora", role: "表达与产品状态", enRole: "Expression and product status" },
  ];
  return (
    <Diagram
      caption={
        <T
          zh="一份 ChatGPT 订阅打开的不是一个聊天框，是一组各管一类活的产品 —— 多数你付了钱却没点开。"
          en="A ChatGPT subscription opens not one chat box but a set of products, each for a kind of work — most paid for and never opened."
        />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-oai-map">
        <title id="dgm-oai-map">一份订阅向外连到八个产品 / one subscription linked to eight products</title>
        <DT x={80} y={58} fontSize={40} fontWeight={600} zh="一份订阅，一柜子产品" en="One Subscription, a Cabinet of Products" />
        <DT x={80} y={96} fontSize={20} className="dgm-muted" zh="同一份会员后面，是一组各管一类活的产品" en="Behind one plan sits a set of products, each for a kind of work" />
        <g className="dgm-line">
          {cells.map((c, i) => (
            <path key={i} d={`M640 404 L${c.cx} ${c.cy}`} />
          ))}
        </g>
        {cells.map((c, i) => (
          <g key={i}>
            <rect x={c.x} y={c.y} width={350} height={165} rx={0} className="dgm-card" />
            <DT x={c.x + 26} y={c.y + 60} fontSize={24} zh={c.zh} en={c.en} />
            <DT x={c.x + 26} y={c.y + 100} fontSize={17} className="dgm-muted" zh={c.role} en={c.enRole} />
          </g>
        ))}
        <rect x={465} y={322} width={350} height={165} rx={0} className="dgm-tint" />
        <DT x={640} y={398} fontSize={30} fontWeight={600} textAnchor="middle" className="dgm-accent" zh="一份订阅" en="One subscription" />
        <DT x={640} y={432} fontSize={17} textAnchor="middle" className="dgm-muted" zh="同一份 ChatGPT 会员" en="the same ChatGPT plan" />
        <DT x={80} y={702} fontSize={15} className="dgm-muted" zh="截至 2026-07-10 · 选对入口，比追更高的档位重要" en="As of 2026-07-10 · the right entrance beats a higher tier" />
      </svg>
    </Diagram>
  );
}

/* ch2 挑模型 — the picker decision: Instant → Medium / High → Extra High / Pro. */
export function OpenAIPickerLadder() {
  return (
    <Diagram
      caption={
        <T
          zh="怎么选：日常问答停在 Instant，难题切 Medium / High，只有 High 仍不够才升 Extra High / Pro。"
          en="How to choose: everyday questions stay on Instant, hard ones use Medium / High, and only when High falls short do you move to Extra High / Pro."
        />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-oai-picker">
        <title id="dgm-oai-picker">从 Instant 到 Medium / High 再到 Extra High / Pro 的决策流 / a decision flow from Instant to Medium / High to Extra High / Pro</title>
        <DT x={80} y={58} fontSize={40} fontWeight={600} zh="推理档怎么选" en="Choosing a Reasoning Level" />
        <DT x={80} y={96} fontSize={20} className="dgm-muted" zh="日常停 Instant，难题切 Medium / High，撞质量墙才继续升" en="Instant for daily work; Medium / High for hard work; climb only at the quality wall" />

        {/* Instant — the default (emphasized) */}
        <rect x={70} y={250} width={280} height={170} rx={0} className="dgm-tint" />
        <DT x={210} y={306} fontSize={28} fontWeight={600} textAnchor="middle" zh="Instant" en="Instant" />
        <DT x={210} y={346} fontSize={18} textAnchor="middle" className="dgm-ink-2" zh="日常主力 · 快" en="Workhorse · fast" />
        <DT x={210} y={380} fontSize={15} textAnchor="middle" className="dgm-muted" zh="查信息 / 改写 / 翻译" en="look up / edit / translate" />

        {/* Medium / High */}
        <rect x={500} y={250} width={280} height={170} rx={0} className="dgm-card" />
        <DT x={640} y={306} fontSize={28} fontWeight={600} textAnchor="middle" zh="Medium / High" en="Medium / High" />
        <DT x={640} y={346} fontSize={18} textAnchor="middle" className="dgm-ink-2" zh="真难题 · 先想再答" en="hard ones · reasons first" />
        <DT x={640} y={380} fontSize={15} textAnchor="middle" className="dgm-muted" zh="推理 / 代码 / 核对" en="reasoning / code / check" />

        {/* Extra High / Pro */}
        <rect x={930} y={250} width={280} height={170} rx={0} className="dgm-card" />
        <DT x={1070} y={306} fontSize={25} fontWeight={600} textAnchor="middle" zh="Extra High / Pro" en="Extra High / Pro" />
        <DT x={1070} y={346} fontSize={18} textAnchor="middle" className="dgm-ink-2" zh="最高推理 · 最长任务" en="deepest reasoning · long tasks" />
        <DT x={1070} y={380} fontSize={15} textAnchor="middle" className="dgm-muted" zh="质量墙后才值得" en="only after the quality wall" />

        {/* arrows + conditions */}
        <line x1={360} y1={335} x2={490} y2={335} className="dgm-arrowline" />
        <path d="M490 335 l-14 -7 v14 z" className="dgm-arrow" />
        <DT x={425} y={232} fontSize={15} textAnchor="middle" className="dgm-muted" zh="难题自动升级" en="hard ones escalate" />

        <line x1={790} y1={335} x2={920} y2={335} className="dgm-arrowline" />
        <path d="M920 335 l-14 -7 v14 z" className="dgm-arrow" />
        <DT x={855} y={222} fontSize={15} textAnchor="middle" className="dgm-muted" zh="连 High 都不够" en="even High falls short" />
        <DT x={855} y={244} fontSize={15} textAnchor="middle" className="dgm-muted" zh="+ 每周撞额度墙" en="+ weekly quota wall" />

        {/* "most stop here" bracket under Instant + Medium / High */}
        <path d="M70 470 v12 H780 v-12" className="dgm-line" />
        <DT x={425} y={512} fontSize={19} fontWeight={600} textAnchor="middle" className="dgm-accent" zh="多数人停在这两档 · Plus 就够" en="Most stop at these two · Plus is enough" />
        <DT x={1070} y={470} fontSize={16} textAnchor="middle" className="dgm-muted" zh="撞质量墙才升" en="only at the quality wall" />

        <DT x={80} y={690} fontSize={15} className="dgm-muted" zh="截至 2026-07-10 · 记失败模式，别背型号" en="As of 2026-07-10 · remember failure modes, not model numbers" />
      </svg>
    </Diagram>
  );
}

/* ch9 写码 — the light-to-heavy ladder: chat → Canvas → Codex. */
export function OpenAICodexLadder() {
  const steps: {
    x: number;
    top: number;
    num: string;
    zh: string;
    en: string;
    role: string;
    enRole: string;
    cls: string;
  }[] = [
    { x: 130, top: 470, num: "①", zh: "聊天改一段", en: "Edit in chat", role: "贴段代码 · 扫一眼", enRole: "paste a snippet · glance", cls: "dgm-card" },
    { x: 490, top: 390, num: "②", zh: "Canvas 改一个文件", en: "Canvas · one file", role: "单文件来回改 · 读改动", enRole: "one file, back and forth", cls: "dgm-card" },
    { x: 850, top: 310, num: "③", zh: "Codex 改整个仓库", en: "Codex · whole repo", role: "跨文件 · 跑测试 · 审 diff", enRole: "cross-file · tests · review diff", cls: "dgm-tint" },
  ];
  return (
    <Diagram
      caption={
        <T
          zh="改动越大越往右：投入和能力一路加重，越往右越要会审 diff —— 别一上来就用最重的那档。"
          en="The bigger the change, the further right: investment and power climb together, and the further right the more you must review a diff — do not reach for the heaviest rung first."
        />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-oai-codex">
        <title id="dgm-oai-codex">从轻到重的三级阶梯：聊天、Canvas、Codex / a three-rung ladder: chat, Canvas, Codex</title>
        <DT x={80} y={58} fontSize={40} fontWeight={600} zh="从轻到重的三级阶梯" en="A Ladder from Light to Heavy" />
        <DT x={80} y={96} fontSize={20} className="dgm-muted" zh="改动越大越往右 —— 越往右越要会审 diff" en="The bigger the change, the further right — and the more you review a diff" />

        {steps.map((s, i) => (
          <g key={i}>
            <rect x={s.x} y={s.top} width={300} height={630 - s.top} rx={0} className={s.cls} />
            <text x={s.x + 26} y={s.top + 52} fontSize={34} fontWeight={600} className="dgm-accent">
              {s.num}
            </text>
            <DT x={s.x + 26} y={s.top + 96} fontSize={23} zh={s.zh} en={s.en} />
            <DT x={s.x + 26} y={s.top + 132} fontSize={16} className="dgm-muted" zh={s.role} en={s.enRole} />
          </g>
        ))}

        {/* baseline axis */}
        <line x1={120} y1={660} x2={1180} y2={660} className="dgm-arrowline" />
        <path d="M1180 660 l-14 -7 v14 z" className="dgm-arrow" />
        <DT x={130} y={694} fontSize={16} className="dgm-ink-2" zh="改一段" en="a snippet" />
        <DT x={1180} y={694} fontSize={16} textAnchor="end" className="dgm-ink-2" zh="改整个仓库，越往右越要审 diff →" en="whole repo — the further right, the more diff review →" />

        <DT x={80} y={150} fontSize={16} className="dgm-accent" zh="↑ 投入 / 能力 / 复核强度" en="↑ effort / power / review intensity" />
        <DT x={620} y={150} fontSize={15} className="dgm-muted" zh="截至 2026-07-10 · Codex 含在 ChatGPT 计划中，用量随计划变化" en="As of 2026-07-10 · Codex is included in ChatGPT plans; usage varies by plan" />
      </svg>
    </Diagram>
  );
}

/* ch10 选档 — three walls: features / quota / collaboration. */
export function OpenAITierWalls() {
  const walls: {
    x: number;
    wall: string;
    enWall: string;
    tier: string;
    enTier: string;
    behind: string;
    enBehind: string;
  }[] = [
    { x: 110, wall: "功能", enWall: "Features", tier: "Plus · $20/月", enTier: "Plus · $20/mo", behind: "几乎所有产品面全开", enBehind: "nearly every surface opens" },
    { x: 490, wall: "额度", enWall: "Quota", tier: "Pro · $100 / $200", enTier: "Pro · $100 / $200", behind: "约 5×–20× 用量 + 最高档模型", enBehind: "~5x–20x usage + top model" },
    { x: 870, wall: "协作", enWall: "Collaboration", tier: "Business / Enterprise", enTier: "Business / Enterprise", behind: "共享 · SSO · 审计", enBehind: "sharing · SSO · audit" },
  ];
  return (
    <Diagram
      caption={
        <T
          zh="升档不是「更高级」，是解开一堵具体的墙：Plus 解功能、Pro 解额度与最高档模型、Business / Enterprise 解协作与管控。先认清你撞的是哪一堵。"
          en="Upgrading is not more-premium but unlocking one specific wall: Plus unlocks features, Pro unlocks quota and the top model, Business / Enterprise unlock collaboration and controls. First name the wall you keep hitting."
        />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-oai-walls">
        <title id="dgm-oai-walls">三堵并排的墙：功能、额度、协作 / three walls: features, quota, collaboration</title>
        <DT x={80} y={58} fontSize={40} fontWeight={600} zh="每档解开一堵不同的墙" en="Each Tier Unlocks a Different Wall" />
        <DT x={80} y={96} fontSize={20} className="dgm-muted" zh="升档不是「更高级」，是解开一堵具体的墙" en="Upgrading isn't 'more premium' — it unlocks one specific wall" />

        {walls.map((w, i) => (
          <g key={i}>
            <rect x={w.x} y={170} width={300} height={310} rx={0} className="dgm-card" />
            {/* brick courses */}
            <line x1={w.x} y1={247} x2={w.x + 300} y2={247} className="dgm-line" />
            <line x1={w.x} y1={324} x2={w.x + 300} y2={324} className="dgm-line" />
            <line x1={w.x} y1={401} x2={w.x + 300} y2={401} className="dgm-line" />
            <DT x={w.x + 150} y={340} fontSize={44} fontWeight={600} textAnchor="middle" className="dgm-accent" zh={w.wall} en={w.enWall} />
            <DT x={w.x + 150} y={528} fontSize={22} fontWeight={600} textAnchor="middle" zh={w.tier} en={w.enTier} />
            <DT x={w.x + 150} y={562} fontSize={16} textAnchor="middle" className="dgm-muted" zh={w.behind} en={w.enBehind} />
          </g>
        ))}

        <DT x={80} y={690} fontSize={15} className="dgm-muted" zh="截至 2026-07-10 · chatgpt.com/pricing · 撞哪堵墙，就升解那堵墙的档" en="As of 2026-07-10 · chatgpt.com/pricing · hit a wall, upgrade for that wall" />
      </svg>
    </Diagram>
  );
}
