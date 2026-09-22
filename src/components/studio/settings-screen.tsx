import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { speedLabel } from "@/lib/media";
import { useStudio } from "@/store/studio";

export function SettingsScreen() {
  const speed = useStudio((s) => s.speed);
  const fontSize = useStudio((s) => s.fontSize);
  const recState = useStudio((s) => s.recState);
  const setSpeed = useStudio((s) => s.setSpeed);
  const setFontSize = useStudio((s) => s.setFontSize);
  const closeSettings = useStudio((s) => s.closeSettings);
  const locked = recState !== "idle";

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center gap-2 pt-2">
        <Button variant="ghost" size="icon" aria-label="Back" onClick={closeSettings}>
          <ChevronLeft className="size-6" />
        </Button>
        <div>
          <h1 className="text-lg font-medium tracking-tight">Settings</h1>
          <p className="text-xs text-muted">
            {locked ? "Locked while a take is in progress." : "Scroll speed and type size freeze when you hit record."}
          </p>
        </div>
      </header>

      <div className="mt-8 flex flex-col gap-8">
        <SettingBlock
          label="Scroll speed"
          value={speedLabel(speed)}
          hint="How fast the script climbs while you talk."
        >
          <Slider
            min={18}
            max={140}
            step={1}
            value={[speed]}
            disabled={locked}
            onValueChange={(v) => setSpeed(v[0] ?? speed)}
            aria-label="Teleprompter scroll speed"
          />
          <div className="mt-1 flex justify-between text-xs text-faint">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </SettingBlock>

        <SettingBlock
          label="Prompt size"
          value={`${Math.round(fontSize)} px`}
          hint="Larger type is easier to read without leaning in."
        >
          <Slider
            min={24}
            max={56}
            step={1}
            value={[fontSize]}
            disabled={locked}
            onValueChange={(v) => setFontSize(v[0] ?? fontSize)}
            aria-label="Teleprompter text size"
          />
        </SettingBlock>

        <div className="rounded-xl bg-bg-elevated px-5 py-6 shadow-[var(--shadow-border)]">
          <p className="text-center text-xs font-medium tracking-[0.16em] text-faint uppercase">
            Reading preview
          </p>
          <p
            className="mt-4 text-center font-medium leading-snug text-fg"
            style={{ fontSize: `${fontSize}px`, letterSpacing: "-0.02em" }}
          >
            Say it like a friend.
          </p>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <Button size="lg" className="w-full" onClick={closeSettings}>
          Done
        </Button>
      </div>
    </div>
  );
}

function SettingBlock({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <Label className="text-fg">{label}</Label>
        <span className="text-sm font-medium tabular-nums text-steel">{value}</span>
      </div>
      {children}
      <p className="mt-2 text-xs leading-relaxed text-faint">{hint}</p>
    </section>
  );
}
