"use client";

import dynamic from "next/dynamic";
import { installStorage } from "@/lib/storage-client";

// window.storage must exist before the trainer mounts; installing at module
// scope guarantees it runs before any effect inside the component.
installStorage();

// The trainer seeds its first problem with Math.random, so it must not be
// server-rendered — the hydration pass would disagree with the server HTML.
const MentalMathTrainer = dynamic(() => import("./MentalMathTrainer"), {
  ssr: false,
});

export default function TrainerClient() {
  return <MentalMathTrainer />;
}
