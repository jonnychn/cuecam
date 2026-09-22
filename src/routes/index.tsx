import { createFileRoute } from "@tanstack/react-router";
import { CueCamApp } from "@/components/studio/cue-cam-app";

export const Route = createFileRoute("/")({
  ssr: false,
  component: Home,
});

function Home() {
  return <CueCamApp />;
}
