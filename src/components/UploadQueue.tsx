import { useEffect, useRef, useState } from "react";
import type { UploadTask } from "../types";
import { formatBytes } from "../utils/format";

interface UploadQueueProps {
  tasks: UploadTask[];
  onClear: () => void;
}

const STATUS_LABEL: Record<UploadTask["status"], string> = {
  waiting: "等待上传",
  uploading: "正在上传",
  success: "上传完成",
  error: "上传失败",
};

function ResultField({ label, value }: { label: string; value: string }) {
  const [tip, setTip] = useState<{ id: number; text: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function showTip(text: string) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setTip({ id: Date.now(), text });
    timerRef.current = window.setTimeout(() => setTip(null), 1200);
  }

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      showTip("已复制");
    } catch {
      showTip("复制失败");
    }
  }

  return (
    <label className="result-field">
      <span>{label}</span>
      <span className="result-input-wrap">
        <input
          readOnly
          value={value}
          onClick={(event) => { event.currentTarget.select(); showTip("双击复制"); }}
          onDoubleClick={() => { void copyValue(); }}
        />
        {tip && <small key={tip.id} className="field-copy-tip" role="status">{tip.text}</small>}
      </span>
    </label>
  );
}

function UploadResultCard({ task }: { task: UploadTask }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const progress = Math.max(0, Math.min(100, task.progress));

  useEffect(() => {
    const url = URL.createObjectURL(task.file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [task.file]);

  return (
    <article className={`upload-result-card ${task.status}`}>
      <div className="upload-result-preview">
        {previewUrl && <img src={previewUrl} alt={task.file.name} />}
        {task.status === "success" && <span className="upload-success-mark" aria-label="上传成功">✓</span>}
        <strong title={task.file.name}>{task.file.name}</strong>
        <small>{formatBytes(task.file.size)}</small>
      </div>

      <div className="upload-result-detail">
        <div className="upload-progress-heading">
          <span>{STATUS_LABEL[task.status]}</span>
          <strong>{progress}%</strong>
        </div>
        <div
          className="upload-progress-track"
          role="progressbar"
          aria-label={`${task.file.name} 上传进度`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        {task.error && <p className="upload-result-error">{task.error}</p>}
        {task.result && (
          <div className="upload-result-links">
            <ResultField label="URL" value={task.result.url} />
            <ResultField label="Markdown" value={`![](${task.result.url})`} />
            <ResultField label="BBCode" value={`[img]${task.result.url}[/img]`} />
            <ResultField label="HTML" value={`<img src="${task.result.url}" alt="image">`} />
          </div>
        )}
      </div>
    </article>
  );
}

export function UploadQueue({ tasks, onClear }: UploadQueueProps) {
  if (tasks.length === 0) return null;
  const active = tasks.some((task) => task.status === "waiting" || task.status === "uploading");

  return (
    <section className="panel upload-queue" aria-label="上传文件">
      <div className="section-heading">
        <h2>上传文件 <span>({tasks.length})</span></h2>
        <button
          className="button clear-files-button"
          type="button"
          onClick={onClear}
          disabled={active}
          title={active ? "请等待当前上传完成" : "清空上传记录"}
        >
          清空文件
        </button>
      </div>
      <div className="upload-result-list">
        {tasks.map((task) => <UploadResultCard key={task.id} task={task} />)}
      </div>
    </section>
  );
}
