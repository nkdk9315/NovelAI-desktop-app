import { createElement } from "react";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import i18n from "@/i18n";

export function toastError(message: string) {
  toast.error(message, {
    action: {
      label: createElement(Copy, { className: "h-3.5 w-3.5" }),
      onClick: () => {
        navigator.clipboard.writeText(message);
        toast.success(i18n.t("common.copied"));
      },
    },
  });
}
