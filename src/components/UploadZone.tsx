import { useRef, useState } from "react";

interface UploadZoneProps {
  disabled: boolean;
  onFiles: (files: File[]) => void;
}

export function UploadZone({ disabled, onFiles }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <section
      className={`upload-zone${dragging ? " is-dragging" : ""}`}
      aria-label="图片上传区域"
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(Array.from(event.dataTransfer.files));
      }}
    >
      <div className="upload-icon" aria-hidden="true">↑</div>
      <h2>拖拽图片到这里</h2>
      <p>也可以点击选择，或直接粘贴截图</p>
      <p className="upload-hint">JPEG · PNG · WebP · GIF · AVIF，单张最大 5 MB</p>
      <button className="button primary" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        选择图片
      </button>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        multiple
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />
    </section>
  );
}
