# CueCam

Front-camera teleprompter for talking to camera. Write a script, read it while you record, save the take.

Built for iPhone Safari. Open the site, allow camera + mic, then record.

## What it does

- Front camera preview with 1:1, 4:3, and 16:9 frames
- Scrolling teleprompter over the live view
- Record / pause / stop
- Speed and font size in settings (locked once recording starts)
- Save the video to your phone

## Run locally

Needs Node 22+.

```bash
npm install
npm run dev
```

Then open the app on your iPhone over HTTPS (or localhost on a Mac). Camera access requires a secure context.

```bash
npm run build
npm run typecheck
```

## Stack

React 19, TanStack Start, Tailwind v4, Zustand. Preview and recording use `getUserMedia` + `MediaRecorder`.
