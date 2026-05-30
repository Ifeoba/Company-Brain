import { useState } from "react";
import { useVaultSecrets, useStoreSecret, useDeleteSecret } from "../api/hooks";
import type { VaultSecretSummary } from "../types";

interface Props {
  onClose: () => void;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function VaultModal({ onClose }: Props) {
  const { data: secrets = [], isLoading } = useVaultSecrets();
  const storeSecret = useStoreSecret();
  const deleteSecret = useDeleteSecret();

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  async function handleStore(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved("");
    if (!name.trim() || !value.trim()) return;
    try {
      await storeSecret.mutateAsync({ name: name.trim(), value: value.trim() });
      setSaved(name.trim().toUpperCase());
      setName("");
      setValue("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to store secret");
    }
  }

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal-card" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <h2>Vault</h2>
        <div className="modal-sub">
          Encrypted workspace secrets — referenced by tools via their <code style={{ fontSize: 11 }}>vault_key</code> config.
          Values are write-only; they cannot be read back through the UI.
        </div>

        {/* Existing secrets */}
        <div className="modal-row">
          <span className="label">Stored secrets</span>
          {isLoading ? (
            <p className="dim" style={{ fontSize: 13 }}>Loading…</p>
          ) : secrets.length === 0 ? (
            <p className="dim" style={{ fontSize: 13 }}>No secrets stored yet.</p>
          ) : (
            <div className="trigger-list">
              {secrets.map((s: VaultSecretSummary) => (
                <div key={s.name} className="trigger-row">
                  <div className="trigger-row-info">
                    <code className="trigger-row-name" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {s.name}
                    </code>
                    <span className="trigger-row-meta">updated {relativeTime(s.updated_at)}</span>
                  </div>
                  <button
                    className="btn btn-sm btn-ghost btn-danger"
                    onClick={() => {
                      if (confirm(`Delete secret "${s.name}"? Any tools using it will stop working.`)) {
                        deleteSecret.mutate(s.name);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add / update secret */}
        <form onSubmit={handleStore}>
          <div className="modal-row">
            <span className="label">Secret name</span>
            <input
              className="input"
              placeholder="e.g. SLACK_BOT_TOKEN"
              value={name}
              onChange={(e) => { setName(e.target.value.toUpperCase()); setSaved(""); }}
              style={{ fontFamily: "var(--font-mono)" }}
            />
            <div className="hint" style={{ marginTop: 4, fontSize: 11.5 }}>
              Names are upper-cased automatically. Creating a duplicate overwrites it.
            </div>
          </div>

          <div className="modal-row">
            <span className="label">Value</span>
            <input
              className="input"
              type="password"
              placeholder="Paste your secret here"
              value={value}
              onChange={(e) => { setValue(e.target.value); setSaved(""); }}
              autoComplete="new-password"
            />
          </div>

          {saved && (
            <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 8 }}>
              ✓ {saved} stored.
            </p>
          )}
          {error && <div className="error-msg">{error}</div>}

          <div className="footer-row">
            <button type="button" className="btn" onClick={onClose}>Done</button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!name.trim() || !value.trim() || storeSecret.isPending}
            >
              {storeSecret.isPending ? "Storing…" : "Store secret"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
