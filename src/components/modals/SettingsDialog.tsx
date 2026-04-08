import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/toast-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "@/components/header/ThemeToggle";
import { useSettingsStore } from "@/stores/settings-store";
import { MODELS, SAMPLERS, DEFAULT_MODEL, DEFAULT_SAMPLER, DEFAULT_STEPS, DEFAULT_SCALE } from "@/lib/constants";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t, i18n } = useTranslation();
  const { settings, initializeClient, refreshAnlas, setSetting } = useSettingsStore();
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) return;
    setIsSaving(true);
    try {
      await initializeClient(apiKey.trim());
      await refreshAnlas();
      toast.success(t("settings.apiKeySaved"));
      setApiKey("");
    } catch (e) {
      toastError(String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setSetting("language", lang);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("settings.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* API Key */}
          <div className="space-y-2">
            <Label>{t("settings.apiKey")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.api_key ? "********" : "pst-..."}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button onClick={handleSaveApiKey} disabled={isSaving || !apiKey.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </div>

          {/* Default Parameters */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t("settings.defaultParams")}</Label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{t("generation.model")}</Label>
                <Select
                  value={settings.default_model ?? DEFAULT_MODEL}
                  onValueChange={(v) => setSetting("default_model", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODELS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("generation.sampler")}</Label>
                <Select
                  value={settings.default_sampler ?? DEFAULT_SAMPLER}
                  onValueChange={(v) => setSetting("default_sampler", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SAMPLERS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("generation.steps")}</Label>
                <Input
                  type="number"
                  value={settings.default_steps ?? DEFAULT_STEPS}
                  onChange={(e) => setSetting("default_steps", e.target.value)}
                  min={1}
                  max={50}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">{t("generation.scale")}</Label>
                <Input
                  type="number"
                  value={settings.default_scale ?? DEFAULT_SCALE}
                  onChange={(e) => setSetting("default_scale", e.target.value)}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </div>
            </div>
          </div>

          {/* Theme & Language */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-xs">{t("settings.language")}</Label>
              <Select value={i18n.language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ja">日本語</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("settings.theme")}</Label>
              <div className="pt-1">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
