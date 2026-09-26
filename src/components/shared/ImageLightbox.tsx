import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface ImageLightboxProps {
  src: string | null;
  title: string;
  onClose: () => void;
}

/** Full-size preview of a thumbnail. Click anywhere or press Esc to close. */
export default function ImageLightbox({ src, title, onClose }: ImageLightboxProps) {
  return (
    <Dialog open={src !== null} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        className="w-auto max-w-[90vw] border-none bg-transparent p-0 shadow-none sm:max-w-[90vw]"
        onClick={onClose}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        {src && (
          <img src={src} alt={title} className="max-h-[85vh] max-w-[90vw] rounded-md object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}
