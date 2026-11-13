"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useJournalState } from "@/components/mock-product-state";
import { BackIcon, SettingsSectionIcon } from "./icons";
import { FontPicker } from "./font-picker";
import { JournalStorageStatus } from "./journal-storage-status";
import { BackendSettings } from "./backend-settings";

export function SpaceSettings({ onClose }: { onClose: () => void }) {
  const backButton = useRef<HTMLButtonElement>(null);
  const [section, setSection] = useState("overview");
  useEffect(() => { backButton.current?.focus(); }, []);
  useEffect(() => {
    if (section !== "overview") document.getElementById(`settings-${section}`)?.focus({ preventScroll: true });
    else backButton.current?.focus({ preventScroll: true });
    document.querySelector(".echo-settings-scroll")?.scrollTo(0, 0);
  }, [section]);
  const { preferences, updatePreferences, identityVersions, activeIdentity } = useJournalState();
  return <section className="echo-settings" data-settings-view={section}>
    <header className="echo-space-header"><button ref={backButton} className="echo-icon-button" aria-label={section === "overview" ? "Back to Your Space" : "Back to Settings"} onClick={() => section === "overview" ? onClose() : setSection("overview")}><BackIcon /></button><h1>Settings</h1><span className="settings-spacer" /></header>
    <div className="settings-workspace">
      <nav className="settings-navigation" aria-label="Settings sections">
        <div className="settings-menu-intro"><h2>Your space, your way.</h2><p>Account, comfort and the things you keep.</p></div>
        {[
          ["connection", "Your account", "Sign-in and account access"],
          ["appearance", "Appearance & reading", "Black & white · text size · motion"],
          ["language", "Language", "Interface and conversation language"],
          ["direction", "Your Future Self", "Your direction and earlier versions"],
          ["data", "Privacy & data", "Permissions, backup and restore"],
          ["help", "Help & about", "A little guidance"]
        ].map(([id, label, description]) => <button key={id} type="button" aria-current={section === id ? "page" : undefined} onClick={() => setSection(id)}><SettingsSectionIcon section={id} className="settings-row-icon" /><span className="settings-row-copy"><strong>{label}</strong><small>{description}</small></span><BackIcon className="settings-row-chevron" /></button>)}
      </nav>
    <div className="echo-settings-scroll" hidden={section === "overview"}>
      <div hidden={section !== "appearance"}><section id="settings-appearance" tabIndex={-1} className="echo-settings-section"><h2>Appearance & reading</h2><div className="settings-value-row"><span>Theme</span><strong>Black & white</strong></div><p className="echo-muted">A dark interface with soft-white controls. Your journal pages keep their own colours.</p>
        <fieldset className="echo-setting-choice"><legend>Text size</legend>{(["regular", "large"] as const).map((size) => <label key={size}><input type="radio" name="reading-size" checked={preferences.readingSize === size} onChange={() => updatePreferences({ readingSize: size })} /><span>{size === "regular" ? "Standard" : "Larger"}</span></label>)}</fieldset>
        <p className="settings-reading-preview">There is no pace you need to keep up with.</p>
        <fieldset className="echo-setting-choice"><legend>Motion</legend>{(["system", "reduced"] as const).map((motion) => <label key={motion}><input type="radio" name="motion" checked={preferences.motion === motion} onChange={() => updatePreferences({ motion })} /><span>{motion === "system" ? "Follow device" : "Reduce motion"}</span></label>)}</fieldset>
        <p className="echo-muted">Your device’s reduced-motion preference is always respected.</p>
      </section>
      <section className="echo-settings-section"><FontPicker label="Default style for new notes" value={preferences.defaultNoteFont} onChange={(defaultNoteFont) => updatePreferences({ defaultNoteFont })} /><p className="echo-muted">Existing pages keep their own style. You can change each page in its editor.</p></section>
      </div><div id="settings-connection" hidden={section !== "connection"} tabIndex={-1}><BackendSettings /></div>
      <section hidden={section !== "direction"} id="settings-direction" tabIndex={-1} className="echo-settings-section"><h2>Your direction</h2><Link href="/future-self" className="journal-direction-row"><span><small>{activeIdentity?.horizon.label ?? "Your next chapter"}</small><strong>{activeIdentity?.definition ?? "Choose your possible future"}</strong><em>Manage your Future Self</em></span><BackIcon className="turn-around" /></Link>
        <details><summary>Earlier conversations</summary>{identityVersions.filter((identity) => identity.status === "past").map((identity) => <Link key={identity.id} className="echo-settings-link" href={`/now?past=${encodeURIComponent(identity.id)}`}>Future Self v{identity.version} · {identity.horizon.label}</Link>)}</details>
      </section>
      <section hidden={section !== "data"} id="settings-data" tabIndex={-1} className="echo-settings-section journal-data-section"><h2>Your pages, in your hands.</h2><p>Pages and drafts stay in this browser on this device. A private backup keeps a second copy with you.</p><JournalStorageStatus backup /><details><summary>Storage & privacy details</summary><p>Wait for “Saved on this device” before closing. Browser cleanup, private browsing or storage failure can remove local data. Your photo journal has no cloud backup.</p><p>Editor drafts save separately. Choose Done to turn a new draft into a saved moment. Chat and drafts stay on this device across tab closure. Chat keeps the existing Free 30-day / Plus 90-day history window; Saved Moments do not expire with chat. Browser cleanup or storage failure can remove local data. Chat is unencrypted and excluded from journal backups. Up to 500 messages per direction fit within a bounded device cache. Account history respects its existing expiry timestamps. No new scheduled deletion was enabled. Provider and backup erasure timing is separate.</p><p>Each moment has its own AI context permission. Notes require separate permission. Photos, decorations, covers, drafts and saved playlists never enter model context.</p><p>Live AI requires server setup, sign-in and explicit connection consent during setup or in the conversation. There are no connected payments or music accounts. Local backups include saved playlists, not conversation history or unfinished drafts.</p></details></section>
      <section hidden={section !== "language"} id="settings-language" tabIndex={-1} className="echo-settings-section"><h2>Language</h2><div className="settings-value-row"><span>App language</span><strong>English</strong></div><p>The interface is currently available in English. A translated interface is not available yet.</p><div className="settings-value-row"><span>Conversation</span><strong>Follows your message</strong></div><p>You can write in English or Myanmar. Reply quality can vary; a manual language preference is not available yet.</p></section>
      <section hidden={section !== "help"} id="settings-help" tabIndex={-1} className="echo-settings-section"><h2>Help & about</h2><details><summary>How Future Echo works</summary><p>Create a possible future identity, then open your conversation. This is an imagined perspective, not a prediction.</p></details><details><summary>Keeping a moment</summary><p>Use the message options to save a moment. Saving it does not automatically give permission to use it in AI replies.</p></details><details><summary>Protecting your journal</summary><p>Use Privacy & data to download a backup. Photos and journal pages stay in this browser; signing in does not upload them.</p></details><p className="echo-muted">Future Echo · Demo beta</p></section>
    </div>
    </div>
  </section>;
}
