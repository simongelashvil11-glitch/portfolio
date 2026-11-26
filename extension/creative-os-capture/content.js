/*
 * CreativeOS Capture — runs on the Meta Ad Library.
 *
 * Adds a "Save to CreativeOS" button to each ad card, and a bar with "Save
 * all on screen". It reads only what is already on the page you are looking
 * at, and only when you press a button.
 *
 * The Ad Library's markup uses generated class names that change, so cards
 * are found by the words every card shows — "Library ID: …" — and parts of
 * the card by their text ("Started running on…", "Sponsored", the link
 * card). If a part cannot be told apart, the card's whole text is saved, so
 * nothing is lost; you can tidy it in CreativeOS.
 */
(() => {
  const ID_PATTERN = /Library ID:?\s*(\d{5,})/i;
  const CTA_TEXTS = [
    "Shop now", "Learn more", "Sign up", "Order now", "Buy now", "Get offer", "Get offer details", "Download", "Book now",
    "Subscribe", "Contact us", "Apply now", "Get quote", "Watch more", "Send message", "Send WhatsApp message", "Install now",
    "Play game", "Listen now", "See menu", "Get started", "Donate now", "Call now", "Get directions", "Request time", "Use app",
    "Open link", "See more", "Book a test drive", "Get showtimes", "Order food", "Start order", "Visit Instagram profile",
  ];
  const CTA_SET = new Set(CTA_TEXTS.map((text) => text.toLowerCase()));
  /** The link card's domain line, in any case: "SHOP.EXAMPLE.COM", "www.karebi.ge", "example.com/offer". */
  const isDomainLine = (line) => /^(https?:\/\/)?(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(line);

  /* ---------------------------------------------------------------- */
  /* Reading a card                                                   */
  /* ---------------------------------------------------------------- */

  const countIds = (element) => (element.innerText.match(/Library ID/gi) || []).length;

  /** The element holding "Library ID: …", for every card on the page. */
  function idElements(root = document.body) {
    const found = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => (/Library ID/i.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    while (walker.nextNode()) {
      const element = walker.currentNode.parentElement;
      if (element && !element.closest("[data-cos-ui]")) found.push(element);
    }
    return found;
  }

  /** The largest ancestor that still contains only this one ad. */
  function cardFor(idElement) {
    let card = idElement;
    while (card.parentElement && card.parentElement !== document.body && countIds(card.parentElement) === 1) card = card.parentElement;
    return card;
  }

  const lines = (element) =>
    element.innerText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  function landingFrom(href) {
    try {
      const url = new URL(href);
      if (/(^|\.)facebook\.com$/.test(url.hostname) && url.pathname === "/l.php") return url.searchParams.get("u");
      if (!/(^|\.)(facebook|instagram|messenger)\.com$/.test(url.hostname)) return url.href;
    } catch {
      /* not a link */
    }
    return null;
  }

  function parseCard(card) {
    const text = lines(card);
    const all = text.join("\n");
    const libraryId = ID_PATTERN.exec(all)?.[1] ?? null;

    const startedLine = text.find((line) => /Started running on/i.test(line)) ?? text.find((line) => /\b\d{4}\s*[-–]\s*[A-Z][a-z]{2}/.test(line));
    const active = text.some((line) => /^Active$/i.test(line)) ? true : text.some((line) => /^Inactive$/i.test(line)) ? false : null;
    const variationsMatch = /(\d+)\s+ads?\s+uses?\s+this\s+creative\s+and\s+text/i.exec(all);

    // The advertiser is the line just above "Sponsored".
    const sponsoredAt = text.findIndex((line) => /^Sponsored$/i.test(line));
    let advertiser = sponsoredAt > 0 ? text[sponsoredAt - 1] : null;
    if (!advertiser || /Library ID|See ad details|See summary details/i.test(advertiser)) {
      const pageLink = [...card.querySelectorAll('a[href*="facebook.com/"]')].find(
        (link) => link.innerText.trim() && !/ads\/library|l\.php/.test(link.href),
      );
      advertiser = pageLink?.innerText.trim() ?? null;
    }

    // The ad's own text keeps its line breaks in a pre-wrap block; take the longest.
    const textBlocks = [...card.querySelectorAll('[style*="pre-wrap"]')]
      .map((element) => element.innerText.trim())
      .filter((value) => value.length > 0)
      .sort((a, b) => b.length - a.length);
    let body = textBlocks[0] ?? null;
    if (!body && sponsoredAt >= 0) {
      const after = text.slice(sponsoredAt + 1).filter((line) => !CTA_SET.has(line.toLowerCase()) && !isDomainLine(line));
      body = after.slice(0, 12).join("\n") || null;
    }

    // The link card: the landing page, its headline, description and button.
    let landingUrl = null;
    let headline = null;
    let description = null;
    let cta = null;
    for (const link of card.querySelectorAll("a[href]")) {
      const landing = landingFrom(link.href);
      if (!landing) continue;
      landingUrl ||= landing;
      const linkLines = lines(link).filter((line) => line !== body);
      const words = linkLines.filter((line) => !isDomainLine(line));
      for (const line of words) {
        if (CTA_SET.has(line.toLowerCase())) cta ||= line;
        else if (!headline) headline = line;
        else if (!description && line !== headline) description = line;
      }
      if (headline) break;
    }
    cta ||= text.find((line) => CTA_SET.has(line.toLowerCase())) ?? null;
    if (headline && body && body.includes(headline) && headline.length > 60) headline = null;

    // Pictures: the video's first frame, or the largest image (not the page's little profile picture).
    const video = card.querySelector("video");
    const images = [...card.querySelectorAll("img")]
      .filter((image) => (image.naturalWidth || image.width) >= 150)
      .sort((a, b) => (b.naturalWidth || b.width) * (b.naturalHeight || b.height) - (a.naturalWidth || a.width) * (a.naturalHeight || a.height));
    const mediaKind = video ? "video" : images.length >= 2 ? "carousel" : images.length === 1 ? "image" : "text";
    const imageUrl = (video && video.poster) || images[0]?.currentSrc || images[0]?.src || null;
    // The video file's own address, for the transcript: only a real https address (a "blob:" stream can't be fetched later).
    const videoSource = video ? video.currentSrc || video.src || video.querySelector("source")?.src || "" : "";
    const videoUrl = /^https:\/\/[^/]*fbcdn\.net\//.test(videoSource) ? videoSource : null;
    const videoSeconds = video && Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration * 10) / 10 : null;

    return {
      libraryId,
      libraryUrl: libraryId ? `https://www.facebook.com/ads/library/?id=${libraryId}` : null,
      advertiser,
      body,
      headline,
      description,
      cta,
      landingUrl,
      startedText: startedLine ?? null,
      active,
      variations: variationsMatch ? Number(variationsMatch[1]) : null,
      mediaKind,
      videoUrl,
      videoSeconds,
      cardText: all.slice(0, 20000),
      imageUrl,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Buttons                                                          */
  /* ---------------------------------------------------------------- */

  const BUTTON_STYLE =
    "font:600 12px/1 'Segoe UI',system-ui,sans-serif;padding:6px 10px;margin:6px 0;border-radius:4px;border:1px solid #0f6cbd;" +
    "background:#0f6cbd;color:#fff;cursor:pointer;display:inline-flex;gap:6px;align-items:center";

  function setState(button, state, detail) {
    const look = {
      idle: ["Save to CreativeOS", "#0f6cbd", "#fff"],
      saving: ["Saving…", "#ebf3fc", "#0f548c"],
      saved: ["Saved ✓", "#f1faf1", "#0e700e"],
      updated: ["Updated ✓", "#f1faf1", "#0e700e"],
      error: ["Not saved — retry", "#fdf3f4", "#b10e1c"],
    }[state];
    button.textContent = look[0];
    button.style.background = look[1];
    button.style.color = look[2];
    button.style.borderColor = state === "idle" ? "#0f6cbd" : look[2];
    button.title = detail || "";
    button.dataset.state = state;
  }

  async function save(card, button) {
    if (button.dataset.state === "saving") return false;
    const ad = parseCard(card);
    if (!ad.libraryId) {
      setState(button, "error", "This card's Library ID could not be read.");
      return false;
    }
    setState(button, "saving");
    const result = await chrome.runtime.sendMessage({ type: "save", ad }).catch((error) => ({ ok: false, error: String(error) }));
    if (result?.ok) {
      setState(button, result.created ? "saved" : "updated", result.transcribing ? "Saved. The video is being transcribed; the transcript appears in the Ad Lab within a minute or so." : "Open it in CreativeOS from the Ad Lab.");
      button.dataset.url = result.url || "";
      return true;
    }
    setState(button, "error", result?.error || "Something went wrong.");
    showBar(result?.error || "Something went wrong.", true);
    return false;
  }

  function addButtons() {
    for (const idElement of idElements()) {
      const card = cardFor(idElement);
      if (card.dataset.cosCard) continue;
      card.dataset.cosCard = "1";
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.cosUi = "1";
      button.setAttribute("style", BUTTON_STYLE);
      setState(button, "idle");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (button.dataset.state === "saved" || button.dataset.state === "updated") {
          if (button.dataset.url) window.open(button.dataset.url, "_blank", "noopener");
          return;
        }
        void save(card, button);
      });
      idElement.insertAdjacentElement("afterend", button);
    }
    updateBar();
  }

  /* ---------------------------------------------------------------- */
  /* The bar: project, count, Save all                                */
  /* ---------------------------------------------------------------- */

  let bar = null;
  let barMessage = null;

  function cardButtons() {
    return [...document.querySelectorAll("button[data-cos-ui]")].filter((button) => button.dataset.state !== undefined);
  }

  function showBar(message, isError = false) {
    if (!bar) return;
    barMessage.textContent = message;
    barMessage.style.color = isError ? "#b10e1c" : "#424242";
  }

  async function updateBar() {
    if (!bar) {
      bar = document.createElement("div");
      bar.dataset.cosUi = "1";
      bar.setAttribute(
        "style",
        "position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#fff;border:1px solid #d1d1d1;border-radius:8px;" +
          "box-shadow:0 8px 16px rgba(0,0,0,.14);padding:10px 12px;font:13px/1.4 'Segoe UI',system-ui,sans-serif;color:#242424;max-width:320px",
      );
      const title = document.createElement("div");
      title.style.cssText = "font-weight:600;margin-bottom:4px";
      title.textContent = "CreativeOS Capture";
      barMessage = document.createElement("div");
      barMessage.style.cssText = "margin-bottom:8px;font-size:12px";
      const all = document.createElement("button");
      all.type = "button";
      all.dataset.cosUi = "1";
      all.setAttribute("style", BUTTON_STYLE.replace("margin:6px 0", "margin:0"));
      all.textContent = "Save all on screen";
      all.addEventListener("click", async () => {
        const pending = cardButtons().filter((button) => button.dataset.state === "idle" || button.dataset.state === "error");
        all.disabled = true;
        let done = 0;
        for (const button of pending) {
          const card = button.closest("[data-cos-card]");
          if (!card) continue;
          showBar(`Saving ${done + 1} of ${pending.length}…`);
          const ok = await save(card, button);
          if (!ok && button.title && /Not connected|No project/.test(button.title)) break;
          done += 1;
        }
        all.disabled = false;
        showBar(`Saved ${cardButtons().filter((b) => b.dataset.state === "saved" || b.dataset.state === "updated").length} ads on this page.`);
      });
      bar.append(title, barMessage, all);
      document.body.append(bar);
    }
    const status = await chrome.runtime.sendMessage({ type: "status" }).catch(() => null);
    const count = cardButtons().length;
    if (!status?.connected) showBar("Not connected: click the extension's icon and paste your connection code.", true);
    else if (!status.projectId) showBar("Choose a project: click the extension's icon.", true);
    else if (!barMessage.textContent.startsWith("Saving")) showBar(`${count} ${count === 1 ? "ad" : "ads"} on screen → ${status.projectName ?? "your project"}`);
  }

  /* The Ad Library loads more cards as you scroll; add buttons to new ones. */
  let queued = false;
  new MutationObserver((mutations) => {
    // Changes to our own buttons and bar are not new cards.
    const ours = (node) => (node.nodeType === 1 ? node : node.parentElement)?.closest?.("[data-cos-ui]");
    if (mutations.every((mutation) => ours(mutation.target) || [...mutation.addedNodes].every((node) => ours(node)))) return;
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      addButtons();
    }, 600);
  }).observe(document.body, { childList: true, subtree: true });
  chrome.storage.onChanged.addListener(() => void updateBar());
  addButtons();

  // For testing the reader on a saved page: window.__cosParse(card) returns what would be saved.
  window.__cosParse = (element) => parseCard(cardFor(element));
})();
