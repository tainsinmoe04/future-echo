"use client";
import { useId } from "react";
import type { NoteFont } from "@/lib/domain";
import { NOTE_FONTS } from "@/lib/scrapbook";

export function FontPicker({ value, onChange, label = "Note style" }: {
  value: NoteFont; onChange: (font: NoteFont) => void; label?: string;
}) {
  const group = useId();
  return <fieldset className="echo-font-picker"><legend>{label}</legend>
    <div className="echo-font-options">{NOTE_FONTS.map((font) => <label key={font.id}>
      <input type="radio" name={group} value={font.id} checked={value === font.id} onChange={() => onChange(font.id)} />
      <span><span className="font-sample" data-note-font={font.id}>A little moment<span lang="my" className="font-myanmar-sample">အမှတ်တရ</span></span><strong>{font.label}</strong><small>{font.description}</small></span>
    </label>)}</div>
    <p>For notes and photo captions. Myanmar styles use Noto Sans, Padauk, or Noto Serif; handwriting applies to Latin text.</p>
  </fieldset>;
}
