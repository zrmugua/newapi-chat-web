# NewAPI Chat

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzrmugua%2Fnewapi-chat-web)

基于 [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo) 改造的 New API 聊天前端。保留原有会话与 Markdown 界面，浏览器直接连接你的 API 中转站，可作为静态站点部署到 Vercel。

## 使用

打开设置 → API 连接，填写 API 地址、API Key 和接口协议，点击「保存连接」。API 地址支持站点根地址、带 `/v1` 的地址，以及完整的 `/v1/chat/completions` 或 `/v1/responses` 地址。连接后会自动获取模型并选择列表中的第一个；也可以在列表中切换，或手动输入模型 ID。

- **Chat Completions**：调用 `POST /v1/chat/completions`，解析文本和 `reasoning_content` / `reasoning` 流式输出。
- **Responses**：调用 `POST /v1/responses`，支持文本、推理摘要、完成、输出截断和错误事件。请求携带 `store: false`，每次发送本地会话上下文。
- **推理等级**：在输入框选择`low`、`medium`、`high`、`xhigh`。Chat Completions 使用 `reasoning_effort`；Responses 使用 `reasoning.effort`，并请求 `summary: auto`。初始等级为 `medium`，具体支持范围由模型与中转站决定。
- **会话**：多会话、本地自动标题、重命名、删除、停止生成、继续回答、编辑提问、重新生成、消息分支、ZIP 历史导入导出。每条回答下方显示请求时间、响应耗时和 API 返回的输入 / 输出 token；可复制文本、复制 Markdown，或删除整轮对话并在提示中撤销。API 未返回用量时显示「—」，继续回答后显示最近一次请求的统计。
- **内容**：Markdown、代码高亮、KaTeX、Mermaid、HTML / SVG 预览、浅色 / 深色主题、简体中文 / 英文界面和移动端布局。
- **附件**：PNG、JPEG、GIF、WebP 图片，以及文本、代码文件；单文件最大 10 MB。图片随请求按 Base64 发送，文本在本机读取后作为上下文发送。图片理解需要模型支持。

## New API 聊天预设

将下面的链接填入 New API 后台的聊天预设 URL，并替换聊天站域名。未指定模型时会自动选择可用列表中的首个模型。

```text
https://chat.example.com/#apiUrl={address}&apiKey={key}&protocol=chat-completions&reasoning=medium
```

Responses 模型示例：

```text
https://chat.example.com/#apiUrl={address}&apiKey={key}&protocol=responses&reasoning=high
```

New API 会用站点地址替换 `{address}`，用用户选中的令牌替换 `{key}`。也可以固定 API 地址：

```text
https://chat.example.com/#apiUrl=https://api.example.com&apiKey={key}
```

截图形式的查询参数同样支持：

```text
https://chat.example.com/?apiUrl=https://api.example.com&apiKey={key}
```

优先使用 `#` 片段参数，让凭据留在浏览器端。查询参数会随首次页面请求发送到静态托管服务，读取后才会从地址栏移除。参数导入在界面初始化和 API 请求之前执行；导入完成后清理地址栏，同时将连接保存到本机。切换 API 地址而没有传入新 Key 时，会清除原连接的 Key。

| 参数        | 可选值或别名                                              |
| ----------- | --------------------------------------------------------- |
| `apiUrl`    | 支持 `baseUrl`、`base_url`、`url`                         |
| `apiKey`    | 支持 `api_key`、`key`                                     |
| `model`     | 可选；未指定且本机没有可用的已保存选择时，使用列表首个模型 |
| `protocol`  | `chat-completions`、`responses`；省略时沿用本机协议       |
| `reasoning` | `low`、`medium`、`high`、`xhigh`；别名 `reasoning_effort` |

## HTML 与 SVG 实时预览

助手正文中的模型输出使用带语言标记的代码块触发 HTML / SVG 预览：`html`、`htm`、`svg`，或以 `<svg>` 开头的 `xml`。生成过程中约每 600 ms 更新预览；思考内容中的代码保持为代码块。工具栏提供预览 / 源码切换、复制、刷新、下载和放大按钮。

预览通过独立来源的沙箱 iframe 运行。内联 JavaScript 可直接运行，预览无法读取聊天页面的 Key、存储或 DOM。预览使用内联 CSS、脚本及 data / blob 图片，CSP 限制外部网络资源。引用 CDN 的页面需要模型改写为内联资源；JSX / TSX 和需要 npm 构建的应用应先转成独立 HTML。

## 部署与自动更新

点击页面顶部的 Vercel 按钮，授权 GitHub 并创建项目即可开始部署。该按钮会将本仓库克隆为你账号下的新 Git 仓库，再从副本创建 Vercel 项目。若你已经拥有本仓库，并希望 Vercel 直接部署它，请在 Vercel 控制台选择导入现有 Git 仓库，再选择 `newapi-chat-web`。仓库中的 `vercel.json` 已设置构建命令与输出目录，使用 Node.js 24。

首次部署后，Vercel 会关联创建项目时选择的 GitHub 仓库。使用一键部署按钮时，关联的是按钮克隆生成的新仓库；导入现有仓库时，关联的是你选择的原仓库。向所关联仓库的 `main` 分支推送会自动构建并更新正式站点；其他分支和 Pull Request 会生成预览部署。日常更新前，确认本地 `origin` 指向 Vercel 所关联的仓库，再执行：

```sh
git add .
git commit -m "Update NewAPI Chat"
git push origin main
```

部署完成后，把站点域名填入上面的 New API 预设。详见 [Vercel Git 部署说明](https://vercel.com/docs/git)。

可选的公开构建变量：

| 环境变量            | 含义                    | 默认值                     |
| ------------------- | ----------------------- | -------------------------- |
| `CHAT_API_BASE_URL` | 首次访问的默认 API 地址 | 留空，由用户填写或预设导入 |

API 地址会写入前端静态产物。API Key 由用户在浏览器中填写或从 New API 导入。

浏览器直接请求中转站，因此中转站需要允许聊天站域名的 CORS 跨域请求，包括 `Authorization`、`Content-Type` 请求头和 `GET`、`POST`、`OPTIONS` 方法。HTTPS 聊天站应连接 HTTPS API 地址。Vercel 负责静态文件托管，模型的流式请求直接连接 API 地址。

## 本地开发与验证

使用 Node.js 24 和 pnpm：

```sh
pnpm install --frozen-lockfile
pnpm dev
```

打开 `http://localhost:8090/`。构建和验证：

```sh
pnpm type
pnpm test
pnpm build
```

静态产物位于 `dist/`。构建脚本支持 Windows、macOS 和 Linux。

本地模拟接口用于浏览器验收：另开终端运行 `node tests/fixtures/server.mjs`，然后打开：

```text
http://localhost:8090/#apiUrl=http%3A%2F%2F127.0.0.1%3A8091&apiKey=sk-preview-fixture&model=demo-model&protocol=responses&reasoning=high
```

模拟接口会流式返回 HTML 与 SVG 示例，可用来验证预设导入、协议切换、推理等级、附件发送、脚本交互和预览隔离。实际模型接入还需要使用中转站的有效 Key 和可用模型。

## 本地数据

Key 和设置保存于 localStorage，会话和附件原件保存于 IndexedDB，按浏览器与站点来源隔离。设置中的「清除 Key」可以删除本机凭据。历史导出包含会话和本地图片，文本及其他附件仅导出元数据；Key 和应用设置不进入 ZIP。格式见[历史归档说明](src/services/chat/history/README.md)。

## 来源与许可证

基于 [deepseek-ai/chat-demo](https://github.com/deepseek-ai/chat-demo)，遵循 [MIT 许可证](LICENSE)。构建产物包含 `LICENSE`，分发时请保留。New API 预设格式参照其[链接实现](https://github.com/QuantumNous/new-api/blob/main/web/src/features/chat/lib/chat-links.ts)；Responses 格式参照 [API 文档](https://developers.openai.com/api/reference/resources/responses/methods/create)。
