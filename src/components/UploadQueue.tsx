import type { UploadTask } from "../types";
import { formatBytes } from "../utils/format";

interface UploadQueueProps {
  tasks: UploadTask[];
  onClear: () => void;
}

const STATUS_LABEL: Record<UploadTask["status"], string> = {
  waiting: "等待上传",
  uploading: "上传中…",
  success: "上传成功",
  error: "上传失败",
};

export function UploadQueue({ tasks, onClear }: UploadQueueProps) {
  if (tasks.length === 0) return null;
  return (
    <section className="panel upload-queue" aria-label="上传队列">
      <div className="section-heading">
        <h2>上传进度</h2>
        <button className="text-button" type="button" onClick={onClear}>清除已完成</button>
      </div>
      <div className="queue-list">
        {tasks.map((task) => (
          <div className="queue-row" key={task.id}>
            <span className={`status-dot ${task.status}`} aria-hidden="true" />
            <div className="queue-info">
              <strong title={task.file.name}>{task.file.name}</strong>
              <span>{formatBytes(task.file.size)} · {task.error ?? STATUS_LABEL[task.status]}</span>
            </div>
            <span className={`status-label ${task.status}`}>{STATUS_LABEL[task.status]}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
