import { useMemo, useState } from "react";

const SECTIONS = [
  { id: "identite", label: "Informations" },
  { id: "menage", label: "Cohabitants" },
  { id: "revenus", label: "Revenus" },
  { id: "biens", label: "Biens" },
  { id: "apercu", label: "Aperçu" },
];

const defaultData = {
  identite: {
    nom: "",
    prenom: "",
    dateNaissance: "",
    nationalite: "",
  },
  menage: {
    situation: "isolé", // isolé | cohabitant | famille
    nbEnfants: 0,
  },
  revenus: {
    revenusMensuels: 0,
  },
  biens: {
    aBienImmo: false,
  },
};

function computeResult(data) {
  // Placeholder: on remplacera par la vraie logique Excel.
  const revenus = Number(data.revenus.revenusMensuels || 0);
  const plafond = data.menage.situation === "famille" ? 1600 : 1200;
  const eligible = revenus < plafond;
  const montant = eligible ? plafond - revenus : 0;

  return {
    eligible,
    montant: Math.max(0, Math.round(montant)),
    explications: eligible
      ? [`Revenus (${revenus}€) < plafond (${plafond}€).`]
      : [`Revenus (${revenus}€) ≥ plafond (${plafond}€).`],
  };
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{label}</span>
      {children}
    </label>
  );
}

export default function App() {
  const [active, setActive] = useState("identite");
  const [data, setData] = useState(defaultData);

  const result = useMemo(() => computeResult(data), [data]);

  function reset() {
    setData(defaultData);
    setActive("identite");
  }

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Simulateur – Revenu d’intégration</h1>
          <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
            Sans enregistrement – calcul local dans le navigateur
          </div>
        </div>
        <button onClick={reset} style={{ padding: "10px 12px", cursor: "pointer" }}>
          Réinitialiser
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, marginTop: 16 }}>
        {/* Sidebar */}
        <nav style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 10px",
                marginBottom: 6,
                borderRadius: 8,
                border: "1px solid #ddd",
                background: active === s.id ? "#f3f3f3" : "white",
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Main */}
        <main style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          {active === "identite" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Informations</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nom">
                  <input
                    value={data.identite.nom}
                    onChange={(e) => setData((d) => ({ ...d, identite: { ...d.identite, nom: e.target.value } }))}
                  />
                </Field>
                <Field label="Prénom">
                  <input
                    value={data.identite.prenom}
                    onChange={(e) => setData((d) => ({ ...d, identite: { ...d.identite, prenom: e.target.value } }))}
                  />
                </Field>
                <Field label="Date de naissance">
                  <input
                    type="date"
                    value={data.identite.dateNaissance}
                    onChange={(e) =>
                      setData((d) => ({ ...d, identite: { ...d.identite, dateNaissance: e.target.value } }))
                    }
                  />
                </Field>
                <Field label="Nationalité">
                  <input
                    value={data.identite.nationalite}
                    onChange={(e) =>
                      setData((d) => ({ ...d, identite: { ...d.identite, nationalite: e.target.value } }))
                    }
                  />
                </Field>
              </div>
            </section>
          )}

          {active === "menage" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Cohabitants / ménage</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Situation">
                  <select
                    value={data.menage.situation}
                    onChange={(e) => setData((d) => ({ ...d, menage: { ...d.menage, situation: e.target.value } }))}
                  >
                    <option value="isolé">Isolé</option>
                    <option value="cohabitant">Cohabitant</option>
                    <option value="famille">Famille</option>
                  </select>
                </Field>

                <Field label="Nombre d’enfants à charge">
                  <input
                    type="number"
                    min="0"
                    value={data.menage.nbEnfants}
                    onChange={(e) =>
                      setData((d) => ({ ...d, menage: { ...d.menage, nbEnfants: Number(e.target.value || 0) } }))
                    }
                  />
                </Field>
              </div>
            </section>
          )}

          {active === "revenus" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Revenus</h2>
              <Field label="Total revenus mensuels (placeholder)">
                <input
                  type="number"
                  value={data.revenus.revenusMensuels}
                  onChange={(e) =>
                    setData((d) => ({ ...d, revenus: { ...d.revenus, revenusMensuels: Number(e.target.value || 0) } }))
                  }
                />
              </Field>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Ici, on remplacera par la structure réelle : revenus nets, ressources diverses, exonérations, etc.
              </div>
            </section>
          )}

          {active === "biens" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Biens</h2>
              <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={data.biens.aBienImmo}
                  onChange={(e) => setData((d) => ({ ...d, biens: { ...d.biens, aBienImmo: e.target.checked } }))}
                />
                Possède un bien immobilier (placeholder)
              </label>
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                On détaillera ensuite : RC non indexé, quote-part, etc.
              </div>
            </section>
          )}

          {active === "apercu" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Aperçu</h2>

              <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Statut</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {result.eligible ? "Éligible" : "Non éligible"}
                </div>
                <div style={{ marginTop: 8 }}>
                  Montant estimé : <b>{result.montant} €</b>
                </div>
                <ul style={{ marginTop: 10 }}>
                  {result.explications.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>

              <details>
                <summary>Données (debug)</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
              </details>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
