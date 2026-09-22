import { useEffect } from "react";
import { Toaster } from "sonner";
import { ReviewScreen } from "@/components/studio/review-screen";
import { ScriptScreen } from "@/components/studio/script-screen";
import { SettingsScreen } from "@/components/studio/settings-screen";
import { StudioScreen } from "@/components/studio/studio-screen";
import { loadSettings, saveSettings } from "@/lib/storage";
import { useStudio } from "@/store/studio";

export function CueCamApp() {
  const screen = useStudio((s) => s.screen);
  const script = useStudio((s) => s.script);
  const speed = useStudio((s) => s.speed);
  const zoom = useStudio((s) => s.zoom);
  const fontSize = useStudio((s) => s.fontSize);
  const aspect = useStudio((s) => s.aspect);
  const hydrated = useStudio((s) => s.hydrated);
  const hydrate = useStudio((s) => s.hydrate);

  useEffect(() => {
    hydrate(loadSettings());
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    saveSettings({ script, speed, zoom, fontSize, aspect });
  }, [hydrated, script, speed, zoom, fontSize, aspect]);

  return (
    <main className="min-h-dvh bg-bg text-fg">
      {screen === "script" ? <ScriptScreen /> : null}
      {screen === "settings" ? <SettingsScreen /> : null}
      {screen === "studio" ? <StudioScreen /> : null}
      {screen === "review" ? <ReviewScreen /> : null}
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "bg-bg-elevated text-fg border-border font-sans",
          },
        }}
      />
    </main>
  );
}
