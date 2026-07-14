import { FormEvent, useState } from "react";
import { api } from "../services/api";

interface LoginPageProps {
  onLoggedIn: () => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.login(password);
      setPassword("");
      onLoggedIn();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-mark" aria-hidden="true">墨</div>
        <h1>墨小图床</h1>
        <p>私人图片管理后台</p>
        <form onSubmit={(event) => { void submit(event); }}>
          <label htmlFor="password">管理员密码</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
            required
            autoFocus
          />
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="button primary wide" type="submit" disabled={loading || !password}>
            {loading ? "正在登录…" : "登录"}
          </button>
        </form>
        <small>登录状态由安全的 HttpOnly Cookie 保存 7 天</small>
      </section>
    </main>
  );
}
