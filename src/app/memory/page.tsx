"use client";
import "@/app/journal-romantic.css";
import { useRouter } from "next/navigation";
import { PersonalSpace } from "@/components/echo/personal-space";
export default function Memory() {
  const router = useRouter();
  return <main className="echo-ui echo-stage"><div className="echo-memory-shell"><PersonalSpace onClose={() => router.push("/now")} /></div></main>;
}
