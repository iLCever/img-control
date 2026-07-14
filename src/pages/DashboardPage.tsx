import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageCard } from "../components/ImageCard";
import { Toast } from "../components/Toast";
import { UploadQueue } from "../components/UploadQueue";
import { UploadZone } from "../components/UploadZone";
import { ApiRequestError, api } from "../services/api";
import type { ImageItem, StatsData, UploadTask } from "../types";
import { formatBytes } from "../utils/format";

interface DashboardPageProps {
  onLoggedOut: () => void;
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_SIZE = 5 * 1024 * 1024;

export function DashboardPage({ onLoggedOut }: DashboardPageProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [stats, setStats] = useState<StatsData>({ count: 0, totalSize: 0 });
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [matchedCount, setMatchedCount] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  const headerInputRef = useRef<HTMLInputElement>(null);

  const uploading = tasks.some((task) => task.status === "uploading" || task.status === "waiting");

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiRequestError && error.status === 401) onLoggedOut();
  }, [onLoggedOut]);

  const loadStats = useCallback(async () => {
    try { setStats(await api.stats()); } catch (error) { handleAuthError(error); }
  }, [handleAuthError]);

  const loadImages = useCallback(async (append = false, cursor: string | null = null) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const data = await api.listImages(cursor, search);
      setImages((current) => append ? [...current, ...data.images] : data.images);
      setNextCursor(data.nextCursor);
      setMatchedCount(data.matchedCount);
      if (!append) setSelected(new Set());
    } catch (error) {
      handleAuthError(error);
      setToast(error instanceof Error ? error.message : "图片列表加载失败");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [handleAuthError, search]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    void Promise.all([loadImages(), loadStats()]);
  }, [loadImages, loadStats]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const addFiles = useCallback((incoming: File[]) => {
    if (incoming.length === 0) return;
    const created = incoming.map<UploadTask>((file) => {
      let error: string | undefined;
      if (!ALLOWED_TYPES.has(file.type)) error = "不支持此图片格式";
      else if (file.size > MAX_SIZE) error = "图片超过 5 MB";
      return { id: crypto.randomUUID(), file, status: error ? "error" : "waiting", error };
    });
    setTasks((current) => [...created, ...current]);

    // 限制为 3 个并发请求，减少浏览器和边缘函数瞬时压力。
    const valid = created.filter((task) => task.status === "waiting");
    void (async () => {
      let index = 0;
      async function worker() {
        while (index < valid.length) {
          const task = valid[index++];
          if (!task) continue;
          setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: "uploading" } : item));
          try {
            const result = await api.upload(task.file);
            setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: "success", result } : item));
          } catch (error) {
            handleAuthError(error);
            setTasks((current) => current.map((item) => item.id === task.id ? {
              ...item,
              status: "error",
              error: error instanceof Error ? error.message : "上传失败",
            } : item));
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(3, valid.length) }, () => worker()));
      if (valid.length > 0) {
        await Promise.all([loadImages(), loadStats()]);
        setToast("上传队列处理完成");
      }
    })();
  }, [handleAuthError, loadImages, loadStats]);

  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null);
      if (files.length > 0) addFiles(files);
    };
    window.addEventListener("paste", paste);
    return () => window.removeEventListener("paste", paste);
  }, [addFiles]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setToast(`${label} 已复制`);
    } catch {
      setToast("复制失败，请检查浏览器权限");
    }
  }

  async function remove(keys: string[]) {
    const label = keys.length === 1 ? "这张图片" : `选中的 ${keys.length} 张图片`;
    if (!window.confirm(`确定永久删除${label}吗？此操作无法撤销。`)) return;
    try {
      await api.deleteImages(keys);
      setToast(`已删除 ${keys.length} 张图片`);
      await Promise.all([loadImages(), loadStats()]);
    } catch (error) {
      handleAuthError(error);
      setToast(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function logout() {
    try { await api.logout(); } finally { onLoggedOut(); }
  }

  const allVisibleSelected = useMemo(() => images.length > 0 && images.every((image) => selected.has(image.key)), [images, selected]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark small">墨</span><div><strong>墨小图床</strong><span>私人图片管理</span></div></div>
        <div className="header-actions">
          <div className="stat-pill"><strong>{stats.count}</strong><span>张图片</span></div>
          <div className="stat-pill"><strong>{formatBytes(stats.totalSize)}</strong><span>已使用</span></div>
          <button className="button primary header-upload" type="button" disabled={uploading} onClick={() => headerInputRef.current?.click()}>上传</button>
          <input
            ref={headerInputRef}
            className="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            multiple
            onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }}
          />
          <button className="icon-button" type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} title="切换主题">
            {theme === "light" ? "☾" : "☀"}
          </button>
          <button className="button quiet" type="button" onClick={() => { void logout(); }}>退出</button>
        </div>
      </header>

      <main className="dashboard">
        <UploadZone disabled={uploading} onFiles={addFiles} />
        <UploadQueue tasks={tasks} onClear={() => setTasks((current) => current.filter((task) => task.status === "waiting" || task.status === "uploading"))} />

        <section className="library-section">
          <div className="library-heading">
            <div><h2>图片库</h2><p>{search ? `找到 ${matchedCount} 张匹配图片` : `共 ${stats.count} 张图片`}</p></div>
            <form className="search-form" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
              <input aria-label="搜索图片" placeholder="搜索文件名或存储 Key" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} />
              <button className="button quiet" type="submit">搜索</button>
              {search && <button className="text-button" type="button" onClick={() => { setSearchInput(""); setSearch(""); }}>清除</button>}
            </form>
          </div>

          <div className="bulk-bar">
            <label><input type="checkbox" checked={allVisibleSelected} onChange={(event) => setSelected(event.target.checked ? new Set(images.map((image) => image.key)) : new Set())} /> 全选当前页</label>
            <span>已选择 {selected.size} 张</span>
            <button className="button danger" type="button" disabled={selected.size === 0} onClick={() => { void remove([...selected]); }}>批量删除</button>
            <button className="button quiet" type="button" disabled={loading} onClick={() => { void Promise.all([loadImages(), loadStats()]); }}>刷新</button>
          </div>

          {loading ? (
            <div className="empty-state"><span className="spinner" />正在加载图片…</div>
          ) : images.length === 0 ? (
            <div className="empty-state">{search ? "没有找到匹配的图片" : "还没有图片，从上方上传第一张吧"}</div>
          ) : (
            <div className="image-grid">
              {images.map((image) => (
                <ImageCard
                  key={image.key}
                  image={image}
                  selected={selected.has(image.key)}
                  onSelect={(checked) => setSelected((current) => { const next = new Set(current); checked ? next.add(image.key) : next.delete(image.key); return next; })}
                  onDelete={() => { void remove([image.key]); }}
                  onCopy={(text, label) => { void copy(text, label); }}
                />
              ))}
            </div>
          )}
          {nextCursor && <button className="button load-more" type="button" disabled={loadingMore} onClick={() => { void loadImages(true, nextCursor); }}>{loadingMore ? "加载中…" : "加载更多"}</button>}
        </section>
      </main>
      {toast && <Toast message={toast} />}
    </div>
  );
}
