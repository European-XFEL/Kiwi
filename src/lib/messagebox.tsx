import { useState } from 'react';
import { toast } from 'sonner';

type ToastVariant = 'info' | 'error' | 'warning';

type MessageBoxProps = {
  variant?: ToastVariant;
  title: string;
  msg: string;
  details?: string;
  duration?: number;
};

type BoxDetailsProps = {
  msg: string;
  details?: string;
};

function BoxDetails({ msg, details }: BoxDetailsProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div>{msg}</div>

      {details && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-xs font-medium underline underline-offset-2"
          >
            {open ? 'Hide details' : 'Show details'}
          </button>

          {open && (
            <div className="rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap font-mono">
              {details}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function showMessageBox({
  variant = 'info',
  title,
  msg,
  details,
  duration = 8000,
}: MessageBoxProps) {
  const options = {
    closeButton: true,
    duration,
    description: <BoxDetails msg={msg} details={details} />,
  };

  switch (variant) {
    case 'error':
      toast.error(title, options);
      break;
    case 'warning':
      toast.warning(title, options);
      break;
    default:
      toast.info(title, options);
      break;
  }
}
