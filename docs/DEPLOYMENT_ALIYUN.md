# 阿里云宝塔自动部署

这套部署面向一台 **x86_64 Linux** 阿里云服务器：宝塔管理域名、SSL 和
Nginx，GitHub Actions 负责质量门禁、构建和发布，PM2 只负责运行 Next.js
standalone server。

```text
pull request ── test / lint / typecheck / build

main push ── quality gates ── next build (standalone)
                            └─ rsync over pinned SSH host key
                                 └─ releases/<git-sha>
                                      ├─ current -> releases/<git-sha>
                                      ├─ shared/.env.production
                                      └─ shared/data/analytics.db

browser ── HTTPS / 宝塔 Nginx ── 127.0.0.1:3010 / PM2 ── Next.js
```

## 为什么这样部署

- 构建只发生在 GitHub Runner；生产机不执行 `git pull`、`npm install` 或
  `next build`，线上状态更小、更可复现。
- 不依赖生产机拉取 GHCR / npm 包，避开大陆服务器访问境外 Registry 的不稳定。
- `rsync --link-dest` 复用上一个 release 中没有变化的文件。`public/books`
  的大 PDF 不会每次重新上传或重复占盘。
- `releases / current / shared` 把代码、入口和持久数据分开。切换 `current`
  是原子的；健康检查不通过会自动切回上一版。
- 每个发布包都带完整 SHA256 manifest；服务器在切换前校验文件内容，并拒绝把
  同一 git SHA 静默替换成不同构建产物。
- PM2 使用单实例 cluster 模式，但 release 切换时执行 `delete + start`，确保
  `script` 和 `cwd` 都指向新 release；启动后还会从 `pm2 jlist` 反查这两个路径。
- Actions 只使用 GitHub 官方 checkout/setup-node Action；SSH 和 rsync 走系统
  工具，并固定服务器 host key。

## 1. 服务器准备

推荐系统为 Alibaba Cloud Linux 3 或 Ubuntu 22.04+，架构必须是 `x86_64`。
Actions 的 Linux x64 构建里包含 `better-sqlite3` 原生模块；ARM64 服务器应改用
ARM64 self-hosted runner，不能直接复用当前产物。

服务器需要：

- Node.js 22
- PM2
- `rsync`、`curl`、`sha256sum`
- 一个非 root 的发布用户，例如 `deploy`

让发布用户同时拥有站点目录和 PM2 进程。下面只是一组路径示例，请把域名替换
成真实值：

```bash
sudo mkdir -p /www/wwwroot/library.example.com/{incoming,releases,shared/data}
# 宝塔会把站点根目录里的 .user.ini 设为 immutable；不要对整个目录递归 chown。
# 发布用户需要拥有根目录本身（用于切换 current 链接）和三个部署子目录。
sudo chown deploy:deploy /www/wwwroot/library.example.com
sudo chown -R deploy:deploy \
  /www/wwwroot/library.example.com/incoming \
  /www/wwwroot/library.example.com/releases \
  /www/wwwroot/library.example.com/shared
sudo -iu deploy node --version
sudo -iu deploy pm2 --version
sudo -iu deploy rsync --version
```

Node 必须输出 `v22.x`。用同一个 `deploy` 用户执行一次 `pm2 startup`，再按它
打印的命令配置 systemd；工作流每次成功发布后都会执行 `pm2 save`。

还要从你自己的电脑验证非交互 SSH 也能找到这些命令，因为 Actions 使用的正是
这种 shell：

```bash
ssh deploy@服务器IP \
  'node --version && pm2 --version && rsync --version && sha256sum --version'
```

如果宝塔把 Node 装在自定义目录而这里找不到，可把完整运行时 PATH 配成下一节的
GitHub Actions Variable `RUNTIME_PATH`，例如
`/www/server/nodejs/v22/bin:/usr/local/bin:/usr/bin:/bin`。`rsync` 发生在运行时
配置加载之前，仍应位于系统 PATH（通常是 `/usr/bin/rsync`）。

为 GitHub Actions 单独生成 SSH key，把公钥放进
`/home/deploy/.ssh/authorized_keys`。服务器安全组只需开放 SSH、80、443；应用
端口只监听 `127.0.0.1`，不要对公网开放 3010。

## 2. 运行时配置模型

GitHub Repository Secrets 是运行时机密的唯一配置源。每次部署完成上传后，Actions
通过固定 host key 的 SSH 标准输入传输配置，先写入同目录临时文件，再原子替换
`shared/.env.production`。文件由 `deploy` 创建，权限固定为 `600`；机密不会进入
Git 仓库、构建产物、rsync release 或 shell 命令参数。

服务器仍保留这份受限的运行时副本，因为 PM2/systemd 在 GitHub Runner 已退出或
服务器重启后也必须能恢复应用。它不是人工维护的配置：修改或轮换值时只更新
GitHub Secret，再执行一次部署。

`ANALYTICS_SECRET` 与 `CRON_SECRET` 都必须至少 32 字符且不能相同，否则同步步骤
会在接触生产进程之前失败。

单机部署可以不设置 `DATABASE_URL`：每个 release 的 `./data` 都会链接到
`shared/data`，默认 SQLite 因此可以跨版本保留。使用 Turso 时，在 GitHub 增加
`DATABASE_URL` 与 `DATABASE_AUTH_TOKEN` 两个 Repository Secrets。

创建新的 Turso 数据库（本机已安装并登录 Turso CLI）：

```bash
turso db create aklman-ebooks-analytics --wait
turso db show aklman-ebooks-analytics --url
turso db tokens create aklman-ebooks-analytics --expiration 365d
```

第二条命令的完整输出写入 `DATABASE_URL`，第三条命令的完整输出写入
`DATABASE_AUTH_TOKEN`。Token 必须有写权限：不要添加 `--read-only`，因为应用
需要插入事件、更新认证信息和自动初始化 schema。两项必须同时存在；部署会先从
GitHub Runner 执行 `SELECT 1` 预检，连接或鉴权失败时不会更新生产配置。

无论使用本地 SQLite 还是 Turso，都应在宝塔里配置数据库/目录备份；不要备份
整个 `releases`。真正需要保护的是 `shared/data`；若备份
`shared/.env.production`，备份本身也必须加密并限制访问。

## 3. 配置 GitHub Actions

本项目是个人账户下的私有仓库，因此 Secrets 和 Variables 配在
**Settings → Secrets and variables → Actions** 的 Repository 层级。工作流仍声明
`production` Environment，用于部署记录和站点 URL；若 GitHub 计划支持保护规则，
可以再为它启用 required reviewer 或限定部署分支。

Repository secrets：

| 名称 | 内容 |
| --- | --- |
| `DEPLOY_SSH_PRIVATE_KEY` | 完整私钥，包括 BEGIN/END 行 |
| `ANALYTICS_SECRET` | 至少 32 字符；可用 `openssl rand -hex 32` 生成 |
| `CRON_SECRET` | 另一个至少 32 字符的随机值 |
| `DATABASE_URL` | 可选；Turso/libsql URL |
| `DATABASE_AUTH_TOKEN` | 可选；Turso/libsql token |

`DEPLOY_KNOWN_HOSTS` 不要在 Actions 中用 `accept-new` 临时生成。先通过可信的
宝塔终端核对 `/etc/ssh/ssh_host_ed25519_key.pub`，默认 22 端口的格式是：

```text
服务器IP ssh-ed25519 AAAAC3...
```

非 22 端口则是：

```text
[服务器IP]:端口 ssh-ed25519 AAAAC3...
```

Repository variables：

| 名称 | 示例 | 说明 |
| --- | --- | --- |
| `DEPLOY_HOST` | `203.0.113.10` | ECS 公网 IP 或 SSH 域名 |
| `DEPLOY_USER` | `deploy` | 非 root 发布用户 |
| `DEPLOY_KNOWN_HOSTS` | `203.0.113.10 ssh-ed25519 AAAA…` | 固定的公开 SSH host key |
| `DEPLOY_PATH` | `/www/wwwroot/library.example.com` | 必填；发布用户拥有写权限 |
| `NEXT_PUBLIC_SITE_URL` | `https://library.example.com` | 必填；不要尾随 `/` |
| `DEPLOY_SSH_PORT` | `22` | 可选，默认 22 |
| `APP_PORT` | `3010` | 可选，默认 3010 |
| `PM2_APP_NAME` | `aklman-library` | 可选 |
| `KEEP_RELEASES` | `5` | 可选，范围 3–20 |
| `ANALYTICS_RETENTION_DAYS` | `90` | 可选，范围 1–3650 |
| `RUNTIME_PATH` | `/usr/local/bin:/usr/bin:/bin` | 仅 Node/PM2 不在默认 PATH 时设置 |
| `NEXT_PUBLIC_GISCUS_REPO` | `owner/repo` | 评论区可选 |
| `NEXT_PUBLIC_GISCUS_REPO_ID` | `R_...` | 评论区可选 |
| `NEXT_PUBLIC_GISCUS_CATEGORY` | `Comments` | 评论区可选 |
| `NEXT_PUBLIC_GISCUS_CATEGORY_ID` | `DIC_...` | 评论区可选 |

`NEXT_PUBLIC_*` 本来就会被 Next.js 写入浏览器 bundle，所以放 variables，不要
把它们误当服务器机密。真正的 analytics / database secret 只在 Repository
Secrets 中维护，服务器副本由工作流自动同步。

## 4. 宝塔网站和 Nginx

在宝塔创建网站、绑定域名并申请 SSL。站点配置的 `server {}` 内加入反向代理；
端口必须和 GitHub 的 `APP_PORT` 一致：

宝塔为静态/PHP 网站生成的默认配置通常还包含 `enable-php-00.conf`，以及匹配
图片、JavaScript、CSS 的正则 `location`。这是纯 Next.js 站点，不需要 PHP；并且
这些正则位置会优先于下面的 `location /`，导致 `/_next/static/*` 等资源绕过反向
代理而返回 404。应停用 PHP include，并删除或注释这两个静态资源正则 location，
同时保留宝塔的证书验证、禁止访问敏感文件、访问日志和 SSL 配置。

```nginx
location / {
    proxy_pass http://127.0.0.1:3010;
    proxy_http_version 1.1;

    # 显式覆盖宝塔 extension/http/server 层可能继承下来的共享缓存。
    # Next 的静态 HTML 带一年 s-maxage；没有部署级 purge 时不能让 Nginx 缓存。
    proxy_cache off;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_connect_timeout 10s;
    proxy_read_timeout 120s;
    proxy_send_timeout 120s;

    # Next.js App Router streaming 不能被 Nginx 聚合后再一次性返回。
    proxy_buffering off;
}
```

宝塔可能在主 vhost 开头 include
`/www/server/panel/vhost/nginx/extension/<域名>/*.conf`。上线前用
`nginx -T` 检查**实际生效配置**，确认没有更具体的 exact/regex `location`
重新启用 `proxy_cache`、`proxy_store` 或第三方 `srcache`。不要以响应里缺少
`Age` / `X-Cache` 作为无缓存的证据；Nginx 只有在显式配置响应头时才会暴露
`$upstream_cache_status`。

### 缓存配置归属

缓存区与缓存开关应分开管理。宝塔的
`/www/server/nginx/conf/proxy.conf` 可以保留 `proxy_cache_path` 和
`keys_zone=cache_one`，但不应在 `http` 层写默认开启：

```nginx
# 可以保留：这里只是定义缓存区。
proxy_cache_path /www/server/nginx/proxy_cache_dir
    levels=1:2 keys_zone=cache_one:20m inactive=1d max_size=5g;

# 删除这一类 http 级默认值：
# proxy_cache cache_one;
```

确实需要代理缓存的旧站点，在它自己的 `location` 内显式 opt-in：

```nginx
location /cacheable-service/ {
    proxy_cache cache_one;
    proxy_pass http://127.0.0.1:9000;
}
```

所有由 Next.js / Node 自己管理响应语义、又没有部署级 purge 的反代站点，则在
实际 `proxy_pass` 所在的 `location` 内显式写 `proxy_cache off;`。这两层同时做：
全局不默认开启，站点也明确关闭；以后宝塔改 include 顺序时仍有防线。

本仓库随 release 发布只读 doctor。修改宝塔或升级 Nginx 后，把所有需要禁止
代理缓存的域名一次传入；它解析完整的 `nginx -T` 输出，并从匹配域名的
`server` 与主配置的 `http` 上下文递归展开 include，而不是只检查仓库模板
（路径里的 `kimi.read.wiki` 是本站的发布目录，后三个域名为同机其他站点
示例，按需替换）：

```bash
set -o pipefail
sudo /www/server/nginx/sbin/nginx -T 2>&1 |
  node /www/wwwroot/kimi.read.wiki/current/ops/nginx-cache-doctor.mjs \
    --stdin \
    kimi.read.wiki \
    second.example.com \
    third.example.com \
    fourth.example.com
```

doctor 会：

- 拒绝全局或无法确认作用域的 `proxy_cache` / `fastcgi_cache` /
  `proxy_store` / `srcache` 开启项；
- 拒绝目标域名 vhost、extension 或共享 include 重新开启响应缓存；
- 要求每个目标域名实际代理的 `location /` 直接声明 `proxy_cache off;`；
- 只报告、不拦截 `proxy_cache_path` 与 `open_file_cache`。后者缓存文件句柄和元数据，
  不会把上游 HTML 响应变成旧页面。

运行结果必须是 `nginx-cache-doctor: PASS`。然后再执行：

```bash
sudo /www/server/nginx/sbin/nginx -t
sudo /www/server/nginx/sbin/nginx -s reload
```

GitHub Actions 不自动执行这个 doctor：发布用户按最小权限设计，不应仅为了读取
Nginx 全局配置而获得免密 root。仓库模板由单元测试审计；服务器有效配置在宝塔
配置变更或 Nginx 升级后由运维执行上述检查。

### 缓存可观测性

如需在访问日志里持续看到缓存决策，在 Nginx 主配置的 `http {}` 中注册格式：

```nginx
log_format upstream_cache
    '$remote_addr [$time_local] "$request" $status $body_bytes_sent '
    'upstream=$upstream_addr cache=$upstream_cache_status '
    'request_time=$request_time upstream_time=$upstream_response_time';
```

再把站点 vhost 的访问日志改为：

```nginx
access_log /www/wwwlogs/kimi.read.wiki.log upstream_cache;
```

`cache=HIT|MISS|BYPASS|EXPIRED|STALE|UPDATING|REVALIDATED` 能直接说明缓存行为；
关闭 `proxy_cache` 时该字段为空是正常结果。无需为了观测而向公网暴露
`X-Cache` 响应头。

### HTML 的 Cache-Control

Next.js 16 对永久预渲染页下发 `s-maxage=31536000` 是框架的标准 CDN 语义。
`s-maxage` 只控制共享缓存，浏览器不会把它当作一年的 `max-age`，因此浏览器侧
无需修改。本项目当前没有 CDN，并在 Nginx 明确 `proxy_cache off`，所以保留该
响应头，不在应用层把所有静态页改成动态或 `no-store`。

若以后接入 CDN，必须二选一：部署时按 HTML + RSC cache key 做 purge，或在 CDN
规则中绕过页面/RSC 缓存；不能直接继承一年 TTL。`/_next/static` 的带 hash 资源
仍应长期 immutable 缓存，不要用全站 `no-store` 一刀切。

在宝塔里测试并重载 Nginx，再打开“强制 HTTPS”。不要让宝塔另外启动一份 Node
项目；Node 进程由 release 中的 PM2 配置统一管理。

## 5. 定时 rollup / prune

仓库里的 `vercel.json` cron 在阿里云自托管环境不会执行。第一次成功发布后，在
宝塔 **计划任务 → Shell 脚本** 建一个每日任务（例如服务器时区 04:10）：

```bash
/bin/bash /www/wwwroot/library.example.com/current/ops/analytics-rollup.sh \
  /www/wwwroot/library.example.com
```

脚本从 `shared/.env.production` 读取 `CRON_SECRET`，不会把 secret 写进宝塔任务
命令或进程参数。

## 6. 首次发布与验证

准备好服务器环境、GitHub Actions 配置和 Nginx 后，push 到 `main`，或在
Actions 页面手动运行 **Aliyun CI/CD**（必须选择 main）。工作流依次执行：

1. `npm test`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`
5. 生成 SHA256 manifest 并增量上传 standalone release
6. 从 Repository Secrets 原子同步 `shared/.env.production`
7. 校验 manifest 与 Next build-time `deploymentId`
8. 原子切换 `current`，PM2 `delete + start` 并反查 `script` / `cwd`
9. 服务器本机通过 `/api/health` 校验运行时、release、构建三个 git SHA
10. 从 GitHub Runner 通过公网域名校验 health，以及首页与章节页的
    canonical / cache-buster HTML 中的 `data-dpl-id`（HTML 校验带短重试）

服务器检查：

```bash
sudo -iu deploy pm2 list
curl -fsS http://127.0.0.1:3010/api/health
curl -fsS https://library.example.com/api/health
readlink -f /www/wwwroot/library.example.com/current
```

如果应用内部健康检查失败，脚本会自动恢复上一条 `current` 并重新加载 PM2。
公网检查失败通常是 DNS、证书或 Nginx 配置问题，它会把 Action 标红，但不会把
已经通过本机检查的新 release 回滚，因为旧代码也无法修复这类基础设施问题。
如果 cache-buster HTML 是新 SHA、裸 canonical HTML 是旧 SHA，工作流会直接标成
反向代理缓存陈旧，而不是把 `/api/health` 的绿灯误当成页面已经更新。

同一 SHA 重复部署（Actions 里 Re-run，或手动触发同一提交）时，服务器会比对
新上传产物与已部署 release 的 SHA256 manifest。相同构建环境下产物通常一致，
但这不是跨 runner 镜像的永久保证；若构建产物不一致，激活会中止并报
`already exists with a different artifact manifest`。该错误发生在切换
`current` 之前，线上仍运行旧版本，不受影响。最安全的处理是创建一个新 commit，
用新的 SHA 重新部署。**绝不能删除 `current` 当前指向的 release**：这会立刻破坏
线上静态资源，并让自动回滚失去旧产物。若确实必须重建同一 SHA，应先切换并验证
另一个完整 release，确认目标目录已经不是 `current` 后，才能由运维人工处理。

## 7. 手动回滚

每个 release 以完整 git SHA 命名，默认保留 5 个。先选一个已有版本：

```bash
ls -1t /www/wwwroot/library.example.com/releases
```

然后以 `deploy` 用户运行当前 release 自带的同一套切换脚本：

```bash
sudo -iu deploy bash \
  /www/wwwroot/library.example.com/current/ops/deploy-release.sh \
  /www/wwwroot/library.example.com \
  0123456789abcdef0123456789abcdef01234567 \
  aklman-library \
  3010 \
  /api/health \
  5
```

目标 SHA 必须已经存在于 `releases/`。脚本仍会做 PM2 `delete + start`、路径断言
和版本健康检查；如果目标版本起不来，会恢复到回滚前的版本。

新部署的 release 会在回滚前复验 SHA256 manifest。升级这套机制以前生成的历史
release 没有 manifest，仍允许人工回滚，但脚本会打印 legacy warning；同一 SHA
从工作流重新上传时则必须有 manifest 且与服务器现有产物完全一致。

## 运维边界

- 本应用当前只运行一个 PM2 / Next 实例，不需要 Redis cache handler；同机其他
  项目拥有各自的进程与缓存边界。若本应用以后扩成多实例或多台 ECS，必须再解决
  共享缓存、tag invalidation 和 Server Actions encryption key。
- 发布脚本会保留持久数据，但备份、系统补丁、磁盘告警、证书续期仍由宝塔/云监控
  负责。
- GitHub 计划支持时，建议同时开启 `production` Environment deployment
  protection 与 `main` branch protection；前者控制上线，后者控制代码进入主分支。
