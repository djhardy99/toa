import { useState } from "react";

// An empty policy: just a name and id. The judge, prompt and versions come later (docs/schemas.md).
type Policy = { id: string; name: string; updatedAt: string };

const STORAGE_KEY = "policies";
const SEED: Policy[] = [{ id: "jailbreak", name: "Jailbreak", updatedAt: "2026-09-30" }];

// ponytail: policies live in localStorage. Replace with GET/POST /policies once the API exists.
function load(): Policy[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") as Policy[];
  } catch {
    return SEED;
  }
}

// "No secrets leakage" -> "no-secrets-leakage", the kebab-case id format from docs/schemas.md.
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Policies() {
  const [policies, setPolicies] = useState(load);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const create = (name: string) => {
    const id = slug(name);
    if (!id) return setError("Name needs at least one letter or number.");
    if (policies.some((p) => p.id === id)) return setError(`A policy with id "${id}" already exists.`);
    const next = [{ id, name: name.trim(), updatedAt: new Date().toISOString().slice(0, 10) }, ...policies];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPolicies(next);
    setCreating(false);
    setError("");
  };

  return (
    <>
      <div className="section-header">
        <h2>Policies</h2>
        {!creating && (
          <button className="button button-primary" onClick={() => setCreating(true)}>
            New policy
          </button>
        )}
      </div>

      {creating && (
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            create(String(new FormData(e.currentTarget).get("name")));
          }}
        >
          <input name="name" placeholder="Policy name" required autoFocus />
          <button className="button button-primary">Create</button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setCreating(false);
              setError("");
            }}
          >
            Cancel
          </button>
          {error && <span className="error">{error}</span>}
        </form>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Id</th>
            <th>Latest</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td className="mono">{p.id}</td>
              <td>
                <span className="badge badge-draft">draft only</span>
              </td>
              <td className="muted">{p.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
