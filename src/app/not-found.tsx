import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="echo-ui echo-stage"><section className="echo-empty-chat">
    <Brand /><p className="journal-eyebrow">404 · Page not found</p>
    <h1>This page isn’t here.</h1>
    <p>The link may have changed. Your conversation and saved pages have not been deleted.</p>
    <Link href="/now" className="echo-button white">Back to your conversation</Link>
    <Link href="/memory" className="echo-button outline">Open Your Space</Link>
  </section></main>;
}
