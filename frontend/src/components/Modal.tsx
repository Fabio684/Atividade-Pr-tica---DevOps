import { useId, type ReactNode } from "react";

interface ModalProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
}

export function Modal({ title, children, onClose }: ModalProps) {
  const generatedId = useId();
  const titleId = `${generatedId}-title`;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.currentTarget === event.target && onClose()}>
      <div className="modal-card">
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}