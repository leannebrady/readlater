export async function getConfig() {
  return chrome.storage.sync.get({ server: "http://localhost:3000", token: "" });
}

export async function savePage(url, title) {
  const { server, token } = await getConfig();
  const res = await fetch(`${server.replace(/\/$/, "")}/api/articles`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ url, title }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server returned ${res.status}`);
  return data;
}
