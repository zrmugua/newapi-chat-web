# NewAPI Chat

[简体中文使用与部署文档](README.zh-CN.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzrmugua%2Fnewapi-chat-web)

A static New API chat frontend based on [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo), with Chat Completions and Responses support, selectable reasoning effort, and live HTML / SVG previews.

The browser connects directly to your gateway. Configure the API URL, key, protocol, and model in Settings. Your gateway must allow cross-origin browser requests from your chat domain.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm type
pnpm test
pnpm build
```

Use Node.js 24. Production files are written to `dist/`. The Vercel button above creates a Vercel project from this repository; `vercel.json` configures the build and output directory. Public defaults can be set through `CHAT_API_BASE_URL` and `CHAT_DEFAULT_MODEL`.

## Deployment and updates

After the first deployment, Vercel connects to the GitHub repository. Pushing to `main` automatically builds and updates production; other branches and pull requests receive preview deployments. To publish an update:

```sh
git add .
git commit -m "Update NewAPI Chat"
git push origin main
```

See [Vercel Git deployments](https://vercel.com/docs/git).

New API chat preset example:

```text
https://chat.example.com/#apiUrl={address}&apiKey={key}&model=your-model&protocol=responses&reasoning=high
```

Query parameters are also supported. Imported parameters are removed from the address bar before rendering. API keys and settings are stored in localStorage; chats and original attachments are stored in IndexedDB.

HTML / SVG code fences update live in an isolated iframe. Inline scripts run inside the sandbox for interactive previews. The iframe cannot access the parent page's storage; external network resources are restricted. Reasoning levels are low, medium, high, and xhigh. Each reply shows response duration and API-reported token usage, with copy, regenerate, and reversible turn deletion actions. Protocol availability depends on the selected model and gateway.

Licensed under [MIT](LICENSE). Preserve the upstream license when distributing the build.
