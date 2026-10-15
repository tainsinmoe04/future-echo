"use client";
import { useRef, useState } from "react";
import type { MomentPhoto } from "@/lib/domain";
import { MAX_PHOTOS, validatePhoto } from "@/lib/personal-space";
import { PhotoIcon } from "./icons";
import { readRasterFile } from "@/lib/journal-media";

export function PhotoPicker({ photos, onChange, onBusyChange }: { photos: readonly MomentPhoto[]; onChange: (photos: readonly MomentPhoto[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <div className="echo-photo-picker">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} aria-label="Choose photos" onChange={async (event) => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = "";
      if (!files.length) return;
      if (files.length + photos.length > MAX_PHOTOS) { setError(`Keep up to ${MAX_PHOTOS} photos in one moment.`); return; }
      const problem = files.map(validatePhoto).find(Boolean);
      if (problem) { setError(problem); return; }
      setBusy(true); onBusyChange?.(true); setError("");
      try {
        const additions: MomentPhoto[] = [];
        for (const file of files) additions.push({ id: crypto.randomUUID(), src: await readRasterFile(file), caption: "" });
        onChange([...photos, ...additions]);
      } catch (problem) { setError(problem instanceof Error ? problem.message : "The photo could not be added."); }
      finally { setBusy(false); onBusyChange?.(false); }
    }} />
    <button type="button" onClick={() => input.current?.click()} disabled={busy || photos.length >= MAX_PHOTOS} className="echo-toolbar-button"><PhotoIcon /><span>{busy ? "Adding…" : "Photo"}</span></button>
    {error && <p role="alert" className="echo-error">{error}</p>}
  </div>;
}
