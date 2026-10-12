const $ = (s) => document.querySelector(s);
let view = "next", tag = "", timer;

const token = () => localStorage.getItem("rl_token") || "";
async function api(path, opts = {}) {
  const res = await fetch("/api" + path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token() && { Authorization: `Bearer ${token()}` }) },
  });
  if (res.status === 401) {
    const t = prompt("Enter your API token");
    if (!t) throw new Error("API token required");
    localStorage.setItem("rl_token", t);
    return api(path, opts);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

const esc = (s = "") => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const say = (msg, error = false) => { const el = $("#status"); el.textContent = msg; el.className = error ? "error" : ""; };

function card(a) {
  const mins = a.word_count ? `${Math.max(1, Math.round(a.word_count / 230))} min read` : "";
  const date = new Date(a.saved_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const tags = (a.tags ? a.tags.split(",") : []).filter(Boolean)
    .map((t) => `<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join("");
  return `<li class="item ${a.read ? "done" : ""}" data-id="${a.id}">
    <a class="title" href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title || a.url)}</a>
    ${a.priority ? '<span class="flag">Priority</span>' : ""}
    <p class="meta">${[esc(a.site), mins, "saved " + date].filter(Boolean).join(", ")}</p>
    ${a.summary ? `<p class="summary">${esc(a.summary)}</p>` : ""}
    ${tags ? `<div class="tags">${tags}</div>` : ""}
    <div class="actions">
      <button data-act="read">${a.read ? "Mark unread" : "Mark finished"}</button>
      <button data-act="prio">${a.priority ? "Remove priority" : "Prioritize"}</button>
      <button data-act="del" class="danger">Delete</button>
    </div></li>`;
}

async function load() {
  const q = $("#q").value.trim();
  const params = new URLSearchParams({ q, tag, filter: view === "all" ? "all" : view });
  try {
    const rows = view === "next" && !q && !tag ? await api("/queue") : await api("/articles?" + params);
    $("#list").innerHTML = rows.length ? rows.map(card).join("")
      : `<li class="empty">${q ? "No saved articles match that search." : view === "read" ? "Nothing finished yet." : "Nothing here yet. Paste a link above or use the browser extension."}</li>`;
  } catch (e) { say(e.message, true); }
  $("#tagbar").hidden = !tag;
  $("#tagname").textContent = tag ? `Showing #${tag}` : "";
}

$("#add").addEventListener("submit", async (e) => {
  e.preventDefault();
  say("Saving…");
  try {
    const a = await api("/articles", { method: "POST", body: JSON.stringify({ url: $("#url").value }) });
    say(a.duplicate ? "Already saved." : "Saved.");
    $("#url").value = "";
    load();
  } catch (err) { say(err.message, true); }
});

$("#tabs").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  view = b.dataset.view;
  document.querySelectorAll("#tabs button").forEach((x) => x.setAttribute("aria-current", x === b));
  load();
});
$("#q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(load, 250); });
$("#cleartag").addEventListener("click", () => { tag = ""; load(); });

$("#list").addEventListener("click", async (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.tag) { tag = t.dataset.tag; return load(); }
  const li = t.closest(".item"); const id = li.dataset.id;
  try {
    if (t.dataset.act === "del") { if (!confirm("Delete this article?")) return; await api(`/articles/${id}`, { method: "DELETE" }); }
    if (t.dataset.act === "read") await api(`/articles/${id}`, { method: "PATCH", body: JSON.stringify({ read: !li.classList.contains("done") }) });
    if (t.dataset.act === "prio") await api(`/articles/${id}`, { method: "PATCH", body: JSON.stringify({ priority: li.querySelector(".flag") ? 0 : 1 }) });
    load();
  } catch (err) { say(err.message, true); }
});

load();
