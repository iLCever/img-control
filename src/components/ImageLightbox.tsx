import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, open, onClose }: ImageLightboxProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
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
  return createPortal(
    <div className="image-lightbox" role="dialog" aria-modal="true" aria-label={`预览 ${alt}`} onMouseDown={onClose}>
      <button ref={closeButtonRef} className="lightbox-close" type="button" aria-label="关闭预览" onClick={onClose}>×</button>
      <figure className="lightbox-content" onMouseDown={(event) => event.stopPropagation()}>
        <img src={src} alt={alt} />
        <figcaption>{alt}</figcaption>
      </figure>
    </div>,
    document.body,
  );
}
