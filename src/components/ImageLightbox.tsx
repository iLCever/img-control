import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [flipX, setFlipX] = useState(1);
  const [flipY, setFlipY] = useState(1);

  useEffect(() => {
    if (!open) return;
    // 每次打开都从原始方向与 100% 缩放开始。
    setRotation(0);
    setScale(1);
    setFlipX(1);
    setFlipY(1);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;
  const isQuarterTurn = Math.abs(rotation % 180) === 90;
  const imageTransform = `translate3d(0, 0, 0) rotate(${rotation}deg) scale(${scale * flipX}, ${scale * flipY})`;

  return createPortal(
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`预览 ${alt}`} onMouseDown={onClose}>
      <button ref={closeButtonRef} className="lightbox-close" type="button" aria-label="关闭预览" onClick={onClose}>×</button>
      <figure className={`lightbox-content${isQuarterTurn ? " quarter-turn" : ""}`} onMouseDown={(event) => event.stopPropagation()}>
        <img src={src} alt={alt} style={{ transform: imageTransform }} />
        <figcaption>{alt}</figcaption>
        <div className="lightbox-toolbar" role="toolbar" aria-label="图片预览工具">
          <button type="button" title="上下翻转" aria-label="上下翻转" onClick={() => setFlipY((value) => value * -1)}>↕</button>
          <button type="button" title="左右翻转" aria-label="左右翻转" onClick={() => setFlipX((value) => value * -1)}>↔</button>
          <button type="button" title="向左旋转 90 度" aria-label="向左旋转 90 度" onClick={() => setRotation((value) => value - 90)}>↶</button>
          <button type="button" title="向右旋转 90 度" aria-label="向右旋转 90 度" onClick={() => setRotation((value) => value + 90)}>↷</button>
          <button type="button" title="缩小" aria-label="缩小" disabled={scale <= 0.25} onClick={() => setScale((value) => Math.max(0.25, value - 0.25))}>−</button>
          <button type="button" title="放大" aria-label="放大" disabled={scale >= 3} onClick={() => setScale((value) => Math.min(3, value + 0.25))}>+</button>
        </div>
      </figure>
    </div>,
    document.body,
  );
}
