import { Camera, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_SCRIPT } from "@/lib/storage";
import { wordStats } from "@/lib/media";
import { useStudio } from "@/store/studio";

export function ScriptScreen() {
  const script = useStudio((s) => s.script);
  const setScript = useStudio((s) => s.setScript);
  const goStudio = useStudio((s) => s.goStudio);
  const openSettings = useStudio((s) => s.openSettings);
  const { words, read } = wordStats(script);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="enter-rise flex items-start justify-between gap-4 pt-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium tracking-widest text-muted uppercase">
            <span className="size-1.5 rounded-full bg-rec" />
            CueCam
          </p>
          <h1 className="font-display mt-3 text-4xl leading-tight font-medium tracking-tight text-fg italic">
            Look into the lens.
            <br />
            Then talk.
          </h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open settings"
          onClick={openSettings}
          className="shrink-0 text-muted hover:text-fg"
        >
          <SlidersHorizontal className="size-5" />
        </Button>
      </header>

      <section className="enter-rise-2 mt-8 flex min-h-0 flex-1 flex-col rounded-2xl bg-bg-elevated p-4 shadow-[var(--shadow-border)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted">Your script</p>
          <button
            type="button"
            onClick={() => setScript(DEFAULT_SCRIPT)}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-xs font-medium text-faint transition-colors duration-150 hover:text-fg"
          >
            <RotateCcw className="size-3.5" />
            Sample
          </button>
        </div>
        <Textarea
          value={script}
          onChange={(event) => setScript(event.target.value)}
          placeholder="Paste or write what you want to say…"
          className="min-h-56 flex-1 text-base leading-relaxed"
          aria-label="Teleprompter script"
        />
        <p className="mt-3 text-xs tabular-nums text-faint">
          {words} {words === 1 ? "word" : "words"} · {read}
        </p>
      </section>

      <div className="enter-rise-3 mt-6 flex flex-col gap-3">
        <Button size="xl" onClick={goStudio} className="w-full">
          <Camera className="size-5" />
          Open front camera
        </Button>
        <p className="text-center text-xs leading-relaxed text-faint">
          The teleprompter sits over your selfie view. Hit record, read, and save the take.
        </p>
      </div>
    </div>
  );
}
