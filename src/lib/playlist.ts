export interface SongSuggestion { title: string; artist: string }
export interface PlaylistSuggestion { title: string; description: string; songs: readonly SongSuggestion[] }
export interface SavedPlaylist extends PlaylistSuggestion {
  id: string;
  identityVersionId: string;
  sourceMessageId: string;
  savedAt: string;
}
export interface FutureReply { text: string; playlist: PlaylistSuggestion | null; safety: "normal" | "support" }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
const keys = (value: Record<string, unknown>, allowed: string[]) => Object.keys(value).every((key) => allowed.includes(key));
export function isPlaylist(value: unknown): value is PlaylistSuggestion {
  return record(value) && keys(value, ["title", "description", "songs"]) && text(value.title, 120) && typeof value.description === "string" && value.description.length <= 400
    && Array.isArray(value.songs) && value.songs.length >= 1 && value.songs.length <= 12
    && value.songs.every((song) => record(song) && keys(song, ["title", "artist"]) && text(song.title, 160) && text(song.artist, 160))
    && new Set(value.songs.map((song) => `${song.artist.toLowerCase().trim()}:${song.title.toLowerCase().trim()}`)).size === value.songs.length;
}
export function isFutureReply(value: unknown): value is FutureReply {
  return record(value) && keys(value, ["text", "playlist", "safety"]) && text(value.text, 4000)
    && (value.playlist === null || isPlaylist(value.playlist)) && ["normal", "support"].includes(value.safety as string)
    && (value.safety !== "support" || value.playlist === null);
}
export function isSavedPlaylist(value: unknown): value is SavedPlaylist {
  if (!record(value) || !keys(value, ["title", "description", "songs", "id", "identityVersionId", "sourceMessageId", "savedAt"])) return false;
  return isPlaylist({ title: value.title, description: value.description, songs: value.songs })
    && [value.id, value.identityVersionId, value.sourceMessageId].every((id) => typeof id === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(id) && !["__proto__", "constructor", "prototype"].includes(id))
    && typeof value.savedAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.savedAt) && Number.isFinite(Date.parse(value.savedAt)) && new Date(value.savedAt).toISOString() === value.savedAt;
}
/** Search destinations, never fabricated track IDs or claims of catalog verification. */
export function songSearchUrl(song: SongSuggestion, site: "youtube" | "spotify" = "youtube") {
  const query = encodeURIComponent(`${song.title} ${song.artist}`);
  return site === "spotify" ? `https://open.spotify.com/search/${query}` : `https://www.youtube.com/results?search_query=${query}`;
}
export const requestsMusic = (message: string) => /playlist|\b(recommend|suggest|give|find|pick|share)\b.{0,60}\b(songs?|music)\b|\b(songs?|music)\b.{0,40}\b(recommend|suggest|please|for me)\b|သီချင်း|သီခ်င္း/i.test(message);
