# 图床（Workers KV 免费版）

面向低访问量场景的轻量公开图床：访客可以直接上传并获取本次上传的图片链接；完整图片库仅对登录管理员开放，管理员通过独立域名登录后浏览、管理与删除图片。前端使用 React、TypeScript 与 Vite，API 使用 Cloudflare Pages Functions，图片保存在 Workers KV；不需要传统服务器、R2 或 D1。

- 公开图床：<https://img.moxiao.ggff.net>
- 管理后台：<https://img-admin.moxiao.ggff.net>
- KV Binding：`IMAGES_KV`
- Secret：`ADMIN_PASSWORD`、`SESSION_SECRET`
- 普通变量：`PUBLIC_IMAGE_BASE_URL=https://img.moxiao.ggff.net`

## 免费方案限制

Workers Free 默认包含 Workers KV。当前免费限制为：总存储 1 GB、每天 100,000 次读取、1,000 次写入、1,000 次删除、1,000 次列表操作；KV 单值上限 25 MiB。本项目主动把单张图片限制为 **5 MB**。

KV 是最终一致存储。上传或删除在当前访问位置通常立即可见，但其他地区最多可能约 60 秒后才看到变化。这个方案适合低流量图床，不适合大量图片或高并发场景。

> [!IMPORTANT]
> 公开域名允许匿名上传，任何访客都可能消耗 KV 存储和每日写入额度。用于长期公开服务时，建议继续增加 Turnstile、上传频率限制或其他反滥用措施。

## 功能

- 公开上传：点击选择、拖拽、剪贴板粘贴和最多 3 个并发上传请求
- 上传结果：本地缩略图、真实上传百分比、进度条、成功/失败状态和清空记录
- 图片校验：JPEG、PNG、WebP、GIF、AVIF 的扩展名、Content-Type 与文件头三重校验；单张最大 5 MB，拒绝 SVG
- 链接输出：URL、Markdown、HTML、BBCode；单击文本框全选，双击复制并显示上浮提示
- 管理员图库：上传时间倒序、分页、文件名/Key 搜索、存储数量与容量统计、失败占位图
- 网页内预览：悬停变暗，支持上下/左右翻转、左右旋转 90°、25%–300% 缩放及 `Esc` 关闭
- 管理后台：单管理员密码、HMAC 签名的 7 天 HttpOnly Session Cookie、单删、批量删除和刷新
- 域名分流：公开站右上角登录跳转到管理域名；管理员退出后返回公开站
- 顶部信息：显示已托管文件数量和当前访客 IP（来自 Cloudflare `CF-Connecting-IP`）
- 响应式白色界面：桌面 4–6 列、手机 2 列，上传结果和预览工具栏自适应

## 安装与本地开发

安装 Node.js 20 LTS 或更新版本，然后运行：

```bash
npm install
```

常用命令：

```bash
npm run dev          # 仅启动 Vite 前端
npm run dev:pages    # 构建并运行完整 Pages + Functions
npm run cf-typegen   # 修改 wrangler.jsonc 后重新生成绑定类型
npm run typecheck    # TypeScript 类型检查
npm run build        # 生产构建
```

本地完整开发前，将 `.dev.vars.example` 复制为 `.dev.vars`：

```dotenv
ADMIN_PASSWORD=<YOUR_LOCAL_ADMIN_PASSWORD>
SESSION_SECRET=<YOUR_RANDOM_SESSION_SECRET_AT_LEAST_32_BYTES>
PUBLIC_IMAGE_BASE_URL=https://img.moxiao.ggff.net
```

Wrangler 默认使用本地 KV 模拟数据，不会改动线上 Namespace。

## 部署步骤

### 1. 创建 Workers KV Namespace

此步骤使用 Workers Free，不需要开通 R2 或 Workers Paid。

控制台方式：

1. 登录 Cloudflare。
2. 进入 **Storage & databases → Workers KV**。
3. 点击 **Create instance**。
4. 名称填写 `moxiao-images` 或你喜欢的名称。
5. 创建后复制 Namespace ID。

也可以使用 Wrangler：

```bash
npx wrangler login
npx wrangler kv namespace create IMAGES_KV
```

### 2. 修改唯一占位符

打开 `wrangler.jsonc`，将：

```jsonc
"id": "replace-with-your-kv-namespace-id"
```

替换为真实 Namespace ID。保持 binding 名称为 `IMAGES_KV`，不要填写账户 ID，也不要把 Secret 写入配置。

然后验证：

```bash
npm run cf-typegen
npm run build
```

### 3. 推送 GitHub

将项目提交并推送到自己的 GitHub 私有仓库。不要提交 `.dev.vars`、`.env`、密码、Cookie 或 API Token。

### 4. 创建 Cloudflare Pages 项目

1. 进入 **Workers & Pages → Create application → Pages → Connect to Git**。
2. 选择 GitHub 仓库和生产分支。
3. Build command：`npm run build`。
4. Build output directory：`dist`。
5. Root directory：留空。
6. 保存并执行第一次部署。

`wrangler.jsonc` 包含 `pages_build_output_dir`，因此它是 Pages 配置来源。`PUBLIC_IMAGE_BASE_URL` 和 `IMAGES_KV` 都已在文件中声明，不要在控制台重复创建同名绑定。

### 5. 设置管理员 Secret

在 Pages 项目 **Settings → Variables and Secrets → Add** 中，为 Production 添加：

- `ADMIN_PASSWORD`：选择 Encrypt/Secret，填写强管理员密码。
- `SESSION_SECRET`：选择 Encrypt/Secret，填写至少 32 字节随机值，且不要与管理员密码相同。

保存后重新部署。若使用 Preview 部署，需要为 Preview 单独设置 Secret，建议绑定独立的测试 KV Namespace。

### 6. 核验 KV Binding

第一次部署后，在 Pages 项目 **Settings → Bindings** 中确认：

- Binding 名称：`IMAGES_KV`
- 资源：你刚创建的 KV Namespace

如果不存在，先检查生产部署是否读取了仓库根目录的 `wrangler.jsonc`，不要创建不同名称的 Binding。

### 7. 绑定两个域名到同一个 Pages 项目

在 Pages 项目 **Custom domains → Set up a domain** 中分别添加：

1. `img-admin.moxiao.ggff.net`
2. `img.moxiao.ggff.net`

必须通过 Pages 的 Custom domains 流程添加，不能只手动创建 DNS CNAME。等待两个域名的 TLS 状态都变为 Active。

同一个 Pages 项目会按 Host 分流：

- `img-admin.moxiao.ggff.net` 提供登录和完整管理后台。
- `img.moxiao.ggff.net/` 无需登录即可上传、浏览、搜索、预览和复制图片链接。
- `img.moxiao.ggff.net/YYYY/MM/UUID.扩展名` 从 KV 返回图片。
- 图片域名开放上传、列表与统计 API；登录和删除等管理 API会返回 404。

## 部署后测试

1. 打开 `https://img.moxiao.ggff.net/`，确认无需登录即可上传并显示公开图片网格。
2. 点击右上角“登录”，确认跳转到 `https://img-admin.moxiao.ggff.net/login`。
3. 使用错误密码测试拒绝和登录限流，再使用管理员密码登录。
4. 分别测试点击、拖拽、粘贴和多图上传。
5. 测试超过 5 MB、SVG、伪造扩展名和伪造 Content-Type 的文件，均应失败。
6. 确认图片 URL 使用 `https://img.moxiao.ggff.net/YYYY/MM/UUID.扩展名`。
7. 测试搜索、分页、四种链接格式、单击全选、双击复制、单删和批量删除。
8. 退出后公开域名的 `/api/upload`、`/api/images` 和 `/api/stats` 仍可访问，管理域名的删除接口应返回 401。
9. 测试网页内预览、上下/左右翻转、左右旋转、缩小、放大和 `Esc` 关闭。
10. 确认顶部显示托管文件数与当前访客 IP，手机端网格为两列且顶部信息正常换行。

## API

成功响应：

```json
{ "success": true, "data": {}, "error": null }
```

失败响应：

```json
{
  "success": false,
  "data": null,
  "error": { "code": "ERROR_CODE", "message": "错误信息" }
}
```

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/login` | 登录并设置 Session Cookie |
| POST | `/api/logout` | 清除 Session Cookie |
| GET | `/api/session` | 查询登录状态 |
| GET | `/api/images?cursor=&limit=30&search=` | 管理员登录后查询列表、搜索与分页 |
| POST | `/api/upload` | 公开上传；multipart 字段 `file`，每个请求一张 |
| DELETE | `/api/images` | JSON：`{ "keys": ["..."] }`，最多 100 个 |
| GET | `/api/stats` | 公开统计，返回文件数量、总大小和当前访客 IP |
| GET/HEAD | `/YYYY/MM/UUID.扩展名` | 从 KV 返回公开图片 |

## 安全与实现说明

- Session 只包含到期时间和随机 nonce，并由 `SESSION_SECRET` 做 HMAC-SHA-256 签名。
- Cookie 设置 HttpOnly、Secure、SameSite=Strict；前端不保存密码或长期 Token。
- 图片列表、删除和退出等管理 API 在 Pages Functions 中验证 Session；图片上传、统计和已知图片直链保持公开。
- 上传同时检查扩展名、Content-Type 和文件头，服务端生成 `YYYY/MM/UUID.扩展名` Key。
- 图片二进制保存为 KV value，大小、类型、原始文件名和上传时间保存在 KV metadata。
- 图片域名中间件允许前端静态资源、公开上传、公开统计和合法图片路径；列表请求进入 API 后返回标准 401，登录和删除 API 不在公开域名开放。
- 访客 IP 由 Pages Function 读取 `CF-Connecting-IP`，只在当前请求的 `no-store` 响应中返回。
- 登录失败限流使用 Cache API 按 IP 做轻量近似限制。
- 列表和统计会扫描 KV Key metadata；适合低量私人场景。
- UUID 图片 URL 使用长期 immutable 缓存；删除后旧的边缘缓存可能短时间继续可见。

## 修改密码

在 Pages 的 Variables and Secrets 中修改 `ADMIN_PASSWORD` 并重新部署。只改密码不会让现有 Session 立即失效；若要强制所有设备退出，同时轮换 `SESSION_SECRET`。

## 备份图片

KV 不是文件系统或 S3。备份前先使用 Wrangler 列出 Key：

```bash
npx wrangler kv key list --binding=IMAGES_KV --remote
```

再按 Key 下载二进制文件：

```bash
npx wrangler kv key get --binding=IMAGES_KV "2026/07/UUID.jpg" --remote --file="./backup/UUID.jpg"
```

图片较多时，可根据 `kv key list` 的 JSON 输出编写脚本循环执行 `kv key get`。请将备份保存在 Cloudflare 之外，并定期抽查文件可打开。KV metadata 包含原始文件名、类型、大小和上传时间；若需要完整灾备，备份脚本也应保存 metadata。

## 最终手动操作清单

- [ ] 创建 Workers KV Namespace（不创建 R2）
- [ ] 把 `wrangler.jsonc` 中的 KV Namespace ID 占位符替换为真实 ID
- [ ] 运行 `npm run cf-typegen` 和 `npm run build`
- [ ] 推送到 GitHub 私有仓库
- [ ] 创建 Pages 项目，构建命令 `npm run build`，输出目录 `dist`
- [ ] 加密设置 `ADMIN_PASSWORD` 和 `SESSION_SECRET`
- [ ] 核验 `IMAGES_KV` Binding 指向正确 Namespace
- [ ] 给同一个 Pages 项目添加 `img-admin.moxiao.ggff.net`
- [ ] 给同一个 Pages 项目添加 `img.moxiao.ggff.net`
- [ ] 重新部署并完成测试
