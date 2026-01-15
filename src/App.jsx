import { useMemo, useState } from "react";
import { computeRI } from "./engine/ri";
import { useEffect } from "react";

useEffect(() => {
  function notifyHeight() {
    const height = document.documentElement.scrollHeight;
    window.parent?.postMessage(
      { type: "SIMULATEUR_RI_HEIGHT", height },
      "*"
    );
  }

  notifyHeight();

  const observer = new ResizeObserver(() => {
    notifyHeight();
  });

  observer.observe(document.body);

  return () => observer.disconnect();
}, []);

const SECTIONS = [
  { id: "reference", label: "Référence" },
  { id: "identite", label: "Informations" },
  { id: "menage", label: "Ménage" },
  { id: "revenus_nets", label: "Revenus nets" },
  { id: "ressources", label: "Ressources" },
  { id: "apercu", label: "Aperçu" },
];

const defaultRow = () => ({
  label: "",
  comptabilise: 0, // colonne "Revenus comptabilisés €/mois"
  exonere: 0, // colonne "Revenus exonérés €/mois"
});

const defaultData = {
  reference: {
    dateISO: "2025-02-01",
    joursPrisEnCompte: "",
  },
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
  revenusNets: {
    demandeur: {
      rows: [defaultRow()],
    },
    conjoint: {
      enabled: false,
      rows: [defaultRow()],
    },
  },
  ressources: {
    autresRessourcesMensuelles: 0, // temporaire (chômage, mutuelle, avantages, etc. viendront remplacer)
    ressourcesDiversesAnnuelles: 0, // annuel
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

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeDateISO(dateISO) {
  if (!dateISO) return "";
  const [y, m] = dateISO.split("-").map(Number);
  if (!y || !m) return dateISO;
  const mm = String(m).padStart(2, "0");
  return `${y}-${mm}-01`;
}

function situationToCategorie(situation) {
  // Mapping à confirmer si vous avez une règle interne différente.
  if (situation === "isolé") return 1;
  if (situation === "cohabitant") return 2;
  return 3; // famille
}

function computeNetMonthly(rows) {
  const sumC = rows.reduce((acc, r) => acc + safeNumber(r.comptabilise, 0), 0);
  const sumE = rows.reduce((acc, r) => acc + safeNumber(r.exonere, 0), 0);
  return {
    sumComptabilise: sumC,
    sumExonere: sumE,
    net: sumC - sumE,
  };
}

function Money({ value }) {
  const v = typeof value === "number" ? value : safeNumber(value, 0);
  return <>{v.toFixed(2)} €</>;
}

function RowsTable({ title, rows, onChangeRows }) {
  const totals = useMemo(() => computeNetMonthly(rows), [rows]);
  const annual = totals.net * 12;

  function updateRow(i, patch) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onChangeRows(next);
  }

  function addRow() {
    onChangeRows([...rows, defaultRow()]);
  }

  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i);
    onChangeRows(next.length ? next : [defaultRow()]);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={addRow} style={{ cursor: "pointer", padding: "6px 10px" }}>
          + Ajouter une ligne
        </button>
      </div>

      <div style={{ overflowX: "auto", marginTop: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Libellé</th>
              <th style={thStyle}>Revenus comptabilisés (€/mois)</th>
              <th style={thStyle}>Revenus exonérés (€/mois)</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <input
                    value={r.label}
                    onChange={(e) => updateRow(i, { label: e.target.value })}
                    placeholder="ex: salaire net, prime, indemnité..."
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    value={r.comptabilise}
                    onChange={(e) => updateRow(i, { comptabilise: safeNumber(e.target.value, 0) })}
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={tdStyle}>
                  <input
                    type="number"
                    value={r.exonere}
                    onChange={(e) => updateRow(i, { exonere: safeNumber(e.target.value, 0) })}
                    style={{ width: "100%" }}
                  />
                </td>
                <td style={tdStyle}>
                  <button onClick={() => removeRow(i)} style={{ cursor: "pointer" }}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={tfStyle}><b>Sous-total</b></td>
              <td style={tfStyle}><Money value={totals.sumComptabilise} /></td>
              <td style={tfStyle}><Money value={totals.sumExonere} /></td>
              <td style={tfStyle}></td>
            </tr>
            <tr>
              <td style={tfStyle}><b>Net mensuel (ΣC − ΣE)</b></td>
              <td style={tfStyle} colSpan={3}><b><Money value={totals.net} /></b></td>
            </tr>
            <tr>
              <td style={tfStyle}><b>Net annuel (mensuel × 12)</b></td>
              <td style={tfStyle} colSpan={3}><b><Money value={annual} /></b></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", fontSize: 13 };
const tdStyle = { borderBottom: "1px solid #eee", padding: "8px 6px", verticalAlign: "top" };
const tfStyle = { padding: "8px 6px" };

function computeFromForm(data) {
  const categorie = situationToCategorie(data.menage.situation);
  const dateISO = normalizeDateISO(data.reference.dateISO);

  const jours =
    data.reference.joursPrisEnCompte === "" || data.reference.joursPrisEnCompte == null
      ? null
      : safeNumber(data.reference.joursPrisEnCompte, null);

  // Revenus nets (demandeur + conjoint si activé)
  const dem = computeNetMonthly(data.revenusNets.demandeur.rows);
  const conj = data.revenusNets.conjoint.enabled
    ? computeNetMonthly(data.revenusNets.conjoint.rows)
    : { sumComptabilise: 0, sumExonere: 0, net: 0 };

  // Autres ressources mensuelles (temporaire)
  const autresMensuelles = safeNumber(data.ressources.autresRessourcesMensuelles, 0);

  // Total ressources mensuelles (temporaire mais déjà structuré)
  const totalMensuel = dem.net + conj.net + autresMensuelles;

  // Ressources annuelles diverses (temporaire)
  const diversesAnnuelles = safeNumber(data.ressources.ressourcesDiversesAnnuelles, 0);

  // Total annuel utilisé par le moteur RI (équivalent “C37” au stade actuel)
  const totalRessourcesAnnuelles = totalMensuel * 12 + diversesAnnuelles;

  const ri = computeRI({
    dateISO,
    categorie,
    totalRessourcesAnnuelles,
    joursPrisEnCompte: jours,
  });

  return {
    ...ri,
    _breakdown: {
      revenusNetsDemandeurMensuel: dem.net,
      revenusNetsConjointMensuel: conj.net,
      autresMensuelles,
      totalMensuel,
      diversesAnnuelles,
      totalRessourcesAnnuelles,
      categorie,
      dateISO,
    },
  };
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
        Ordre conseillé : <b>Référence</b> → <b>Ménage</b> → <b>Revenus nets</b> → <b>Aperçu</b>.
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

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, marginTop: 16 }}>
        <Sidebar active={active} onSelect={setActive} />

        <main style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
          {active === "reference" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Référence</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Date de référence (barème)">
                  <input
                    type="date"
                    value={data.reference.dateISO}
                    onChange={(e) =>
                      setData((d) => ({ ...d, reference: { ...d.reference, dateISO: e.target.value } }))
                    }
                  />
                </Field>

                <Field label="Jours pris en compte (prorata)" hint="Laisse vide pour mois complet.">
                  <input
                    type="number"
                    min="1"
                    value={data.reference.joursPrisEnCompte}
                    onChange={(e) =>
                      setData((d) => ({ ...d, reference: { ...d.reference, joursPrisEnCompte: e.target.value } }))
                    }
                  />
                </Field>
              </div>
            </section>
          )}

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
            </section>
          )}

          {active === "menage" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ménage</h2>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Situation (mappée vers Catégorie Excel)">
                  <select
                    value={data.menage.situation}
                    onChange={(e) => setData((d) => ({ ...d, menage: { ...d.menage, situation: e.target.value } }))}
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
            </section>
          )}

          {active === "revenus_nets" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Revenus nets</h2>

              <RowsTable
                title="Demandeur"
                rows={data.revenusNets.demandeur.rows}
                onChangeRows={(rows) =>
                  setData((d) => ({ ...d, revenusNets: { ...d.revenusNets, demandeur: { ...d.revenusNets.demandeur, rows } } }))
                }
              />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  checked={data.revenusNets.conjoint.enabled}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      revenusNets: {
                        ...d.revenusNets,
                        conjoint: { ...d.revenusNets.conjoint, enabled: e.target.checked },
                      },
                    }))
                  }
                />
                <span>Encoder aussi les revenus nets du conjoint</span>
              </div>

              {data.revenusNets.conjoint.enabled && (
                <RowsTable
                  title="Conjoint"
                  rows={data.revenusNets.conjoint.rows}
                  onChangeRows={(rows) =>
                    setData((d) => ({ ...d, revenusNets: { ...d.revenusNets, conjoint: { ...d.revenusNets.conjoint, rows } } }))
                  }
                />
              )}

              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Règle Excel reproduite : <b>net mensuel = Σ(comptabilisés) − Σ(exonérés)</b>, puis <b>annuel = mensuel × 12</b>.
              </div>
            </section>
          )}

          {active === "ressources" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ressources</h2>

              <Field
                label="Autres ressources mensuelles (temporaire)"
                hint="À remplacer ensuite par : chômage/mutuelle/remplacement, avantages en nature, etc."
              >
                <input
                  type="number"
                  value={data.ressources.autresRessourcesMensuelles}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      ressources: { ...d.ressources, autresRessourcesMensuelles: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>

              <Field
                label="Ressources diverses annuelles"
                hint="Montants annuels qui ne sont pas mensuels."
              >
                <input
                  type="number"
                  value={data.ressources.ressourcesDiversesAnnuelles}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      ressources: { ...d.ressources, ressourcesDiversesAnnuelles: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>

              <div style={{ fontSize: 13, opacity: 0.75 }}>
                Le total annuel utilisé pour le calcul = <b>(total mensuel × 12) + diverses annuelles</b>.
              </div>
            </section>
          )}

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
                    Montant mensuel : <b><Money value={result.montantMensuel} /></b>
                  </div>

                  <div style={{ marginTop: 6 }}>
                    Montant mensuel proratisé : <b><Money value={result.montantMensuelProratise} /></b>
                  </div>

                  <hr style={{ margin: "12px 0" }} />

                  <div style={{ fontSize: 13, opacity: 0.7 }}>Ressources (résumé)</div>
                  <ul style={{ marginTop: 8 }}>
                    <li>Revenus nets demandeur (mensuel) : <b><Money value={result._breakdown.revenusNetsDemandeurMensuel} /></b></li>
                    <li>Revenus nets conjoint (mensuel) : <b><Money value={result._breakdown.revenusNetsConjointMensuel} /></b></li>
                    <li>Autres ressources mensuelles : <b><Money value={result._breakdown.autresMensuelles} /></b></li>
                    <li>Total mensuel : <b><Money value={result._breakdown.totalMensuel} /></b></li>
                    <li>Diverses annuelles : <b><Money value={result._breakdown.diversesAnnuelles} /></b></li>
                    <li>Total ressources annuelles (utilisé) : <b><Money value={result._breakdown.totalRessourcesAnnuelles} /></b></li>
                  </ul>

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

      <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
        Note : aucun stockage persistant. Cette app est “iframe-friendly”.
      </footer>
    </div>
  );
}
