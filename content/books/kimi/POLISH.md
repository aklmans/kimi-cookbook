# Kimi 书 · 出版级完善清单（你亲手操作的部分）

这本书在「准确 + 结构 + 配图（概念图）」上已到位。要把它从 **doc-grade（据文档写）** 抬到
**experience-grade（亲手用过写）**，剩下的活只有你能做——都需要真账号 / 真操作。下面逐项给你
怎么做、产物放哪、怎么落进书里。每条都标了对应章节和可直接粘贴的代码。

> 已经帮你做完、无需动手的：定位重写、一手数据核实、3 张概念 SVG、四章嵌入可复制 prompt、
> 实战速查章、一轮精修。下面是**只有真账号能补**的最后一截。

---

## 〇、先扫一眼那 3 张概念图（现已是随主题的内联组件）

3 张概念图现在是**内联 SVG 组件**（`components/mdx/diagrams.tsx` 里的 KimiStackDiagram / KimiModesDiagram / KimiSwarmDiagram），用 CSS 变量上色，**深色 / 浅色自动跟随、也能正确打印**（旧的外挂 `.svg` 做不到，已删）：

| 组件 | 章节 | 画的是 |
| --- | --- | --- |
| `<KimiStackDiagram/>` | ch2 全景 | 栈映射到 OpenAI/Anthropic + 开源底 |
| `<KimiModesDiagram/>` | ch4 四模式 | Instant→Thinking→Agent→Swarm 阶梯 |
| `<KimiSwarmDiagram/>` | ch6 大活 | 一任务扇出到 ~300 子 agent 再归并 |

👉 **请在 `npm run dev` 或线上扫一眼这 3 张**（浅色 + 深色各看一眼），间距 / 字号 / 配色觉得哪不对告诉我，我直接改组件里的 SVG。

---

## 一、补 UI 截图（概念图已就位，这里是要你截的真图）

流程每张都一样：**① 截图 → ② 存到指定路径（裁 16:9）→ ③ 把下面给好的 `<Figure>` 粘到指定位置**。
放完 `npm run build`，占位即变真图、点击能放大。**截前确认图里没有你的 key / 私人信息。**

### 1. Agent 出的成品 —— ch5 `chapters/05-agent.mdx`
- **截什么**：在 Kimi Agent 里用书里那段 PPT brief 跑一次，截「成品页 + 可导出」的那一屏。
- **存为**：`public/books/kimi/05-agent-deck.png`
- **粘在哪**：`model="Kimi · Agent"` 那个 `<PromptBox>` 之后。
- **粘这段**：
  ```mdx
  <Figure
    label={<T zh="截图 · Agent 交回的成品" />}
    caption={<T zh="同一段 brief, Agent 直接交回一份排好版、可导出的件 —— 不是一段还要你自己做的文字。" />}
    ratio="16 / 9"
    src="/books/kimi/05-agent-deck.png"
    alt="Kimi Agent 生成的 PPT 成品页"
  />
  ```

### 2. Deep Research 报告 —— ch7 `chapters/07-research.mdx`
- **截什么**：用书里那段调研 prompt 跑一次，截「带目录 + 每条结论挂出处」的报告头屏。
- **存为**：`public/books/kimi/07-research-report.png`
- **粘在哪**：`model="Kimi · Deep Research"` 那个 `<PromptBox>` 之后。
- **粘这段**：
  ```mdx
  <Figure
    label={<T zh="截图 · 带出处的研究报告" />}
    caption={<T zh="分章节、每条关键结论都挂着来源和日期 —— 这是它和「联网搜一下」的分水岭。" />}
    ratio="16 / 9"
    src="/books/kimi/07-research-report.png"
    alt="Kimi Deep Research 生成的带出处长报告"
  />
  ```

### 3. Kimi Code 终端循环 —— ch8 `chapters/08-code.mdx`
- **截什么**：终端里让 Kimi Code 做一个跨文件改动、并跑测试，截那几行「读文件 / 跑命令 / 改动」。
- **存为**：`public/books/kimi/08-kimi-code-terminal.png`
- **粘在哪**：`model="kimi-k2.7-code"` 那个 `<PromptBox>` 之后。
- **粘这段**：
  ```mdx
  <Figure
    label={<T zh="截图 · Kimi Code 的终端循环" />}
    caption={<T zh="它在你的项目目录里直接读文件、跑命令、提改动 —— 一个完整的「改、跑、看、再改」循环。" />}
    ratio="16 / 9"
    src="/books/kimi/08-kimi-code-terminal.png"
    alt="终端里 Kimi Code 改多文件并跑测试"
  />
  ```

### （可选）4. Agent Swarm 进度屏 —— ch6 / 5. 输入框模式选择器 —— ch4
有就更好，没有也不影响。要加按上面同样的格式，存 `public/books/kimi/06-swarm-run.png` /
`04-mode-switcher.png`，`<Figure>` 仿写即可。

---

## 二、把 4 个「最佳实践 prompt」用真任务打磨

书里 4 个 `<PromptBox>` 是我**设计**的模板，没经真任务验证。请各跑一次，把实际更好用的措辞回填
（重点记：哪句让它更听话、哪句多余、漏了什么约束）：

| 章节 | PromptBox | 跑一遍验证 |
| --- | --- | --- |
| ch5 | PPT brief | 「验收标准前置」是否真减少返工？ |
| ch6 | Swarm 盘点 | 「框成可并行 + 标来源」它照做了吗？ |
| ch7 | Deep Research 调研 | 「标来源+日期」「区分宣传/实测」可落实？ |
| ch8 | 改代码 brief | 「先报方案再动手」它真先停下来了吗？ |

跑顺的版本：直接改对应 `.mdx` 里 `<PromptBox>` 的 `text`，或发我替你改。

---

## 三、把「用出来的质感」补进每章（只有你能补）

跑每一面时，记下这些**用过才知道**的点，发我，我补进各章的 `<Callout>`：
- **真实延迟**：Deep Research / Swarm 实际跑多久？Agent 出一份 PPT 多久？
- **一次到位率**：Agent / Kimi Code 一次做对的比例、你返工了几次？
- **踩的坑 / 报错**：哪一面有反直觉的坑、固定会犯的错？
- **额度感受**：Swarm 一次大概吃掉多少、五档够不够你用？

这一截是 doc-grade → experience-grade 的关键：现在书里的判断是「推理」出来的，你补的是「用」出来的。

---

## 四、数据保鲜（每季度回看一次）

书里所有数字标了「截至 2026-07」，一手来源：`kimi.com` / `platform.kimi.com` / Hugging Face。
Kimi 月月迭代，回看时重点核这几样，变了改 `meta.ts` + 对应章（或发我）：
- API 价（ch3 / ch9 那张表）、会员价与各档额度（ch9 / 帮助中心；注意已改共享 token 额度池，Kimi Code 为单独池，且官方预告会员与 Kimi Code 权益将拆分、未上线）；
- Agent Swarm 子 agent 上限与步数（ch6，现 ~300 / 4000+，已由 K3 驱动、Moderato 档起 25 次）；
- 当前旗舰 / 编码模型名（现 K3 / K2.7-Code；K3 权重官方承诺 2026-07-27 前放出，协议随技术报告）；
- Kimi Claw 形态与默认模型（入口已迁 /bot，本体页面已无 Beta 标记、新形态 Claw 群聊标 Preview；默认模型官方两页说法不一：/bot 写 K2.6 Thinking、资源页写 K3）。

---

## 五、（可选）自定义封面

现在用的是 `@lobehub/icons` 的 Kimi 标志 fallback 封面（`BookCoverLogo.tsx` 里的 kimi 分支，
完全能上线）。想要专属封面：放 `public/books/kimi/cover.jpg`（竖版，约 3:4），`meta.ts` 里
`cover` 已指向它，build 会自动启用。

---

## 放完自检

- [ ] 扫过 3 张概念 SVG，确认或反馈要改的地方
- [ ] 3 张真截图就位、对应 `<Figure>` 已粘、点击能放大
- [ ] 4 个 prompt 各跑过、把更顺的措辞回填
- [ ] 把延迟 / 一次到位率 / 坑 发我补进 Callout
- [ ] `npm test` && `npm run lint` && `npx tsc --noEmit` && `npm run build` 全过
- [ ] 截图里没泄露 key / 私人信息

> 做完这几项，它就从「准确好读的指南」真正变成「亲手用过的实战书」。其余的判断与结构，前面十章已经给齐。
