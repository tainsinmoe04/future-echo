"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useMockProductState } from "@/components/mock-product-state";
import { BackIcon } from "./icons";
import { FontPicker } from "./font-picker";
import { JournalStorageStatus } from "./journal-storage-status";
import { BackendSettings } from "./backend-settings";

export function SpaceSettings({ onClose }: { onClose: () => void }) {
  const backButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { backButton.current?.focus(); }, []);
  const { preferences, updatePreferences, identityVersions, activeIdentity } = useMockProductState();
  return <section className="echo-settings">
    <header className="echo-space-header"><button ref={backButton} className="echo-icon-button" aria-label="Back to Your Space" onClick={onClose}><BackIcon /></button><h1>Settings</h1><span className="settings-spacer" /></header>
    <div className="echo-settings-scroll">
      <div className="journal-settings-heading"><span className="journal-eyebrow">YOUR LITTLE CORNER</span><p className="echo-settings-intro">Make room<br />for yourself.</p><p>Small comforts for the pages you keep.</p></div>
      <BackendSettings />
      <section className="echo-settings-section"><h2>Reading comfort</h2>
        <fieldset className="echo-setting-choice"><legend>Text size</legend>{(["regular", "large"] as const).map((size) => <label key={size}><input type="radio" name="reading-size" checked={preferences.readingSize === size} onChange={() => updatePreferences({ readingSize: size })} /><span>{size === "regular" ? "Standard" : "Larger"}</span></label>)}</fieldset>
        <p className="settings-reading-preview">There is no pace you need to keep up with.</p>
        <fieldset className="echo-setting-choice"><legend>Motion</legend>{(["system", "reduced"] as const).map((motion) => <label key={motion}><input type="radio" name="motion" checked={preferences.motion === motion} onChange={() => updatePreferences({ motion })} /><span>{motion === "system" ? "Follow device" : "Reduce motion"}</span></label>)}</fieldset>
        <p className="echo-muted">Your device’s reduced-motion preference is always respected.</p>
      </section>
      <section className="echo-settings-section"><FontPicker label="Default style for new notes" value={preferences.defaultNoteFont} onChange={(defaultNoteFont) => updatePreferences({ defaultNoteFont })} /><p className="echo-muted">Existing pages keep their own style. You can change each page in its editor.</p></section>
      <section className="echo-settings-section"><h2>Your direction</h2><Link href="/future-self" className="journal-direction-row"><span><small>{activeIdentity?.horizon.label ?? "Your next chapter"}</small><strong>{activeIdentity?.definition ?? "Choose your possible future"}</strong><em>Manage your Future Self</em></span><span aria-hidden="true">↗</span></Link>
        <details><summary>Earlier conversations</summary>{identityVersions.filter((identity) => identity.status === "past").map((identity) => <Link key={identity.id} className="echo-settings-link" href={`/now?past=${encodeURIComponent(identity.id)}`}>Future Self v{identity.version} · {identity.horizon.label}</Link>)}</details>
      </section>
      <section className="echo-settings-section journal-data-section"><span className="journal-eyebrow">KEEP A COPY</span><h2>Your pages, in your hands.</h2><p>Pages and drafts stay in this browser on this device. A private backup keeps a second copy with you.</p><JournalStorageStatus backup /><details><summary>Storage & privacy details</summary><p>Wait for “Saved on this device” before closing. Browser cleanup, private browsing or storage failure can remove local data. Your photo journal has no cloud backup.</p><p>Editor drafts save separately. Choose Done to turn a new draft into a saved moment. Chat and unsent words recover across reloads in this tab for up to 24 hours. Closing the tab, browser cleanup or storage failure can remove that temporary copy. It is not encrypted or included in journal backups. Connected account history lasts 30 days on Free or 90 days on Plus; this tab reconnects your explicitly connected account and loads up to 100 messages.</p><p>Each moment has its own AI context permission. Notes require separate permission. Photos, decorations, covers, drafts and saved playlists never enter model context.</p><p>Live AI requires server setup, sign-in and explicit connection consent during setup or in the conversation. There are no connected payments or music accounts. Local backups include saved playlists, not conversation history or unfinished drafts.</p></details></section>
    </div>
  </section>;
}
