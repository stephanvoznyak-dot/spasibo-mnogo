import { createFileRoute } from "@tanstack/react-router";
import { AppRoot } from "@/ui/screens";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AppRoot />;
}
