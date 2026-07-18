import { T } from "@/components/T";
import { Diagram } from "./blocks";

/* Book-specific themed diagrams. The SVGs use semantic .dgm-* classes only
   (no hard-coded hex) so they follow the v3 light/dark tokens and print —
   colors are defined in app/globals.css Round-33. Rendered inline (not via
   <img>) so the CSS variables actually resolve. viewBox is 16:9 (1280×720). */

/* ch2 全景 — the OpenAI/Anthropic-shaped stack + open-weights foundation. */
export function KimiStackDiagram() {
  const bars: [string, string][] = [
    ["聊天 + 五档会员", "≈ ChatGPT / Claude 应用 + 订阅"],
    ["K2.6 旗舰 · 思考 · K2.7-Code", "≈ 旗舰 + 推理 + 编码模型"],
    ["Agent · Agent Swarm", "≈ 成品生成 / 多 agent"],
    ["Deep Research", "≈ Deep Research（同名一面）"],
    ["Kimi Code · 开放平台 API", "≈ Claude Code / Codex · API"],
  ];
  return (
    <Diagram
      caption={
        <T zh="从聊天到 API, Kimi 这套栈几乎层层对得上前沿; 底下垫的开源权重, 才是 OpenAI / Anthropic 不给的那一样。" />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-kimi-stack">
        <title id="dgm-kimi-stack">Kimi 的产品栈逐层映射到 OpenAI / Anthropic, 底部是开源权重</title>
        <text x="80" y="64" fontSize="40" fontWeight="600">
          一套对标 OpenAI / Anthropic 的栈
        </text>
        <text x="80" y="102" fontSize="20" className="dgm-muted">
          聊天到 API, 一层层都能在前沿那边找到对应 —— 再加一样它们不给的
        </text>
        {bars.map(([label, eq], i) => {
          const y = 146 + i * 82;
          return (
            <g key={i}>
              <rect x="80" y={y} width="680" height="68" rx="0" className="dgm-card" />
              <rect x="80" y={y} width="6" height="68" rx="0" className="dgm-accent" />
              <text x="106" y={y + 42} fontSize="25">
                {label}
              </text>
              <text x="800" y={y + 42} fontSize="19" className="dgm-muted">
                {eq}
              </text>
            </g>
          );
        })}
        <rect x="80" y="566" width="1120" height="84" rx="0" className="dgm-tint" />
        <text x="106" y="601" fontSize="25" fontWeight="600" className="dgm-accent">
          开源权重 · Modified MIT
        </text>
        <text x="106" y="629" fontSize="17" className="dgm-muted">
          能下载、自托管、商用 —— OpenAI / Anthropic 不给的那一样
        </text>
        <text x="80" y="690" fontSize="16" className="dgm-muted">
          截至 2026-06 · 来源: kimi.com · platform.kimi.com · Hugging Face
        </text>
      </svg>
    </Diagram>
  );
}

/* ch4 四模式 — the answer→do ladder. */
export function KimiModesDiagram() {
  const steps: [number, number, string, string, string][] = [
    [90, 470, "Instant 快答", "秒回, 不思考", "dgm-card"],
    [360, 425, "Thinking 深想", "先推几步再答", "dgm-card"],
    [630, 380, "Agent 交办", "直接做出成品", "dgm-tint"],
    [900, 335, "Agent Swarm", "一群子 agent 并行", "dgm-tint"],
  ];
  return (
    <Diagram
      caption={
        <T zh="Instant → Thinking → Agent → Agent Swarm, 越往右它替你扛得越多, 时间、额度、自主也越大。" />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-kimi-modes">
        <title id="dgm-kimi-modes">四个模式从快答到集群的上升阶梯, 越往右代价越大</title>
        <text x="80" y="64" fontSize="40" fontWeight="600">
          四个模式 · 从「答你」到「替你做」
        </text>
        <text x="80" y="102" fontSize="20" className="dgm-muted">
          挑能办成事的最低那一档 —— 往右, 时间 / 额度 / 自主都在涨
        </text>
        <text x="215" y="168" fontSize="21" fontWeight="600" className="dgm-ink-2">
          它答 · 你做
        </text>
        <text x="755" y="168" fontSize="21" fontWeight="600" className="dgm-accent">
          它做 · 你验
        </text>
        <line x1="615" y1="190" x2="615" y2="600" className="dgm-rule" />
        <text x="1000" y="210" fontSize="18" className="dgm-accent">
          时间 / 额度 / 自主 ↑
        </text>
        {steps.map(([x, y, name, sub, cls], i) => (
          <g key={i}>
            <rect x={x} y={y} width="250" height={600 - y} rx="0" className={cls} />
            <text x={x + 24} y={y + 42} fontSize="24">
              {name}
            </text>
            <text x={x + 24} y={y + 72} fontSize="16" className="dgm-muted">
              {sub}
            </text>
          </g>
        ))}
        <line x1="90" y1="632" x2="1140" y2="632" className="dgm-arrowline" />
        <path d="M1140 632 l-14 -7 v14 z" className="dgm-arrow" />
        <text x="90" y="668" fontSize="20" className="dgm-ink-2">
          答你
        </text>
        <text x="1070" y="668" fontSize="20" className="dgm-ink-2">
          替你做
        </text>
      </svg>
    </Diagram>
  );
}

/* ch6 大活 — one task fans out to a swarm, then merges. */
export function KimiSwarmDiagram() {
  const dots = [
    [500, 250], [590, 250], [680, 250], [770, 250],
    [500, 330], [590, 330], [680, 330], [770, 330],
    [500, 410], [590, 410], [680, 410], [770, 410],
    [500, 490], [590, 490], [680, 490], [770, 490],
  ];
  const accentDots = new Set(["590,330", "680,410"]);
  return (
    <Diagram
      caption={
        <T zh="一个任务拆给最多约 300 个子 agent 并行, 再归并成产出。只对「拆得开」的大活值, 线性活别用。" />
      }
    >
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="dgm-kimi-swarm">
        <title id="dgm-kimi-swarm">任务扇出到一群并行子 agent, 再归并为产出</title>
        <text x="80" y="64" fontSize="40" fontWeight="600">
          Agent Swarm · 一个任务, 一群分身
        </text>
        <text x="80" y="102" fontSize="20" className="dgm-muted">
          拆得开的活才值 —— K2.6 最多约 300 个子 agent、4000+ 次工具调用、约 4.5× 快
        </text>
        <g className="dgm-line">
          <path d="M230 350 L470 250" />
          <path d="M230 350 L470 330" />
          <path d="M230 350 L470 410" />
          <path d="M230 350 L470 490" />
          <path d="M230 350 L560 290" />
          <path d="M230 350 L560 450" />
          <path d="M810 250 L1030 350" />
          <path d="M810 330 L1030 350" />
          <path d="M810 410 L1030 350" />
          <path d="M810 490 L1030 350" />
          <path d="M720 290 L1030 350" />
          <path d="M720 450 L1030 350" />
        </g>
        <rect x="80" y="305" width="150" height="90" rx="0" className="dgm-tint" />
        <text x="155" y="358" fontSize="26" fontWeight="600" textAnchor="middle" className="dgm-accent">
          任务
        </text>
        {dots.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r="12"
            className={accentDots.has(`${cx},${cy}`) ? "dgm-accent" : "dgm-dot"}
          />
        ))}
        <text x="500" y="552" fontSize="19" className="dgm-muted">
          并行的子 agent …… 最多约 300 个
        </text>
        <rect x="1030" y="305" width="170" height="90" rx="0" className="dgm-card" />
        <text x="1115" y="358" fontSize="24" fontWeight="600" textAnchor="middle">
          归并产出
        </text>
        <text x="80" y="648" fontSize="18" className="dgm-muted">
          适合: 大规模检索 · 上百份文档 · 多视角综合 —— 一步接一步的线性活别用。
        </text>
        <text x="80" y="690" fontSize="16" className="dgm-muted">
          截至 2026-06 · Beta · Allegretto / Allegro 档 · 来源: kimi.com 帮助中心
        </text>
      </svg>
    </Diagram>
  );
}
