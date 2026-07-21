# Contributing · 参与共建这本书

《Kimi · 从长文本到一套 agent 栈》是一本**一个付费用户写给其他付费用户**
的书。欢迎三类共建,门槛从低到高:

## ① 内容纠错 / 数据保鲜(Issues)

书里全是具体数字:价格、额度、上下文、版本号、错误码。它们会变。
发现过时或写错,请开 Issue 并附**证据链接**(官网/文档/公告),
我们按「截至 YYYY-MM」的口径修。模板:**数据过期**。

## ② 案例投稿(Issues)

你的真实用法比任何虚构案例都值钱。什么活、用什么面、花了多少、
值不值 —— 开 Issue 讲清楚,合适的会写进书里(署名可选)。模板:**案例投稿**。

## ③ 直接改字(Pull Requests)

改书即写作,写作有标准。提 PR 前请确保:

- **读过 [content/books/kimi/EDITOR-PROMPT.md](./content/books/kimi/EDITOR-PROMPT.md)** ——
  全书的编辑标准(语气、禁语、标点、组件词汇);
- **声线**:第一人称(「我」的观察/算账/判断),指令句留给「你」;
  不虚构作者经历;
- **数据纪律**:每个关键事实带一手来源 + 「截至 YYYY-MM」;
  不新增无来源数字,不改动既有 references 结构;
- **组件词汇**:只使用现有 MDX 组件(Cover / SectionTitle / H3 /
  Callout / PromptBox / CodeBlock / Steps / Checklist / Dl / Stats /
  PriceTable / Timeline / Tabs),不发明新写法;
- **无「免费」字样**(用「开源」「公开」),内引号用「」,
  半角逗号 + 空格,破折号 ——,中英之间留空;
- **门禁**:`npm test && npm run lint && npx tsc --noEmit && npm run build`
  全绿后再提。

**协议**:你的 PR 一经合并,即视为同意以 **CC BY-NC-SA 4.0** 授权该贡献
(署名 Zhaphar,同协议共享,非商业)。

**评审**:涉及 `content/books/**` 的 PR 一律由作者本人终审;
新章节、结构调整请先开 Issue 讨论,别直接写。

## 翻译

书的 en slot 目前是空的(zh-only)。想做英文版?开一个 Issue 先说,
我们对齐术语表再动手 —— 整章翻,别半章翻。
