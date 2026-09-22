import { ChevronLeft, Download, RotateCcw, Share } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { extForMime, formatStamp, formatTimecode, shareOrDownload } from "@/lib/media";
import { useStudio } from "@/store/studio";

export function ReviewScreen() {
  const videoUrl = useStudio((s) => s.videoUrl);
  const videoBlob = useStudio((s) => s.videoBlob);
  const elapsedMs = useStudio((s) => s.elapsedMs);
  const goScript = useStudio((s) => s.goScript);
  const retake = useStudio((s) => s.retake);

  const onSave = async () => {
    if (!videoBlob) {
      toast.error("No video to save yet.");
      return;
    }
    const filename = `CueCam-${formatStamp()}.${extForMime(videoBlob.type)}`;
    const result = await shareOrDownload(videoBlob, filename);
    if (result === "shared") toast.success("Share sheet is open — save it to Photos.");
    if (result === "downloaded") toast.success("Video downloaded.");
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-lg flex-col px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-3 pt-2">
        <Button variant="ghost" size="icon" aria-label="Back to script" onClick={goScript}>
          <ChevronLeft className="size-6" />
        </Button>
        <div className="text-center">
          <h1 className="text-base font-medium">Take ready</h1>
          <p className="text-xs tabular-nums text-muted">{formatTimecode(elapsedMs)}</p>
        </div>
        <span className="size-11" />
      </header>

      <div className="mt-4 flex-1 overflow-hidden rounded-2xl bg-bg-elevated shadow-[var(--shadow-lift)]">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            className="h-full min-h-72 w-full bg-bg object-cover"
            style={{ minHeight: "58dvh" }}
          />
        ) : (
          <div className="flex min-h-72 items-center justify-center text-sm text-muted">
            No take captured.
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <Button size="xl" className="w-full" onClick={() => void onSave()} disabled={!videoBlob}>
          <Share className="size-5" />
          Save video
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="secondary" size="lg" onClick={retake}>
            <RotateCcw className="size-4" />
            New take
          </Button>
          <Button variant="outline" size="lg" onClick={() => void onSave()} disabled={!videoBlob}>
            <Download className="size-4" />
            Download
          </Button>
        </div>
        <p className="text-center text-xs leading-relaxed text-faint">
          On iPhone, Save opens the share sheet so you can add it to Photos.
        </p>
      </div>
    </div>
  );
}
