import { useState } from "react";
import { useDeleteApiKey, useMe, useSetApiKey } from "../api/hooks";
import AppTopbar from "../components/Layout";
import Icon from "../components/Icon";

// Static — matches llm_client.py PROVIDERS. No API call needed.
const PROVIDERS = [
  {
    id: "anthropic",
    name: "Claude (Anthropic)",
    key_hint: "sk-ant-…",
    key_url: "https://console.anthropic.com/",
  },
  {
    id: "openai",
    name: "ChatGPT (OpenAI)",
    key_hint: "sk-…",
    key_url: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    name: "Gemini (Google)",
    key_hint: "AIza…",
    key_url: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "groq",
    name: "Groq",
    key_hint: "gsk_…",
    key_url: "https://console.groq.com/keys",
  },
];

export default function Settings() {
  const { data: user } = useMe();
  const setKey = useSetApiKey();
  const deleteKey = useDeleteApiKey();

  const currentProvider = user?.llm_provider || "anthropic";
  const [selectedProvider, setSelectedProvider] = useState("");
  const activeProvider = selectedProvider || currentProvider;

  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const chosen = PROVIDERS.find((p) => p.id === activeProvider);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await setKey.mutateAsync({ provider: activeProvider, api_key: apiKey });
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  async function handleDelete() {
    if (!confirm("Remove your API key?")) return;
    await deleteKey.mutateAsync();
  }

  return (
    <div className="settings-shell">
      <AppTopbar />
      <div className="settings-main">
        <div className="inner">
          <div className="settings-head">
            <h1>Settings</h1>
            {user && (
              <span className="ws-label">workspace · {user.github_username}</span>
            )}
          </div>

          <div className="settings-section">
            <h3>
              <Icon name="key" size={14} />
              AI provider
            </h3>
            <div className="desc">
              Choose your AI provider and paste an API key. Your key is encrypted and never shared.
            </div>

            <div className="provider-grid">
              {PROVIDERS.map((p) => {
                const isActive = p.id === activeProvider;
                const isCurrent = p.id === currentProvider && user?.has_api_key;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={"provider-card" + (isActive ? " selected" : "")}
                    onClick={() => {
                      setSelectedProvider(p.id);
                      setApiKey("");
                      setError("");
                      setSaved(false);
                    }}
                  >
                    <span className="provider-name">{p.name}</span>
                    {isCurrent && <span className="provider-badge">connected</span>}
                  </button>
                );
              })}
            </div>

            {user?.has_api_key && currentProvider === activeProvider && (
              <div className="status-line" style={{ marginBottom: 12 }}>
                <span className="ok">● connected</span>
                {" · "}
                <button
                  className="btn btn-sm"
                  onClick={handleDelete}
                  disabled={deleteKey.isPending}
                  style={{ display: "inline", padding: 0, border: "none", background: "none", fontSize: "inherit", color: "var(--bad)", cursor: "pointer" }}
                >
                  {deleteKey.isPending ? "Removing…" : "Remove key"}
                </button>
              </div>
            )}

            <form onSubmit={handleSave}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="field-row">
                  <input
                    type="password"
                    className="input key-input"
                    placeholder={
                      user?.has_api_key && currentProvider === activeProvider
                        ? `${chosen?.key_hint ?? "…"} (enter new key to replace)`
                        : chosen?.key_hint ?? "Paste API key…"
                    }
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={setKey.isPending || !apiKey}
                  >
                    {setKey.isPending ? "Saving…" : "Save"}
                  </button>
                </div>
                {chosen && (
                  <div style={{ fontSize: 12, color: "var(--dim)" }}>
                    Get a key at{" "}
                    <a href={chosen.key_url} target="_blank" rel="noopener noreferrer">
                      {chosen.key_url.replace(/^https?:\/\//, "")} →
                    </a>
                  </div>
                )}
              </div>
            </form>

            {error && <div className="status-line" style={{ color: "var(--bad)", marginTop: 8 }}>{error}</div>}
            {saved && <div className="status-line" style={{ color: "var(--ok)", marginTop: 8 }}>Saved.</div>}
          </div>

          <div className="settings-section">
            <h3>Email notifications</h3>
            <div className="desc">
              When you send a question to an expert, it arrives by email. Add your Resend API key
              via the <a href="/insights">Credentials</a> page — store it as{" "}
              <code className="mono">RESEND_API_KEY</code>.
            </div>
          </div>

          <div className="settings-footer">
            <a href="/api/auth/logout" className="btn">
              <Icon name="logout" size={12} /> Sign out
            </a>
            {user && (
              <span className="user-label">
                Signed in as <b>{user.github_username}</b>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
