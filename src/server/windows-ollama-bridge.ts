import { spawn } from "node:child_process";

// A fixed Windows localhost request, not a shell command containing user text.
// JSON travels on stdin; Ollama remains bound to Windows loopback, never 0.0.0.0.
const command = `[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false); [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false); $payload = [Console]::In.ReadToEnd(); try { $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:11434/api/chat' -Method Post -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($payload)) -MaximumRedirection 0 -TimeoutSec 180; [Console]::Out.Write($response.Content) } catch { exit 1 }`;

export function windowsOllamaRequest(body: string): Promise<Response> {
  return new Promise((resolve, reject) => {
    const child = spawn("/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true });
    const chunks: Buffer[] = []; let total = 0;
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Local Ollama timeout")); }, 185000);
    child.stdout.on("data", (chunk: Buffer) => {
      total += chunk.byteLength;
      if (total > 65536) { child.kill(); reject(new Error("Local Ollama response too large")); }
      else chunks.push(chunk);
    });
    child.on("error", () => { clearTimeout(timeout); reject(new Error("Windows localhost bridge unavailable")); });
    child.stdin.on("error", () => { /* Exit/error handler reports failure without exposing data. */ });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0 || total > 65536) reject(new Error("Windows localhost bridge failed"));
      else resolve(new Response(Buffer.concat(chunks).toString("utf8"), { headers: { "Content-Type": "application/json" } }));
    });
    child.stdin.end(body, "utf8");
  });
}

export const localOllamaFetch: typeof fetch = (input, init) => {
  if (process.platform === "linux" && process.env.FUTURE_ECHO_OLLAMA_WINDOWS_BRIDGE === "true") {
    if (String(input) !== "http://127.0.0.1:11434/api/chat" || typeof init?.body !== "string") return Promise.reject(new Error("Unsupported local request"));
    return windowsOllamaRequest(init.body);
  }
  return fetch(input, init);
};
