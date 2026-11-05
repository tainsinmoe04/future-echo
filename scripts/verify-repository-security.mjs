import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";

// This intentionally scans only Git-tracked working-tree files, never ignored
// credentials or browser storage. Diagnostics contain rule IDs and paths only.
const maximumTextBytes = 8 * 1024 * 1024;
const secretNames = "(?:SUPABASE_(?:PUBLISHABLE_KEY|SERVICE_ROLE_KEY)|GEMINI_API_KEY|OPENROUTER_API_KEY|VERCEL_TOKEN)";
const rules = [
  ["private-key", /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ["openrouter-key", /\bsk-or-v1-[a-f0-9]{32,}\b/i],
  ["google-api-key", /\bAIza[A-Za-z0-9_-]{35}\b/],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ["supabase-secret", /\bsb_secret_[A-Za-z0-9_-]{20,}\b/],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["credential-url", /https?:\/\/[^\s\/"':]+:[^\s\/"'@]+@[^\s/]+/],
];

export function inspectRepositoryFile(name, bytes) {
  const findings = [];
  const normalized = name.replaceAll("\\", "/");
  if (/(?:^|\/)\.env(?:\..*)?$/.test(normalized) && normalized !== ".env.example") findings.push("tracked-environment-file");
  if (/\.(?:pem|key|p12|pfx)$/.test(normalized) || /(?:^|\/)(?:id_rsa|id_ed25519)$/.test(normalized)) findings.push("credential-file");
  if (/(?:^|\/)(?:playwright-report|test-results|\.auth|auth-state|storage-state)(?:\/|\.)/.test(normalized)) findings.push("browser-test-artifact");
  // Images and fonts are legitimate journal assets, not searchable text.
  if (bytes.includes(0)) return findings;
  if (bytes.byteLength > maximumTextBytes) return [...findings, "oversized-text-review-required"];
  const text = bytes.toString("utf8");
  for (const [id, pattern] of rules) if (pattern.test(text)) findings.push(id);
  if (normalized === ".env.example") {
    const assignments = new RegExp("^[ \\t]*(?:export[ \\t]+)?" + secretNames + "[ \\t]*=[ \\t]*([^\\r\\n]+)$", "gm");
    for (const match of text.matchAll(assignments)) {
      const value = match[1].trim();
      if (value !== '""' && value !== "''") findings.push("nonempty-example-credential");
    }
  }
  return [...new Set(findings)];
}

function selfTest() {
  const inspect = (name, text) => inspectRepositoryFile(name, Buffer.from(text));
  assert.deepEqual(inspect(".env.example", "GEMINI_API_KEY=\nAPP_ORIGIN=http://localhost:3000\n"), []);
  assert.deepEqual(inspect(".env.example", 'OPENROUTER_API_KEY=""\n'), []);
  assert.ok(inspect(".env.production", "").includes("tracked-environment-file"));
  assert.ok(inspect("nested/.env.local", "").includes("tracked-environment-file"));
  assert.ok(inspect(".env.example", "GEMINI_API_KEY=not-a-real-key\n").includes("nonempty-example-credential"));
  assert.ok(inspect("src/key.ts", "sk-or-" + "v1-" + "a".repeat(64)).includes("openrouter-key"));
  assert.ok(inspect("src/key.ts", "AI" + "za" + "x".repeat(35)).includes("google-api-key"));
  assert.ok(inspect("src/key.ts", "gh" + "p_" + "x".repeat(40)).includes("github-token"));
  assert.ok(inspect("src/key.ts", "sb_" + "secret_" + "x".repeat(24)).includes("supabase-secret"));
  assert.ok(inspect("src/key.ts", "-----BEGIN " + "PRIVATE KEY-----").includes("private-key"));
  assert.ok(inspect("notes.md", "https://" + "person:password@example.invalid").includes("credential-url"));
  assert.ok(inspect(".auth/user.json", "{}").includes("browser-test-artifact"));
  assert.ok(inspect("test-results/trace.zip", "").includes("browser-test-artifact"));
  assert.ok(inspect("notes.txt", "x".repeat(maximumTextBytes + 1)).includes("oversized-text-review-required"));
  assert.deepEqual(inspectRepositoryFile("public/photo.png", Buffer.from([0, 1, 2])), []);
  assert.deepEqual(inspect("README.md", "Use process.env.GEMINI_API_KEY; sb_secret_ is a prefix, not a value."), []);
  console.log("PASS: repository security scanner synthetic regression checks");
}

function scanTrackedFiles() {
  const root = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  const files = execFileSync("git", ["ls-files", "--cached", "-z"], { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).split("\0").filter(Boolean);
  let failed = false;
  for (const name of files) {
    const absolute = path.resolve(root, name);
    if (!absolute.startsWith(root + path.sep)) throw new Error("Tracked path escaped repository");
    let metadata;
    try { metadata = lstatSync(absolute); } catch (cause) { if (cause.code === "ENOENT") continue; throw cause; }
    const findings = metadata.isSymbolicLink() ? ["tracked-symlink-review-required"] : inspectRepositoryFile(name, readFileSync(absolute));
    for (const rule of findings) {
      failed = true;
      console.error(JSON.stringify({ path: name, rule }));
    }
  }
  if (failed) process.exitCode = 1;
  else console.log("PASS: Git-tracked working-tree credential/artifact checks (not history or ignored files)");
}

if (process.argv.includes("--self-test")) selfTest();
else scanTrackedFiles();
