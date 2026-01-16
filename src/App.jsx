import { useMemo, useState } from "react";

const SECTIONS = [
  { id: "reference", label: "Référence" },
  { id: "identite", label: "Informations" },
  { id: "menage", label: "Ménage" },
  { id: "revenus_nets", label: "Revenus nets" },
  { id: "cmr", label: "Chômage / Mutuelle / Remplacement" },
  { id: "avantages", label: "Avantages en nature" },
  { id: "cessions_biens", label: "Cessions de biens" },
  { id: "biens_immobiliers", label: "Biens immobiliers" },
  { id: "ressources_diverses", label: "Ressources diverses" },
  { id: "apercu", label: "Aperçu" },
];

const defaultRow = () => ({ label: "", comptabilise: 0, exonere: 0 });

const defaultCessionRow = () => ({
  typeBien: "", valeurVenale: 0, natureCession: "", dateCession: "",
  titrePropriete: "", partConcernee: 100, dettesPersonnelles: 0,
  dispenseEquite: 0, abattementForfaitaire: 0, datePriseEnCompteRI: ""
});

const defaultBienImmobilierRow = () => ({
  typeBien: "", localisation: "", interetsPaye: 0, renteAnnuelle: 0,
  revenuImmoEtranger: 0, rcNonIndexe: 0, loyerAnnuel: 0, quotePart: 50
});

const defaultData = {
  reference: { dateISO: "2025-02-01", joursPrisEnCompte: "" },
  identite: { nom: "", prenom: "", dateNaissance: "", nationalite: "" },
  menage: { situation: "isolé", nbEnfants: 0 },
  revenusNets: {
    demandeur: { rows: [defaultRow()] },
    conjoint: { enabled: false, rows: [defaultRow()] }
  },
  cmr: {
    chomage: { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    mutuelle: { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    remplacement: { pensionMensuel: 0, droitPasserelleMensuel: 0, allocationHandicapeMensuel: 0 }
  },
  avantages: {
    chargesLocativesTiers: 0, loyerFictifProfessionnel: 0,
    loyerFictifSimulateur: 0, pretHypothecaireTiers: 0
  },
  cessionsBiens: { rows: [] },
  biensImmobiliers: { rows: [] },
  ressourcesDiverses: {
    generales: [
      { label: "Allocation récurrente prov. soc. H.E. ou Université", montant: 0 },
      { label: "Partie d'une Bourse couvrant les frais de séjour", montant: 0 },
      { label: "Autre ressource diverses", montant: 0 }
    ],
    benevoles: [
      { label: "montant journalier", montant: 0 },
      { label: "montant annuel acquis", montant: 0 },
      { label: "indemnités perçues", montant: 0 }
    ]
  }
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 13, opacity: 0.85 }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 12, opacity: 0.65 }}>{hint}</span>}
    </label>
  );
}

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function Money({ value }) {
  const v = typeof value === "number" ? value : safeNumber(value, 0);
  return <>{v.toFixed(2)} €</>;
}

function computeNetMonthly(rows) {
  const sumC = rows.reduce((acc, r) => acc + safeNumber(r.comptabilise, 0), 0);
  const sumE = rows.reduce((acc, r) => acc + safeNumber(r.exonere, 0), 0);
  return { sumComptabilise: sumC, sumExonere: sumE, net: sumC - sumE };
}

function RowsTable({ title, rows, onChangeRows }) {
  const totals = useMemo(() => computeNetMonthly(rows), [rows]);

  function updateRow(i, patch) {
    onChangeRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { onChangeRows([...rows, defaultRow()]); }
  function removeRow(i) {
    const next = rows.filter((_, idx) => idx !== i);
    onChangeRows(next.length ? next : [defaultRow()]);
  }

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button onClick={addRow} style={{ cursor: "pointer", padding: "6px 10px" }}>+ Ajouter</button>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>Libellé</th>
              <th style={thStyle}>Comptabilisés (€/mois)</th>
              <th style={thStyle}>Exonérés (€/mois)</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <input value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })}
                    placeholder="ex: salaire net..." style={{ width: "100%" }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" value={r.comptabilise}
                    onChange={(e) => updateRow(i, { comptabilise: safeNumber(e.target.value, 0) })}
                    style={{ width: "100%" }} />
                </td>
                <td style={tdStyle}>
                  <input type="number" value={r.exonere}
                    onChange={(e) => updateRow(i, { exonere: safeNumber(e.target.value, 0) })}
                    style={{ width: "100%" }} />
                </td>
                <td style={tdStyle}>
                  <button onClick={() => removeRow(i)} style={{ cursor: "pointer" }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td style={tfStyle}><b>Net mensuel</b></td>
              <td style={tfStyle} colSpan={3}><b><Money value={totals.net} /></b></td>
            </tr>
            <tr>
              <td style={tfStyle}><b>Net annuel</b></td>
              <td style={tfStyle} colSpan={3}><b><Money value={totals.net * 12} /></b></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CessionsBiensTable({ rows, onChangeRows }) {
  function updateRow(i, patch) {
    onChangeRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { onChangeRows([...rows, defaultCessionRow()]); }
  function removeRow(i) { onChangeRows(rows.filter((_, idx) => idx !== i)); }

  const totalRevenu = rows.reduce((sum, r) => {
    const val = safeNumber(r.valeurVenale, 0);
    const part = safeNumber(r.partConcernee, 100) / 100;
    const dettes = safeNumber(r.dettesPersonnelles, 0);
    const dispense = safeNumber(r.dispenseEquite, 0);
    const abat = safeNumber(r.abattementForfaitaire, 0);
    return sum + (val * part - dettes - dispense - abat);
  }, 0);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Cessions de biens</h3>
        <button onClick={addRow} style={{ cursor: "pointer", padding: "6px 10px" }}>+ Ajouter</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucune cession enregistrée</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Valeur vénale</th>
                <th style={thStyle}>Nature</th>
                <th style={thStyle}>Date</th>
                <th style={thStyle}>Part %</th>
                <th style={thStyle}>Dettes</th>
                <th style={thStyle}>Dispense</th>
                <th style={thStyle}>Abattement</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    <input value={r.typeBien} onChange={(e) => updateRow(i, { typeBien: e.target.value })}
                      placeholder="Type" style={{ width: 100 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.valeurVenale}
                      onChange={(e) => updateRow(i, { valeurVenale: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input value={r.natureCession} onChange={(e) => updateRow(i, { natureCession: e.target.value })}
                      placeholder="Nature" style={{ width: 100 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="date" value={r.dateCession}
                      onChange={(e) => updateRow(i, { dateCession: e.target.value })} style={{ width: 120 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.partConcernee}
                      onChange={(e) => updateRow(i, { partConcernee: safeNumber(e.target.value, 100) })}
                      style={{ width: 60 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.dettesPersonnelles}
                      onChange={(e) => updateRow(i, { dettesPersonnelles: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.dispenseEquite}
                      onChange={(e) => updateRow(i, { dispenseEquite: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.abattementForfaitaire}
                      onChange={(e) => updateRow(i, { abattementForfaitaire: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => removeRow(i)} style={{ cursor: "pointer" }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ marginTop: 10, padding: 10, background: "#f5f5f5", borderRadius: 5 }}>
        <b>Total revenu (mensuel) : <Money value={totalRevenu / 12} /></b>
      </div>
    </div>
  );
}

function BiensImmobiliersTable({ rows, onChangeRows }) {
  function updateRow(i, patch) {
    onChangeRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { onChangeRows([...rows, defaultBienImmobilierRow()]); }
  function removeRow(i) { onChangeRows(rows.filter((_, idx) => idx !== i)); }

  const { IB, INB } = useMemo(() => {
    let ressIB = 0, intIB = 0, locIB = 0;
    let ressINB = 0, intINB = 0, locINB = 0, etranger = 0;

    rows.forEach(r => {
      const quote = safeNumber(r.quotePart, 50) / 100;
      const rc = safeNumber(r.rcNonIndexe, 0) * quote;
      const int = safeNumber(r.interetsPaye, 0) * quote;
      const loyer = safeNumber(r.loyerAnnuel, 0) * quote;
      const revEtr = safeNumber(r.revenuImmoEtranger, 0);

      if (r.typeBien === "Bâti") {
        ressIB += rc; intIB += int; locIB += loyer;
      } else if (r.typeBien === "Non bâti") {
        ressINB += rc; intINB += int; locINB += loyer;
      } else if (r.typeBien === "Étranger") {
        etranger += revEtr;
      }
    });

    return {
      IB: { ressources: ressIB, interets: intIB, locatifs: locIB, total: ressIB - intIB + locIB },
      INB: { ressources: ressINB, interets: intINB, locatifs: locINB, etranger, 
             total: ressINB - intINB + locINB + etranger }
    };
  }, [rows]);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>Biens immobiliers</h3>
        <button onClick={addRow} style={{ cursor: "pointer", padding: "6px 10px" }}>+ Ajouter</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucun bien immobilier enregistré</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Localisation</th>
                <th style={thStyle}>Intérêts payés</th>
                <th style={thStyle}>RC non indexé</th>
                <th style={thStyle}>Loyer annuel</th>
                <th style={thStyle}>Revenu étranger</th>
                <th style={thStyle}>Quote-part %</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}>
                    <select value={r.typeBien} onChange={(e) => updateRow(i, { typeBien: e.target.value })}
                      style={{ width: 100 }}>
                      <option value="">Choisir...</option>
                      <option value="Bâti">Bâti</option>
                      <option value="Non bâti">Non bâti</option>
                      <option value="Étranger">Étranger</option>
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <input value={r.localisation} onChange={(e) => updateRow(i, { localisation: e.target.value })}
                      placeholder="Localisation" style={{ width: 120 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.interetsPaye}
                      onChange={(e) => updateRow(i, { interetsPaye: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.rcNonIndexe}
                      onChange={(e) => updateRow(i, { rcNonIndexe: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.loyerAnnuel}
                      onChange={(e) => updateRow(i, { loyerAnnuel: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.revenuImmoEtranger}
                      onChange={(e) => updateRow(i, { revenuImmoEtranger: safeNumber(e.target.value, 0) })}
                      style={{ width: 80 }} disabled={r.typeBien !== "Étranger"} />
                  </td>
                  <td style={tdStyle}>
                    <input type="number" value={r.quotePart}
                      onChange={(e) => updateRow(i, { quotePart: safeNumber(e.target.value, 50) })}
                      style={{ width: 60 }} />
                  </td>
                  <td style={tdStyle}>
                    <button onClick={() => removeRow(i)} style={{ cursor: "pointer" }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div style={{ marginTop: 10, padding: 10, background: "#f5f5f5", borderRadius: 5, fontSize: 13 }}>
        <div><b>Biens Immobiliers Bâtis (IB)</b> — Total annuel : <Money value={IB.total} /></div>
        <div style={{ marginTop: 5 }}><b>Biens Immobiliers Non Bâtis (INB)</b> — Total annuel : <Money value={INB.total} /></div>
        <div style={{ marginTop: 5 }}><b>Total mensuel</b> : <Money value={(IB.total + INB.total) / 12} /></div>
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", fontSize: 13 };
const tdStyle = { borderBottom: "1px solid #eee", padding: "8px 6px", verticalAlign: "top" };
const tfStyle = { padding: "8px 6px" };

function daysPaidInYearExcludingSunday(year) {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  let count = 0;
  for (let d = start; d <= end; d = new Date(d.getTime() + 24 * 3600 * 1000)) {
    if (d.getUTCDay() !== 0) count += 1;
  }
  return count;
}

function computeChomageOrMutuelleMonthly({ mensuelReel, montantJour26, montantJourAnnuel, year }) {
  const m1 = safeNumber(mensuelReel, 0);
  const m2 = safeNumber(montantJour26, 0) * 26;
  const daysPaid = daysPaidInYearExcludingSunday(year);
  const m3 = (safeNumber(montantJourAnnuel, 0) * daysPaid) / 12;
  return { mensuelTotal: m1 + m2 + m3, daysPaid };
}

function computeRemplacementMonthly({ pensionMensuel, droitPasserelleMensuel, allocationHandicapeMensuel }) {
  return safeNumber(pensionMensuel, 0) + safeNumber(droitPasserelleMensuel, 0) + safeNumber(allocationHandicapeMensuel, 0);
}

function Sidebar({ active, onSelect }) {
  return (
    <nav style={{ border: "1px solid #ddd", borderRadius: 10, padding: 10 }}>
      {SECTIONS.map((s) => (
        <button key={s.id} onClick={() => onSelect(s.id)}
          style={{
            width: "100%", textAlign: "left", padding: "10px 10px", marginBottom: 8,
            borderRadius: 10, border: "1px solid #ddd",
            background: active === s.id ? "#f3f3f3" : "white", cursor: "pointer"
          }}>
          {s.label}
        </button>
      ))}
    </nav>
  );
}

function computeRI({ totalRessourcesAnnuelles, categorie }) {
  const plafonds = { 1: 14000, 2: 10000, 3: 18000 };
  const plafond = plafonds[categorie] || 14000;
  const eligible = totalRessourcesAnnuelles <= plafond;
  return { eligible, montantMensuel: eligible ? plafond / 12 : 0 };
}
function round2(n) {
  const x = Number(n);
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0;
}

const EXO_BATI = 875;    // Exoneration!C16
const EXO_NON_BATI = 30; // Exoneration!C17

function computeImmoAnnualExcelLike(rows) {
  const safeRows = (rows || []).map(r => ({
    typeBien: r.typeBien || "",
    rcNonIndexe: safeNumber(r.rcNonIndexe, 0),
    interetsPaye: safeNumber(r.interetsPaye, 0),
    renteAnnuelle: safeNumber(r.renteAnnuelle, 0),
    loyerAnnuel: safeNumber(r.loyerAnnuel, 0),
    revenuImmoEtranger: safeNumber(r.revenuImmoEtranger, 0),
    quotePart: safeNumber(r.quotePart, 50) / 100
  }));

  const countRCPos = safeRows.reduce((c, r) => c + (r.rcNonIndexe > 0 ? 1 : 0), 0;

  let total = 0;

  for (const r of safeRows) {
    // Cas "Etranger" : Excel somme directement le revenu étranger (col G) à part
    // (sans passer par RC / exonération / loyer).
    if (r.typeBien === "Étranger" || r.typeBien === "Etranger") {
      total += r.revenuImmoEtranger;
      continue;
    }

    if (r.rcNonIndexe <= 0) {
      // Si pas de RC => ressourcesZT vides, mais le loyer pourrait exister.
      // En Excel, le loyer est comparé à M (qui vaut 0) donc si loyer>0, il est compté.
    }

    const K = round2(r.rcNonIndexe * r.quotePart); // RC x Part

    // Exo/bat (L) : (exo*2) réparti entre les biens avec RC>0, puis * quotePart
    const baseExo = (r.typeBien === "Bâti" ? EXO_BATI : EXO_NON_BATI) * 2;
    const L = (r.rcNonIndexe > 0 && countRCPos > 0)
      ? round2((baseExo * r.quotePart) / countRCPos)
      : 0;

    // Ressources - ZT (M)
    const M = (r.rcNonIndexe > 0 && K >= L) ? round2((K - L) * 3) : 0;

    // Loyer droit (U) + loyer compté (V)
    const U = (r.loyerAnnuel > 0) ? round2(r.loyerAnnuel * r.quotePart) : 0;
    const loyerCompte = (U > M) ? U : 0;

    // Si loyer compté => ressources RC "voir loyer" => on ne prend pas M
    const ressourcesRC = loyerCompte > 0 ? 0 : M;

    // Intérêts et rente plafonnés à 50% des ressourcesRC (Excel: N/2)
    const maxDed = round2(ressourcesRC / 2);

    const interetsDroit = round2(r.interetsPaye * r.quotePart);
    const dedInterets = (ressourcesRC > 0 && interetsDroit > 0)
      ? -round2(Math.min(interetsDroit, maxDed))
      : 0;

    const renteDroit = round2(r.renteAnnuelle * r.quotePart);
    const dedRente = (ressourcesRC > 0 && renteDroit > 0)
      ? -round2(Math.min(renteDroit, maxDed))
      : 0;

    // Total annuel de la ligne
    total += ressourcesRC + loyerCompte + dedInterets + dedRente;
  }

  return round2(total);
}
const TRANCHE_IMMUNISEE_UNIQUE = 37200;
const SEUIL_T2 = 6200;
const SEUIL_T3 = 12500;

function coeffTitrePropriete(titre) {
  if (!titre) return 1;
  const t = String(titre).toLowerCase();
  if (t.includes("usufruit")) return 0.4;
  if (t.includes("nu")) return 0.6; // nu-propriété
  return 1; // pleine propriété
}

// Excel: HLOOKUP(cat, Données!Q20:S21,2) => 1250/2000/2500
function montantAnnuelCat(categorie) {
  if (categorie === 1) return 1250;
  if (categorie === 2) return 2000;
  return 2500; // cat 3
}

// Excel P = MAX( (yearK-yearD)*12 + (monthK-monthD) - 1, 0 )
function monthsDiffMinus1(dateCession, datePourRI) {
  if (!dateCession || !datePourRI) return 0;
  const d = new Date(dateCession);
  const k = new Date(datePourRI);
  if (Number.isNaN(d.getTime()) || Number.isNaN(k.getTime())) return 0;

  const yd = d.getUTCFullYear(), md = d.getUTCMonth() + 1; // 1..12
  const yk = k.getUTCFullYear(), mk = k.getUTCMonth() + 1;

  const monthsDiff = (yk - yd) * 12 + (mk - md);
  return Math.max(monthsDiff - 1, 0);
}

function computeCessionsAnnualExcelLike(rows, categorie) {
  const O = montantAnnuelCat(categorie);

  let total = 0;

  for (const r of (rows || [])) {
    const type = r.typeBien || "";
    const valeur = safeNumber(r.valeurVenale, 0);
    if (!valeur) continue;

    const part = safeNumber(r.partConcernee, 100) / 100; // UI en %
    const dettes = safeNumber(r.dettesPersonnelles, 0);
    const dispense = safeNumber(r.dispenseEquite, 0);

    const coeff = coeffTitrePropriete(r.titrePropriete);

    const isUnique =
      type === "Bien bâti (unique)" ||
      type === "Bien non-bâti (unique)" ||
      type === "Bien non-bati (unique)";

    // Q = E * F * coeffTitre
    const Q = round2(valeur * part * coeff);

    // N = -ROUND(trancheImmunisee * part, 2) si unique
    const N = isUnique ? -round2(TRANCHE_IMMUNISEE_UNIQUE * part) : 0;

    // P (nbr mois) + S (annualité) si unique
    const P = isUnique ? monthsDiffMinus1(r.dateCession, r.datePriseEnCompteRI) : 0;
    const S = isUnique ? -round2(O * P / 12) : 0;

    // T = ((Q + N) - dettes) - (dispense - S)
    const T = round2((Q + N) - dettes - (dispense - S));

    // Tranches (Excel multiplie encore par F ici)
    const U = (T === 0) ? 0 : round2(Math.min(SEUIL_T2, T) * part);
    const V = (T === 0) ? 0 : (T > SEUIL_T2 ? round2(Math.min(SEUIL_T3, T) * part) : 0);
    const W = (T > SEUIL_T3) ? T : 0;

    const revenu1 = 0;
    const revenu2 = (V > U) ? round2((V - U) * 0.06) : 0;
    const revenu3 = (W > 0) ? round2((W - V) * 0.10) : 0;

    const M = round2(revenu1 + revenu2 + revenu3);
    total += M;
  }

  return round2(total);
}

function computeFromForm(data) {
  const categorie =
    data.menage.situation === "isolé" ? 1 :
    data.menage.situation === "cohabitant" ? 2 : 3;

  const [yearStr] = (data.reference.dateISO || "2025-01-01").split("-");
  const year = safeNumber(yearStr, 2025);

  const dem = computeNetMonthly(data.revenusNets.demandeur.rows);
  const conj = data.revenusNets.conjoint.enabled
    ? computeNetMonthly(data.revenusNets.conjoint.rows)
    : { net: 0 };

  const chom = computeChomageOrMutuelleMonthly({ ...data.cmr.chomage, year });
  const mut = computeChomageOrMutuelleMonthly({ ...data.cmr.mutuelle, year });
  const rem = computeRemplacementMonthly(data.cmr.remplacement);

  const avantagesMensuel = Object.values(data.avantages).reduce(
    (s, v) => s + safeNumber(v, 0),
    0
  );

  // ✅ Excel-like (à ajouter dans ton code, cf. fonctions que je t’ai données)
  const cessionsTotalAnnuel = computeCessionsAnnualExcelLike(
    data.cessionsBiens?.rows || [],
    categorie
  );

  const immobiliersTotalAnnuel = computeImmoAnnualExcelLike(
    data.biensImmobiliers?.rows || []
  );

  const diversesGenerales = (data.ressourcesDiverses.generales || []).reduce(
    (s, r) => s + safeNumber(r.montant, 0),
    0
  );

  const diversesBenevoles = (data.ressourcesDiverses.benevoles || []).reduce(
    (s, r) => s + safeNumber(r.montant, 0),
    0
  );

  const totalMensuel =
    dem.net +
    conj.net +
    chom.mensuelTotal +
    mut.mensuelTotal +
    rem +
    avantagesMensuel +
    cessionsTotalAnnuel / 12 +
    immobiliersTotalAnnuel / 12 +
    diversesGenerales +
    diversesBenevoles;

  const totalRessourcesAnnuelles = totalMensuel * 12;

  return {
    ...computeRI({ totalRessourcesAnnuelles, categorie }),
    _breakdown: {
      categorie,
      dem: dem.net,
      conj: conj.net,
      chomage: chom.mensuelTotal,
      mutuelle: mut.mensuelTotal,
      remplacement: rem,
      avantages: avantagesMensuel,
      cessions: cessionsTotalAnnuel / 12,
      immobiliers: immobiliersTotalAnnuel / 12,
      diversesGenerales,
      diversesBenevoles,
      totalMensuel,
      totalRessourcesAnnuelles,
    },
  };
}

export default function App() {
  const [active, setActive] = useState("reference");
  const [data, setData] = useState(defaultData);
  const result = useMemo(() => computeFromForm(data), [data]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ margin: 0 }}>Simulateur — Revenu d'intégration</h1>
          <div style={{ opacity: 0.7, marginTop: 4, fontSize: 13 }}>
            Calcul local dans le navigateur (GitHub Pages)
          </div>
        </div>
        <button onClick={() => { setData(defaultData); setActive("reference"); }}
          style={{ padding: "10px 12px", cursor: "pointer" }}>
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
                  <input type="date" value={data.reference.dateISO}
                    onChange={(e) => setData(d => ({ ...d, reference: { ...d.reference, dateISO: e.target.value } }))} />
                </Field>
                <Field label="Jours pris en compte (prorata)" hint="Laisse vide pour mois complet.">
                  <input type="number" min="1" value={data.reference.joursPrisEnCompte}
                    onChange={(e) => setData(d => ({ ...d, reference: { ...d.reference, joursPrisEnCompte: e.target.value } }))} />
                </Field>
              </div>
            </section>
          )}

          {active === "identite" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Informations</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Nom">
                  <input value={data.identite.nom}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, nom: e.target.value } }))} />
                </Field>
                <Field label="Prénom">
                  <input value={data.identite.prenom}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, prenom: e.target.value } }))} />
                </Field>
                <Field label="Date de naissance">
                  <input type="date" value={data.identite.dateNaissance}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, dateNaissance: e.target.value } }))} />
                </Field>
                <Field label="Nationalité">
                  <input value={data.identite.nationalite}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, nationalite: e.target.value } }))} />
                </Field>
              </div>
            </section>
          )}

          {active === "menage" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ménage</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field label="Situation">
                  <select value={data.menage.situation}
                    onChange={(e) => setData(d => ({ ...d, menage: { ...d.menage, situation: e.target.value } }))}>
                    <option value="isolé">Isolé (Cat. 1)</option>
                    <option value="cohabitant">Cohabitant (Cat. 2)</option>
                    <option value="famille">Famille (Cat. 3)</option>
                  </select>
                </Field>
                <Field label="Nombre d'enfants à charge">
                  <input type="number" min="0" value={data.menage.nbEnfants}
                    onChange={(e) => setData(d => ({ ...d, menage: { ...d.menage, nbEnfants: safeNumber(e.target.value, 0) } }))} />
                </Field>
              </div>
            </section>
          )}

          {active === "revenus_nets" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Revenus nets</h2>
              <RowsTable title="Demandeur" rows={data.revenusNets.demandeur.rows}
                onChangeRows={(rows) => setData(d => ({
                  ...d, revenusNets: { ...d.revenusNets, demandeur: { ...d.revenusNets.demandeur, rows } }
                }))} />

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="checkbox" checked={data.revenusNets.conjoint.enabled}
                  onChange={(e) => setData(d => ({
                    ...d, revenusNets: { ...d.revenusNets, conjoint: { ...d.revenusNets.conjoint, enabled: e.target.checked } }
                  }))} />
                <span>Encoder aussi les revenus nets du conjoint</span>
              </div>

              {data.revenusNets.conjoint.enabled && (
                <RowsTable title="Conjoint" rows={data.revenusNets.conjoint.rows}
                  onChangeRows={(rows) => setData(d => ({
                    ...d, revenusNets: { ...d.revenusNets, conjoint: { ...d.revenusNets.conjoint, rows } }
                  }))} />
              )}
            </section>
          )}

          {active === "cmr" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Chômage / Mutuelle / Remplacement</h2>

              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Chômage</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Montant mensuel réel">
                    <input type="number" value={data.cmr.chomage.mensuelReel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, mensuelReel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Montant/jour (sur 26 jours)">
                    <input type="number" value={data.cmr.chomage.montantJour26}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, montantJour26: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Montant/jour (annuel)">
                    <input type="number" value={data.cmr.chomage.montantJourAnnuel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, montantJourAnnuel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                </div>
              </div>

              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Mutuelle</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Montant mensuel réel">
                    <input type="number" value={data.cmr.mutuelle.mensuelReel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, mensuelReel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Montant/jour (sur 26 jours)">
                    <input type="number" value={data.cmr.mutuelle.montantJour26}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, montantJour26: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Montant/jour (annuel)">
                    <input type="number" value={data.cmr.mutuelle.montantJourAnnuel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, montantJourAnnuel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                </div>
              </div>

              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Remplacement</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <Field label="Pension (mensuel)">
                    <input type="number" value={data.cmr.remplacement.pensionMensuel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, pensionMensuel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Droit passerelle (mensuel)">
                    <input type="number" value={data.cmr.remplacement.droitPasserelleMensuel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, droitPasserelleMensuel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                  <Field label="Allocation d'Handicapé ARR (mensuel)">
                    <input type="number" value={data.cmr.remplacement.allocationHandicapeMensuel}
                      onChange={(e) => setData(d => ({
                        ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, allocationHandicapeMensuel: safeNumber(e.target.value, 0) } }
                      }))} />
                  </Field>
                </div>
              </div>
            </section>
          )}

          {active === "avantages" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Avantages en nature</h2>
              <Field label="Charges locatives prises en charge par un tiers (€/mois)">
                <input type="number" value={data.avantages.chargesLocativesTiers}
                  onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, chargesLocativesTiers: safeNumber(e.target.value, 0) } }))} />
              </Field>
              <Field label="Loyer fictif évalué par un professionnel (€/mois)">
                <input type="number" value={data.avantages.loyerFictifProfessionnel}
                  onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifProfessionnel: safeNumber(e.target.value, 0) } }))} />
              </Field>
              <Field label="Loyer fictif évalué via simulateur ou grille de loyers (€/mois)">
                <input type="number" value={data.avantages.loyerFictifSimulateur}
                  onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifSimulateur: safeNumber(e.target.value, 0) } }))} />
              </Field>
              <Field label="Prêt hypothécaire pris en charge par un tiers (€/mois)">
                <input type="number" value={data.avantages.pretHypothecaireTiers}
                  onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, pretHypothecaireTiers: safeNumber(e.target.value, 0) } }))} />
              </Field>
            </section>
          )}

          {active === "cessions_biens" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Cessions de biens</h2>
              <CessionsBiensTable rows={data.cessionsBiens.rows}
                onChangeRows={(rows) => setData(d => ({ ...d, cessionsBiens: { rows } }))} />
            </section>
          )}

          {active === "biens_immobiliers" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Biens immobiliers</h2>
              <BiensImmobiliersTable rows={data.biensImmobiliers.rows}
                onChangeRows={(rows) => setData(d => ({ ...d, biensImmobiliers: { rows } }))} />
            </section>
          )}

          {active === "ressources_diverses" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Ressources diverses</h2>
              
              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Ressources diverses générales</h3>
                {data.ressourcesDiverses.generales.map((r, i) => (
                  <Field key={i} label={r.label}>
                    <input type="number" value={r.montant}
                      onChange={(e) => {
                        const next = [...data.ressourcesDiverses.generales];
                        next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                        setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, generales: next } }));
                      }} />
                  </Field>
                ))}
              </div>

              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
                <h3 style={{ marginTop: 0 }}>Ressources diverses — Bénévoles</h3>
                {data.ressourcesDiverses.benevoles.map((r, i) => (
                  <Field key={i} label={r.label}>
                    <input type="number" value={r.montant}
                      onChange={(e) => {
                        const next = [...data.ressourcesDiverses.benevoles];
                        next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                        setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, benevoles: next } }));
                      }} />
                  </Field>
                ))}
              </div>
            </section>
          )}

          {active === "apercu" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Aperçu</h2>

              <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 13, opacity: 0.7 }}>Statut</div>
                <div style={{ fontSize: 24, fontWeight: 750 }}>
                  {result.eligible ? "Éligible" : "Non éligible"}
                </div>

                <div style={{ marginTop: 10 }}>
                  Montant mensuel : <b><Money value={result.montantMensuel} /></b>
                </div>

                <hr style={{ margin: "12px 0" }} />

                <div style={{ fontSize: 13, opacity: 0.7 }}>Ressources (résumé)</div>
                <ul style={{ marginTop: 8, fontSize: 13 }}>
                  <li>Revenus nets demandeur : <Money value={result._breakdown.dem} /></li>
                  <li>Revenus nets conjoint : <Money value={result._breakdown.conj} /></li>
                  <li>Chômage : <Money value={result._breakdown.chomage} /></li>
                  <li>Mutuelle : <Money value={result._breakdown.mutuelle} /></li>
                  <li>Remplacement : <Money value={result._breakdown.remplacement} /></li>
                  <li>Avantages en nature : <Money value={result._breakdown.avantages} /></li>
                  <li>Cessions de biens : <Money value={result._breakdown.cessions} /></li>
                  <li>Biens immobiliers : <Money value={result._breakdown.immobiliers} /></li>
                  <li>Ressources diverses générales : <Money value={result._breakdown.diversesGenerales} /></li>
                  <li>Ressources diverses bénévoles : <Money value={result._breakdown.diversesBenevoles} /></li>
                  <li><b>Total mensuel</b> : <b><Money value={result._breakdown.totalMensuel} /></b></li>
                  <li><b>Total annuel</b> : <b><Money value={result._breakdown.totalRessourcesAnnuelles} /></b></li>
                </ul>

                <details style={{ marginTop: 12 }}>
                  <summary style={{ cursor: "pointer" }}>Détails complets (debug)</summary>
                  <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, marginTop: 10 }}>
                    {JSON.stringify(result._breakdown, null, 2)}
                  </pre>
                </details>
              </div>
            </section>
          )}
        </main>
      </div>

      <footer style={{ marginTop: 16, fontSize: 12, opacity: 0.65 }}>
        Note : Calcul Excel reproduit (NETWORKDAYS.INTL "0000001" = dimanche exclu)
      </footer>
    </div>
  );
}