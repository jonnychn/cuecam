import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyHardwareZoom,
  cameraErrorMessage,
  captureFramedStream,
  isSecureCameraContext,
  MAX_TAKE_MS,
  pickRecorderMime,
  requestWakeLock,
  startFrontCamera,
  stopStream,
  type CameraStatus,
} from "@/lib/media";
import { useStudio } from "@/store/studio";

export function useRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasStopRef = useRef<null | (() => void)>(null);
  const wakeRef = useRef<null | { release: () => Promise<void> }>(null);
  const timerRef = useRef<number>(0);
  const clockRef = useRef({ origin: 0, base: 0 });
  const lockedAspectRef = useRef(useStudio.getState().aspect);
  const stopRef = useRef<() => Promise<void>>(async () => {});

  const recState = useStudio((s) => s.recState);
  const aspect = useStudio((s) => s.aspect);
  const setRecState = useStudio((s) => s.setRecState);
  const setElapsedMs = useStudio((s) => s.setElapsedMs);
  const setCameraMessage = useStudio((s) => s.setCameraMessage);
  const setVideo = useStudio((s) => s.setVideo);
  const goReview = useStudio((s) => s.goReview);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");

  const attachStream = useCallback(async (stream: MediaStream) => {
    streamRef.current = stream;
    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      try {
        await video.play();
      } catch {
        /* autoplay can wait for a tap */
      }
    }
    const track = stream.getVideoTracks()[0];
    if (track) await applyHardwareZoom(track, 1);
    setCameraStatus("live");
  }, []);

  const startCamera = useCallback(async () => {
    if (!isSecureCameraContext()) {
      setCameraStatus("unavailable");
      setCameraMessage("Open CueCam on your iPhone to use the front camera.");
      return;
    }
    setCameraStatus("requesting");
    setCameraMessage(null);
    try {
      const stream = await startFrontCamera();
      await attachStream(stream);
    } catch (err) {
      const message = cameraErrorMessage(err);
      setCameraMessage(message);
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setCameraStatus(denied ? "denied" : "unavailable");
    }
  }, [attachStream, setCameraMessage]);

  const stopCamera = useCallback(() => {
    stopStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }, []);

  useEffect(() => {
    void startCamera();
    return () => {
      stopCamera();
      window.clearInterval(timerRef.current);
      canvasStopRef.current?.();
      void wakeRef.current?.release();
    };
    // Mount/unmount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearTimer = useCallback(() => {
    window.clearInterval(timerRef.current);
  }, []);

  const startClock = useCallback(
    (reset: boolean) => {
      if (reset) {
        clockRef.current = { origin: performance.now(), base: 0 };
        setElapsedMs(0);
      } else {
        clockRef.current.origin = performance.now();
      }
      clearTimer();
      timerRef.current = window.setInterval(() => {
        const { origin, base } = clockRef.current;
        const next = base + (performance.now() - origin);
        setElapsedMs(next);
        if (next >= MAX_TAKE_MS) void stopRef.current();
      }, 80);
    },
    [clearTimer, setElapsedMs],
  );

  const startRecording = useCallback(async () => {
    const stream = streamRef.current;
    const video = videoRef.current;
    const live = cameraStatus === "live" && stream;

    if (!live) {
      setRecState("recording");
      startClock(true);
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setCameraMessage("This browser can’t record video. Try Safari on iPhone.");
      setRecState("recording");
      startClock(true);
      return;
    }

    lockedAspectRef.current = useStudio.getState().aspect;
    const track = stream.getVideoTracks()[0];
    if (track) await applyHardwareZoom(track, 1);

    canvasStopRef.current?.();
    canvasStopRef.current = null;

    let recordStream: MediaStream = stream;
    if (video) {
      const captured = captureFramedStream(video, stream, lockedAspectRef.current);
      if (captured) {
        recordStream = captured.stream;
        canvasStopRef.current = captured.stop;
      }
    }

    const mime = pickRecorderMime();
    let recorder: MediaRecorder;
    try {
      recorder = mime
        ? new MediaRecorder(recordStream, {
            mimeType: mime,
            videoBitsPerSecond: 5_500_000,
          })
        : new MediaRecorder(recordStream);
    } catch {
      try {
        recorder = new MediaRecorder(stream);
      } catch (err) {
        canvasStopRef.current?.();
        canvasStopRef.current = null;
        setCameraMessage(cameraErrorMessage(err));
        return;
      }
    }

    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onerror = () => {
      setCameraMessage("Recording failed. Try again.");
    };
    recorderRef.current = recorder;
    recorder.start(1000);
    setVideo(null);
    setCameraMessage(null);
    setRecState("recording");
    startClock(true);
    wakeRef.current = await requestWakeLock();
  }, [
    cameraStatus,
    setCameraMessage,
    setRecState,
    setVideo,
    startClock,
  ]);

  const pauseRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      try {
        recorder.pause();
      } catch {
        /* some browsers skip pause */
      }
    }
    clockRef.current.base += performance.now() - clockRef.current.origin;
    clearTimer();
    setRecState("paused");
  }, [clearTimer, setRecState]);

  const resumeRecording = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "paused") {
      try {
        recorder.resume();
      } catch {
        /* continue clock even if resume throws */
      }
    }
    startClock(false);
    setRecState("recording");
  }, [setRecState, startClock]);

  const stopRecording = useCallback(async () => {
    const recorder = recorderRef.current;
    clearTimer();
    void wakeRef.current?.release();
    wakeRef.current = null;

    if (!recorder || recorder.state === "inactive") {
      recorderRef.current = null;
      canvasStopRef.current?.();
      canvasStopRef.current = null;
      setRecState("idle");
      return;
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || chunksRef.current[0]?.type || "video/mp4";
        const parts = chunksRef.current;
        resolve(parts.length ? new Blob(parts, { type }) : null);
      };
      try {
        if (recorder.state === "paused") recorder.resume();
      } catch {
        /* continue to stop */
      }
      try {
        recorder.stop();
      } catch {
        resolve(null);
      }
    });

    recorderRef.current = null;
    canvasStopRef.current?.();
    canvasStopRef.current = null;
    setRecState("idle");

    if (!blob || blob.size < 64) {
      setCameraMessage("Nothing was captured. Check camera permission and try a new take.");
      return;
    }
    setVideo(blob);
    goReview();
  }, [clearTimer, goReview, setCameraMessage, setRecState, setVideo]);

  stopRef.current = stopRecording;

  const previewAspect = recState === "idle" ? aspect : lockedAspectRef.current;

  return {
    videoRef,
    cameraStatus,
    previewAspect,
    startCamera,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
}
