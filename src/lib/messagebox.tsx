import { toast } from 'sonner';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/api';

type ToastVariant = 'info' | 'error' | 'warning';

type MessageBoxProps = {
  variant?: ToastVariant;
  title: string;
  msg: string;
  details?: string;
  duration?: number;
};

type BoxDetailsProps = {
  title: string;
  msg: string;
  details?: string;
};

function BoxDetails({ title, msg, details }: BoxDetailsProps) {
  return (
    <div className="space-y-3">
      <Dialog>
        <div>{msg}</div>
        {details && (
          <form>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                data-testid="message-show-details"
                className="text-xs font-medium underline underline-offset-2"
              >
                Show Details
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{msg}</DialogDescription>
              </DialogHeader>
              <div className="-mx-4 no-scrollbar max-h-[50vh] overflow-y-auto px-4 text-xs whitespace-pre-wrap font-mono">
                {details}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  data-testid="message-copy-details"
                  onClick={() => {
                    navigator.clipboard.writeText(details);
                  }}
                >
                  Copy to Clipboard
                </Button>
              </DialogFooter>
            </DialogContent>
          </form>
        )}
      </Dialog>
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
    description: <BoxDetails title={title} msg={msg} details={details} />,
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
