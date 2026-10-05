import { useState } from "react";

// A guardrail is a set of policies (docs/design.md). A new one is empty: a name, an id and no
// policies yet, so it is not publishable until at least one is added (docs/schemas.md).
type Guardrail = { id: string; name: string; policies: string[]; updatedAt: string };

const STORAGE_KEY = "guardrails";
const SEED: Guardrail[] = [{ id: "jailbreak", name: "Jailbreak", policies: [], updatedAt: "2026-09-30" }];

// ponytail: guardrails live in localStorage. Replace with GET/POST /guardrails once the API exists.
function load(): Guardrail[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "") as Guardrail[];
  } catch {
    return SEED;
  }
}

// "Security basics" -> "security-basics", the kebab-case id format from docs/schemas.md.
const slug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function Guardrails() {
  const [guardrails, setGuardrails] = useState(load);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const create = (name: string) => {
    const id = slug(name);
    if (!id) return setError("Name needs at least one letter or number.");
    if (guardrails.some((g) => g.id === id)) return setError(`A guardrail with id "${id}" already exists.`);
    const next = [
      { id, name: name.trim(), policies: [], updatedAt: new Date().toISOString().slice(0, 10) },
      ...guardrails,
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setGuardrails(next);
    setCreating(false);
    setError("");
  };

  return (
    <>
      <div className="section-header">
        <h2>Guardrails</h2>
        {!creating && (
          <button className="button button-primary" onClick={() => setCreating(true)}>
            New guardrail
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
          <input name="name" placeholder="Guardrail name" required autoFocus />
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
            <th>Policies</th>
            <th>Latest</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {guardrails.map((g) => (
            <tr key={g.id}>
              <td>{g.name}</td>
              <td className="mono">{g.id}</td>
              <td>{g.policies.length}</td>
              <td>
                <span className="badge badge-draft">draft only</span>
              </td>
              <td className="muted">{g.updatedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
