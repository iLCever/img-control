import { useEffect, useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { api } from "./services/api";

type AuthState = "loading" | "authenticated" | "anonymous";

export default function App() {
  const [auth, setAuth] = useState<AuthState>("loading");

  useEffect(() => {
    void api.session()
      .then((result) => setAuth(result.authenticated ? "authenticated" : "anonymous"))
      .catch(() => setAuth("anonymous"));
  }, []);

  useEffect(() => {
    if (auth === "loading") return;
    const target = auth === "authenticated" ? "/" : "/login";
    if (window.location.pathname !== target) window.history.replaceState(null, "", target);
  }, [auth]);

  if (auth === "loading") {
    return <main className="loading-screen"><span className="spinner" />正在检查登录状态…</main>;
  }
  return auth === "authenticated"
    ? <DashboardPage onLoggedOut={() => setAuth("anonymous")} />
    : <LoginPage onLoggedIn={() => setAuth("authenticated")} />;
}
