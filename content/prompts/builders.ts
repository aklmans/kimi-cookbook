export type BuilderPrompt = {
  id: string;
  category: "学习" | "思考" | "构建" | "转型" | "综合";
  categoryEn: "Learn" | "Think" | "Build" | "Transform" | "All";
  title: string;
  titleEn: string;
  bestMode: "Thinking" | "Agent" | "Deep Research" | "Instant";
  description: string;
  descriptionEn: string;
  model: string;
  prompt: string;
  example?: string;
};

export const BUILDER_PROMPTS: BuilderPrompt[] = [
  {
    id: "artifact-learn",
    category: "学习",
    categoryEn: "Learn",
    title: "苏格拉底式极速跨学科精通链（Socratic Mastery Prompt）",
    titleEn: "Socratic Mastery Prompt Chain",
    bestMode: "Thinking",
    description: "拒绝死记硬背。让 Kimi 扮演严谨的苏格拉底导师，通过渐进式提问与反例测试，在 1 小时内透彻理解任何复杂的全新学科或技术概念。",
    descriptionEn: "Reject passive cramming. Turn Kimi into a demanding Socratic coach who guides your conceptual breakthrough through guided questions and counterexamples.",
    model: "Kimi · Thinking",
    prompt: `你现在是顶尖的跨学科认知教练兼苏格拉底学者。我的目标是透彻理解【主题: <要学习的核心概念>】的核心机制, 并能向小白解释清楚。

【教学规则】
1. 不要一上来输出教科书式定义或长篇大论。
2. 用一个生活比喻切入, 引出该概念试图解决的根本矛盾。
3. 每次只向我抛出一个递进式问题, 等我回答。
4. 如果我理解有偏差, 给出反例或极端边界进行挑刺(Socratic Irony), 逼我修正漏洞。
5. 连续通过三层逻辑验证后, 再进入下一阶。

请用第一个比喻和第一道问题开始。`,
    example: `你现在是顶尖的跨学科认知教练兼苏格拉底学者。我的目标是透彻理解【主题: 分布式共识算法 Paxos 与 Raft 的核心差异】的核心机制, 并能向小白解释清楚。

【教学规则】
1. 不要一上来输出教科书式定义或长篇大论。
2. 用一个生活比喻切入, 引出该概念试图解决的根本矛盾。
3. 每次只向我抛出一个递进式问题, 等我回答。
4. 如果我理解有偏差, 给出反例或极端边界进行挑刺(Socratic Irony), 逼我修正漏洞。
5. 连续通过三层逻辑验证后, 再进入下一阶。

请用第一个比喻和第一道问题开始。`,
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
    model: "Kimi · Thinking",
    prompt: `你现在是我最严苛的战略顾问兼红队指挥官(Red Teamer)。我即将做出一个重大决定, 请在出发前彻底撕碎我的方案, 挑出所有致命漏洞。

【我的方案】
目标与背景: <背景说明>
具体行动路线: <步骤与资源投放>
预期收益: <预期成果>

【请按三步审查】
1. 预检死亡(Pre-mortem): 假设 12 个月后该计划彻底崩盘。列出 3 个最可能导致惨剧的隐蔽隐患(排除天灾, 聚焦于我的假设盲区)。
2. 二阶效应挑战: 哪条假设最经不起推敲？若利益相关方非理性反制, 我的软肋在哪？
3. 最小验证: 给出一个成本低于现有 5%、耗时不超过 7 天的真实压力测试方案。`,
    example: `你现在是我最严苛的战略顾问兼红队指挥官(Red Teamer)。我即将做出一个重大决定, 请在出发前彻底撕碎我的方案, 挑出所有致命漏洞。

【我的方案】
目标与背景: 我是一名有 6 年经验的资深后端研发, 计划辞职创立针对出海独立开发者的微型自动化税务合规 SaaS。
具体行动路线: 前 3 个月全职开发 MVP, 接入 Stripe 与各地区税率 API; 第 4 个月在 Product Hunt 与 X 发布。
预期收益: 半年内积累 50 位年费 $299 的付费用户。

【请按三步审查】
1. 预检死亡(Pre-mortem): 假设 12 个月后该计划彻底崩盘。列出 3 个最可能导致惨剧的隐蔽隐患(排除天灾, 聚焦于我的假设盲区)。
2. 二阶效应挑战: 哪条假设最经不起推敲？若利益相关方非理性反制, 我的软肋在哪？
3. 最小验证: 给出一个成本低于现有 5%、耗时不超过 7 天的真实压力测试方案。`,
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
    model: "Kimi · Agent",
    prompt: `请以资深全栈系统架构师的标准, 为我交付一份完整的【成品类型: <可交互单页 HTML / 专业报告 / 演示材料>】。

【主题与目标】<任务说明>
【底稿与关键数据】<粘贴客观事实与数据表>

【硬性交付验收标准】
1. 严禁使用「TODO」、「占位符」或未完成逻辑; 必须是内容丰满的完整成品。
2. 文中所有数字与事实严格出自我的底稿, 不得脑补幻觉。
3. 排版采用现代极简美学, 重点结论必须有对比表格与高亮数据卡。
4. 直接输出成品源码或文档, 并在开头附 3 句话执行摘要。`,
    example: `请以资深全栈系统架构师的标准, 为我交付一份完整的【成品类型: 包含交互式筛选与趋势可视化的单页财务仪表盘 HTML】。

【主题与目标】根据过去四个季度的多渠道投放数据, 交付一份能直接在浏览器打开的投产比(ROI)复盘看板。
【底稿与关键数据】Q1-Q4 总投放 240 万; 搜索渠道 ROI 2.8, 信息流 ROI 1.4, 达人合作 ROI 3.6; 下半年达人渠道获客成本上升 35%。

【硬性交付验收标准】
1. 严禁使用「TODO」、「占位符」或未完成逻辑; 必须是内容丰满的完整成品。
2. 文中所有数字与事实严格出自我的底稿, 不得脑补幻觉。
3. 排版采用现代极简美学, 重点结论必须有对比表格与高亮数据卡。
4. 直接输出成品源码或文档, 并在开头附 3 句话执行摘要。`,
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
    model: "Kimi · Deep Research",
    prompt: `你是一位专注于「超级个体转型与高杠杆生产力重塑」的商业教练。我希望在不增加团队成员的前提下，将我个人的业务产能提升 5 倍，完成从时间出售者到杠杆拥有者的跃迁。

【我的当前职业/业务角色】：【填写你的行业与岗位】
【我每周花费时间最多的 5 项重复性任务】：【详细列举具体事务与耗时】
【我的核心专业壁垒与最热爱的事】：【填写你的不可替代优势】

请为我制定一份切实的「AI 杠杆置换战略」：
1. 任务剥离矩阵：将我上述 5 项任务按「完全可交给 Agent 托管」、「需人机协同」、「必须由我亲力亲为」三档分类。
2. 自动化工具链设计：针对完全可托管的任务，用现有的 Kimi 工具栈（Chat / Agent / Deep Research / Swarm / API）给出具体的串联方案。
3. 个人商业护城河加固：释放出的 50% 时间，我应该如何构建专属于我个人的数字化知识资产或专有 Agent？给出 90 天行动路线图。`,
  },
];

export function getBuilderPrompt(id: string): BuilderPrompt {
  const prompt = BUILDER_PROMPTS.find((item) => item.id === id);
  if (!prompt) throw new Error(`Unknown Builder prompt: ${id}`);
  return prompt;
}
