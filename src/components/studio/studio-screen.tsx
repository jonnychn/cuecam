import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Pause, Play, SlidersHorizontal, Square } from "lucide-react";
import { Teleprompter } from "@/components/studio/teleprompter";
import { Button } from "@/components/ui/button";
import { useRecorder } from "@/hooks/use-recorder";
import { formatTimecode } from "@/lib/media";
import { ASPECT_RATIO, ASPECTS, type Aspect } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useStudio } from "@/store/studio";

export function StudioScreen() {
  const recState = useStudio((s) => s.recState);
  const elapsedMs = useStudio((s) => s.elapsedMs);
  const cameraMessage = useStudio((s) => s.cameraMessage);
  const setAspect = useStudio((s) => s.setAspect);
  const goScript = useStudio((s) => s.goScript);
  const openSettings = useStudio((s) => s.openSettings);
  const {
    videoRef,
    cameraStatus,
    previewAspect,
    startCamera,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useRecorder();

  const locked = recState !== "idle";
  const live = cameraStatus === "live";
  const frame = useFrameSize(previewAspect);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg text-fg">
      <div ref={frame.ref} className="absolute inset-0 bg-bg">
        <div
          className="camera-stage absolute top-1/2 left-1/2 overflow-hidden"
          style={{
            width: frame.size.w,
            height: frame.size.h,
            transform: "translate(-50%, -50%)",
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "camera-preview h-full w-full -scale-x-100 transition-opacity duration-200",
              live ? "opacity-100" : "opacity-0",
            )}
          />
          {!live ? (
            <IdleStage
              status={cameraStatus}
              message={cameraMessage}
              showEnable={recState === "idle"}
              onEnable={() => void startCamera()}
            />
          ) : null}
          <div className="viewfinder-vignette pointer-events-none absolute inset-0" />
          <ViewfinderCorners />
          <Teleprompter />
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-bg/70 to-transparent pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto flex items-center justify-between px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Back to script"
            disabled={locked}
            onClick={goScript}
            className="bg-bg/35 text-fg backdrop-blur-sm"
          >
            <ChevronLeft className="size-6" />
          </Button>

          <StatusChip recState={recState} elapsedMs={elapsedMs} live={live} />

          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            disabled={locked}
            onClick={openSettings}
            className="bg-bg/35 text-fg backdrop-blur-sm"
          >
            <SlidersHorizontal className="size-5" />
          </Button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-bg/80 via-bg/40 to-transparent pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-16">
        <div className="pointer-events-auto mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4">
          <AspectPicker
            value={previewAspect}
            disabled={locked}
            onChange={setAspect}
          />
          <div className="flex items-center justify-center gap-10">
            <button
              type="button"
              aria-label="Stop recording"
              disabled={recState === "idle"}
              onClick={() => void stopRecording()}
              className={cn(
                "flex size-14 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-border)] transition-[transform,opacity] duration-150 ease-out",
                recState === "idle" ? "opacity-30" : "opacity-100 active:scale-[0.96]",
              )}
            >
              <Square className="size-5 fill-fg text-fg" />
            </button>

            {recState === "recording" ? (
              <RecordButton mode="pause" onClick={pauseRecording} label="Pause recording" />
            ) : recState === "paused" ? (
              <RecordButton mode="resume" onClick={resumeRecording} label="Resume recording" />
            ) : (
              <RecordButton mode="record" onClick={() => void startRecording()} label="Start recording" />
            )}

            <span className="size-14" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

function AspectPicker({
  value,
  disabled,
  onChange,
}: {
  value: Aspect;
  disabled: boolean;
  onChange: (aspect: Aspect) => void;
}) {
  return (
    <div
      className="flex items-center gap-1 rounded-full bg-bg/55 p-1 shadow-[var(--shadow-border)] backdrop-blur-sm"
      role="group"
      aria-label="Aspect ratio"
    >
      {ASPECTS.map((aspect) => {
        const active = aspect === value;
        return (
          <button
            key={aspect}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(aspect)}
            className={cn(
              "h-11 min-w-14 rounded-full px-3 text-xs font-medium tracking-wide transition-[background-color,color,transform] duration-150 ease-out",
              active ? "bg-fg text-bg" : "text-steel",
              disabled ? "opacity-50" : "active:scale-[0.96]",
            )}
          >
            {aspect}
          </button>
        );
      })}
    </div>
  );
}

function useFrameSize(aspect: Aspect) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => fitFrame(aspect, 390, 844));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => setSize(fitFrame(aspect, node.clientWidth, node.clientHeight));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(node);
    return () => ro.disconnect();
  }, [aspect]);

  return { ref, size };
}

function fitFrame(aspect: Aspect, cw: number, ch: number) {
  if (!cw || !ch) return { w: 390, h: 844 };
  const ratio = ASPECT_RATIO[aspect];
  if (cw / ch > ratio) return { w: Math.round(ch * ratio), h: ch };
  return { w: cw, h: Math.round(cw / ratio) };
}

function RecordButton({
  mode,
  onClick,
  label,
}: {
  mode: "record" | "pause" | "resume";
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="relative flex size-20 items-center justify-center rounded-full bg-fg/10 shadow-[var(--shadow-border)] transition-transform duration-150 ease-out active:scale-[0.96]"
    >
      <span className="absolute inset-1 rounded-full border-2 border-fg" />
      {mode === "pause" ? (
        <span className="flex size-10 items-center justify-center rounded-md bg-rec">
          <Pause className="size-5 fill-rec-fg text-rec-fg" />
        </span>
      ) : mode === "resume" ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-rec">
          <Play className="ml-0.5 size-5 fill-rec-fg text-rec-fg" />
        </span>
      ) : (
        <span className="size-12 rounded-full bg-rec" />
      )}
    </button>
  );
}

function StatusChip({
  recState,
  elapsedMs,
  live,
}: {
  recState: string;
  elapsedMs: number;
  live: boolean;
}) {
  const recording = recState === "recording";
  const paused = recState === "paused";
  const label = recording ? (live ? "REC" : "READ") : paused ? "PAUSE" : "READY";
  return (
    <div className="flex h-9 items-center gap-2 rounded-full bg-bg/55 px-3.5 shadow-[var(--shadow-border)] backdrop-blur-sm">
      <span
        className={cn(
          "size-2 rounded-full",
          recording ? "rec-pulse bg-rec" : paused ? "bg-steel" : "bg-faint",
        )}
      />
      <span className="text-xs font-medium tracking-wide tabular-nums">
        {label} {formatTimecode(elapsedMs)}
      </span>
    </div>
  );
}

function IdleStage({
  status,
  message,
  showEnable,
  onEnable,
}: {
  status: string;
  message: string | null;
  showEnable: boolean;
  onEnable: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-bg-elevated px-6">
      <div className="relative size-28 opacity-20" aria-hidden>
        <span className="absolute inset-0 rounded-full border border-border-strong" />
        <span className="absolute inset-4 rounded-full border border-border" />
        <span className="absolute inset-8 rounded-full border border-rec/70" />
        <span className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rec" />
      </div>
      {showEnable ? (
        <div className="z-30 flex flex-col items-center gap-3">
          <p className="max-w-sm text-center text-xs leading-relaxed text-muted">
            {message ??
              (status === "requesting"
                ? "Waiting on camera permission…"
                : "Use your iPhone front camera to record while you read.")}
          </p>
          {status !== "requesting" ? (
            <Button variant="secondary" size="pill" onClick={onEnable}>
              Enable camera
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ViewfinderCorners() {
  return (
    <div className="pointer-events-none absolute inset-4 z-10">
      <Corner className="top-0 left-0 border-t border-l" />
      <Corner className="top-0 right-0 border-t border-r" />
      <Corner className="bottom-0 left-0 border-b border-l" />
      <Corner className="right-0 bottom-0 border-r border-b" />
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={cn("absolute size-7 border-fg/55", className)} />;
}
