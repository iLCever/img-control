import { useState } from "react";
import { ImageLightbox } from "./ImageLightbox";
import type { ImageItem } from "../types";
import { formatBytes, formatDate, shortType } from "../utils/format";

interface ImageCardProps {
  image: ImageItem;
  manageable: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDelete: () => void;
  onCopy: (text: string, label: string) => void;
}

export function ImageCard({ image, manageable, selected, onSelect, onDelete, onCopy }: ImageCardProps) {
  const [failed, setFailed] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const copies = [
    ["URL", image.url],
    ["Markdown", `![](${image.url})`],
    ["HTML", `<img src="${image.url}" alt="image">`],
    ["BBCode", `[img]${image.url}[/img]`],
  ] as const;

  return (
    <article className={`image-card${selected ? " is-selected" : ""}`}>
      <div className="image-preview">
        {failed ? (
          <div className="image-placeholder" role="img" aria-label="图片加载失败">图片无法加载</div>
        ) : (
          <img src={image.url} alt={image.originalName} loading="lazy" onError={() => setFailed(true)} />
        )}
        {!failed && (
          <button className="thumbnail-preview-button" type="button" aria-label={`预览 ${image.originalName}`} onClick={() => setPreviewing(true)} />
        )}
        {manageable && (
          <label className="select-box" title="选择图片">
            <input type="checkbox" checked={selected} onChange={(event) => onSelect(event.target.checked)} />
            <span aria-hidden="true">✓</span>
          </label>
        )}
      </div>
      <div className="card-body">
        <strong className="file-name" title={image.originalName}>{image.originalName}</strong>
        <div className="image-meta">
          <span>{shortType(image.contentType)}</span><span>{formatBytes(image.size)}</span><span>{formatDate(image.uploadedAt)}</span>
        </div>
        <code className="image-key" title={image.key}>{image.key}</code>
        <div className="copy-grid">
          {copies.map(([label, value]) => (
            <button type="button" key={label} onClick={() => onCopy(value, label)}>复制 {label}</button>
          ))}
        </div>
        {manageable && <button className="delete-button" type="button" onClick={onDelete}>删除图片</button>}
      </div>
      <ImageLightbox src={image.url} alt={image.originalName} open={previewing} onClose={() => setPreviewing(false)} />
    </article>
  );
}
