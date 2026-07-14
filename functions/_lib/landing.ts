const LANDING_HTML = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <meta name="referrer" content="no-referrer">
    <title>墨小图床</title>
    <style>
      :root{color-scheme:light dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;background:#f5f6fa;color:#20212a}
      *{box-sizing:border-box}body{min-width:320px;min-height:100vh;display:grid;place-items:center;margin:0;padding:20px;background:radial-gradient(circle at top,#eeeeff,transparent 45%),#f5f6fa}
      main{width:min(100%,420px);padding:44px 32px;text-align:center;background:#fff;border:1px solid #e3e4ec;border-radius:22px;box-shadow:0 12px 40px rgba(31,35,48,.1)}
      .mark{width:62px;height:62px;display:grid;place-items:center;margin:0 auto 20px;color:#fff;background:#5b5bd6;border-radius:17px;font-size:26px;font-weight:800}
      h1{margin:0;font-size:26px}p{margin:10px 0 29px;color:#6d7080}a{display:inline-block;padding:13px 20px;color:#fff;background:#5b5bd6;border-radius:11px;text-decoration:none;font-weight:700}a:hover{background:#4c4cc4}small{display:block;margin-top:24px;color:#898c99}
      @media(prefers-color-scheme:dark){:root{background:#121319;color:#f1f2f7}body{background:radial-gradient(circle at top,#292947,transparent 45%),#121319}main{background:#1a1c24;border-color:#30333f;box-shadow:0 16px 45px rgba(0,0,0,.3)}p,small{color:#a3a7b6}}
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">墨</div>
      <h1>墨小图床</h1>
      <p>私人图片存储服务</p>
      <a href="https://img-admin.moxiao.ggff.net/login">管理员登录</a>
      <small>图片资源由 Cloudflare Workers KV 提供</small>
    </main>
  </body>
</html>`;

export function landingResponse(headOnly = false): Response {
  return new Response(headOnly ? null : LANDING_HTML, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "no-referrer",
    },
  });
}
