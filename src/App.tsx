import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { api } from "./services/api";

type AuthState = "loading" | "authenticated" | "anonymous";

const PUBLIC_IMAGE_HOST = "img.moxiao.ggff.net";

export default function App() {
  const [auth, setAuth] = useState<AuthState>("loading");
  const isPublicSite = window.location.hostname === PUBLIC_IMAGE_HOST
    || (import.meta.env.DEV && new URLSearchParams(window.location.search).get("view") === "public");

  useEffect(() => {
    // 公开图片域名不需要请求 Session；鉴权只用于独立管理域名。
    if (isPublicSite) return;
    void api.session()
      .then((result) => setAuth(result.authenticated ? "authenticated" : "anonymous"))
      .catch(() => setAuth("anonymous"));
  }, [isPublicSite]);

  useEffect(() => {
    if (isPublicSite || auth === "loading") return;
    const target = auth === "authenticated" ? "/" : "/login";
    if (window.location.pathname !== target) window.history.replaceState(null, "", target);
  }, [auth, isPublicSite]);

  if (isPublicSite) return <DashboardPage isAdmin={false} />;

  if (auth === "loading") {
    return <main className="loading-screen"><span className="spinner" />正在检查登录状态…</main>;
  }
  return auth === "authenticated"
    ? <DashboardPage isAdmin onLoggedOut={() => setAuth("anonymous")} />
    : <LoginPage onLoggedIn={() => setAuth("authenticated")} />;
}
