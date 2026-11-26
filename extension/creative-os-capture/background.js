/*
 * CreativeOS Capture — background worker.
 *
 * Talks to your CreativeOS site on behalf of the Ad Library page: lists
 * projects for the popup, and saves one ad at a time. Requests go only to
 * your own site (and, for the ad's picture, to Facebook's image server the
 * page already loaded it from). Nothing runs unless you press a button.
 */

const DEFAULT_SITE = "https://www.simongelashvili.com";
const MAX_IMAGE_BYTES = 1_500_000;

async function settings() {
  const stored = await chrome.storage.local.get(["site", "code", "projectId", "competitorId"]);
  return { site: (stored.site || DEFAULT_SITE).replace(/\/+$/, ""), ...stored };
}

async function call(path, { method = "GET", body, site, code } = {}) {
  const response = await fetch(`${site}/api/creative-os/capture${path}`, {
    method,
    headers: { Authorization: `Bearer ${code}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || `The site answered ${response.status}.`);
  return result;
}

/** The ad's picture as base64, if it is small enough; otherwise nothing (the ad still saves). */
async function imageAsBase64(url) {
  if (!url || !/^https:\/\/[^/]*fbcdn\.net\//.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_IMAGE_BYTES) return null;
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { base64: btoa(binary), mediaType: response.headers.get("content-type") || "image/jpeg" };
  } catch {
    return null;
  }
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  (async () => {
    const config = await settings();
    if (message.type === "targets") {
      const site = (message.site || config.site).replace(/\/+$/, "");
      const code = message.code ?? config.code;
      if (!code) throw new Error("Paste your connection code first.");
      const result = await call("", { site, code });
      return { ok: true, projects: result.projects };
    }
    if (message.type === "status") {
      return { ok: true, connected: Boolean(config.code), projectId: config.projectId ?? null, projectName: config.projectName ?? null };
    }
    if (message.type === "save") {
      if (!config.code) throw new Error("Not connected. Click the CreativeOS Capture icon and paste your connection code.");
      if (!config.projectId) throw new Error("No project chosen. Click the CreativeOS Capture icon and pick a project.");
      const { imageUrl, ...ad } = message.ad;
      const image = await imageAsBase64(imageUrl);
      const result = await call("", {
        method: "POST",
        site: config.site,
        code: config.code,
        body: { projectId: Number(config.projectId), competitorId: config.competitorId ? Number(config.competitorId) : null, ad: { ...ad, image } },
      });
      return { ok: true, created: result.created, url: result.url };
    }
    throw new Error("Unknown request.");
  })().then(reply, (error) => reply({ ok: false, error: error.message || String(error) }));
  return true; // the reply comes asynchronously
});
