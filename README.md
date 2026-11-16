# NewAPI Chat

[简体中文使用与部署文档](README.zh-CN.md)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzrmugua%2Fnewapi-chat-web)

A static New API chat frontend based on [DeepSeek Chat Demo](https://github.com/deepseek-ai/chat-demo), with Chat Completions and Responses support, selectable reasoning effort, and live HTML / SVG previews.

The browser connects directly to your gateway. Configure the API URL, key, and protocol in Settings. The first model returned for the key is selected automatically; users can choose another model or enter an ID. Your gateway must allow cross-origin browser requests from your chat domain.

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm type
pnpm test
pnpm build
```

Use Node.js 24. Production files are written to `dist/`. The Vercel button above clones this repository into a new Git repository in your account and creates a Vercel project from that copy; `vercel.json` configures the build and output directory. If you already own this repository and want Vercel to deploy it directly, import the existing repository from the Vercel dashboard instead. `CHAT_API_BASE_URL` can set a public default API address.

## Deployment and updates

After the first deployment, Vercel connects to the Git repository selected during setup. Pushing to its `main` branch automatically builds and updates production; other branches and pull requests receive preview deployments. With the Deploy button, this is the new repository created by the clone flow. If you imported an existing repository, pushes to that repository's `main` branch trigger updates. To publish an update from a local checkout, make sure `origin` points to the repository connected to Vercel, then run:

```sh
git add .
git commit -m "Update NewAPI Chat"
git push origin main
```

See [Vercel Git deployments](https://vercel.com/docs/git).

New API chat preset example. When no model is specified, the first available model is selected unless the browser already has a valid saved choice:

```text
https://chat.example.com/#apiUrl={address}&apiKey={key}&protocol=responses&reasoning=high
```

Query parameters are also supported. Imported parameters are removed from the address bar before rendering. API keys and settings are stored in localStorage; chats and original attachments are stored in IndexedDB.

HTML / SVG code fences in assistant replies update live in an isolated iframe; code in reasoning content remains a code block. Inline scripts run inside the sandbox for interactive previews. The iframe cannot access the parent page's storage; external network resources are restricted. Reasoning levels are low, medium, high, and xhigh. Each reply shows response duration and API-reported token usage, with copy, regenerate, and reversible turn deletion actions. Protocol availability depends on the selected model and gateway.

Licensed under [MIT](LICENSE). Preserve the upstream license when distributing the build.
