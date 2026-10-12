import { getConfig, savePage } from "./api.js";

const $ = (id) => document.getElementById(id);
const say = (t, err = false) => { $("msg").textContent = t; $("msg").className = err ? "error" : ""; };

getConfig().then(({ server, token }) => { $("server").value = server; $("token").value = token; });

$("apply").addEventListener("click", async () => {
  await chrome.storage.sync.set({ server: $("server").value.trim(), token: $("token").value.trim() });
  say("Settings saved.");
});

$("save").addEventListener("click", async () => {
  $("save").disabled = true;
  say("Saving…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const a = await savePage(tab.url, tab.title);
    say(a.duplicate ? "Already in your list." : "Saved to your list.");
  } catch (e) {
    say(`Couldn't save: ${e.message}. Check the server URL in settings.`, true);
  } finally {
    $("save").disabled = false;
  }
});
