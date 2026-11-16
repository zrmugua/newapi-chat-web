import http from 'node:http'

const html = `<!doctype html><html lang="zh-CN"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;background:#f3f5f9;color:#172637;font:16px system-ui;padding:32px}main{max-width:640px;margin:auto}small{color:#61788c;letter-spacing:.12em}h1{font-size:30px;margin:12px 0}p{color:#667887;line-height:1.7}.cards{display:flex;gap:14px;margin:24px 0}.card{flex:1;padding:20px;background:white;border-radius:16px;border:1px solid #e3e9f1}.card strong{display:block;font-size:27px;color:#416ee7;margin:8px 0}button{background:#416ee7;color:white;padding:12px 20px;border:0;border-radius:10px;cursor:pointer}</style></head><body><main><small>NEWAPI CHAT / PREVIEW</small><h1>让想法，即刻呈现。</h1><p>从一段对话开始，构建你的下一件作品。</p><div class="cards"><div class="card">本周灵感<strong>24</strong>持续探索</div><div class="card">完成作品<strong>08</strong>每一个都值得</div></div><button id="counter">开始探索 · 0</button><script>let n=0;document.getElementById('counter').onclick=e=>e.target.textContent='开始探索 · '+(++n);try{parent.localStorage.getItem('chat-demo:api-key');document.body.dataset.parentAccess='allowed'}catch{document.body.dataset.parentAccess='blocked'}</script></main></body></html>`
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 260"><rect width="600" height="260" rx="24" fill="#f2f6ff"/><circle cx="120" cy="130" r="60" fill="#4776ef"/><path d="M95 130l18 18 34-38" fill="none" stroke="white" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><text x="215" y="125" font-family="system-ui" font-size="28" fill="#1c3355">Hello, SVG.</text><text x="215" y="162" font-family="system-ui" font-size="16" fill="#637d9e">Ideas come to life.</text></svg>`
const answer = `这是一个可以直接预览的页面：\n\n\`\`\`html\n${html}\n\`\`\`\n\n还可以预览 SVG 图形：\n\n\`\`\`svg\n${svg}\n\`\`\``

http
  .createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }
    if (req.headers.authorization !== 'Bearer sk-preview-fixture') {
      res.writeHead(401, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Fixture key required' } }))
      return
    }
    if (req.url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ data: [{ id: 'demo-model' }, { id: 'demo-reasoner' }] }))
      return
    }
    if (!['/v1/chat/completions', '/v1/responses'].includes(req.url)) {
      res.writeHead(404)
      res.end()
      return
    }
    let raw = ''
    for await (const chunk of req) raw += chunk
    const body = JSON.parse(raw)
    const responses = req.url === '/v1/responses'
    const short = /简短|short/i.test(JSON.stringify(body.input || body.messages))
    const output = short
      ? '你好！可以选择模型和推理等级，或让我生成 HTML、SVG 文件并直接预览。'
      : answer
    console.log(
      JSON.stringify({
        protocol: responses ? 'responses' : 'chat-completions',
        model: body.model,
        effort: body.reasoning?.effort ?? body.reasoning_effort ?? 'default',
        messages: (body.input || body.messages)?.length,
        images: JSON.stringify(body).includes('data:image/'),
        attachments: JSON.stringify(body).includes('<attachment>'),
      })
    )
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' })
    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
    if (responses) {
      send({ type: 'response.created', response: { id: 'fixture-response' } })
      send({
        type: 'response.reasoning_summary_text.delta',
        delta: '我将生成一个 HTML 页面和一张 SVG 图形。',
      })
    } else
      send({
        choices: [
          { index: 0, delta: { reasoning_content: '我将生成一个 HTML 页面和一张 SVG 图形。' } },
        ],
      })
    let offset = 0
    const timer = setInterval(() => {
      if (offset >= output.length) {
        clearInterval(timer)
        if (responses)
          send({
            type: 'response.completed',
            response: { output: [], usage: { input_tokens: 25, output_tokens: 80 } },
          })
        else {
          send({ choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })
          send({ choices: [], usage: { prompt_tokens: 25, completion_tokens: 80 } })
          res.write('data: [DONE]\n\n')
        }
        res.end()
        return
      }
      const delta = output.slice(offset, offset + 65)
      offset += 65
      send(
        responses
          ? { type: 'response.output_text.delta', delta }
          : { choices: [{ index: 0, delta: { content: delta } }] }
      )
    }, 80)
    res.on('close', () => clearInterval(timer))
  })
  .listen(8091, '127.0.0.1', () => console.log('Fixture API: http://127.0.0.1:8091'))
