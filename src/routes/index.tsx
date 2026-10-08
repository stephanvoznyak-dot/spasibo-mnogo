import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppRoot, BootScreen } from "@/ui/screens";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <BootScreen />;
  return <AppRoot />;
}
