"use client";
import { useState } from "react";
import { useMockProductState } from "../mock-product-state";
import { backendRequest } from "@/lib/backend-client";
import { songSearchUrl, type PlaylistSuggestion, type SavedPlaylist } from "@/lib/playlist";
export function PlaylistCard({ playlist, messageId, saved: existing }: { playlist: PlaylistSuggestion; messageId: string; saved?: SavedPlaylist }) {
  const { journalSnapshot, updateJournal, connectedAI, localAI, activeIdentity } = useMockProductState();
  const saved = existing ?? journalSnapshot.playlists?.find((p) => p.sourceMessageId === messageId);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function change() {
    setBusy(true); setError("");
    try {
      if (localAI) {
        if (saved) updateJournal((current) => ({ ...current, playlists: current.playlists?.filter((p) => p.id !== saved.id) }));
        else if (activeIdentity) {
          const item: SavedPlaylist = { ...playlist, id: crypto.randomUUID(), identityVersionId: activeIdentity.id, sourceMessageId: messageId, savedAt: new Date().toISOString() };
          updateJournal((current) => ({ ...current, playlists: [...(current.playlists ?? []), item] }));
        }
        return;
      }
      if (saved) {
        await backendRequest("/api/playlists", { id: saved.id }, "DELETE");
        updateJournal((current) => ({ ...current, playlists: current.playlists?.filter((p) => p.id !== saved.id) }));
      } else {
        const result = await backendRequest<{ playlist: SavedPlaylist }>("/api/playlists", { messageId });
        updateJournal((current) => ({ ...current, playlists: [...(current.playlists ?? []).filter((p) => p.id !== result.playlist.id), result.playlist] }));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Playlist could not be saved."); } finally { setBusy(false); }
  }
  return <section className="echo-playlist" aria-label={`Playlist: ${playlist.title}`}><h3>{playlist.title}</h3><p>{playlist.description}</p><ol>{playlist.songs.map((song) => <li key={`${song.artist}:${song.title}`}><span><strong>{song.title}</strong><small>{song.artist}</small></span><a href={songSearchUrl(song)} target="_blank" rel="noreferrer">YouTube<span className="sr-only"> search for {song.title}</span> ↗</a><a href={songSearchUrl(song, "spotify")} target="_blank" rel="noreferrer">Spotify<span className="sr-only"> search for {song.title}</span> ↗</a></li>)}</ol><p className="echo-muted">Suggestions, not verified catalog results. Links open a search. Nothing plays automatically.</p><button className="echo-button outline" disabled={busy || (!saved && !connectedAI && !localAI)} onClick={() => void change()}>{busy ? "Please wait…" : saved ? "Remove saved playlist" : "Save playlist"}</button>{saved && <p className="echo-muted">Saved separately from your moments. Not shared as AI memory.</p>}{error && <p role="alert">{error}</p>}</section>;
}
