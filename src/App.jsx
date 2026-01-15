import { useMemo, useState } from "react";
import { computeRI } from "./engine/ri";

const SECTIONS = [
  { id: "reference", label: "Référence" },
  { id: "identite", label: "Informations" },
  { id: "menage", label: "Ménage" },
  { id: "ressources", label: "Ressources" },
  { id: "apercu", label: "Aperçu" },
];

const defaultData = {
  reference: {
    dateISO: "2025-02-01", // date de référence du barème (1er du mois recommandé)
    joursPrisEnCompte: "", // vide = mois complet
  },
  identite: {
    nom: "",
    prenom: "",
    dateNaissance: "",
    nationalite: "",
  },
  menage: {
    situation: "isolé", // "isolé" | "cohabitant" | "famille"
    nbEnfants: 0,
  },
  ressources: {
    totalRessourcesAnnuelles: 0, // équivalent Apercu!C37 (temporaire, on détaillera ensuite)
  },
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{label}</span>
      {children}
      {hint ? <span style={{ fontSize: 12, opacity: 0.65 }}>{hint}</span> : null}
    </label>
  );
}

function situationToCategorie(situation) {
  // Mapping "métier" -> catégorie Excel (à valider/ajuster si besoin)
  // isolé -> 1, cohabitant -> 2, famille -> 3
  if (situation === "isolé") return 1;
  if (situation === "cohabitant") return 2;
  return 3;
}

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDateISO(dateISO) {
  // Si l'utilisateur choisit un jour quelconque, on peut forcer au 1er du mois.
  // (Excel se base sur des dates de barèmes; le 1er est souvent logique.)
  // Si tu préfères respecter le jour exact, enlève cette fonction.
  if (!dateISO) return "";
  const [y, m] = dateISO.split("-").map(Number);
  if (!y || !m) return dateISO;
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

function computeFromForm(data) {
  const categorie = situationToCategorie(data.menage.situation);

  const dateISO = normalizeDateISO(data.reference.dateISO);
  const totalRessourcesAnnuelles = safeNumber(data.ressources.totalRessourcesAnnuelles, 0);

  const jours =
    data.reference.joursPrisEnCompte === "" || data.reference.joursPrisEnCompte == null
      ? null
      : safeNumber(data.reference.joursPrisEnCompte, null);

  return computeRI({
    dateISO,
    categorie,
    totalRessourcesAnnuelles,
    joursPrisEnCompte: jours,
  });
}

function Sidebar({ active, onSelect }) {
  return (
    <nav style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "10px 10px",
            marginBottom: 8,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: active === s.id ? "#f3f3f3" : "white",
            cursor: "pointer",
          }}
        >
          {s.label}
        </button>
      ))}
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        Astuce : commence par <b>Référence</b> puis <b>Ménage</b>, et enfin <b>Ressources</b>.
      </div>
    </nav>
  );
}

export default function App() {
  const [active, setActive] = useState("reference");
  const [data, setData] = useState(defaultData);

  const result = useMemo(() => computeFromForm(data), [data]);

  function reset() {
    setData(defaultData);
    setActive("reference");
  }

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1150, margin: "0 auto" }}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0 }}>Simulateur – Revenu d’intégration</h1>
          <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
            Aucun enregistrement – calcul local dans le navigateur (GitHub Pages)
          </div>
        </div>
        <button onClick={reset} style={{ padding: "10px 12px", cursor: "pointer" }}>
          Réinitialiser
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "270px 1fr", gap: 16, marginTop: 16 }}>
        <Sidebar active={active} onSelect={setActive} />

        <main style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          {/* Référence */}
          {active === "reference" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Référence</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field
                  label="Date de référence (barème)"
                  hint="On utilisera le barème en vigueur à cette date. (Astuce : mets le 1er du mois.)"
                >
                  <input
                    type="date"
                    value={data.reference.dateISO}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        reference: { ...d.reference, dateISO: e.target.value },
                      }))
                    }
                  />
                </Field>

                <Field
                  label="Jours pris en compte (prorata)"
                  hint="Laisse vide pour un mois complet. Sinon, nombre de jours du mois à prendre en compte."
                >
                  <input
                    type="number"
                    min="1"
                    value={data.reference.joursPrisEnCompte}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        reference: { ...d.reference, joursPrisEnCompte: e.target.value },
                      }))
                    }
                  />
                </Field>
              </div>

              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Le prorata correspond à la formule Excel (type <code>mensuel × joursPris / joursMois</code>).
              </div>
            </section>
          )}

          {/* Informations */}
          {active === "identite" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Informations</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nom">
                  <input
                    value={data.identite.nom}
                    onChange={(e) =>
                      setData((d) => ({ ...d, identite: { ...d.identite, nom: e.target.value } }))
                    }
                  />
                </Field>

                <Field label="Prénom">
                  <input
                    value={data.identite.prenom}
                    onChange={(e) =>
                      setData((d) => ({ ...d, identite: { ...d.identite, prenom: e.target.value } }))
                    }
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

              <div style={{ opacity: 0.75, fontSize: 13 }}>
                (Pour l’instant, ces champs n’influencent pas le calcul. On les reliera aux règles si nécessaire.)
              </div>
            </section>
          )}

          {/* Ménage */}
          {active === "menage" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ménage</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Situation (mappée vers Catégorie Excel)">
                  <select
                    value={data.menage.situation}
                    onChange={(e) =>
                      setData((d) => ({ ...d, menage: { ...d.menage, situation: e.target.value } }))
                    }
                  >
                    <option value="isolé">Isolé (Cat. 1)</option>
                    <option value="cohabitant">Cohabitant (Cat. 2)</option>
                    <option value="famille">Famille (Cat. 3)</option>
                  </select>
                </Field>

                <Field label="Nombre d’enfants à charge">
                  <input
                    type="number"
                    min="0"
                    value={data.menage.nbEnfants}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        menage: { ...d.menage, nbEnfants: safeNumber(e.target.value, 0) },
                      }))
                    }
                  />
                </Field>
              </div>

              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Le mapping Catégorie 1/2/3 est à confirmer par votre règle métier exacte (facile à ajuster).
              </div>
            </section>
          )}

          {/* Ressources */}
          {active === "ressources" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ressources</h2>

              <Field
                label="Total des ressources annuelles (temporaire)"
                hint="Correspond à la cellule de total global des ressources (annuel) sur le dashboard Excel. On détaillera ensuite (revenus nets, ressources diverses, etc.)."
              >
                <input
                  type="number"
                  value={data.ressources.totalRessourcesAnnuelles}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      ressources: {
                        ...d.ressources,
                        totalRessourcesAnnuelles: safeNumber(e.target.value, 0),
                      },
                    }))
                  }
                />
              </Field>

              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Prochaine étape : remplacer ce champ par le détail des onglets (revenus, chômage, avantages, biens, etc.)
                et recalculer ce total automatiquement.
              </div>
            </section>
          )}

          {/* Aperçu */}
          {active === "apercu" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Aperçu</h2>

              {result?.error ? (
                <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
                  <b>Erreur :</b> {result.error}
                </div>
              ) : (
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 13, opacity: 0.7 }}>Statut</div>
                  <div style={{ fontSize: 24, fontWeight: 750 }}>
                    {result.eligible ? "Éligible" : "Non éligible"}
                  </div>

                  <div style={{ marginTop: 10 }}>
                    Montant mensuel :{" "}
                    <b>
                      {typeof result.montantMensuel === "number"
                        ? result.montantMensuel.toFixed(2)
                        : result.montantMensuel}{" "}
                      €
                    </b>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    Montant mensuel proratisé :{" "}
                    <b>
                      {typeof result.montantMensuelProratise === "number"
                        ? result.montantMensuelProratise.toFixed(2)
                        : result.montantMensuelProratise}{" "}
                      €
                    </b>
                  </div>

                  <ul style={{ marginTop: 12 }}>
                    {(result.explications || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>

                  <details style={{ marginTop: 12 }}>
                    <summary>Détails (debug)</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result.details, null, 2)}</pre>
                  </details>
                </div>
              )}

              <details>
                <summary>Données (debug)</summary>
                <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(data, null, 2)}</pre>
              </details>
            </section>
          )}
        </main>
      </div>

      {/* footer mini */}
      <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
        Note : pour un rendu “iframe-friendly”, cette app n’utilise aucun stockage persistant (pas de localStorage/DB).
      </footer>
    </div>
  );
}
