/* CreativeOS Capture — the popup: connect with the code from Settings, then pick where ads go. */

const DEFAULT_SITE = "https://www.simongelashvili.com";
const $ = (id) => document.getElementById(id);
let projects = [];

function status(text, kind = "") {
  $("status").textContent = text;
  $("status").className = `status ${kind}`;
}

function fillProjects(selectedProject, selectedCompetitor) {
  const project = $("project");
  project.innerHTML = "";
  if (projects.length === 0) {
    project.innerHTML = "<option>No projects yet: create one in CreativeOS</option>";
    project.disabled = true;
    return;
  }
  for (const item of projects) project.add(new Option(item.name, String(item.id)));
  project.disabled = false;
  project.value = selectedProject && projects.some((item) => String(item.id) === String(selectedProject)) ? String(selectedProject) : String(projects[0].id);
  fillCompetitors(selectedCompetitor);
}

function fillCompetitors(selected) {
  const select = $("competitor");
  const project = projects.find((item) => String(item.id) === $("project").value);
  select.innerHTML = "";
  select.add(new Option("Match by advertiser name", ""));
  for (const competitor of project?.competitors ?? []) select.add(new Option(competitor.name, String(competitor.id)));
  select.disabled = false;
  select.value = selected && [...select.options].some((option) => option.value === String(selected)) ? String(selected) : "";
}

async function saveChoice() {
  const project = projects.find((item) => String(item.id) === $("project").value);
  await chrome.storage.local.set({
    projectId: $("project").value,
    projectName: project?.name ?? null,
    competitorId: $("competitor").value || null,
  });
  status(`Ads will be saved into ${project?.name ?? "this project"}.`, "ok");
}

async function load(code, site) {
  status("Connecting…");
  const result = await chrome.runtime.sendMessage({ type: "targets", code, site });
  if (!result?.ok) {
    status(result?.error ?? "Could not connect.", "error");
    return false;
  }
  projects = result.projects;
  return true;
}

$("connect").addEventListener("click", async () => {
  const code = $("code").value.trim();
  const site = ($("site").value.trim() || DEFAULT_SITE).replace(/\/+$/, "");
  if (!code) return status("Paste your connection code first.", "error");
  if (await load(code, site)) {
    await chrome.storage.local.set({ code, site });
    fillProjects();
    await saveChoice();
  }
});

$("project").addEventListener("change", async () => {
  fillCompetitors();
  await saveChoice();
});
$("competitor").addEventListener("change", saveChoice);

(async () => {
  const stored = await chrome.storage.local.get(["code", "site", "projectId", "competitorId"]);
  $("site").value = stored.site || DEFAULT_SITE;
  if (stored.code) {
    $("code").value = stored.code;
    if (await load(stored.code, stored.site || DEFAULT_SITE)) {
      fillProjects(stored.projectId, stored.competitorId);
      const project = projects.find((item) => String(item.id) === $("project").value);
      status(`Connected. Ads go into ${project?.name ?? "the chosen project"}.`, "ok");
    }
  } else {
    status("Make a connection code in CreativeOS Settings and paste it above.");
  }
})();
