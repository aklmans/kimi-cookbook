export type MonthlyArtifact = {
  id: string;
  category: "学习" | "思考" | "构建" | "转型" | "综合";
  categoryEn: "Learn" | "Think" | "Build" | "Transform" | "All";
  title: string;
  titleEn: string;
  bestMode: "Thinking" | "Agent" | "Deep Research" | "Instant";
  description: string;
  descriptionEn: string;
  prompt: string;
};

export type MonthlyCaseStudy = {
  id: string;
  tag: string;
  tagEn: string;
  title: string;
  titleEn: string;
  role: string;
  roleEn: string;
  challenge: string;
  challengeEn: string;
  solution: string;
  solutionEn: string;
  takeaways: string[];
  takeawaysEn: string[];
};

export type MonthlyIssue = {
  slug: string;
  volume: number;
  month: string; // "2026.09"
  date: string; // "2026-09-01"
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
  lede: string;
  ledeEn: string;
  paradigmShift: {
    title: string;
    titleEn: string;
    content: string[];
    contentEn: string[];
    keyInsights: { title: string; titleEn: string; desc: string; descEn: string }[];
  };
  caseStudies: MonthlyCaseStudy[];
  artifacts: MonthlyArtifact[];
  audit: {
    title: string;
    titleEn: string;
    summary: string;
    summaryEn: string;
    comparison: {
      dimension: string;
      dimensionEn: string;
      recommendation: string;
      recommendationEn: string;
      tradeoff: string;
      tradeoffEn: string;
    }[];
    goldenRule: string;
    goldenRuleEn: string;
  };
};

export const MONTHLY_ISSUES: MonthlyIssue[] = [
  {
    slug: "2026-09",
    volume: 1,
    month: "2026.09",
    date: "2026-09-01",
    title: "泛 Builder 时代：从敲代码到放大个人终极杠杆",
    titleEn: "The Universal Builder Era: From Code to Ultimate Personal Leverage",
    subtitle: "AI 不是让你写更多代码，而是让你成为自己业务与认知的全局指挥官",
    subtitleEn: "AI is not about writing more code; it is about becoming the executive commander of your own business and cognition.",
    lede: "在旧叙事里，Builder 属于能打开终端配置环境的少数极客；在 K3 与 Agent 时代，任何运用智能模型极速学习、对抗性思考、组装无代码流、完成业务转型的个体，都是无可争议的 Universal Builder。",
    ledeEn: "In the old narrative, a builder was a niche developer in a terminal. In the K3 and agent era, anyone leveraging intelligence to accelerate learning, dialectic thinking, workflow automation, and career transformation is a true Universal Builder.",
    paradigmShift: {
      title: "从「代码工人」到「智能调度者」的心智范式转移",
      titleEn: "Paradigm Shift: From Code Worker to Intelligence Orchestrator",
      content: [
        "过去两年，绝大多数人把 AI 当作「搜索引擎的升级版」或「代码补全的副驾驶」。这种用法依然停留在人作为执行主体的旧逻辑里：你给一句指令，它吐一段字，你再手工修修补补。",
        "K3 与长上下文 Agent 栈带来的最大颠覆，是把「人」从具体的代码实现与文本苦工中抽离出来。真正的瓶颈不再是『怎么把逻辑翻译成代码』，而是『你能不能精确定义现实世界的复杂问题、设定不可妥协的边界，并设计出容错的工作流』。",
        "AI 时代的 Builder 具备五个核心层级：用 AI 极速穿透陌生学科（学习）、用 AI 展开红蓝军对抗与反向挑刺（思考）、用自然语言和 Agent 组装成品（构建）、用一人公司商业闭环重塑个人生产力（转型），以及用智能杠杆解决现实高阶决策（协同一切）。",
      ],
      contentEn: [
        "Over the past two years, most users treated AI as a faster search engine or an autocomplete copilot. This remains anchored in the old human-as-executor mental model.",
        "The K3 and agent stack decouples humans from low-level syntax and brute-force text work. The bottleneck is no longer translating ideas to code, but framing problems, enforcing constraints, and orchestrating robust workflows.",
        "Universal Builders operate across five dimensions: Learn (rapid cross-domain mastery), Think (adversarial debate and dialectics), Build (shipping artifacts without code), Transform (solopreneur workflow restructuring), and Everything (mastering real-world complex decisions).",
      ],
      keyInsights: [
        {
          title: "问题定义力重于代码书写力",
          titleEn: "Problem Framing Outweighs Syntax",
          desc: "能把需求、输入条件与异常边界说清的人，更容易让 Agent 一次交付可用产物；具体提速幅度应在自己的任务上计时验证。",
          descEn: "People who define requirements, inputs, and edge constraints clearly are more likely to get usable agent deliverables; measure any speedup on your own tasks.",
        },
        {
          title: "从 Prompt Engineering 到 Context & Spec Engineering",
          titleEn: "From Prompt to Spec Engineering",
          desc: "单句咒语已经失效。现在的核心技术是提供结构化背景（Context）、分步推演路径、验收断言（Assertions）与负向禁令（Negative Constraints）。",
          descEn: "One-liner magic prompts are obsolete. Mastery lies in clean contextual scaffolding, phased reasoning, and verifiable assertions.",
        },
        {
          title: "一人即公司（The One-Person Enterprise）",
          titleEn: "The One-Person Enterprise",
          desc: "一个掌握 Agent 全栈的独立个体，可以组合研究、架构、文案与分析能力，但仍需对事实、专业判断和最终交付负责。",
          descEn: "An operator fluent in agent workflows can combine research, architecture, copy, and analysis while remaining accountable for facts, judgment, and delivery.",
        },
      ],
    },
    caseStudies: [
      {
        id: "case-01",
        tag: "情景示例 · 用 AI 转型 & 构建",
        tagEn: "Hypothetical case · Transform & Build",
        title: "独立咨询顾问：把行业初报与动态看板串成一条交付流",
        titleEn: "Independent Consultant: Connecting Industry Research and a Live Dashboard",
        role: "独立产业经济顾问（非程序员背景）",
        roleEn: "Independent Industry Analyst (Non-coder)",
        challenge: "在这个情景里，顾问需要检索多份行业年报与券商研报，汇总核心数据并绘制交叉图表；人工复制与排版占用了本可用于核验和分析的时间。",
        challengeEn: "In this scenario, a consultant must review annual reports and broker research, reconcile data, and build charts; manual copying and layout crowd out verification and analysis.",
        solution: "使用 Kimi Deep Research 配合结构化大纲生成带事实出处的论点链；再交由 Kimi Agent 模式输出包含可交互图表的单页 HTML 报告与关键风险摘要。",
        solutionEn: "Use Kimi Deep Research to build a sourced chain of claims, then ask Kimi Agent to compile an interactive HTML report and risk summary.",
        takeaways: [
          "不再从零写字，改为扮演『首席总编辑』：初审材料、抽查出处并设定验收红线。",
          "这条流程的价值应通过实际交付时长、返工次数和错误率验证，而不是预设一个固定提速倍数。",
        ],
        takeawaysEn: [
          "Move from drafting everything to acting as editor-in-chief: review sources, spot-check citations, and set acceptance criteria.",
          "Evaluate the workflow through delivery time, rework, and error rates rather than assuming a fixed speedup.",
        ],
      },
      {
        id: "case-02",
        tag: "情景示例 · 用 AI 学习 & 思考",
        tagEn: "Hypothetical case · Learn & Think",
        title: "文科产品经理：用苏格拉底提问与红蓝军演练补齐技术判断",
        titleEn: "Non-Technical PM: Building Technical Judgment through Socratic Red Teaming",
        role: "B 端供应链产品经理（文科背景）",
        roleEn: "Enterprise Product Manager (Humanities background)",
        challenge: "在这个情景里，产品经理需要与研发团队讨论分布式账本和一致性协议，却难以判断技术方案的成本、风险与工期是否合理。",
        challengeEn: "In this scenario, a product manager must discuss distributed ledgers and consensus protocols with engineers but lacks the technical grounding to assess cost, risk, and schedules.",
        solution: "利用 Kimi K3 开启 Thinking 模式，设定为『严格的苏格拉底计算机科学教授』。不直接给概念定义，而是通过反问、场景推演与极端边界测试引导自己建立思维模型；随后让 AI 扮演刁钻的架构师对自己的方案进行红蓝对抗挑刺。",
        solutionEn: "Use Kimi K3 in Thinking mode as a strict Socratic CS professor, building a mental model through questions and edge cases before red-teaming the proposal.",
        takeaways: [
          "把学习从被动阅读改成主动复述、反例测试与方案辩护，AI 负责追问，人负责理解和判断。",
          "评审前进行多轮 AI 挑刺可以暴露盲区，但是否降低上线风险仍要由真实评审与上线结果验证。",
        ],
        takeawaysEn: [
          "Turn passive reading into active recall, counterexamples, and proposal defense; AI asks questions while the human builds judgment.",
          "Red-teaming before review can expose blind spots, but any reduction in production risk must be validated by real reviews and outcomes.",
        ],
      },
      {
        id: "case-03",
        tag: "情景示例 · 用 AI 协同一切",
        tagEn: "Hypothetical case · AI for Everything",
        title: "跨境电商团队：用 Agent Swarm 汇总多家竞品动态",
        titleEn: "Cross-border E-commerce: Aggregating Competitor Updates with Agent Swarm",
        role: "出海电商品牌负责人",
        roleEn: "E-commerce Brand Director",
        challenge: "在这个情景里，竞品分布在不同国家和站点，价格、促销与差评持续变化，人工巡检难以保持一致频率和统一记录格式。",
        challengeEn: "In this scenario, competitors operate across regions and storefronts, making manual checks of prices, promotions, and reviews inconsistent and hard to compare.",
        solution: "将巡检任务切分成标准子任务包，在 Kimi Agent Swarm 中并发派遣子 Agent 分头抓取各品牌公开评论与活动页，归纳共性痛点后汇总输出每日早报。",
        solutionEn: "Split monitoring into standardized subtasks for Kimi Agent Swarm, collect public reviews and campaign pages in parallel, and aggregate a consistent daily brief.",
        takeaways: [
          "Swarm 适合边界清楚、彼此独立的多来源任务；每个子任务都应限定来源、日期与输出结构。",
          "把并行结果与人工基线比较覆盖率、误报和实际耗时，再决定是否扩大监控范围。",
        ],
        takeawaysEn: [
          "Swarms fit independent, well-bounded multi-source tasks; constrain each subtask by source, date, and output schema.",
          "Compare coverage, false positives, and elapsed time against a manual baseline before expanding the monitoring scope.",
        ],
      },
    ],
    artifacts: [
      {
        id: "artifact-learn",
        category: "学习",
        categoryEn: "Learn",
        title: "苏格拉底式极速跨学科精通链（Socratic Mastery Prompt）",
        titleEn: "Socratic Mastery Prompt Chain",
        bestMode: "Thinking",
        description: "拒绝死记硬背。让 Kimi 扮演严谨的苏格拉底导师，通过渐进式提问与反例测试，在 1 小时内透彻理解任何复杂的全新学科或技术概念。",
        descriptionEn: "Reject passive cramming. Turn Kimi into a demanding Socratic coach who guides your conceptual breakthrough through guided questions and counterexamples.",
        prompt: `你现在是世界顶尖的跨学科认知教练兼苏格拉底学者。我的目标是透彻理解【输入你要学习的复杂主题/技术概念】的核心机制，并能向没有任何专业背景的人解释清楚。

请遵守以下教学协议：
1. 不要一上来就输出整段教科书式的定义或长篇大论。
2. 请用一个极具启发性的现实生活物理比喻作为切入点，引出该主题试图解决的核心矛盾。
3. 每次对话只向我提出一个递进式的问题，等待我的回答。
4. 如果我的理解有偏差或含糊，请给出反例或极端情况进行挑刺（Socratic Irony），逼迫我修正逻辑漏洞。
5. 只有当我通过了三层递进验证后，才进入下一个子模块，并在最后让我用费曼法进行综合复述。

现在请开始：用第一个生活比喻和你的第一道问题迎接我。`,
      },
      {
        id: "artifact-think",
        category: "思考",
        categoryEn: "Think",
        title: "商业与重大决策红蓝军对抗推演（Red Teaming Decision Sparring）",
        titleEn: "Adversarial Red-Team Decision Sparring",
        bestMode: "Thinking",
        description: "在做重要商业、产品或个人职业抉择前，用严苛的对抗视角排查所有幸存者偏差与隐蔽风险，防患于未然。",
        descriptionEn: "Stress-test critical business, product, or career decisions against brutal adversarial scrutiny before execution.",
        prompt: `你现在是我最严苛、最洞察人性的战略顾问兼红队指挥官（Red Teamer）。我即将做出一个重大决定，需要你在我出发前把方案彻底撕碎，找出所有致命漏洞。

我的决策与计划如下：
【详细输入你的背景、目标、具体行动方案、预期收益与你认为可能存在的风险】

请分三步对我发起冷酷审查：
第一步【预检死亡（Pre-mortem）】：假定这个计划在 12 个月后彻底崩盘、所有资源消耗殆尽。请列出最可能导致这一惨剧的 3 个隐蔽原因（排除不可抗力，专注于我假设错误或盲目乐观的地方）。
第二步【二阶效应与反常识挑战】：我的计划中，哪一个核心假设最经不起逻辑推敲？如果竞争对手或利益相关方采取非理性反制，我的脆弱点在哪里？
第三步【红线加固与最小验证】：不要泛泛而谈建议。给我设计一个「成本不超过现有 5%、耗时不超过 7 天」的最小真实压力测试，证明我的核心假设是否成立。`,
      },
      {
        id: "artifact-build",
        category: "构建",
        categoryEn: "Build",
        title: "自然语言成品交付指令模板（Artifact Ship Spec）",
        titleEn: "Natural Language Artifact Ship Spec",
        bestMode: "Agent",
        description: "让 Kimi Agent 模式不再产生半成品或跑偏。通过标准的前置验收规约，直接获得排版精美、逻辑闭环的高质量报告、网页或演示。",
        descriptionEn: "Force Kimi Agent to ship complete, polished deliverables by front-loading acceptance criteria and negative constraints.",
        prompt: `请以资深全栈系统架构师与交付总监的标准，为我交付一份完整的【成品类型：如交互式行业分析单页 HTML / 战略汇报 PPT / 多维财务模型】。

【目标主题】：【填写具体要完成的事项】
【核心输入材料与硬性事实】：【粘贴必要背景、数据、不可更改的数据底稿】

【不可妥协的交付标准】：
1. 完整性：禁止提供「待填充占位符」、「TODO」或伪代码。必须是开箱即用、内容丰满的完整成品。
2. 边界红线：文中所有关键论断与数值，必须严格限制在我给出的材料范围内，严禁幻觉脑补。
3. 审美规范：排版采用现代极简设计语言，层次分明，重要对比使用表格呈现，核心指标必须有高亮卡片。
4. 交付形式：直接输出完整的代码或文档文件，并在开头提供 3 句话的核心执行摘要（Executive Summary）。`,
      },
      {
        id: "artifact-transform",
        category: "转型",
        categoryEn: "Transform",
        title: "超级个体职业杠杆审计（Solopreneur Leverage Audit）",
        titleEn: "Solopreneur Leverage & Workflow Audit",
        bestMode: "Deep Research",
        description: "梳理你日常工作中 80% 的机械劳动，设计 Agent 托管闭环，把个人时间全部释放给高价值战略与人际连接。",
        descriptionEn: "Audit and automate 80% of repetitive workflows to liberate time for high-leverage strategic creation.",
        prompt: `你是一位专注于「超级个体转型与高杠杆生产力重塑」的商业教练。我希望在不增加团队成员的前提下，将我个人的业务产能提升 5 倍，完成从时间出售者到杠杆拥有者的跃迁。

【我的当前职业/业务角色】：【填写你的行业与岗位】
【我每周花费时间最多的 5 项重复性任务】：【详细列举具体事务与耗时】
【我的核心专业壁垒与最热爱的事】：【填写你的不可替代优势】

请为我制定一份切实的「AI 杠杆置换战略」：
1. 任务剥离矩阵：将我上述 5 项任务按「完全可交给 Agent 托管」、「需人机协同」、「必须由我亲力亲为」三档分类。
2. 自动化工具链设计：针对完全可托管的任务，用现有的 Kimi 工具栈（Chat / Agent / Deep Research / Swarm / API）给出具体的串联方案。
3. 个人商业护城河加固：释放出的 50% 时间，我应该如何构建专属于我个人的数字化知识资产或专有 Agent？给出 90 天行动路线图。`,
      },
    ],
    audit: {
      title: "本月工具与功能取舍实测审计",
      titleEn: "Monthly No-Hype Tool Audit & Trade-off Assessment",
      summary: "拒绝炒作。把真金白银花在哪一档、什么场景坚决不开思考、什么时候别上 Agent，算清账再动手。",
      summaryEn: "No hype, just economics. Understand exact tier allocations, when to disable thinking mode, and when to avoid agent overhead.",
      comparison: [
        {
          dimension: "K3 思考模式 vs Instant 极速模式",
          dimensionEn: "K3 Thinking vs Instant Mode",
          recommendation: "写方案、算账、拆逻辑坚决开 Thinking；查定义、修错字、格式转换坚决关 Thinking 走 Instant。",
          recommendationEn: "Thinking mode for reasoning, math, and strategy; Instant mode for definitions, proofreading, and format conversion.",
          tradeoff: "Thinking 模式耗时 30-90 秒且消耗更多 Token 额度；拿它问常识属于用牛刀杀鸡。",
          tradeoffEn: "Thinking mode adds 30-90s latency and heavier token burn; using it for trivial lookups is pure waste.",
        },
        {
          dimension: "单 Agent 交付 vs Swarm 集群并发",
          dimensionEn: "Single Agent vs Swarm Cluster",
          recommendation: "单件产物（如一份报告、一个网页）走 Agent；横向 20+ 份跨行业/跨品类调研走 Swarm。",
          recommendationEn: "Single Agent for dedicated artifacts (report, webpage); Swarm for 20+ parallel cross-domain research jobs.",
          tradeoff: "Swarm 会快速消耗 Moderato/Allegretto 的集群次数额度；非并行的连贯任务强上 Swarm 会产生逻辑断层。",
          tradeoffEn: "Swarms quickly burn quota; using swarms for sequential tasks causes fragmentation.",
        },
        {
          dimension: "Deep Research vs 普通对话检索",
          dimensionEn: "Deep Research vs Standard Web Search",
          recommendation: "需要拿结论做正式商业汇报、要求每条论点挂出处链接时走 Deep Research；日常搜资料普通对话即刻解决。",
          recommendationEn: "Deep Research when conclusions require verifiable source links for stakeholders; standard search for quick facts.",
          tradeoff: "Deep Research 每次耗时 10-25 分钟，心急等待体验差；务必将需求写深后再启动。",
          tradeoffEn: "Deep Research takes 10-25 min per run; front-load comprehensive requirements before triggering.",
        },
      ],
      goldenRule: "挑能办成事的最低档位，更高的档位不等于更好的产出；先说清验收标准，再把活放给 Agent。",
      goldenRuleEn: "Pick the lowest tier that completes the job. Higher tiers do not guarantee better results. Clarify acceptance criteria before launching agents.",
    },
  },
];

export function getAllMonthlyIssues(): MonthlyIssue[] {
  return [...MONTHLY_ISSUES].sort((a, b) => b.date.localeCompare(a.date));
}

/** Newest first via the SORTED list — an issue appended to the array's
    end must never leave /monthly stuck on the previous one. */
export function getLatestMonthlyIssue(): MonthlyIssue {
  return getAllMonthlyIssues()[0];
}

export function getMonthlyIssue(slug: string): MonthlyIssue | undefined {
  return MONTHLY_ISSUES.find((issue) => issue.slug === slug);
}
