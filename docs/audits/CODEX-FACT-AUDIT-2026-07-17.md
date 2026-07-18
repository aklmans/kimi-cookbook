# Codex 事实审校发现清单 · 2026-07-17

核验口径:本机 `codex-cli 0.144.5` 的实际帮助输出与 bundled model metadata;OpenAI Codex 官方手册、Help Center rate card / credits 文档;竞品官方定价页。严重度采用 `高 / 中 / 低 / 保留 / 待核`。`保留` 表示已核对且无需为了改而改;`待核` 表示事实受账号、灰度或组织策略影响,正文只能写成条件式,不押一个全局结论。

| 章节 | 原文说法 | 问题(错 / 旧 / 缺 / 无用) | 严重度 | 依据(实测 / 主源 / 待核) | 建议修法 |
| --- | --- | --- | --- | --- | --- |
| meta / 01 / 02 / 09 / 10 / 11 | Codex 是固定的「四面」:CLI、IDE、ChatGPT 应用、云端 | 错 / 旧。官方没有稳定的「四界面」产品分类;本地客户端、云端执行环境、GitHub / Slack 集成不是同一层级,且 GitHub 在正文里又成为第五个入口 | 高 | 主源:Codex manual 的 CLI、IDE、ChatGPT app、Cloud、GitHub integration 各页 | 去掉固定数量,改成「本地客户端、云端与 GitHub」;保留「入口跟着活走」这条编辑主线 |
| 01 | Codex 最大的样子是把一批活派上云并行跑 | 缺 / 旧。云端批量任务仍成立,但当前本地 app、CLI、IDE 已默认支持 subagents;并行不再是云端独占 | 高 | 主源:Subagents;实测:`/agent`、当前模型的 Ultra 能力 | 改成两种并行:单任务内 subagents 分工;任务间用 worktree / cloud 隔离并行 |
| 01 | ChatGPT 订阅包含 Codex,与其它 agentic 功能共用池 | 基本正确,但不同计划、企业旧计费与功能可用性有例外 | 保留 | 主源:Pricing、Credits、Codex rate card | 保留主句;用脚注与第 10 章限定「适用计划 / eligible accounts」 |
| 02 | `config.toml`、AGENTS.md、skills、MCP「走到哪跟到哪」 | 错。CLI、IDE、桌面 app 在同一台机器上共享本地配置与 MCP;云端 / GitHub 不读取你机器上的 `~/.codex/config.toml`;只有签入仓库的指令 / skills 才能随仓库走 | 高 | 主源:Config basics、MCP、Cloud environments、GitHub review | 明写边界;把「同一引擎」与「同一配置文件」拆开 |
| 02 | app 的 Local / Worktree / Cloud、Handoff | 当前准确 | 保留 | 主源:ChatGPT desktop app、Worktrees、Local environments、Handoffs | 保留,只把它放回「桌面 app 是调度台」而非第四面 |
| 02 | 只有 worktree / cloud 才能并行 | 缺。subagents 可在同一任务内并行,CLI 用 `/agent` 看 / 切线程;worktree / cloud 解决的是工作树或环境隔离 | 高 | 主源:Subagents、Worktrees | 新增「两种并行别混」,给读者选型规则 |
| 03 | npm / brew / install script;`codex login` 默认 ChatGPT 登录,API key 可选 | 当前准确 | 保留 | 实测:`codex --help`、`codex login --help`;主源:CLI install / auth | 保留 |
| 03 | 用 `/status` 确认登录的是订阅而非 API key | 错命令用途。`/status` 显示会话配置 / token 使用;认证状态的稳定命令是 `codex login status` | 中 | 实测:`codex login --help`;主源:Authentication | 把首次检查改成 `codex login status`;保留 `/status` 的会话用途 |
| 03 | `/plan`、`/diff`、`/compact`、`/fork`、`/side` / `/btw` 等 | 当前准确 | 保留 | 实测 TUI help;主源:Slash commands | 保留;不为罗列新增所有斜杠命令 |
| 04 | sandbox 与 approvals 是两只旋钮;Auto = workspace-write + on-request;默认断网、保护 `.git` 等 | 当前准确 | 保留 | 实测 CLI flags;主源:Security、Config reference | 保留 |
| 04 | macOS Seatbelt、Linux / WSL2 bubblewrap、Windows 原生沙箱 | 当前准确 | 保留 | 主源:Platform sandboxing | 保留 |
| 04 | `--full-auto` 仍可用 | 可用但已是兼容 / deprecated flag,不应写成推荐主路径 | 中 | 实测:`codex exec --full-auto --help`;主源:CLI reference | 保留其历史 / 快捷解释,明确首选显式 sandbox + approvals 或 Auto |
| 04 | `auto_review` 可替用户审越界请求,含连续 / 滚动拒绝阈值 | 当前准确,但能力可能受组织策略 / 可用性约束 | 待核 | 主源:Auto review;账号 / 组织策略决定是否出现 | 以「可用时」限定,不承诺所有账号必有 |
| 05 | AGENTS.md 全局、仓库根、子目录逐层叠加,「离被改文件最近的赢」 | 部分错。一次本地运行按项目根到**当前工作目录**加载一条链,越近 CWD 越后覆盖;GitHub review 才会按每个 changed file 找最近指令 | 高 | 主源:AGENTS.md、GitHub review;本仓库现行规则 | 改成 CWD 链,另点明 GitHub review 的 per-file 例外 |
| 05 | `config.toml` 管模型、沙箱、审批、MCP;三个本地客户端共用 | 当前准确,前提是同一台机器;项目 `.codex/config.toml` 还受 trust 约束 | 保留 | 主源:Config basics / reference | 保留并补足 same-host / trusted-project 边界 |
| 05 | Codex 有 Skills:`SKILL.md`、显式 `$name`、按描述隐式触发、渐进加载 | 当前准确,不是虚构功能 | 保留 | 主源:Agent Skills;实测:当前 Codex 的 skills catalog 与 `/skills` | 保留;强调 repo skill 要签入 `.agents/skills` 才能随项目走 |
| 05 | memories 不能替代显式规则 | 作为用法判断仍有价值;memory 默认 / 可用性可能因产品面不同 | 待核 | 主源:Memories;账号 / surface 可能不同 | 保留「规则写进文件」结论,避免断言所有用户一定有 / 没有 memory |
| 06 | Codex 作 MCP client;`codex mcp add`;stdio + Streamable HTTP;OAuth / bearer;逐工具审批 | 当前准确 | 保留 | 实测:`codex mcp --help`、`codex mcp add --help`;主源:MCP | 保留 |
| 06 | 只讲 Codex 接入别的 MCP server | 缺。Codex 也能以 `codex mcp-server` 对外提供服务;传输是 stdio,暴露 `codex` / `codex-reply` | 高 | 实测:`codex mcp-server --help`;主源:Codex as MCP server | 增补一个短节,并纠正用户题干里可能误写的 `codex mcp`:服务端命令有 `-server` |
| 06 | MCP 工具定义消耗上下文,少接能省量 | 方向正确;具体消耗随服务器工具 schema 变化 | 保留 | 主源:MCP / usage guidance | 保留,不要伪造固定 token 数 |
| 07 | cloud setup 阶段可联网;agent 阶段默认断网;secrets 只在 setup;缓存最长 12h;交回 diff / PR | 当前准确 | 保留 | 主源:Cloud environments、Internet access、Secrets | 保留 |
| 07 | 云端并行是 Codex 与同类拉开差距的独占能力 | 旧 / 过度营销。云端隔离任务仍重要,但本地 subagents / worktrees 也能并行;同类产品亦有 cloud agents | 高 | 主源:Subagents、Worktrees、Cloud;竞品官方页 | 把差异点改成「离机、可复现、隔离环境 + PR 交付」,不写排他比较 |
| 07 | `codex apply`、`codex cloud exec/list`、GitHub `@codex`、手机 Remote | 命令与形态当前准确;`codex cloud` / Remote 仍带 experimental / eligible-account 条件 | 待核 | 实测:`codex cloud --help`;主源:Cloud CLI、Remote | 命令保留;加 experimental / eligible 限定 |
| 08 | `codex exec` 非交互、JSONL、JSON Schema、默认只读;SDK;`openai/codex-action@v1` | 当前准确 | 保留 | 实测:`codex exec --help`;主源:Non-interactive、SDK、GitHub Action | 保留 |
| 08 | 本地 scheduled tasks 会按日程自己开工 | 缺关键前提:本地电脑必须开机且 ChatGPT app 在运行;web scheduled task 不能直接操作本地目录 | 高 | 主源:Scheduled tasks | 补上运行位置 / 在线前提,否则读者会把本地定时误当云端 cron |
| 08 | hooks 按哈希信任,在生命周期节点运行 | 当前准确 | 保留 | 主源:Hooks | 保留,把 hook 定位为前置 / 反馈层,测试 / CI 仍是最终门禁 |
| 09 | `/review` 使用独立 reviewer 且不修改代码;review pane 可逐 hunk;`@codex review` / automatic review 只报 P0 / P1 | 当前准确 | 保留 | 实测:`codex review --help`;主源:Local review、GitHub review | 保留 |
| 09 | OpenAI 的 PR 100% 经 Codex review | 官方当前仍这样表述 | 保留 | 主源:Codex review / OpenAI engineering material | 保留脚注;不外推成质量保证 |
| 10 | Plus 下 Sol 15–90、Terra 20–110、Luna 50–280 条 / 5 小时;Pro 整体 5× / 20×;本地云端共用 5 小时消息窗 | 旧且正在误导。2026-04 起多数个人 / 新企业账号改为与 API token 对齐的 credits;公开 rate card 不再给这组消息范围。少量旧 Enterprise 才保留 legacy per-message | 高 | 主源:Codex rate card(2026-07 更新)、Credits | 删除整组消息数字与共享窗口断言;改成 token-type × model 的 credits 表,同时注明 plan included usage 与 legacy 例外 |
| 10 | Free / Go / Plus / Pro / Business / Enterprise & Edu 包含 Codex;Pro 有 5× / 20× | 当前计划结构准确;具体权限、促销与 rollout 会变 | 保留 | 主源:Pricing | 保留价格与相对档位,标日期;不要推导固定消息条数 |
| 10 | Sol / Terra / Luna 分工;Power 默认 Sol + medium;Max / Ultra;cloud model 不可改 | 当前准确;`gpt-5.3-codex` 对 ChatGPT 登录已弃用,但 code review 仍使用它,需避免写成全产品消失 | 中 | 实测 bundled models;主源:Models、rate card | 保留三模型与档位;补一句 review 例外,避免「deprecated」误读 |
| 10 | fast mode 约快 1.5×、消耗 2.5× credits | 当前准确,必须明确分母是同一 GPT-5.6 standard mode,且速度是官方平均 | 保留 | 主源:Fast mode | 保留并写清变化百分比 / 比较基准 |
| 10 | credits 是「额度墙后的续用」,三堵墙里只有额度墙花钱 | 过时 / 过度简化。eligible Plus / Pro 可在 included usage 后买 credits;fast mode 本身也提高 credit 消耗;同一 credits pool 还可能跨支持的 agentic 功能 | 高 | 主源:Credits、rate card | 重写消费顺序与共享池;不再说「只有额度墙」 |
| 10 | Copilot 只有 Pro+ / Max 才可转派给 Codex / Claude | 复核后确认原说法正确。官方 plans 页顶部 Pro 摘要笼统写「Access to 3rd party agents」,但详细对比表的「Delegate tasks to third-party coding agents like Claude… and OpenAI Codex」逐栏明确为 Pro:Not included、Pro+:Included、Max:Included;另一个「Assign work to Copilot and it creates a pull request」才是 Pro 起 | 保留 | 主源:GitHub Copilot plans 实时详细 feature row,2026-07-17 | 正文拆开两件事:Copilot 自家 cloud agent 从 Pro 起;转派 Claude / Codex 等第三方 coding agent 从 Pro+ 起 |
| 10 | Claude / Cursor / Warp 的价格与主场判断 | 价格经各家官方页核对仍在当前范围;「主场」是编辑判断,不是能力穷举 | 保留 | 主源:各家官方 pricing / product pages | 保留,避免排他性「只有它能」措辞 |
| 11 | 「聊天框是最小的样子,四面开工才最大」收束 | 受全书错误分类牵连 | 高 | 同 meta / 01 / 02 | 改成「一个入口只是开始;把活放到合适位置、带证据收回」,不丢原书声音 |

## 复核返工 · 2026-07-17

| 项目 | 一手源复核结果 | 最终取值 / 写法 |
| --- | --- | --- |
| Copilot 第三方 coding agent 档位 | GitHub Copilot plans 实时页的详细对比行显示:「Delegate tasks to third-party coding agents like Claude by Anthropic and OpenAI Codex (Preview)」在 Free / Pro 均为 Not included,Pro+ / Max 为 Included。页面顶部 Pro 摘要与详细行存在冲突;按更具体的 feature row 定稿 | Copilot 自家 cloud agent / 创建 PR 从 Pro $10 起;转派 Claude / Codex 等第三方 coding agent 从 Pro+ $39 起 |
| GPT-5.6 Codex credits | OpenAI Help Center `Codex rate card` 于 2026-07-17 可直接读取;token-based pricing 表逐行确认。每个绝对值的分母都是 100 万个对应类型 token,单位是 credits | Sol:输入 125 / 缓存输入 12.50 / 输出 750;Terra:62.50 / 6.250 / 375;Luna:25 / 2.50 / 150。水平比例仍为同类 token 下 Terra = Sol 的 1/2、Luna = Sol 的 1/5;同模型 cached input = input 的 1/10、output = input 的 6× |

## 本轮改写边界

- 必改:meta、01、02、03 的认证检查、05 的 AGENTS / config 边界、06 的 MCP server、07 的并行定位、08 的 scheduled 前提、10 的计费 / 模型 / 竞品、11 的收束;09 只清掉「四面」措辞。
- 保留:已实测正确的安装、认证主流程、TUI / slash commands、sandbox / approvals、Skills、MCP client、cloud 环境、exec / SDK / GitHub Action、review 流。
- 待核处理:不把账号灰度 / 组织策略写成确定事实;Remote、`auto_review`、memories、experimental cloud CLI 等统一用「可用时 / eligible / experimental」限定。
