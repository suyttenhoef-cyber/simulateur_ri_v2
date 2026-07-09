// src/utils/calculs.js — Fonctions de calcul pures extraites de App.jsx

// ─── Helpers ────────────────────────────────────────────────────────────────

export function safeNumber(x, fallback = 0) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

export function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Number(`${Math.round(`${x}e+2`)}e-2`);
}

export function asNumOrZero(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

// ─── Biens mobiliers ────────────────────────────────────────────────────────

// Données!R13 / S13 (seuils mobiliers)
export const MOB_SEUIL_R = 6200;
export const MOB_SEUIL_S = 12500;

/**
 * Calcule le revenu annuel issu des biens mobiliers.
 * Tranche ≤ 6200 : exonérée
 * Tranche 6200–12500 : 6%
 * Tranche > 12500 : 10%
 *
 * @param {{ montantCapital: number, partConcernee: number }} param
 * @returns {{ totalAnnuel: number, totalMensuel: number, D5, D6, D7, E6, E7 }}
 */
export function computeBiensMobiliersExcel({ montantCapital, partConcernee }) {
  const B = safeNumber(montantCapital, 0);
  const C = safeNumber(partConcernee, 100) / 100;

  // D5 / D6 / D7 (Tranches)
  const D5 = B === 0 ? 0 : Math.min(MOB_SEUIL_R, B) * C;
  const D6 = B === 0 ? 0 : (B > MOB_SEUIL_R ? Math.min(MOB_SEUIL_S, B) * C : 0);
  const D7 = B > MOB_SEUIL_S ? B * C : null;

  // E6 / E7 (Revenus)
  const E6 = D6 > D5 ? (D6 - D5) * 0.06 : 0;
  const E7 = D7 !== null ? (D7 - D6) * 0.10 : 0;

  // Total = SUM(E5:E7) avec E5 = 0 dans le fichier Excel
  const totalAnnuel = E6 + E7;
  return { totalAnnuel, totalMensuel: totalAnnuel / 12, D5, D6, D7, E6, E7 };
}

// ─── Cessions de biens ──────────────────────────────────────────────────────

export const TRANCHE_IMMUNISEE_CESSION = 37200;
export const SEUIL_CESSION_T1 = 6200;
export const SEUIL_CESSION_T2 = 12500;

export const TITRE_PROPRIETE_COEFF = {
  "Pleine Propriété (P.P.)": 1.0,
  "Nu-propriété (N.P.)": 0.6,
  "Usufruit": 0.4,
};

export const ABATTEMENT_PAR_CATEGORIE = {
  1: 1250,  // Cohabitant
  2: 2000,  // Isolé
  3: 2500,  // Famille
};

export const TYPE_CESSION_MAP = {
  "Bien bâti (unique)": { unique: true },
  "Bien non bâti (unique)": { unique: true },
  "Autre bien bâti": { unique: false },
  "Autre bien non bâti": { unique: false },
  "Bien meuble": { unique: false },
};

export function calculateMonthsDiffCession(dateCession, datePriseCoursRI) {
  if (!dateCession || !datePriseCoursRI) return 0;

  const d1 = new Date(dateCession);
  const d2 = new Date(datePriseCoursRI);

  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;

  const deltaDays = (d2 - d1) / (1000 * 60 * 60 * 24);
  return Math.floor(deltaDays / 30.44);
}

export function calculateCessionDetailed(cession, categorie) {
  const typeInfo = TYPE_CESSION_MAP[cession.typeBien] || { unique: false };

  const montant = safeNumber(cession.valeurVenale, 0);
  const part = safeNumber(cession.partConcernee, 100) / 100;
  const titrePropriete = cession.titrePropriete || "Pleine Propriété (P.P.)";
  const natureCession = cession.natureCession || "Cession à titre onéreux";
  const dettesPersonnelles = safeNumber(cession.dettesPersonnelles, 0);
  const dispenseEquite = safeNumber(cession.dispenseEquite, 0);

  if (montant === 0) return null;

  const coeffTitre = TITRE_PROPRIETE_COEFF[titrePropriete] || 1.0;
  const montantVenal = round2(montant * part * coeffTitre);
  const trancheImmunisee = typeInfo.unique ? round2(TRANCHE_IMMUNISEE_CESSION * part) : 0;

  let abattement = 0;
  let nbMois = 0;
  if (typeInfo.unique && cession.dateCession && cession.datePriseCoursRI) {
    nbMois = calculateMonthsDiffCession(cession.dateCession, cession.datePriseCoursRI);
    const montantAnnuel = ABATTEMENT_PAR_CATEGORIE[categorie] || 0;
    abattement = round2((montantAnnuel * nbMois) / 12);
  }

  // Dettes uniquement si cession onéreuse
  const dettesApplicables = natureCession === "Cession à titre onéreux" ? dettesPersonnelles : 0;

  let montantConsideration = montantVenal - dettesApplicables - trancheImmunisee - abattement - dispenseEquite;
  montantConsideration = Math.max(montantConsideration, 0);

  const tranche1 = montantConsideration === 0 ? 0 : Math.min(SEUIL_CESSION_T1, montantConsideration);
  const tranche2 = montantConsideration > SEUIL_CESSION_T1 ? Math.min(SEUIL_CESSION_T2, montantConsideration) : 0;
  const tranche3 = montantConsideration > SEUIL_CESSION_T2 ? montantConsideration : 0;

  const revenu1 = 0;
  const revenu2 = tranche2 > tranche1 ? round2((tranche2 - tranche1) * 0.06) : 0;
  const revenu3 = tranche3 > 0 ? round2((tranche3 - tranche2) * 0.10) : 0;

  const totalRevenu = round2(revenu1 + revenu2 + revenu3);

  return {
    montantVenal,
    trancheImmunisee,
    nbMois,
    abattement,
    natureCession,
    dettesPersonnelles,
    dettesApplicables,
    dispenseEquite,
    montantConsideration,
    tranches: { tranche1, tranche2, tranche3 },
    revenus: { revenu1, revenu2, revenu3 },
    totalRevenu,
    totalMensuel: round2(totalRevenu / 12),
  };
}

export function computeCessionsTotalAnnuel(rows, categorie) {
  if (!rows || rows.length === 0) {
    return { totalAnnuel: 0, totalMensuel: 0, details: [] };
  }

  const details = rows
    .map((cession) => calculateCessionDetailed(cession, categorie))
    .filter((calc) => calc !== null);
  const totalAnnuel = details.reduce((sum, calc) => sum + calc.totalRevenu, 0);

  return {
    totalAnnuel: round2(totalAnnuel),
    totalMensuel: round2(totalAnnuel / 12),
    details,
  };
}

// ─── Biens immobiliers ──────────────────────────────────────────────────────

/**
 * Calcule le revenu cadastral annuel pour un ensemble de biens immobiliers.
 *
 * Champs attendus dans chaque row :
 *   typeBien        "Bâti" | "Non bâti" | "Étranger"
 *   localisation    string
 *   rcNonIndexe     number  (RC non indexé, en €)
 *   quotePart       number  (%, ex. 100 pour 100%, 50 pour 50%)
 *   interetsPaye    number  (intérêts annuels payés, en €)
 *   renteAnnuelle   number  (rente annuelle, en €)
 *   loyerAnnuel     number  (loyer annuel perçu, en €)
 *   revenuImmoEtranger number (revenus étrangers, en €)
 *
 * Formule bâti    : M = max(0, (RC × J − (exoBatiTotal / nBati) × J) × 3)
 *                   exoBatiTotal = 750 + 125 × nbEnfants ; nBati = nb de biens bâtis
 * Formule non bâti: M = max(0, (RC × J − (30 / nNonBati) × J) × 3)
 *                   30 = exonération légale ; nNonBati = nb de biens non bâtis
 *
 * Art. 4.3 : l'exonération est divisée par le nombre de biens du même type.
 *
 * @param {Array} rows
 * @param {number} nbEnfants
 */
export function computeImmoExcel(rows, nbEnfants = 0) {
  const list = (rows || []).map((r) => ({
    type: r.typeBien || "",
    localisation: r.localisation || "",
    interets: asNumOrZero(r.interetsPaye),
    rente: asNumOrZero(r.renteAnnuelle),
    revEtranger: asNumOrZero(r.revenuImmoEtranger),
    rc: asNumOrZero(r.rcNonIndexe),
    loyer: asNumOrZero(r.loyerAnnuel),
    quote: asNumOrZero(r.quotePart) / 100,
  }));

  const exoBatiTotal = 750 + safeNumber(nbEnfants, 0) * 125;
  const countBati    = list.filter(r => r.type === "Bâti").length || 1;
  const countNonBati = list.filter(r => r.type === "Non bâti").length || 1;

  const totals = {
    IB: { ressources: 0, dedInterets: 0, dedRente: 0, locatifs: 0, total: 0 },
    INB: { ressources: 0, dedInterets: 0, dedRente: 0, locatifs: 0, total: 0 },
    etranger: 0,
    totalAnnuel: 0,
    totalMensuel: 0,
    rowsDetail: [],
  };

  for (const r of list) {
    if (r.type === "Étranger" || r.type === "Etranger") {
      const revEtr = round2(r.revEtranger);
      totals.etranger += revEtr;
      totals.rowsDetail.push({
        type: r.type, localisation: r.localisation,
        rc: 0, loyer: 0, quote: r.quote,
        K: 0, L: 0, M: 0,
        locatifs: 0, ressources: 0, dedInterets: 0, dedRente: 0,
        rowAnnuel: revEtr,
      });
      continue;
    }

    const J = r.quote;
    const H = r.rc;
    const E = r.interets;
    const F = r.rente;
    const I = r.loyer;

    const K = H !== 0 ? round2(H * J) : null;
    // L = montant exonéré × quote-part (art. 4.2 + 4.3)
    // Bâti    : exo = (750 + 125×nbEnfants) / nombre de biens bâtis
    // Non bâti: exo = 30 / nombre de biens non bâtis
    const L = H !== 0
      ? (r.type === "Bâti"
          ? round2((exoBatiTotal / countBati) * J)
          : round2((30 / countNonBati) * J))
      : null;
    const M = H !== 0 && K !== null && L !== null
      ? (K >= L ? round2((K - L) * 3) : 0)
      : null;
    const U = I !== 0 ? round2(I * J) : "s. o.";
    const V = isFiniteNumber(U) && isFiniteNumber(M) && U > M ? U : "s. o.";

    const N = V !== "" ? (V !== "s. o." ? "voir loyer" : M ?? "") : "";
    const O = E !== 0 ? round2(E * J) : null;
    const P = N !== "voir loyer" ? (E !== 0 && isFiniteNumber(N) ? round2(N / 2) : null) : "s. o.";
    const Q = P !== "s. o." ? (E !== 0 && O !== null && P !== null ? -round2(Math.min(O, P)) : null) : "s.o.";
    const R = F !== 0 ? round2(F * J) : null;
    const S = N !== "voir loyer" ? (F !== 0 && isFiniteNumber(N) ? round2(N / 2) : null) : "s. o.";
    const T = S !== "s. o." ? (F !== 0 && R !== null && S !== null ? -round2(Math.min(R, S)) : null) : "s. o.";

    const bucket = r.type === "Bâti" ? totals.IB : totals.INB;

    const ressources = isFiniteNumber(N) ? N : 0;
    const dedInterets = isFiniteNumber(Q) ? Q : 0;
    const dedRente = isFiniteNumber(T) ? T : 0;
    const locatifs = isFiniteNumber(V) ? V : 0;

    bucket.ressources += ressources;
    bucket.dedInterets += dedInterets;
    bucket.dedRente += dedRente;
    bucket.locatifs += locatifs;
    totals.rowsDetail.push({
      type: r.type, localisation: r.localisation,
      rc: r.rc, loyer: r.loyer, quote: r.quote,
      K: K ?? 0, L: L ?? 0, M: M ?? 0,
      locatifs, ressources, dedInterets, dedRente,
      rowAnnuel: round2(ressources + locatifs + dedInterets + dedRente),
    });
  }

  totals.IB.total = round2(
    totals.IB.ressources + totals.IB.dedInterets + totals.IB.dedRente + totals.IB.locatifs
  );
  totals.INB.total = round2(
    totals.INB.ressources + totals.INB.dedInterets + totals.INB.dedRente + totals.INB.locatifs
  );
  totals.etranger = round2(totals.etranger);
  totals.totalAnnuel = round2(totals.IB.total + totals.INB.total + totals.etranger);
  totals.totalMensuel = round2(totals.totalAnnuel / 12);

  return totals;
}
