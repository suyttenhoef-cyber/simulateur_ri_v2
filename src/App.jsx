import { useMemo, useState } from "react";
import { computeRI } from "./engine/ri";

const SECTIONS = [
  { id: "reference", label: "Référence" },
  { id: "identite", label: "Informations" },
  { id: "menage", label: "Ménage" },
  { id: "revenus_nets", label: "Revenus nets" },
  { id: "cmr", label: "Chômage / Mutuelle / Remplacement" },
  { id: "ressources", label: "Ressources" },
  { id: "apercu", label: "Aperçu" },
];

const defaultRow = () => ({
  label: "",
  comptabilise: 0,
  exonere: 0,
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
    demandeur: { rows: [defaultRow()] },
    conjoint: { enabled: false, rows: [defaultRow()] },
  },
  cmr: {
    chomage: {
      mensuelReel: 0,
      montantJour26: 0, // €/jour → *26
      montantJourAnnuel: 0, // €/jour → *joursPayesAnnee/12
    },
    mutuelle: {
      mensuelReel: 0,
      montantJour26: 0,
      montantJourAnnuel: 0,
    },
    remplacement: {
      pensionMensuel: 0,
      droitPasserelleMensuel: 0,
      allocationHandicapeMensuel: 0,
    },
  },
  ressources: {
    autresRessourcesMensuelles: 0, // placeholder pour la suite (avantages en nature, etc.)
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
  if (situation === "isolé") return 1;
  if (situation === "cohabitant") return 2;
  return 3;
}

function computeNetMonthly(rows) {
  const sumC = rows.reduce((acc, r) => acc + safeNumber(r.comptabilise, 0), 0);
  const sumE = rows.reduce((acc, r) => acc + safeNumber(r.exonere, 0), 0);
  return { sumComptabilise: sumC, sumExonere: sumE, net: sumC - sumE };
}

function Money({ value }) {
  const v = typeof value === "number" ? value : safeNumber(value, 0);
  return <>{v.toFixed(2)} €</>;
}

function computeAvantagesMensuels({ voitureSociete, logementGratuit, ticketsRepas, autresAvantages }) {
  const v = safeNumber(voitureSociete, 0);
  const l = safeNumber(logementGratuit, 0);
  const t = safeNumber(ticketsRepas, 0);
  const o = safeNumber(autresAvantages, 0);
  const mensuelTotal = v + l + t + o;
  return { mensuelTotal, annuelTotal: mensuelTotal * 12 };
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

/**
 * Reproduction Excel: NETWORKDAYS.INTL(...,"0000001")
 * => tous les jours comptent sauf le dimanche.
 */
function daysPaidInYearExcludingSunday(year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  let count = 0;

  for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
    const day = d.getUTCDay(); // 0=dimanche
    if (day !== 0) count += 1;
  }
  return count;
}

function computeChomageOrMutuelleMonthly({ mensuelReel, montantJour26, montantJourAnnuel, year }) {
  const m1 = safeNumber(mensuelReel, 0);
  const m2 = safeNumber(montantJour26, 0) * 26;
  const daysPaid = daysPaidInYearExcludingSunday(year);
  const m3 = (safeNumber(montantJourAnnuel, 0) * daysPaid) / 12;

  return {
    mensuelReel: m1,
    mensuel26: m2,
    mensuelAnnuel: m3,
    mensuelTotal: m1 + m2 + m3,
    annuelTotal: (m1 + m2 + m3) * 12,
    daysPaid,
  };
}

function computeRemplacementMonthly({ pensionMensuel, droitPasserelleMensuel, allocationHandicapeMensuel }) {
  const p = safeNumber(pensionMensuel, 0);
  const d = safeNumber(droitPasserelleMensuel, 0);
  const a = safeNumber(allocationHandicapeMensuel, 0);
  const mensuel = p + d + a;
  return { mensuel, annuel: mensuel * 12, parts: { p, d, a } };
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
    </nav>
  );
}

function computeFromForm(data) {
  const categorie = situationToCategorie(data.menage.situation);
  const dateISO = normalizeDateISO(data.reference.dateISO);
  const jours = data.reference.joursPrisEnCompte === "" || data.reference.joursPrisEnCompte == null
      ? null
      : safeNumber(data.reference.joursPrisEnCompte, null);

  const [yearStr] = (dateISO || "2025-01-01").split("-");
  const year = safeNumber(yearStr, 2025);

  // Revenus nets (demandeur + conjoint)
  const dem = computeNetMonthly(data.revenusNets.demandeur.rows);
  const conj = data.revenusNets.conjoint.enabled
    ? computeNetMonthly(data.revenusNets.conjoint.rows)
    : { sumComptabilise: 0, sumExonere: 0, net: 0 };

  // Chômage / mutuelle / remplacement
  const chom = computeChomageOrMutuelleMonthly({ ...data.cmr.chomage, year });
  const mut = computeChomageOrMutuelleMonthly({ ...data.cmr.mutuelle, year });
  const rem = computeRemplacementMonthly(data.cmr.remplacement);

  const cmrMensuel = chom.mensuelTotal + mut.mensuelTotal + rem.mensuel;

  // Avantages en nature
  const avantages = computeAvantagesMensuels(data.avantages);

  // Total mensuel & annuel pour computeRI
  const totalMensuel = dem.net + conj.net + cmrMensuel + avantages.mensuelTotal;
  const diversesAnnuelles = safeNumber(data.ressources.ressourcesDiversesAnnuelles, 0);
  const totalRessourcesAnnuelles = totalMensuel * 12 + diversesAnnuelles;

  const ri = computeRI({ dateISO, categorie, totalRessourcesAnnuelles, joursPrisEnCompte: jours });

  return {
    ...ri,
    _breakdown: {
      dateISO,
      categorie,
      revenusNetsDemandeurMensuel: dem.net,
      revenusNetsConjointMensuel: conj.net,
      cmrMensuel,
      avantages,
      totalMensuel,
      diversesAnnuelles,
      totalRessourcesAnnuelles,
    },
  };
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
                  setData((d) => ({
                    ...d,
                    revenusNets: { ...d.revenusNets, demandeur: { ...d.revenusNets.demandeur, rows } },
                  }))
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
                    setData((d) => ({
                      ...d,
                      revenusNets: { ...d.revenusNets, conjoint: { ...d.revenusNets.conjoint, rows } },
                    }))
                  }
                />
              )}
            </section>
          )}

          {active === "cmr" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Chômage / Mutuelle / Remplacement</h2>

              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                  <h3 style={{ marginTop: 0 }}>Chômage</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Field label="Montant mensuel réel">
                      <input
                        type="number"
                        value={data.cmr.chomage.mensuelReel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, mensuelReel: safeNumber(e.target.value, 0) } },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Montant/jour (sur 26 jours)">
                      <input
                        type="number"
                        value={data.cmr.chomage.montantJour26}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, montantJour26: safeNumber(e.target.value, 0) } },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Montant/jour (annuel)">
                      <input
                        type="number"
                        value={data.cmr.chomage.montantJourAnnuel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: {
                              ...d.cmr,
                              chomage: { ...d.cmr.chomage, montantJourAnnuel: safeNumber(e.target.value, 0) },
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                    Mensuel équivalent = mensuel réel + (€/jour × 26) + (€/jour annuel × jours payés / 12).
                  </div>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                  <h3 style={{ marginTop: 0 }}>Mutuelle</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Field label="Montant mensuel réel">
                      <input
                        type="number"
                        value={data.cmr.mutuelle.mensuelReel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, mensuelReel: safeNumber(e.target.value, 0) } },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Montant/jour (sur 26 jours)">
                      <input
                        type="number"
                        value={data.cmr.mutuelle.montantJour26}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, montantJour26: safeNumber(e.target.value, 0) } },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Montant/jour (annuel)">
                      <input
                        type="number"
                        value={data.cmr.mutuelle.montantJourAnnuel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: {
                              ...d.cmr,
                              mutuelle: { ...d.cmr.mutuelle, montantJourAnnuel: safeNumber(e.target.value, 0) },
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 13, opacity: 0.75 }}>
                    Même logique que l’Excel (NETWORKDAYS.INTL avec dimanche exclu).
                  </div>
                </div>

                <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                  <h3 style={{ marginTop: 0 }}>Remplacement</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <Field label="Pension (mensuel)">
                      <input
                        type="number"
                        value={data.cmr.remplacement.pensionMensuel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, pensionMensuel: safeNumber(e.target.value, 0) } },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Droit passerelle (mensuel)">
                      <input
                        type="number"
                        value={data.cmr.remplacement.droitPasserelleMensuel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: {
                              ...d.cmr,
                              remplacement: {
                                ...d.cmr.remplacement,
                                droitPasserelleMensuel: safeNumber(e.target.value, 0),
                              },
                            },
                          }))
                        }
                      />
                    </Field>

                    <Field label="Allocation d’Handicapé ARR (mensuel)">
                      <input
                        type="number"
                        value={data.cmr.remplacement.allocationHandicapeMensuel}
                        onChange={(e) =>
                          setData((d) => ({
                            ...d,
                            cmr: {
                              ...d.cmr,
                              remplacement: {
                                ...d.cmr.remplacement,
                                allocationHandicapeMensuel: safeNumber(e.target.value, 0),
                              },
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </section>
          )}

          {active === "avantages" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Avantages en nature</h2>
              
              <Field label="Charges locatives prises en charge par un tiers (€/mois)">
                <input
                  type="number"
                  value={data.avantages.voitureSociete}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      avantages: { ...d.avantages, voitureSociete: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>

              <Field label="Loyer fictif évalué par un professionnel (€/mois)">
                <input
                  type="number"
                  value={data.avantages.logementGratuit}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      avantages: { ...d.avantages, logementGratuit: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>

              <Field label="Loyer fictif évalué via simulateur ou grille de loyers (€/mois)">
                <input
                  type="number"
                  value={data.avantages.ticketsRepas}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      avantages: { ...d.avantages, ticketsRepas: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>

              <Field label="Prêt hypothécaire pris en charge par un tiers (€/mois)">
                <input
                  type="number"
                  value={data.avantages.autresAvantages}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      avantages: { ...d.avantages, autresAvantages: safeNumber(e.target.value, 0) },
                    }))
                  }
                />
              </Field>
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
                    <li>Chômage/Mutuelle/Remplacement (mensuel) : <b><Money value={result._breakdown.cmrMensuel} /></b></li>
                    <li>Autres ressources mensuelles : <b><Money value={result._breakdown.autresMensuelles} /></b></li>
                    <li><b>Total mensuel</b> : <b><Money value={result._breakdown.totalMensuel} /></b></li>
                    <li>Diverses annuelles : <b><Money value={result._breakdown.diversesAnnuelles} /></b></li>
                    <li><b>Total ressources annuelles (utilisé)</b> : <b><Money value={result._breakdown.totalRessourcesAnnuelles} /></b></li>
                  </ul>

                  <details style={{ marginTop: 12 }}>
                    <summary>Détails CMR (debug)</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(
                        {
                          chomage: result._breakdown.chomage,
                          mutuelle: result._breakdown.mutuelle,
                          remplacement: result._breakdown.remplacement,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>

                  <ul style={{ marginTop: 12 }}>
                    {(result.explications || []).map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>

                  <details style={{ marginTop: 12 }}>
                    <summary>Détails moteur RI (debug)</summary>
                    <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result.details, null, 2)}</pre>
                  </details>
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
        Note : on a reproduit le calcul Excel (NETWORKDAYS.INTL "0000001" = dimanche exclu).
      </footer>
    </div>
  );
}
