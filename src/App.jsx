import { useMemo, useState, useRef, useEffect, useId, isValidElement, cloneElement } from "react";
import { generatePDF } from './utils/pdfExport.js';
import './App.css';

// Injection Font Awesome + styles globaux dans le <head>
const globalStyles = `
  * { box-sizing: border-box; }
  body, html { 
    margin: 0; 
    padding: 0; 
    overflow-x: hidden !important; 
    max-width: 100vw !important;
  }
`;

// Injecter Font Awesome si pas déjà présent
if (!document.getElementById('fa-cdn')) {
  const link = document.createElement('link');
  link.id = 'fa-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
  document.head.appendChild(link);
}

// Sélectionner tout le contenu au focus sur les champs numériques (évite "0250")
document.addEventListener('focusin', (e) => {
  if (e.target.type === 'number') e.target.select();
});

// Palette de couleurs
const colors = {
  primary: "#163E67",      // Bleu foncé
  secondary: "#2BEBCE",    // Turquoise
  tertiary: "#234268",     // Bleu moyen
  background: "#F5F8FA",
  white: "#FFFFFF",
  text: "#2C3E50",
  textLight: "#767676",
  border: "#E1E8ED",
  success: "#2BEBCE",
  danger: "#BF2222"
};
function computeCohabitantsMonthly(rows) {
  return rows.reduce((acc, row) => acc + safeNumber(row.mensuel, 0), 0);
}
function Row({ label, mensuel, annuel, highlight = false, neg = false, grand = false }) {
  const renderMoney = (v) => {
    if (v === null || v === undefined) return "";
    if (neg) return <>−&nbsp;<Money value={Math.abs(v)} /></>;
    return <Money value={v} />;
  };

  let base;
  if (grand) {
    base = { padding: "9px 12px", background: "#163E67", color: "white", fontWeight: 800, fontSize: 14, borderTop: "3px solid #2BEBCE" };
  } else if (highlight) {
    base = { padding: "6px 12px", background: "#DDE9F5", color: "#163E67", fontWeight: 700, borderTop: "1px solid #B8D0EC" };
  } else if (neg) {
    base = { padding: "5px 8px 5px 24px", color: "#BF2222", fontStyle: "italic", fontSize: 14 };
  } else {
    base = { padding: "5px 8px 5px 20px", color: "#2C3E50" };
  }

  return (
    <tr>
      <td style={base}>{label}</td>
      <td style={{ ...base, textAlign: "right", paddingLeft: 8 }}>{renderMoney(mensuel)}</td>
      <td style={{ ...base, textAlign: "right", paddingLeft: 8 }}>{renderMoney(annuel)}</td>
    </tr>
  );
}

function Sec({ children }) {
  return (
    <tr>
      <td colSpan={3} style={{
        padding: "7px 12px", background: "#163E67", color: "white",
        fontWeight: 700, fontSize: 14, textTransform: "uppercase",
        letterSpacing: "0.7px", borderLeft: "4px solid #2BEBCE",
      }}>
        {children}
      </td>
    </tr>
  );
}

function Gap() {
  return <tr><td colSpan={3} style={{ padding: 0, height: 6, background: "#F0F4F8" }} /></tr>;
}

// Valeurs issues de l'image (fixes en euros)
const REVENUS_RC_BATI = 750;        // RC Bâti
const REVENUS_RC_NON_BATI = 125;    // RC Non bâti
const REVENUS_ENFANT = 30;          // Revenus Enfant (part de l'immobilier)

const TRANCHE_1 = 1250;             // Tranche 1 pour cession
const TRANCHE_2 = 2000;             // Tranche 2 pour cession
const TRANCHE_3 = 2500;             // Tranche 3 pour cession

const EXO_BATI = 750;            // Exonération pour Bâti (à adapter selon ton Excel)
const EXO_NON_BATI = 30;        // Exonération pour Non-Bâti (à adapter selon ton Excel)

const MONTANT_FORFAITAIRE_CESSION_AN = 37200; // Tranche immunisée

const TITRE_PLEINE_PROPRIETE = 1.0;  // Coefficient Pleine Propriété (100%)
const TITRE_USUFRUIT = 0.4;         // Coefficient Usufruit (40%)
const TITRE_NU_PROPRIETE = 0.6;     // Coefficient Nu-Propriété (60%)

const SECTIONS = [
  { id: "informations",      label: "Informations",            icon: "fa-address-card" },
  { id: "revenus_demandeur", label: "Revenus du demandeur",   icon: "fa-sack-dollar"  },
  { id: "cohabitants",       label: "Revenus des cohabitants", icon: "fa-people-group" },
  { id: "apercu",            label: "Aperçu du calcul",        icon: "fa-table-list"   },
];

const defaultRow = () => ({
  nom: "",                         // Nom du cohabitant
  type: "Ascendants/descendant majeur",
  ressourcesTotale: 0,            // D5 - Excel
  priseEnCharge: "Non",           // C5 - "Oui" / "Non" / "MAX"
  typeReport: "Report max",       // E5 - "Report max" / "Partenaire"
  pctReport: 30,                  // F5 - % du report
  categorie: 1                    // G5 - Catégorie 1, 2 ou 3
});

const defaultCessionRow = () => ({
  typeBien: "", 
  valeurVenale: 0, 
  natureCession: "Cession à titre onéreux", // 👈 AJOUT
  dateCession: "",
  titrePropriete: "Pleine Propriété (P.P.)", 
  partConcernee: 100, 
  dettesPersonnelles: 0,
  dispenseEquite: 0, 
  datePriseCoursRI: ""
});

const defaultBienImmobilierRow = () => ({
  typeBien: "", localisation: "", interetsPaye: 0, renteAnnuelle: 0,
  revenuImmoEtranger: 0, rcNonIndexe: 0, loyerAnnuel: 0, quotePart: 50
});

const NATURES_REVENU_COHABITANT = [
  "Revenus professionnels nets",
  "Allocation de chômage",
  "Indemnité de mutuelle",
  "Pension",
  "Revenu de remplacement",
  "Allocation d'handicapé",
  "Ressources diverses",
  "Biens immobiliers",
  "Biens mobiliers",
  "Autres revenus",
];

const defaultRevenuDetail = () => ({ id: Math.random(), nature: "Revenu net professionnel", montant: 0, periode: "mensuel" });

const defaultSimpleRow = () => ({ id: Math.random(), label: "", montant: 0, periode: "mensuel" });

const defaultCohabitantRow = () => ({
  nom: "",
  type: "Ascendant majeur",
  categorie: 1,
  priseEnCharge: "Report max",
  pctReport: 30,
  chargesAdmissibles: 0,
  chargesInadmissibles: 0,
  // Sections structurées (revenus détaillés par catégorie)
  proRows: [],           // Revenus professionnels nets comptabilisés { label, customLabel, montant }
  proExoRows: [],        // Revenus professionnels exonérés { type, montant }
  cmrRows: [],           // legacy (compatibilité ancienne saisie)
  cmrData: {             // Chômage / mutuelle / remplacement structuré
    chomage:     { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    mutuelle:    { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    remplacement:{ pensionMensuel: 0, droitPasserelleMensuel: 0, allocationHandicapeMensuel: 0, indemnisation_perte_revenus: 0, autres_revenus: 0 },
  },
  cessionsBiens: { rows: [] },
  biensImmobiliers: { rows: [] },
  biensMobiliers: { montantCapital: 0, partConcernee: 100 },
  avantages: { chargesLocativesTiers: 0, loyerFictifSimulateur: 0, pretHypothecaireTiers: 0, autresAvantages: 0 },
  ressourcesDiverses: { allocationsFamiliales: 0, pensionAlimentairePercue: 0, autresRessources: 0 },
  // Héritage (compatibilité ancienne saisie)
  revenusDetailes: [],
  ressourcesTotale: 0,
});

function firstOfCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

const defaultData = {
  reference: { dateISO: firstOfCurrentMonth(), joursPrisEnCompte: "" },
  identite: { nom: "", prenom: "", dateNaissance: "", nationalite: "" },
  menage: { situation: "", nbEnfants: 0 },
  revenusNets: {
    demandeur: {
      comptabiliseRows: [{ label: "", customLabel: null, montant: 0 }],
      exonereRows:      [{ type: "", montant: 0 }]
    },
  },
  cmr: {
    chomage: { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    mutuelle: { mensuelReel: 0, montantJour26: 0, montantJourAnnuel: 0 },
    remplacement: { pensionMensuel: 0, droitPasserelleMensuel: 0, allocationHandicapeMensuel: 0, indemnisation_perte_revenus: 0, autres_revenus: 0, }
  },
  avantages: {
    chargesLocativesTiers: 0, loyerFictifProfessionnel: 0,
    loyerFictifSimulateur: 0, pretHypothecaireTiers: 0
  },
  cessionsBiens: { rows: [] },
  biensImmobiliers: { rows: [] },
  biensMobiliers: {
    montantCapital: 0,      // correspond à B5
    partConcernee: 100      // correspond à C5 (en %)
  },
  exoneration: {
    demandeur: {
      general: false,      // Excel C5
      etudiant: false,    // Excel C6
      penurie: false,     // Excel C7
      joursCompteur: 0,   // Excel C8 (si compteur dépassé)
      artisteSP: false,   // Excel C11
    },
  },
  cohabitants: {
    modeCalcul: "groupe",          // "groupe" (circulaire 16/01/2026) | "individuel"
    priseEnCompte: "legale",       // "legale" | "equite" | "aucune"
    montantRetenuAnnuel: 0,        // utilisé si priseEnCompte === "equite"
    risOctroyeCible: "",           // RIS mensuel cible → recalcule montantRetenuAnnuel
    chargesAdmissiblesDemandeur: 0,
    nbBeneficiairesRIS: 1,
    rows: [defaultCohabitantRow()]
  },
  ressourcesDiverses: {
    generales: [
      { label: "Allocations familiales (forfait max. 240 €/mois)", montant: 0 },
      { label: "Pension alimentaire perçue (€/mois)", montant: 0 },
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
// =====================
// Paramètres Excel (onglet Données)
// =====================

// VLOOKUP Données!A2:D (montant du RI annuel) : date -> [cat1, cat2, cat3]

const RI_ANNUEL_TABLE = [
  { date: "2023-01-01", cat1: 9713.04,  cat2: 14569.58, cat3: 19690.01 },
  { date: "2023-07-01", cat1: 9907.30,  cat2: 14860.96, cat3: 20083.80 },
  { date: "2023-11-01", cat1: 10105.38, cat2: 15158.08, cat3: 20485.33 },
  { date: "2024-05-01", cat1: 10307.68, cat2: 15461.53, cat3: 20895.43 },
  { date: "2025-02-01", cat1: 10513.60, cat2: 15770.41, cat3: 21312.87 },
  { date: "2026-03-01", cat1: 10723.75, cat2: 16085.64, cat3: 21738.88 },
];

// VLOOKUP Données!K3:O (exonérations) : date -> montants (mensuel/annuel)
const EXO_TABLE = [
  { date: "2022-12-01", generalMensuel: 291.63, artistiqueAnnuel: 3499.60, etudiantMensuel: 291.63, penurieMensuel: null },
  { date: "2023-11-01", generalMensuel: 297.46, artistiqueAnnuel: 3569.56, etudiantMensuel: 297.46, penurieMensuel: null },
  { date: "2024-01-01", generalMensuel: 297.46, artistiqueAnnuel: 3569.56, etudiantMensuel: 297.46, penurieMensuel: null },
  { date: "2024-05-01", generalMensuel: 303.42, artistiqueAnnuel: 3641.02, etudiantMensuel: 303.42, penurieMensuel: 434.83 },
  { date: "2025-02-01", generalMensuel: 309.48, artistiqueAnnuel: 3713.76, etudiantMensuel: 309.48, penurieMensuel: 443.52 },
  { date: "2026-03-01", generalMensuel: 315.67, artistiqueAnnuel: 3787.99, etudiantMensuel: 315.67, penurieMensuel: 452.39 },
];

// Données!Q3:S3 (Exonération supplémentaire annuelle ©)
const EXO_SUPPL_ANNUEL = { 1: 155, 2: 250, 3: 310 };

// Données!R13 / S13 (seuils mobiliers)
const MOB_SEUIL_R = 6200;
const MOB_SEUIL_S = 12500;

// Données!S22 (tranche immunisée cessions)
const CESSION_TRANCHE_IMMUNISEE = 37200;

function Field({ label, hint, children }) {
  const id = useId();
  const labeled = isValidElement(children) ? cloneElement(children, { id }) : children;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <label htmlFor={id} style={{ fontSize: 14, opacity: 0.85, display: "block" }}>{label}</label>
      {labeled}
      {hint && <span style={{ fontSize: 14, color: "#767676" }}>{hint}</span>}
    </div>
  );
}

function safeNumber(x, fallback = 0) {
  const n = Number(String(x ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}
function toISODateOnly(d) {
  if (!d) return "1970-01-01";
  if (typeof d === "string") return d.slice(0, 10);
  // Date object
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Reproduit le VLOOKUP(date, table, col, TRUE) d'Excel (approx match, trié par date)
function vlookupByDateISO(dateISO, table) {
  const target = toISODateOnly(dateISO);
  let best = table[0];
  for (const row of table) {
    if (row.date <= target) best = row;
  }
  return best;
}

function getRIAnnuel(dateISO, categorie) {
  const row = vlookupByDateISO(dateISO, RI_ANNUEL_TABLE);
  if (categorie === 1) return row.cat1;
  if (categorie === 2) return row.cat2;
  return row.cat3;
}
function Money({ value }) {
  if (value === null || value === undefined) return "";

  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value);
}
// ========================================
// CALCULS POUR CESSIONS DE BIENS
// ========================================

const TRANCHE_IMMUNISEE_CESSION = 37200;
const SEUIL_CESSION_T1 = 6200;
const SEUIL_CESSION_T2 = 12500;

const TITRE_PROPRIETE_COEFF = {
  "Pleine Propriété (P.P.)": 1.0,
  "Nu-propriété (N.P.)": 0.6,
  "Usufruit": 0.4
};

const ABATTEMENT_PAR_CATEGORIE = {
  1: 1250,  // Cohabitant
  2: 2000,  // Isolé
  3: 2500   // Famille
};

const TYPE_CESSION_MAP = {
  "Bien bâti (unique)": { unique: true },
  "Bien non bâti (unique)": { unique: true },
  "Autre bien bâti": { unique: false },
  "Autre bien non bâti": { unique: false },
  "Bien meuble": { unique: false }
};

function calculateMonthsDiffCession(dateCession, datePriseCoursRI) {
  if (!dateCession || !datePriseCoursRI) return 0;
  
  const d1 = new Date(dateCession);
  const d2 = new Date(datePriseCoursRI);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const deltaDays = (d2 - d1) / (1000 * 60 * 60 * 24);
  return Math.floor(deltaDays / 30.44);
}

function calculateCessionDetailed(cession, categorie) {
  const typeInfo = TYPE_CESSION_MAP[cession.typeBien] || { unique: false };
  
  const montant = safeNumber(cession.valeurVenale, 0);
  const part = safeNumber(cession.partConcernee, 100) / 100;
  const titrePropriete = cession.titrePropriete || "Pleine Propriété (P.P.)";
  const natureCession = cession.natureCession || "Cession à titre onéreux"; // 👈 AJOUT
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
  
  // 👇 AJOUT : Dettes uniquement si cession onéreuse
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
    natureCession,        // 👈 AJOUT
    dettesPersonnelles,
    dettesApplicables,    // 👈 AJOUT
    dispenseEquite,
    montantConsideration,
    tranches: { tranche1, tranche2, tranche3 },
    revenus: { revenu1, revenu2, revenu3 },
    totalRevenu,
    totalMensuel: round2(totalRevenu / 12)
  };
}

function computeCessionsTotalAnnuel(rows, categorie) {
  if (!rows || rows.length === 0) {
    return { totalAnnuel: 0, totalMensuel: 0, details: [] };
  }
  
  const details = rows.map(cession => calculateCessionDetailed(cession, categorie)).filter(calc => calc !== null);
  const totalAnnuel = details.reduce((sum, calc) => sum + calc.totalRevenu, 0);
  
  return {
    totalAnnuel: round2(totalAnnuel),
    totalMensuel: round2(totalAnnuel / 12),
    details
  };
}
function computeNetMonthly({ comptabiliseRows, exonereRows }) {
  const sumC = (comptabiliseRows || []).reduce((acc, r) => acc + safeNumber(r.montant, 0), 0);
  const sumE = (exonereRows     || []).reduce((acc, r) => acc + safeNumber(r.montant, 0), 0);
  return { sumComptabilise: sumC, sumExonere: sumE, net: sumC - sumE };
}
function sumSimpleRows(rows) {
  return round2((rows || []).reduce((s, r) => {
    const m = safeNumber(r.montant, 0);
    return s + (r.periode === "annuel" ? m : m * 12);
  }, 0));
}

function hasStructuredRevenues(row) {
  const cmrDataHasValues = (d) => d && (
    safeNumber(d.chomage?.mensuelReel,0) > 0 || safeNumber(d.chomage?.montantJour26,0) > 0 || safeNumber(d.chomage?.montantJourAnnuel,0) > 0 ||
    safeNumber(d.mutuelle?.mensuelReel,0) > 0 || safeNumber(d.mutuelle?.montantJour26,0) > 0 || safeNumber(d.mutuelle?.montantJourAnnuel,0) > 0 ||
    Object.values(d.remplacement||{}).some(v => safeNumber(v,0) > 0)
  );
  return (row.proRows?.length > 0) ||
    (row.proExoRows?.length > 0) ||
    (row.cmrRows?.length > 0) ||
    cmrDataHasValues(row.cmrData) ||
    (row.cessionsBiens?.rows?.length > 0) ||
    (row.biensImmobiliers?.rows?.length > 0) ||
    safeNumber(row.biensMobiliers?.montantCapital, 0) > 0 ||
    Object.values(row.avantages || {}).some(v => safeNumber(v, 0) > 0) ||
    Object.values(row.ressourcesDiverses || {}).some(v => safeNumber(v, 0) > 0);
}

// 1. Ajouter la fonction de calcul pour un cohabitant individuel
function computeCohabitantRow(row, referenceDate) {
  let ressourcesTotale;
  let breakdown = {};

  if (hasStructuredRevenues(row)) {
    // proRows can be new format { label, customLabel, montant } (monthly) or old { label, montant, periode }
    const proCompt = (row.proRows || []).reduce((s, r) => s + safeNumber(r.montant, 0), 0);
    const proExo   = (row.proExoRows || []).reduce((s, r) => s + safeNumber(r.montant, 0), 0);
    const proAnnuel = (row.proRows || []).some(r => r.periode)
      ? sumSimpleRows(row.proRows)  // old format with periode
      : round2((proCompt - proExo) * 12);
    // CMR : priorité à cmrData (structuré), fallback sur cmrRows (legacy simple rows)
    let cmrAnnuel, chomAnnuel = 0, mutAnnuel = 0, remAnnuel = 0;
    if (row.cmrData) {
      const refYear = referenceDate ? parseInt(referenceDate.split("-")[0]) || 2025 : 2025;
      const chomM = computeChomageOrMutuelleMonthly({ ...row.cmrData.chomage, year: refYear }).mensuelTotal;
      const mutM  = computeChomageOrMutuelleMonthly({ ...row.cmrData.mutuelle, year: refYear }).mensuelTotal;
      const remM  = Object.values(row.cmrData.remplacement || {}).reduce((s, v) => s + safeNumber(v, 0), 0);
      chomAnnuel = round2(chomM * 12);
      mutAnnuel  = round2(mutM * 12);
      remAnnuel  = round2(remM * 12);
      cmrAnnuel  = round2(chomAnnuel + mutAnnuel + remAnnuel);
      // Add legacy cmrRows on top if present (backward compat)
      if ((row.cmrRows || []).length > 0) cmrAnnuel = round2(cmrAnnuel + sumSimpleRows(row.cmrRows));
    } else {
      cmrAnnuel = sumSimpleRows(row.cmrRows);
    }
    const cessionsAnnuel = computeCessionsTotalAnnuel(row.cessionsBiens?.rows || [], row.categorie || 1).totalAnnuel;
    const immoAnnuel     = computeImmoExcel(row.biensImmobiliers?.rows || [], 0).totalAnnuel;
    const mobAnnuel      = computeBiensMobiliersExcel(row.biensMobiliers || { montantCapital: 0, partConcernee: 100 }).totalAnnuel;
    const avantagesAnnuel = round2(Object.values(row.avantages || {}).reduce((s, v) => s + safeNumber(v, 0), 0) * 12);
    const diversesAnnuel  = round2(Object.values(row.ressourcesDiverses || {}).reduce((s, v) => s + safeNumber(v, 0), 0) * 12);
    ressourcesTotale = round2(proAnnuel + cmrAnnuel + cessionsAnnuel + immoAnnuel + mobAnnuel + avantagesAnnuel + diversesAnnuel);
    breakdown = { proAnnuel, cmrAnnuel, chomAnnuel, mutAnnuel, remAnnuel, cessionsAnnuel, immoAnnuel, mobAnnuel, avantagesAnnuel, diversesAnnuel };
  } else {
    const details = row.revenusDetailes || [];
    ressourcesTotale = details.length > 0
      ? round2(details.reduce((s, r) => {
          const m = safeNumber(r.montant, 0);
          return s + (r.periode === "annuel" ? m : m * 12);
        }, 0))
      : safeNumber(row.ressourcesTotale, 0);
  }

  const categorie = row.categorie || 1;
  
  // I5: VLOOKUP pour obtenir le seuil RI selon la catégorie
  const seuilRI = getRIAnnuel(referenceDate, categorie);
  
  // J5: Calcul de l'excédent
  let excedent = 0;
  let message = "";
  
  if (ressourcesTotale > seuilRI) {
    excedent = round2(ressourcesTotale - seuilRI);
  } else {
    message = "Le cohabitant a possiblement droit au RI";
  }
  
  // K5: Montant mensuel (si excédent)
  const montantMensuel = excedent > 0 ? round2(excedent / 12) : 0;
  
  let ressourcesProrata = 0;
  let montantReporte = 0;
  const priseEnCharge = row.priseEnCharge || "Report max";
  const isIndicatifOnly = row.type === "Autre";

  if (!isIndicatifOnly) {
    if (priseEnCharge === "Report max") {
      montantReporte = montantMensuel;
      ressourcesProrata = montantMensuel;
    } else if (priseEnCharge === "Report partiel") {
      montantReporte = round2(montantMensuel * (safeNumber(row.pctReport, 0) / 100));
      ressourcesProrata = montantReporte;
    }
    // "Pas de report" → reste à 0
  }
  // type "Autre" → montantReporte = 0 (indicatif uniquement)

  return {
    ...row,
    ressourcesTotale,
    seuilRI,
    excedent,
    montantMensuel,
    ressourcesProrata,
    montantReporte,
    isIndicatifOnly,
    message,
    breakdown,
  };
}

// 2. Calcul groupé — Circulaire 16/01/2026
function computeCohabitantsGrouped(cohabitantsData, referenceDate) {
  const rows = cohabitantsData.rows || [];
  const modeCalcul = cohabitantsData.modeCalcul || "groupe";
  const priseEnCompte = cohabitantsData.priseEnCompte || "legale";
  const montantRetenuAnnuel = safeNumber(cohabitantsData.montantRetenuAnnuel, 0);

  if (rows.length === 0) {
    return { totalAnnuel: 0, totalMensuel: 0, details: [], debiteurs: [], autresCohabitants: [], modeCalcul };
  }

  const details = rows.map(row => computeCohabitantRow(row, referenceDate));
  // Séparer débiteurs d'aliments (Ascendant/Descendant) des cohabitants "Autre" (indicatif)
  const debiteurs = details.filter(d => !d.isIndicatifOnly);
  const autresCohabitants = details.filter(d => d.isIndicatifOnly);

  if (modeCalcul === "individuel") {
    const totalMensuel = round2(debiteurs.reduce((s, d) => s + d.montantReporte, 0));
    return {
      totalAnnuel: round2(totalMensuel * 12), totalMensuel,
      details, debiteurs, autresCohabitants, modeCalcul,
    };
  }

  // Mode groupé : excédent = somme(ressources débiteurs) − somme(seuils débiteurs + seuils "Autre")
  // Les cohabitants "Autre" contribuent leur seuil au dénominateur mais pas leurs revenus.
  const activeDebiteurs = debiteurs.filter(d => d.priseEnCharge !== "Pas de report");
  const ressourcesTotal = round2(activeDebiteurs.reduce((s, d) => s + d.ressourcesTotale, 0));
  const seuilTotal      = round2(
    activeDebiteurs.reduce((s, d) => s + d.seuilRI, 0) +
    autresCohabitants.reduce((s, d) => s + d.seuilRI, 0)
  );
  const rawExcedent     = Math.max(0, round2(ressourcesTotal - seuilTotal));

  // Appliquer pctReport si des débiteurs sont en "Report partiel"
  let excedentGroupe = rawExcedent;
  if (rawExcedent > 0 && ressourcesTotal > 0 && activeDebiteurs.some(d => d.priseEnCharge === "Report partiel")) {
    excedentGroupe = round2(activeDebiteurs.reduce((s, d) => {
      const ratio = d.ressourcesTotale / ressourcesTotal;
      const pct = d.priseEnCharge === "Report partiel" ? safeNumber(d.pctReport, 0) / 100 : 1;
      return s + rawExcedent * ratio * pct;
    }, 0));
  }

  const nbBeneficiaires = Math.max(1, safeNumber(cohabitantsData.nbBeneficiairesRIS, 1));
  const montantAnnuelBrut =
    priseEnCompte === "legale" ? excedentGroupe :
    priseEnCompte === "equite" ? montantRetenuAnnuel : 0;
  const montantAnnuel = round2(montantAnnuelBrut / nbBeneficiaires);

  return {
    totalAnnuel: round2(montantAnnuel),
    totalMensuel: round2(montantAnnuel / 12),
    details, debiteurs, autresCohabitants,
    modeCalcul, ressourcesTotal, seuilTotal, rawExcedent, excedentGroupe,
    priseEnCompte, montantRetenuAnnuel, nbBeneficiaires,
  };
}

// Compatibilité — conservé pour les exports qui appellent encore cette fonction
function computeCohabitantsTotal(rows, referenceDate) {
  return computeCohabitantsGrouped({ rows, modeCalcul: "individuel" }, referenceDate);
}

// 3. Composant CohabitantsTable
function CohabitantsTable({ cohabitants, onChangeCohabitants, referenceDate, categorieDemandeur, onOpenFiche }) {
  const rows             = cohabitants.rows || [];
  const modeCalcul       = cohabitants.modeCalcul || "groupe";
  const priseEnCompte    = cohabitants.priseEnCompte || "legale";
  const montantRetenuAnnuel = safeNumber(cohabitants.montantRetenuAnnuel, 0);
  const risOctroyeCible  = cohabitants.risOctroyeCible ?? "";
  const chargesAdmDem    = safeNumber(cohabitants.chargesAdmissiblesDemandeur, 0);
  const nbBeneficiairesRIS = Math.max(1, safeNumber(cohabitants.nbBeneficiairesRIS, 1));

  const grouped = useMemo(() => computeCohabitantsGrouped(cohabitants, referenceDate), [cohabitants, referenceDate]);

  // Fourchette RIS
  const seuilDem     = categorieDemandeur ? getRIAnnuel(referenceDate, categorieDemandeur) : 0;
  const exoSupplDem  = categorieDemandeur ? safeNumber(EXO_SUPPL_ANNUEL[categorieDemandeur], 0) : 0;
  const risMaxMensuel = seuilDem > 0 ? round2(seuilDem / 12) : null;
  const risMinLegalMensuel = (modeCalcul === "groupe" && seuilDem > 0 && grouped.excedentGroupe != null)
    ? round2(Math.max(0, seuilDem - Math.max(0, grouped.excedentGroupe - exoSupplDem)) / 12)
    : null;
  const risOctroyeMensuel = (priseEnCompte === "equite" && seuilDem > 0)
    ? round2(Math.max(0, seuilDem - Math.max(0, montantRetenuAnnuel - exoSupplDem)) / 12)
    : null;

  function update(patch) { onChangeCohabitants({ ...cohabitants, ...patch }); }
  function updateRow(i, patch) { update({ rows: rows.map((r, idx) => idx === i ? { ...r, ...patch } : r) }); }
  function addRow() { update({ rows: [...rows, defaultCohabitantRow()] }); }
  function removeRow(i) { update({ rows: rows.filter((_, idx) => idx !== i) }); }

  function addProRow(i)            { updateRow(i, { proRows: [...(rows[i].proRows || []), { label: "", customLabel: null, montant: 0 }] }); }
  function removeProRow(i, j)      { updateRow(i, { proRows: (rows[i].proRows || []).filter((_, k) => k !== j) }); }
  function updateProRow(i, j, p)   { updateRow(i, { proRows: (rows[i].proRows || []).map((d, k) => k === j ? { ...d, ...p } : d) }); }

  function addProExoRow(i)         { updateRow(i, { proExoRows: [...(rows[i].proExoRows || []), { type: "", montant: 0 }] }); }
  function removeProExoRow(i, j)   { updateRow(i, { proExoRows: (rows[i].proExoRows || []).filter((_, k) => k !== j) }); }
  function updateProExoRow(i, j, p){ updateRow(i, { proExoRows: (rows[i].proExoRows || []).map((d, k) => k === j ? { ...d, ...p } : d) }); }

  function addCmrRow(i)            { updateRow(i, { cmrRows: [...(rows[i].cmrRows || []), defaultSimpleRow()] }); }
  function removeCmrRow(i, j)      { updateRow(i, { cmrRows: (rows[i].cmrRows || []).filter((_, k) => k !== j) }); }
  function updateCmrRow(i, j, p)   { updateRow(i, { cmrRows: (rows[i].cmrRows || []).map((d, k) => k === j ? { ...d, ...p } : d) }); }
  function updateCmrData(i, section, patch) {
    const cur = rows[i].cmrData || {};
    updateRow(i, { cmrData: { ...cur, [section]: { ...(cur[section] || {}), ...patch } } });
  }

  function updateCessions(i, rows2) { updateRow(i, { cessionsBiens: { rows: rows2 } }); }
  function updateImmo(i, rows2)     { updateRow(i, { biensImmobiliers: { rows: rows2 } }); }
  function updateMob(i, patch)      { updateRow(i, { biensMobiliers: { ...rows[i].biensMobiliers, ...patch } }); }
  function updateAvantages(i, p)    { updateRow(i, { avantages: { ...rows[i].avantages, ...p } }); }
  function updateDiverses(i, p)     { updateRow(i, { ressourcesDiverses: { ...rows[i].ressourcesDiverses, ...p } }); }
  function handleRisOctroyeCible(val) {
    const risNum = safeNumber(val, 0);
    const montant = (risNum > 0 && seuilDem > 0)
      ? round2(Math.max(0, seuilDem + exoSupplDem - risNum * 12))
      : montantRetenuAnnuel;
    update({ risOctroyeCible: val, montantRetenuAnnuel: risNum > 0 ? montant : montantRetenuAnnuel });
  }

  const hasAnyBudget = rows.some(r => safeNumber(r.chargesAdmissibles, 0) > 0 || safeNumber(r.chargesInadmissibles, 0) > 0) || chargesAdmDem > 0;
  const totalChargesAdmCohab   = rows.reduce((s, r) => s + safeNumber(r.chargesAdmissibles, 0), 0);
  const totalChargesInadmCohab = rows.reduce((s, r) => s + safeNumber(r.chargesInadmissibles, 0), 0);
  const ressourcesMensuelles   = grouped.ressourcesTotal != null ? round2(grouped.ressourcesTotal / 12) : 0;
  const disponibleAdm          = round2(ressourcesMensuelles - totalChargesAdmCohab - chargesAdmDem);
  const disponibleTotal        = round2(ressourcesMensuelles - totalChargesAdmCohab - totalChargesInadmCohab - chargesAdmDem);

  const btnMode = (value, label, desc) => {
    const sel = modeCalcul === value;
    return (
      <button key={value} onClick={() => update({ modeCalcul: value })}
        style={{ border: `2px solid ${sel ? colors.primary : colors.border}`, borderRadius: 10, padding: "10px 12px", background: sel ? "#EEF4FA" : colors.white, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "'Source Sans Pro', sans-serif" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: sel ? colors.primary : colors.text, marginBottom: 3 }}>{label}</div>
        <div style={{ fontSize: 14, color: colors.textLight, lineHeight: 1.4 }}>{desc}</div>
      </button>
    );
  };

  const btnPrise = (value, label, sub) => {
    const sel = priseEnCompte === value;
    return (
      <button key={value} onClick={() => update({ priseEnCompte: value })}
        style={{ border: `2px solid ${sel ? colors.primary : colors.border}`, borderRadius: 10, padding: "10px 12px", background: sel ? "#EEF4FA" : colors.white, cursor: "pointer", textAlign: "left", transition: "all 0.2s", fontFamily: "'Source Sans Pro', sans-serif" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: sel ? colors.primary : colors.text, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, color: colors.textLight }}>{sub}</div>
      </button>
    );
  };

  return (
    <Card title={<span style={{ display: "flex", alignItems: "center", gap: 6 }}>Revenus des cohabitants<FicheBtn ficheKey="cohabitants" onOpen={onOpenFiche} /></span>} action={
      <button onClick={addRow} className="btn-add">+ Ajouter un cohabitant</button>
    }>

      {/* ── Mode de calcul ── */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, display: "block", marginBottom: 8 }}>
          Mode de calcul
        </span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {btnMode("groupe",     "Groupé — Circulaire 16/01/2026",  "Seuil calculé sur l'ensemble des cohabitants combinés (recommandé)")}
          {btnMode("individuel", "Individuel (ancienne méthode)",    "Excédent calculé séparément pour chaque cohabitant")}
        </div>
      </div>

      {/* ── Nombre de bénéficiaires RIS ── */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, display: "block", marginBottom: 6 }}>
          Nombre de bénéficiaires RIS dans le ménage
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <NumInput
            aria-label="Nombre de bénéficiaires RIS dans le ménage"
            value={nbBeneficiairesRIS}
            style={{ width: 80, padding: "8px 10px", border: `1px solid ${colors.border}`, borderRadius: 8, fontSize: 14, textAlign: "center" }}
            onChange={(e) => update({ nbBeneficiairesRIS: Math.max(1, safeNumber(e.target.value, 1)) })}
          />
          <span style={{ fontSize: 14, color: colors.textMuted }}>
            {nbBeneficiairesRIS > 1 ? `L'excédent sera divisé par ${nbBeneficiairesRIS}` : "Aucune division appliquée"}
          </span>
        </div>
      </div>

      {/* ── Liste des cohabitants ── */}
      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucun cohabitant enregistré</p>
      ) : (
        <>
          {rows.map((r, i) => {
            const calc = computeCohabitantRow(r, referenceDate);
            return (
              <Card key={i} title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span>Cohabitant #{i + 1}</span>
                  <button
                    onClick={() => removeRow(i)}
                    className="btn-remove"
                    style={{ marginLeft: 24 }}
                    aria-label={`Supprimer cohabitant ${i + 1}`}
                  >
                    <i className="fas fa-trash" aria-hidden="true" /> Supprimer
                  </button>
                </div>
              }>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>

                  {/* Nom */}
                  <Input label="Nom" value={r.nom}
                    onChange={(e) => updateRow(i, { nom: e.target.value })}
                    placeholder="Nom du cohabitant" />

                  {/* Type */}
                  <Field label="Type">
                    <select value={r.type} onChange={(e) => updateRow(i, { type: e.target.value })}>
                      <option value="Ascendant majeur">Ascendant majeur</option>
                      <option value="Descendant majeur">Descendant majeur</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </Field>
                </div>

                {/* ── Sections revenus accordéon ── */}
                {(() => {
                  const accStyle = { marginTop: 8, border: `1px solid ${colors.border}`, borderRadius: 8, overflow: "hidden" };
                  const sumStyle = { fontSize: 14, color: colors.textLight, marginLeft: 8 };
                  const secHdr = (icon, label, total) => (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "#F7F9FB", cursor: "pointer", userSelect: "none" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary }}>
                        <i className={`fas ${icon}`} style={{ marginRight: 6, fontSize: 14, opacity: 0.7 }} aria-hidden="true" />
                        {label}
                      </span>
                      {total > 0 && <span style={sumStyle}><Money value={total} />/an</span>}
                    </div>
                  );
                  const simpleTable = (rowList, onAdd, onRemove, onUpdate, suggestions) => (
                    <div style={{ padding: "10px 12px" }}>
                      {rowList.length > 0 && (
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 8 }}>
                          <thead>
                            <tr style={{ background: "#EEF4FA" }}>
                              <th style={{ padding: "4px 6px", textAlign: "left", fontWeight: 600, color: colors.primary, width: "42%" }}>Nature</th>
                              <th style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, color: colors.primary, width: "22%" }}>Montant</th>
                              <th style={{ padding: "4px 6px", textAlign: "center", fontWeight: 600, color: colors.primary, width: "18%" }}>Période</th>
                              <th style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, color: colors.primary, width: "13%" }}>/an</th>
                              <th style={{ width: "5%" }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {rowList.map((d, j) => {
                              const an = d.periode === "annuel" ? safeNumber(d.montant, 0) : safeNumber(d.montant, 0) * 12;
                              return (
                                <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                  <td style={{ padding: "4px 5px" }}>
                                    {suggestions ? (
                                      <select className="formControl" style={{ padding: "3px 5px", fontSize: 14 }}
                                        aria-label="Nature du revenu"
                                        value={d.label}
                                        onChange={(e) => onUpdate(j, { label: e.target.value })}>
                                        {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                                      </select>
                                    ) : (
                                      <input className="formControl" style={{ padding: "3px 5px", fontSize: 14, width: "100%" }}
                                        aria-label="Nature du revenu"
                                        value={d.label} placeholder="Nature du revenu"
                                        onChange={(e) => onUpdate(j, { label: e.target.value })} />
                                    )}
                                  </td>
                                  <td style={{ padding: "4px 5px" }}>
                                    <NumInput value={d.montant}
                                      aria-label="Montant"
                                      onChange={(e) => onUpdate(j, { montant: safeNumber(e.target.value, 0) })}
                                      style={{ textAlign: "right", padding: "3px 5px", fontSize: 14, width: "100%" }} />
                                  </td>
                                  <td style={{ padding: "4px 5px", textAlign: "center" }}>
                                    <select className="formControl" style={{ padding: "3px 5px", fontSize: 14 }}
                                      aria-label="Période"
                                      value={d.periode}
                                      onChange={(e) => onUpdate(j, { periode: e.target.value })}>
                                      <option value="mensuel">Mensuel</option>
                                      <option value="annuel">Annuel</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: "4px 7px", textAlign: "right", fontWeight: 600, color: colors.primary }}>
                                    <Money value={an} />
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    <button onClick={() => onRemove(j)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: "#BF2222", fontSize: 14, padding: "2px 4px" }}
                                      aria-label="Supprimer">
                                      <i className="fas fa-times" aria-hidden="true" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr style={{ background: "#EEF4FA" }}>
                              <td colSpan={3} style={{ padding: "4px 6px", fontWeight: 700, color: colors.primary, textAlign: "right" }}>Total annuel :</td>
                              <td style={{ padding: "4px 6px", textAlign: "right", fontWeight: 700, color: colors.primary }}>
                                <Money value={sumSimpleRows(rowList)} />
                              </td>
                              <td />
                            </tr>
                          </tfoot>
                        </table>
                      )}
                      <button onClick={onAdd}
                        style={{ background: colors.primary, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="fas fa-plus" aria-hidden="true" /> Ajouter une ligne
                      </button>
                    </div>
                  );

                  const proTotal    = round2(
                    (r.proRows || []).reduce((s, d) => s + safeNumber(d.montant, 0), 0) -
                    (r.proExoRows || []).reduce((s, d) => s + safeNumber(d.montant, 0), 0)
                  );
                  const refYear     = parseInt((referenceDate || "2025-01-01").split("-")[0]) || 2025;
                  const cd          = r.cmrData || {};
                  const cmrChomM    = computeChomageOrMutuelleMonthly({ ...(cd.chomage || {}), year: refYear }).mensuelTotal;
                  const cmrMutM     = computeChomageOrMutuelleMonthly({ ...(cd.mutuelle || {}), year: refYear }).mensuelTotal;
                  const cmrRemM     = Object.values(cd.remplacement || {}).reduce((s, v) => s + safeNumber(v, 0), 0);
                  const cmrTotal    = round2(cmrChomM + cmrMutM + cmrRemM + sumSimpleRows(r.cmrRows) / 12);
                  const cesTotal    = computeCessionsTotalAnnuel(r.cessionsBiens?.rows || [], r.categorie || 1).totalAnnuel;
                  const immoTotal   = computeImmoExcel(r.biensImmobiliers?.rows || [], 0).totalAnnuel;
                  const bmData      = r.biensMobiliers || { montantCapital: 0, partConcernee: 100 };
                  const bmCalc      = computeBiensMobiliersExcel(bmData);
                  const avTotal     = round2(Object.values(r.avantages || {}).reduce((s, v) => s + safeNumber(v, 0), 0) * 12);
                  const divTotal    = round2(Object.values(r.ressourcesDiverses || {}).reduce((s, v) => s + safeNumber(v, 0), 0) * 12);

                  return (
                    <div style={{ marginTop: 12 }}>

                      {/* Revenus professionnels nets */}
                      <details style={accStyle}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-briefcase", "Revenus professionnels nets", proTotal)}
                        </summary>
                        <div style={{ padding: "10px 12px" }}>
                          {/* Comptabilises */}
                          <div style={{ fontWeight: 600, fontSize: 14, color: colors.primary, marginBottom: 6 }}>Revenus comptabilises</div>
                          {(r.proRows || []).length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 6 }}>
                              <thead>
                                <tr style={{ background: "#EEF4FA" }}>
                                  <th style={{ padding: "4px 6px", textAlign: "left", fontWeight: 600, color: colors.primary, width: "50%" }}>Type de revenu</th>
                                  <th style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, color: colors.primary, width: "30%" }}>Montant (€/mois)</th>
                                  <th style={{ width: "20%" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(r.proRows || []).map((d, j) => (
                                  <tr key={j} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <td style={{ padding: "4px 5px" }}>
                                      <select className="formControl" style={{ padding: "3px 5px", fontSize: 14, width: "100%" }}
                                        aria-label="Type de revenu"
                                        value={d.label === "Autre" ? "Autre" : (d.label || "")}
                                        onChange={(e) => updateProRow(i, j, { label: e.target.value, customLabel: e.target.value === "Autre" ? "" : null })}>
                                        {REVENUS_COMPTABILISES_SUGGESTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                      </select>
                                      {d.label === "Autre" && (
                                        <input className="formControl" style={{ marginTop: 4, fontSize: 14, width: "100%", border: "2px solid #2BEBCE", background: "#F0FFFE" }}
                                          aria-label="Précisez le type de revenu"
                                          value={d.customLabel || ""} placeholder="Precisez..."
                                          onChange={(e) => updateProRow(i, j, { customLabel: e.target.value })} />
                                      )}
                                    </td>
                                    <td style={{ padding: "4px 5px" }}>
                                      <NumInput value={d.montant} onChange={(e) => updateProRow(i, j, { montant: safeNumber(e.target.value, 0) })}
                                        aria-label="Montant (€/mois)"
                                        style={{ textAlign: "right", padding: "3px 5px", fontSize: 14, width: "100%" }} />
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <button onClick={() => removeProRow(i, j)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#BF2222", fontSize: 14, padding: "2px 4px" }}>
                                        <i className="fas fa-times" aria-hidden="true" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <button onClick={() => addProRow(i)}
                            style={{ background: colors.primary, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="fas fa-plus" aria-hidden="true" /> Ajouter
                          </button>

                          {/* Exoneres */}
                          <div style={{ fontWeight: 600, fontSize: 14, color: colors.primary, margin: "12px 0 6px" }}>Revenus exoneres</div>
                          {(r.proExoRows || []).length > 0 && (
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 6 }}>
                              <thead>
                                <tr style={{ background: "#EEF4FA" }}>
                                  <th style={{ padding: "4px 6px", textAlign: "left", fontWeight: 600, color: colors.primary, width: "50%" }}>Type d'exoneration</th>
                                  <th style={{ padding: "4px 6px", textAlign: "right", fontWeight: 600, color: colors.primary, width: "30%" }}>Montant (€/mois)</th>
                                  <th style={{ width: "20%" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {(r.proExoRows || []).map((d, j) => (
                                  <tr key={j} style={{ borderBottom: `1px solid ${colors.border}` }}>
                                    <td style={{ padding: "4px 5px" }}>
                                      <select className="formControl" style={{ padding: "3px 5px", fontSize: 14, width: "100%" }}
                                        aria-label="Type d'exonération"
                                        value={d.type || ""}
                                        onChange={(e) => updateProExoRow(i, j, { type: e.target.value })}>
                                        {REVENUS_EXONERES_SUGGESTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                      </select>
                                    </td>
                                    <td style={{ padding: "4px 5px" }}>
                                      <NumInput value={d.montant} onChange={(e) => updateProExoRow(i, j, { montant: safeNumber(e.target.value, 0) })}
                                        aria-label="Montant exonéré (€/mois)"
                                        style={{ textAlign: "right", padding: "3px 5px", fontSize: 14, width: "100%" }} />
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                      <button onClick={() => removeProExoRow(i, j)}
                                        style={{ background: "none", border: "none", cursor: "pointer", color: "#BF2222", fontSize: 14, padding: "2px 4px" }}>
                                        <i className="fas fa-times" aria-hidden="true" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          <button onClick={() => addProExoRow(i)}
                            style={{ background: "#6c757d", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                            <i className="fas fa-plus" aria-hidden="true" /> Ajouter exoneration
                          </button>

                          {/* Net */}
                          {(r.proRows || []).length > 0 && (
                            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 700, color: colors.primary }}>
                              Net mensuel : <Money value={round2(
                                (r.proRows || []).reduce((s, d) => s + safeNumber(d.montant, 0), 0) -
                                (r.proExoRows || []).reduce((s, d) => s + safeNumber(d.montant, 0), 0)
                              )} />
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Chomage, mutuelle & remplacement */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-file-medical", "Chomage / Mutuelle / Remplacement", cmrTotal)}
                        </summary>
                        {(() => {
                          const cData = r.cmrData || {};
                          const setChom = (p) => updateCmrData(i, "chomage", p);
                          const setMut  = (p) => updateCmrData(i, "mutuelle", p);
                          const setRem  = (p) => updateCmrData(i, "remplacement", p);
                          const fldStyle = { padding: "3px 6px", fontSize: 14 };
                          const fieldRow = (label, value, onChange) => (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <label style={{ fontSize: 14, color: colors.textLight, flex: "0 0 220px" }}>{label}</label>
                              <NumInput value={value} onChange={onChange} style={{ ...fldStyle, width: 110, textAlign: "right" }} />
                            </div>
                          );
                          return (
                            <div style={{ padding: "10px 12px", display: "grid", gap: 12 }}>
                              {/* Chomage */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, marginBottom: 6 }}>Allocation de chomage</div>
                                {fieldRow("Montant mensuel reel (€/mois)", cData.chomage?.mensuelReel || 0, (e) => setChom({ mensuelReel: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Montant/jour x 26 jours (euro)", cData.chomage?.montantJour26 || 0, (e) => setChom({ montantJour26: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Montant/jour (base annuelle) (euro)", cData.chomage?.montantJourAnnuel || 0, (e) => setChom({ montantJourAnnuel: safeNumber(e.target.value, 0) }))}
                                {cmrChomM > 0 && <div style={{ fontSize: 14, color: colors.primary, fontWeight: 600 }}>= <Money value={cmrChomM} />/mois</div>}
                              </div>
                              {/* Mutuelle */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, marginBottom: 6 }}>Indemnite de mutuelle</div>
                                {fieldRow("Montant mensuel reel (€/mois)", cData.mutuelle?.mensuelReel || 0, (e) => setMut({ mensuelReel: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Montant/jour x 26 jours (euro)", cData.mutuelle?.montantJour26 || 0, (e) => setMut({ montantJour26: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Montant/jour (base annuelle) (euro)", cData.mutuelle?.montantJourAnnuel || 0, (e) => setMut({ montantJourAnnuel: safeNumber(e.target.value, 0) }))}
                                {cmrMutM > 0 && <div style={{ fontSize: 14, color: colors.primary, fontWeight: 600 }}>= <Money value={cmrMutM} />/mois</div>}
                              </div>
                              {/* Remplacement */}
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, marginBottom: 6 }}>Revenus de remplacement</div>
                                {fieldRow("Pension (€/mois)", cData.remplacement?.pensionMensuel || 0, (e) => setRem({ pensionMensuel: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Droit passerelle (€/mois)", cData.remplacement?.droitPasserelleMensuel || 0, (e) => setRem({ droitPasserelleMensuel: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Allocation handicap ARR (€/mois)", cData.remplacement?.allocationHandicapeMensuel || 0, (e) => setRem({ allocationHandicapeMensuel: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Indemn. perte de revenus (€/mois)", cData.remplacement?.indemnisation_perte_revenus || 0, (e) => setRem({ indemnisation_perte_revenus: safeNumber(e.target.value, 0) }))}
                                {fieldRow("Autre revenu de remplacement (€/mois)", cData.remplacement?.autres_revenus || 0, (e) => setRem({ autres_revenus: safeNumber(e.target.value, 0) }))}
                              </div>
                              {cmrTotal > 0 && (
                                <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, background: "#EEF4FA", padding: "6px 10px", borderRadius: 6 }}>
                                  Total CMR mensuel : <Money value={cmrTotal} />
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </details>

                      {/* Cessions de biens */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-building", "Cessions de biens", cesTotal)}
                        </summary>
                        <div style={{ padding: "10px 12px" }}>
                          <CessionsBiensTable
                            rows={r.cessionsBiens?.rows || []}
                            categorie={r.categorie || 1}
                            onChangeRows={(rows2) => updateCessions(i, rows2)} />
                        </div>
                      </details>

                      {/* Biens immobiliers */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-house", "Biens immobiliers", immoTotal)}
                        </summary>
                        <div style={{ padding: "10px 12px" }}>
                          <BiensImmobiliersTable
                            rows={r.biensImmobiliers?.rows || []}
                            onChangeRows={(rows2) => updateImmo(i, rows2)} />
                        </div>
                      </details>

                      {/* Biens mobiliers */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-coins", "Biens mobiliers", bmCalc.totalAnnuel)}
                        </summary>
                        <div style={{ padding: "10px 12px" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                            <Input label="Capital (€)" type="number" value={bmData.montantCapital}
                              onChange={(e) => updateMob(i, { montantCapital: safeNumber(e.target.value, 0) })} />
                            <Input label="Part concernée (%)" type="number" value={bmData.partConcernee}
                              onChange={(e) => updateMob(i, { partConcernee: safeNumber(e.target.value, 100) })} />
                          </div>
                          {bmCalc.totalAnnuel > 0 && (
                            <div style={{ marginTop: 8, fontSize: 14, color: colors.textLight }}>
                              {safeNumber(bmData.montantCapital, 0) > MOB_SEUIL_R && (
                                <div>Tranche 2 ({MOB_SEUIL_R.toLocaleString("fr-BE")}–{MOB_SEUIL_S.toLocaleString("fr-BE")} €) × 6% = <strong><Money value={bmCalc.E6} /></strong>/an</div>
                              )}
                              {safeNumber(bmData.montantCapital, 0) > MOB_SEUIL_S && (
                                <div>Tranche 3 (&gt;{MOB_SEUIL_S.toLocaleString("fr-BE")} €) × 10% = <strong><Money value={bmCalc.E7} /></strong>/an</div>
                              )}
                              <div style={{ fontWeight: 700, color: colors.primary }}>Total : <Money value={bmCalc.totalAnnuel} />/an</div>
                            </div>
                          )}
                        </div>
                      </details>

                      {/* Avantages en nature */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-house-user", "Avantages en nature", avTotal)}
                        </summary>
                        <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          <Input label="Charges locatives par un tiers (€/mois)" type="number"
                            value={(r.avantages || {}).chargesLocativesTiers || 0}
                            onChange={(e) => updateAvantages(i, { chargesLocativesTiers: safeNumber(e.target.value, 0) })} />
                          <Input label="Loyer fictif (simulateur) (€/mois)" type="number"
                            value={(r.avantages || {}).loyerFictifSimulateur || 0}
                            onChange={(e) => updateAvantages(i, { loyerFictifSimulateur: safeNumber(e.target.value, 0) })} />
                          <Input label="Prêt hypothécaire par un tiers (€/mois)" type="number"
                            value={(r.avantages || {}).pretHypothecaireTiers || 0}
                            onChange={(e) => updateAvantages(i, { pretHypothecaireTiers: safeNumber(e.target.value, 0) })} />
                          <Input label="Autres avantages (€/mois)" type="number"
                            value={(r.avantages || {}).autresAvantages || 0}
                            onChange={(e) => updateAvantages(i, { autresAvantages: safeNumber(e.target.value, 0) })} />
                        </div>
                      </details>

                      {/* Ressources diverses */}
                      <details style={{ ...accStyle, marginTop: 4 }}>
                        <summary style={{ listStyle: "none" }}>
                          {secHdr("fa-chart-bar", "Ressources diverses", divTotal)}
                        </summary>
                        <div style={{ padding: "10px 12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                          <Input label="Allocations familiales (€/mois)" type="number"
                            value={(r.ressourcesDiverses || {}).allocationsFamiliales || 0}
                            onChange={(e) => updateDiverses(i, { allocationsFamiliales: safeNumber(e.target.value, 0) })} />
                          <Input label="Pension alimentaire perçue (€/mois)" type="number"
                            value={(r.ressourcesDiverses || {}).pensionAlimentairePercue || 0}
                            onChange={(e) => updateDiverses(i, { pensionAlimentairePercue: safeNumber(e.target.value, 0) })} />
                          <Input label="Autres ressources diverses (€/mois)" type="number"
                            value={(r.ressourcesDiverses || {}).autresRessources || 0}
                            onChange={(e) => updateDiverses(i, { autresRessources: safeNumber(e.target.value, 0) })} />
                        </div>
                      </details>

                    </div>
                  );
                })()}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 12 }}>

                  {/* Prise en charge */}
                  <Field label={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Prise en charge
                      <FicheBtn ficheKey="prise_en_charge" onOpen={onOpenFiche} />
                    </span>
                  }>
                    <select
                      value={r.priseEnCharge}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateRow(i, {
                          priseEnCharge: val,
                          pctReport: val === "Report max" ? 100 : val === "Pas de report" ? 0 : r.pctReport
                        });
                      }}
                    >
                      <option value="Report max">Report max (100%)</option>
                      <option value="Report partiel">Report partiel</option>
                      <option value="Pas de report">Pas de report (0%)</option>
                    </select>
                  </Field>

                  {/* % Report */}
                  <Field label="% Report">
                    <NumInput
                      value={r.priseEnCharge === "Report max" ? 100 : r.priseEnCharge === "Pas de report" ? 0 : (r.pctReport || 0)}
                      disabled={r.priseEnCharge !== "Report partiel"}
                      onChange={(e) => updateRow(i, { pctReport: safeNumber(e.target.value, 0) })}
                      style={{ opacity: r.priseEnCharge === "Report partiel" ? 1 : 0.45, cursor: r.priseEnCharge === "Report partiel" ? "auto" : "not-allowed" }}
                    />
                  </Field>
                </div>

                {/* Catégorie — cartes Cat. 1 / Cat. 3 */}
                <div style={{ marginTop: 14 }}>
                  <span style={{ fontSize: 14, opacity: 0.85, display: "block", marginBottom: 8 }}>Catégorie (seuil RI applicable)</span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { value: 1, cat: "Cat. 1", label: "Cohabitant" },
                      { value: 3, cat: "Cat. 3", label: "Famille avec charge" },
                    ].map(opt => {
                      const sel = r.categorie === opt.value;
                      return (
                        <button key={opt.value} onClick={() => updateRow(i, { categorie: opt.value })}
                          style={{
                            border: `2px solid ${sel ? colors.primary : colors.border}`,
                            borderRadius: 10, padding: "10px 12px",
                            background: sel ? "#EEF4FA" : colors.white,
                            cursor: "pointer", textAlign: "left",
                            transition: "all 0.2s",
                            fontFamily: "'Source Sans Pro', sans-serif"
                          }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: sel ? colors.primary : colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{opt.cat}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: sel ? colors.primary : colors.text, marginBottom: 4 }}>{opt.label}</div>
                          <div style={{ fontSize: 14, color: colors.textLight, lineHeight: 1.4 }}>{opt.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Mention indicatif si type "Autre" */}
                {r.type === "Autre" && (
                  <div className="alert alert--warning" style={{ marginTop: 12 }}>
                    <i className="fas fa-circle-info" aria-hidden="true" />
                    <span>
                      Ce cohabitant est de type <strong>« Autre »</strong> : ses ressources sont conservées
                      à titre indicatif uniquement et <strong>ne sont pas prises en compte</strong> dans
                      le calcul du droit au RI du demandeur.
                    </span>
                  </div>
                )}

                {/* ── Budget mensuel accordion ── */}
                <details style={{ marginTop: 14 }}>
                  <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: colors.primary, padding: "6px 0", userSelect: "none", listStyle: "none", display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="fas fa-chevron-right" style={{ fontSize: 14, transition: "transform 0.2s" }} aria-hidden="true" />
                    Budget mensuel <span style={{ fontWeight: 400, color: colors.textLight }}>(facultatif — pour analyse d'équité)</span>
                  </summary>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 10, paddingLeft: 4 }}>
                    <Input label="Charges admissibles (€/mois)" type="number"
                      value={r.chargesAdmissibles}
                      onChange={(e) => updateRow(i, { chargesAdmissibles: safeNumber(e.target.value, 0) })} />
                    <Input label="Charges inadmissibles (€/mois)" type="number"
                      value={r.chargesInadmissibles}
                      onChange={(e) => updateRow(i, { chargesInadmissibles: safeNumber(e.target.value, 0) })} />
                  </div>
                  {safeNumber(r.chargesAdmissibles, 0) > 0 && (
                    <div style={{ marginTop: 6, paddingLeft: 4, fontSize: 14, color: colors.textLight }}>
                      Disponible (après charges admissibles) :&nbsp;
                      <strong style={{ color: round2(safeNumber(calc.ressourcesTotale, 0) / 12 - safeNumber(r.chargesAdmissibles, 0)) >= 0 ? "#1a7a3c" : "#BF2222" }}>
                        <Money value={round2(safeNumber(calc.ressourcesTotale, 0) / 12 - safeNumber(r.chargesAdmissibles, 0))} /> /mois
                      </strong>
                    </div>
                  )}
                </details>

                <div className="summary-box" style={{ marginTop: 10, fontSize: 14 }}>
                  {calc.breakdown && Object.keys(calc.breakdown).length > 0 && calc.ressourcesTotale > 0 && (
                    <div style={{ marginBottom: 8, fontSize: 14, color: colors.textLight, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                      {calc.breakdown.proAnnuel > 0 && <span>Pro: <strong><Money value={calc.breakdown.proAnnuel} /></strong></span>}
                      {calc.breakdown.cmrAnnuel > 0 && <span>CMR: <strong><Money value={calc.breakdown.cmrAnnuel} /></strong></span>}
                      {calc.breakdown.cessionsAnnuel > 0 && <span>Cessions: <strong><Money value={calc.breakdown.cessionsAnnuel} /></strong></span>}
                      {calc.breakdown.immoAnnuel > 0 && <span>Immo: <strong><Money value={calc.breakdown.immoAnnuel} /></strong></span>}
                      {calc.breakdown.mobAnnuel > 0 && <span>Mobiliers: <strong><Money value={calc.breakdown.mobAnnuel} /></strong></span>}
                      {calc.breakdown.avantagesAnnuel > 0 && <span>Avantages: <strong><Money value={calc.breakdown.avantagesAnnuel} /></strong></span>}
                      {calc.breakdown.diversesAnnuel > 0 && <span>Diverses: <strong><Money value={calc.breakdown.diversesAnnuel} /></strong></span>}
                      <span style={{ borderLeft: `1px solid ${colors.border}`, paddingLeft: 12, fontWeight: 700, color: colors.primary }}>Total/an: <Money value={calc.ressourcesTotale} /></span>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                    <div><strong>Seuil RI (catégorie {calc.categorie}):</strong> <Money value={calc.seuilRI} /></div>
                    <div><strong>Excédent:</strong> <Money value={calc.excedent} /></div>
                    <div><strong>Montant mensuel:</strong> <Money value={calc.montantMensuel} /></div>
                    <div><strong>Montant reporté :</strong> {calc.isIndicatifOnly ? <em style={{ color: colors.textLight }}>non reporté (indicatif)</em> : <Money value={calc.montantReporte} />}</div>
                  </div>
                  {calc.message && (
                    <div className="alert alert--warning" style={{ marginTop: 8 }}>
                      <i className="fas fa-triangle-exclamation" aria-hidden="true" />
                      <span>{calc.message}</span>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </>
      )}

      {/* ── Synthèse groupée + prise en compte ── */}
      {modeCalcul === "groupe" && rows.length > 0 && (
        <div style={{ marginTop: 16, border: `2px solid ${colors.primary}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: colors.primary, textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 12 }}>
            Synthèse groupée — Circulaire 16/01/2026
          </div>

          {/* Tableau excédent */}
          {(() => {
            const debCount = (grouped.debiteurs || []).filter(d => d.priseEnCharge !== "Pas de report").length;
            const autreCount = (grouped.autresCohabitants || []).length;
            const totalSeuilCount = debCount + autreCount;
            const hasPartiel = (grouped.debiteurs || []).some(d => d.priseEnCharge === "Report partiel");
            return (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 16 }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "6px 8px", color: colors.text }}>Ressources combinées (débiteurs d'aliments)</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}><Money value={grouped.ressourcesTotal} /> /an</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "6px 8px", color: colors.text }}>
                      Seuil garanti ({totalSeuilCount} cohabitant{totalSeuilCount !== 1 ? "s" : ""})
                      {autreCount > 0 && <span style={{ color: colors.textLight, fontSize: 14, marginLeft: 6 }}>dont {autreCount} « Autre » (seuil uniquement)</span>}
                    </td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: "#BF2222", fontWeight: 600 }}>−&nbsp;<Money value={grouped.seuilTotal} /> /an</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.border}`, background: hasPartiel ? undefined : "#EEF4FA" }}>
                    <td style={{ padding: "7px 8px", fontWeight: hasPartiel ? 500 : 700, color: colors.primary }}>
                      Excédent légal brut
                    </td>
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: colors.primary }}>
                      <Money value={grouped.rawExcedent} /> /an
                    </td>
                  </tr>
                  {hasPartiel && (
                    <tr style={{ background: "#EEF4FA" }}>
                      <td style={{ padding: "7px 8px", fontWeight: 700, color: colors.primary }}>
                        Excédent ajusté (report partiel appliqué)
                      </td>
                      <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: colors.primary }}>
                        <Money value={grouped.excedentGroupe} /> /an
                        <span style={{ color: colors.textLight, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                          = <Money value={round2(grouped.excedentGroupe / 12)} />/mois
                        </span>
                      </td>
                    </tr>
                  )}
                  {!hasPartiel && grouped.rawExcedent > 0 && (
                    <tr style={{ background: "#EEF4FA" }}>
                      <td colSpan={2} style={{ padding: "3px 8px 5px", textAlign: "right", color: colors.textLight, fontSize: 14 }}>
                        = <Money value={round2(grouped.excedentGroupe / 12)} />/mois
                      </td>
                    </tr>
                  )}
                  {(grouped.nbBeneficiaires || 1) > 1 && grouped.rawExcedent > 0 && (
                    <tr style={{ background: "#EEF4FA", borderTop: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "7px 8px", fontWeight: 700, color: colors.primary }}>
                        Part demandeur (÷ {grouped.nbBeneficiaires} bénéficiaires RIS)
                      </td>
                      <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 700, color: colors.primary }}>
                        <Money value={grouped.totalAnnuel} /> /an
                        <span style={{ color: colors.textLight, fontWeight: 400, fontSize: 14, marginLeft: 8 }}>
                          = <Money value={grouped.totalMensuel} />/mois
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            );
          })()}

          {/* Prise en compte */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, display: "block", marginBottom: 8 }}>Prise en compte des ressources</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {btnPrise("legale",  "Légale complète",  grouped.totalMensuel > 0 ? `${grouped.totalMensuel.toLocaleString("fr-BE", { minimumFractionDigits: 2 })} €/mois` : "0 €")}
              {btnPrise("equite",  "Par équité",        "Montant réduit — raisons d'équité")}
              {btnPrise("aucune",  "Pas de report",     "0 € comptabilisé")}
            </div>
          </div>

          {/* Saisie équité */}
          {priseEnCompte === "equite" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "#FFF8E1", border: "1px solid #f0d060", borderRadius: 8, padding: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: colors.primary }}>Ressources retenues (€/an)</div>
                <NumInput aria-label="Ressources retenues (€/an)" value={montantRetenuAnnuel}
                  onChange={(e) => update({ montantRetenuAnnuel: safeNumber(e.target.value, 0), risOctroyeCible: "" })} />
                <div style={{ fontSize: 14, color: colors.textLight, marginTop: 3 }}>Maximum légal : <Money value={grouped.excedentGroupe} /> €/an</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, color: colors.primary }}>— ou — RIS visé (€/mois)</div>
                <NumInput aria-label="RIS visé (€/mois)" value={risOctroyeCible}
                  onChange={(e) => handleRisOctroyeCible(e.target.value)} />
                <div style={{ fontSize: 14, color: colors.textLight, marginTop: 3 }}>→ Recalcule automatiquement les ressources retenues</div>
              </div>
            </div>
          )}

          {/* Balance budgétaire ménage */}
          {(hasAnyBudget || chargesAdmDem > 0) && (
            <details style={{ marginBottom: 14 }}>
              <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: colors.primary, padding: "4px 0", userSelect: "none" }}>
                Balance budgétaire du ménage
              </summary>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, marginTop: 8 }}>
                <tbody>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "5px 8px" }}>Ressources totales (cohabitants)</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 600 }}><Money value={ressourcesMensuelles} /> /mois</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "5px 8px" }}>Charges admissibles (cohabitants)</td>
                    <td style={{ padding: "5px 8px", textAlign: "right", color: "#BF2222" }}>−&nbsp;<Money value={totalChargesAdmCohab} /> /mois</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: "5px 8px" }}>
                      Charges admissibles (demandeur)
                    </td>
                    <td style={{ padding: "5px 8px", textAlign: "right" }}>
                      <NumInput aria-label="Charges admissibles du demandeur (€/mois)" value={chargesAdmDem}
                        onChange={(e) => update({ chargesAdmissiblesDemandeur: safeNumber(e.target.value, 0) })}
                        style={{ width: 90, textAlign: "right", padding: "3px 6px", fontSize: 14 }} />
                      <span style={{ color: colors.textLight, marginLeft: 4 }}>€/mois</span>
                    </td>
                  </tr>
                  {totalChargesInadmCohab > 0 && (
                    <tr style={{ borderBottom: `1px solid ${colors.border}` }}>
                      <td style={{ padding: "5px 8px", fontStyle: "italic", color: colors.textLight }}>Charges inadmissibles (cohabitants)</td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: colors.textLight }}>−&nbsp;<Money value={totalChargesInadmCohab} /> /mois</td>
                    </tr>
                  )}
                  <tr style={{ background: disponibleAdm >= 0 ? "#d4edda" : "#fde8e8", fontWeight: 700 }}>
                    <td style={{ padding: "6px 8px", color: disponibleAdm >= 0 ? "#1a7a3c" : "#BF2222" }}>Disponible ménage (charges admissibles)</td>
                    <td style={{ padding: "6px 8px", textAlign: "right", color: disponibleAdm >= 0 ? "#1a7a3c" : "#BF2222" }}><Money value={disponibleAdm} /> /mois</td>
                  </tr>
                  {totalChargesInadmCohab > 0 && (
                    <tr style={{ background: disponibleTotal >= 0 ? "#d4edda" : "#fde8e8" }}>
                      <td style={{ padding: "6px 8px", color: disponibleTotal >= 0 ? "#1a7a3c" : "#BF2222", fontStyle: "italic", fontSize: 14 }}>Disponible ménage (toutes charges)</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: disponibleTotal >= 0 ? "#1a7a3c" : "#BF2222", fontSize: 14 }}><Money value={disponibleTotal} /> /mois</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </details>
          )}

          {/* Fourchette RIS */}
          {categorieDemandeur && risMaxMensuel != null && (
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, display: "block", marginBottom: 8 }}>Fourchette RIS</span>
              <div style={{ display: "grid", gridTemplateColumns: priseEnCompte === "equite" ? "1fr 1fr 1fr" : "1fr 1fr", gap: 8 }}>
                <div style={{ background: "#fde8e8", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 14, color: "#BF2222", fontWeight: 600, marginBottom: 2 }}>Minimum légal</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#BF2222" }}><Money value={risMinLegalMensuel} /> /mois</div>
                  <div style={{ fontSize: 14, color: colors.textLight }}>Application stricte</div>
                </div>
                {priseEnCompte === "equite" && (
                  <div style={{ background: "#fff8e1", border: "1px solid #f0d060", borderRadius: 8, padding: "8px 12px" }}>
                    <div style={{ fontSize: 14, color: "#b8860b", fontWeight: 600, marginBottom: 2 }}>Montant octroyé</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#b8860b" }}><Money value={risOctroyeMensuel} /> /mois</div>
                    <div style={{ fontSize: 14, color: colors.textLight }}>Par équité</div>
                  </div>
                )}
                <div style={{ background: "#d4edda", borderRadius: 8, padding: "8px 12px" }}>
                  <div style={{ fontSize: 14, color: "#1a7a3c", fontWeight: 600, marginBottom: 2 }}>Maximum</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1a7a3c" }}><Money value={risMaxMensuel} /> /mois</div>
                  <div style={{ fontSize: 14, color: colors.textLight }}>Taux plein Cat. {categorieDemandeur}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Totaux (mode individuel) */}
      {modeCalcul === "individuel" && rows.length > 0 && (
        <div className="summary-box" style={{ marginTop: 12 }}>
          <div><b>Total annuel reporté : <Money value={grouped.totalAnnuel} /></b></div>
          <div><b>Total mensuel reporté : <Money value={grouped.totalMensuel} /></b></div>
        </div>
      )}

    </Card>
  );
}
// Listes officielles des revenus
const REVENUS_COMPTABILISES_SUGGESTIONS = [
  { value: "Revenu net professionnel", label: "Revenu net professionnel" },
  { value: "", label: "Sélectionner un type de revenu..." },
  { value: "Accueillante enfants - revenu brut", label: "Accueillante enfants - revenu brut" },
  { value: "Allocation de formation Forem, VDAB ou Actiris", label: "Allocation de formation Forem, VDAB ou Actiris" },
  { value: "Allocation de stage d'insertion", label: "Allocation de stage d'insertion" },
  { value: "Allocation de stage Onem (ou Actiris)", label: "Allocation de stage Onem (ou Actiris)" },
  { value: "Avance reçue", label: "Avance reçue" },
  { value: "Bonus de démarrage de l'Onem", label: "Bonus de démarrage de l'Onem" },
  { value: "Chèque-repas", label: "Chèque-repas" },
  { value: "Don régulier", label: "Don régulier" },
  { value: "Eco-Chèque", label: "Eco-Chèque" },
  { value: "Flexijob", label: "Flexijob" },
  { value: "Formation en alternance", label: "Formation en alternance" },
  { value: "Impulsion Forem", label: "Impulsion Forem" },
  { value: "Indépendant - Revenus nets", label: "Indépendant - Revenus nets" },
  { value: "Indemnité de préavis (pour le mois concerné)", label: "Indemnité de préavis (pour le mois concerné)" },
  { value: "Montant imposable", label: "Montant imposable" },
  { value: "Montant saisi ou cédé", label: "Montant saisi ou cédé" },
  { value: "PFI - Prime du Forem ou VDAB,...", label: "PFI - Prime du Forem ou VDAB,..." },
  { value: "Revenus d'une activité artistique irrégulière", label: "Revenus d'une activité artistique irrégulière" },
  { value: "Revenus d'une activité artistique régulière", label: "Revenus d'une activité artistique régulière" },
  { value: "Simple pécule de vacances - régime ouvrier", label: "Simple pécule de vacances - régime ouvrier" },
  { value: "Autre", label: "💡 Autre (saisie libre)" },
];

const REVENUS_EXONERES_SUGGESTIONS = [
  { value: "", label: "Sélectionner un type d'exonération..." },
  { value: "Accueillante enfants - frais exposés", label: "Accueillante enfants - frais exposés" },
  { value: "Chèque-repas (part perso)", label: "Chèque-repas (part perso)" },
  { value: "Indemnité à charge employeur", label: "Indemnité à charge employeur" },
  { value: "Indépendant - Cotisations sociales", label: "Indépendant - Cotisations sociales" },
  { value: "Indépendant - Dépenses professionnelles", label: "Indépendant - Dépenses professionnelles" },
  { value: "Montant divers à déduire", label: "Montant divers à déduire" },
  { value: "PFI - Forfait employeur (max 6 mois)", label: "PFI - Forfait employeur (max 6 mois)" },
  { value: "Précompte professionnel", label: "Précompte professionnel" }
];

function RowsTable({ title, comptabiliseRows, exonereRows, onChangeComptabilise, onChangeExonere }) {
  const sumCompt = useMemo(() => (comptabiliseRows || []).reduce((s, r) => s + safeNumber(r.montant, 0), 0), [comptabiliseRows]);
  const sumExon  = useMemo(() => (exonereRows     || []).reduce((s, r) => s + safeNumber(r.montant, 0), 0), [exonereRows]);
  const net = sumCompt - sumExon;

  // ── Comptabilisé ──
  function updateC(i, patch) { onChangeComptabilise(comptabiliseRows.map((r, idx) => idx === i ? { ...r, ...patch } : r)); }
  function addC()    { onChangeComptabilise([...comptabiliseRows, { label: "", customLabel: null, montant: 0 }]); }
  function removeC(i) {
    const next = comptabiliseRows.filter((_, idx) => idx !== i);
    onChangeComptabilise(next.length ? next : [{ label: "", customLabel: null, montant: 0 }]);
  }

  // ── Exonéré ──
  function updateE(i, patch) { onChangeExonere(exonereRows.map((r, idx) => idx === i ? { ...r, ...patch } : r)); }
  function addE()    { onChangeExonere([...exonereRows, { type: "", montant: 0 }]); }
  function removeE(i) {
    const next = exonereRows.filter((_, idx) => idx !== i);
    onChangeExonere(next.length ? next : [{ type: "", montant: 0 }]);
  }

  const colHdr = { display: "grid", gridTemplateColumns: "2fr 1.4fr 40px", gap: 12, marginBottom: 8, padding: "0 4px", fontWeight: 600, fontSize: 14, color: colors.primary };
  const colRow = (i) => ({ display: "grid", gridTemplateColumns: "2fr 1.4fr 40px", gap: 12, marginBottom: 8, padding: "8px 4px", background: i % 2 === 0 ? "#FAFBFC" : "#FFF", borderRadius: 6, alignItems: "start" });
  const trashBtn = (onClick) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <button onClick={onClick} className="btn-remove" style={{ padding: "5px 8px" }}>
        <i className="fas fa-trash" aria-hidden="true" />
      </button>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>

      {/* ── BLOC 1 : Revenus professionnels nets ── */}
      {onChangeComptabilise && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "2px solid #F0F4F8" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.primary }}>{title} — Revenus professionnels nets</h3>
            <button onClick={addC} className="btn-add">+ Ajouter</button>
          </div>
          <div style={colHdr}><div>Type de revenu</div><div>Montant (€/mois)</div><div /></div>
          {(comptabiliseRows || []).map((r, i) => (
            <div key={i} style={colRow(i)}>
              <div style={{ display: "grid", gap: 6 }}>
                <select aria-label="Type de revenu" value={r.customLabel !== undefined && r.customLabel !== null ? "Autre" : (r.label || "")}
                  onChange={(e) => { const v = e.target.value; updateC(i, { label: v, customLabel: v === "Autre" ? "" : null }); }}>
                  {REVENUS_COMPTABILISES_SUGGESTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {r.label === "Autre" && (
                  <input aria-label="Précisez le type de revenu" value={r.customLabel || ""} onChange={(e) => updateC(i, { customLabel: e.target.value })}
                    placeholder="Précisez le type de revenu..."
                    style={{ border: "2px solid #2BEBCE", background: "#F0FFFE" }} />
                )}
              </div>
              <NumInput aria-label="Montant (€/mois)" value={r.montant} onChange={(e) => updateC(i, { montant: safeNumber(e.target.value, 0) })} />
              {trashBtn(() => removeC(i))}
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 4px", background: "#F5F8FA", borderRadius: 6, fontWeight: 600, fontSize: 14 }}>
            Total comptabilisé : <Money value={sumCompt} />/mois
          </div>
        </div>
      )}

      {onChangeExonere && (
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: "2px solid #F0F4F8" }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: colors.primary }}>{title} — Revenus professionnels exonérés</h3>
            <button onClick={addE} className="btn-add">+ Ajouter</button>
          </div>
          <div style={colHdr}><div>Type d'exonération</div><div>Montant exonéré (€/mois)</div><div /></div>
          {(exonereRows || []).map((r, i) => (
            <div key={i} style={colRow(i)}>
              <select aria-label="Type d'exonération" value={r.type || ""} onChange={(e) => updateE(i, { type: e.target.value })}>
                {REVENUS_EXONERES_SUGGESTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <NumInput aria-label="Montant exonéré (€/mois)" value={r.montant} onChange={(e) => updateE(i, { montant: safeNumber(e.target.value, 0) })} />
              {trashBtn(() => removeE(i))}
            </div>
          ))}
          <div style={{ marginTop: 12, padding: "10px 4px", background: "#F5F8FA", borderRadius: 6, fontWeight: 600, fontSize: 14 }}>
            Total exonéré : <Money value={sumExon} />/mois
          </div>
        </div>
      )}

      {onChangeComptabilise && onChangeExonere && (
        <div className="summary-box">
          <div><b>Net mensuel ({title}) :</b> <Money value={net} /></div>
          <div style={{ opacity: 0.75, fontSize: 14 }}>Net annuel : <b><Money value={net * 12} /></b></div>
        </div>
      )}
    </div>
  );
}

const CESSION_TYPE_OPTIONS = [
  "Bien bâti (unique)",
  "Bien non bâti (unique)",
  "Autre bien bâti",
  "Autre bien non bâti",
  "Bien meuble",
];

const CESSION_NATURE_OPTIONS = [
  "Cession à titre onéreux",
  "Cession à titre gratuit",
];

const CESSION_TITRE_OPTIONS = [
  "Pleine Propriété (P.P.)",
  "Nu-propriété (N.P.)",
  "Usufruit",
];

function CessionsBiensTable({ rows, onChangeRows, categorie }) {
  function updateRow(i, patch) {
    onChangeRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { onChangeRows([...rows, defaultCessionRow()]); }
  function removeRow(i) { onChangeRows(rows.filter((_, idx) => idx !== i)); }

  // Calculs détaillés pour chaque cession
  const calculations = useMemo(() => {
    return rows.map((r, i) => ({
      index: i,
      ...r,
      calc: calculateCessionDetailed(r, categorie)
    }));
  }, [rows, categorie]);

  const totaux = useMemo(() => {
    const totalAnnuel = calculations.reduce((sum, c) => 
      sum + (c.calc?.totalRevenu || 0), 0
    );
    return {
      annuel: round2(totalAnnuel),
      mensuel: round2(totalAnnuel / 12)
    };
  }, [calculations]);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: `2px solid #F0F4F8` }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: colors.primary }}>Cessions de biens</h3>
        <button onClick={addRow} className="btn-add">+ Ajouter</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucune cession enregistrée</p>
      ) : (
        <>
          {calculations.map((cession, i) => (
            <div key={i} style={{ 
              border: `1px solid ${colors.border}`,
              borderRadius: 8, 
              padding: 14, 
              marginBottom: 12,
              background: "#FAFBFC"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <strong>Cession #{i + 1}</strong>
                <button
                  onClick={() => removeRow(i)}
                  className="btn-remove"
                  aria-label={`Supprimer cession ${i + 1}`}
                >
                  <i className="fas fa-trash" aria-hidden="true" /> Supprimer
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10, alignItems: "start" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Type de bien</span>
                  <select
                    value={cession.typeBien}
                    onChange={(e) => updateRow(i, { typeBien: e.target.value })}
                    style={{ padding: "6px" }}
                  >
                    <option value="">Choisir...</option>
                    <option value="Bien bâti (unique)">Bien bâti (unique)</option>
                    <option value="Bien non bâti (unique)">Bien non bâti (unique)</option>
                    <option value="Autre bien bâti">Autre bien bâti</option>
                    <option value="Autre bien non bâti">Autre bien non bâti</option>
                    <option value="Bien meuble">Bien meuble</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Valeur vénale (€)</span>
                  <NumInput value={cession.valeurVenale}
                    onChange={(e) => updateRow(i, { valeurVenale: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Part (%)</span>
                  <NumInput value={cession.partConcernee}
                    onChange={(e) => updateRow(i, { partConcernee: safeNumber(e.target.value, 100) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Titre de propriété</span>
                  <select
                    value={cession.titrePropriete}
                    onChange={(e) => updateRow(i, { titrePropriete: e.target.value })}
                    style={{ padding: "6px" }}
                  >
                    <option value="Pleine Propriété (P.P.)">Pleine Propriété (100%)</option>
                    <option value="Nu-propriété (N.P.)">Nu-propriété (60%)</option>
                    <option value="Usufruit">Usufruit (40%)</option>
                  </select>
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Nature de la cession</span>
                  <select
                    value={cession.natureCession || "Cession à titre onéreux"}
                    onChange={(e) => updateRow(i, { natureCession: e.target.value })}
                    style={{ padding: "6px" }}
                  >
                    <option value="Cession à titre onéreux">Cession à titre onéreux</option>
                    <option value="Cession à titre gratuit">Cession à titre gratuit</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Dettes (€)</span>
                  <NumInput
                    value={cession.dettesPersonnelles}
                    onChange={(e) => updateRow(i, { dettesPersonnelles: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                    disabled={cession.natureCession === "Cession à titre gratuit"}
                  />
                  {cession.natureCession === "Cession à titre gratuit" && (
                    <span style={{ fontSize: 14, color: "#666" }}>Non applicable pour cession gratuite</span>
                  )}
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Dispense d'équité (€)</span>
                  <NumInput value={cession.dispenseEquite}
                    onChange={(e) => updateRow(i, { dispenseEquite: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Date cession</span>
                  <input type="date" value={cession.dateCession}
                    onChange={(e) => updateRow(i, { dateCession: e.target.value })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Date prise cours RI</span>
                  <input type="date" value={cession.datePriseCoursRI || cession.datePriseEnCompteRI}
                    onChange={(e) => updateRow(i, { datePriseCoursRI: e.target.value })}
                    style={{ padding: "6px" }} />
                </label>
              </div>

              {/* Détail du calcul */}
              {cession.calc && (
                <div style={{ background: colors.white, padding: 10, borderRadius: 6, border: `1px solid ${colors.border}`, fontSize: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                    <div><strong>Montant vénal:</strong> <Money value={cession.calc.montantVenal} /></div>
                    <div><strong>Tranche immunisée:</strong> <Money value={cession.calc.trancheImmunisee} /></div>
                    <div><strong>Abattement ({cession.calc.nbMois} mois):</strong> <Money value={cession.calc.abattement} /></div>
                    <div><strong>À considérer:</strong> <Money value={cession.calc.montantConsideration} /></div>
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #eee", fontWeight: 600 }}>
                    Revenu annuel: <Money value={cession.calc.totalRevenu} /> | Mensuel: <Money value={cession.calc.totalMensuel} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </>
      )}
      
      <div className="summary-box" style={{ marginTop: 12 }}>
        <div><b>Total annuel : <Money value={totaux.annuel} /></b></div>
        <div><b>Total mensuel : <Money value={totaux.mensuel} /></b></div>
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
  
  const immo = useMemo(() => computeImmoExcel(rows), [rows]);

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: `2px solid #F0F4F8` }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: colors.primary }}>Biens immobiliers</h3>
        <button onClick={addRow} className="btn-add">+ Ajouter</button>
      </div>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.6 }}>Aucun bien immobilier enregistré</p>
      ) : (
        <>
          {rows.map((r, i) => (
            <div key={i} style={{ 
              border: `1px solid ${colors.border}`,
              borderRadius: 8, 
              padding: 14, 
              marginBottom: 12,
              background: "#FAFBFC"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <strong>Bien immobilier #{i + 1}</strong>
                <button
                  onClick={() => removeRow(i)}
                  className="btn-remove"
                  aria-label={`Supprimer bien immobilier ${i + 1}`}
                >
                  <i className="fas fa-trash" aria-hidden="true" /> Supprimer
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, alignItems: "start" }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Type de bien</span>
                  <select
                    value={r.typeBien}
                    onChange={(e) => updateRow(i, { typeBien: e.target.value })}
                    style={{ padding: "6px" }}
                  >
                    <option value="">Choisir...</option>
                    <option value="Bâti">Bien bâti</option>
                    <option value="Non bâti">Bien non bâti</option>
                    <option value="Étranger">Bien étranger</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Localisation</span>
                  <input
                    value={r.localisation}
                    onChange={(e) => updateRow(i, { localisation: e.target.value })}
                    placeholder="Ville, pays..."
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>RC non indexé (€)</span>
                  <NumInput value={r.rcNonIndexe}
                    onChange={(e) => updateRow(i, { rcNonIndexe: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Quote-part (%)</span>
                  <NumInput value={r.quotePart}
                    onChange={(e) => updateRow(i, { quotePart: safeNumber(e.target.value, 50) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Loyer annuel (€)</span>
                  <NumInput value={r.loyerAnnuel}
                    onChange={(e) => updateRow(i, { loyerAnnuel: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Intérêts payés (€)</span>
                  <NumInput value={r.interetsPaye}
                    onChange={(e) => updateRow(i, { interetsPaye: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Rente annuelle (€)</span>
                  <NumInput value={r.renteAnnuelle}
                    onChange={(e) => updateRow(i, { renteAnnuelle: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>Revenu étranger (€)</span>
                  <NumInput value={r.revenuImmoEtranger}
                    onChange={(e) => updateRow(i, { revenuImmoEtranger: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                    disabled={r.typeBien !== "Étranger"} />
                  {r.typeBien !== "Étranger" && (
                    <span style={{ fontSize: 14, color: "#666" }}>Uniquement pour biens étrangers</span>
                  )}
                </label>
              </div>
            </div>
          ))}
        </>
      )}
      
      <div style={{ marginTop: 10, padding: 10, background: "#e8f4f8", borderRadius: 5, border: "1px solid #0066cc" }}>
        <div><b>Biens Immobiliers Bâtis (IB)</b> — Total annuel : <Money value={immo.IB.total} /></div>
        <div style={{ marginTop: 5 }}><b>Biens Immobiliers Non Bâtis (INB)</b> — Total annuel : <Money value={immo.INB.total} /></div>
        <div style={{ marginTop: 5 }}><b>Immeubles étrangers</b> — Total annuel : <Money value={immo.etranger} /></div>
        <div style={{ marginTop: 5, paddingTop: 5, borderTop: "1px solid #0088cc", fontWeight: 700 }}>
          <b>Total mensuel : <Money value={immo.totalMensuel} /></b>
        </div>
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px", fontSize: 14 };
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

function computeRemplacementMonthly({ pensionMensuel, droitPasserelleMensuel, allocationHandicapeMensuel, indemnisation_perte_revenus, autres_revenus, }) {
  return safeNumber(pensionMensuel, 0) + safeNumber(droitPasserelleMensuel, 0) + safeNumber(allocationHandicapeMensuel, 0) + safeNumber(indemnisation_perte_revenus, 0), + safeNumber(autres_revenus, 0);
}
function computeBiensMobiliersExcel({ montantCapital, partConcernee }) {
  const B = safeNumber(montantCapital, 0);
  const C = safeNumber(partConcernee, 100) / 100;

  // D5 / D6 / D7 (Tranches)
  const D5 = B === 0 ? 0 : Math.min(MOB_SEUIL_R, B) * C;
  const D6 = B === 0 ? 0 : (B > MOB_SEUIL_R ? Math.min(MOB_SEUIL_S, B) * C : 0);
  const D7 = B > MOB_SEUIL_S ? B * C : null;

  // E6 / E7 (Revenus)
  const E6 = D6 > D5 ? (D6 - D5) * 0.06 : 0;
  const E7 = D7 !== null ? (D7 - D6) * 0.10 : 0;

  // Total = SUM(E5:E7) avec E5 = 0 dans ton fichier
  const totalAnnuel = E6 + E7;
  return { totalAnnuel, totalMensuel: totalAnnuel / 12, D5, D6, D7, E6, E7 };
}
function daysInMonth(dateISO) {
  const [y, m] = toISODateOnly(dateISO).split("-").map(Number);
  return new Date(y, m, 0).getDate();
}
function sumIrregularArtisticMonthly(rows) {
  // Excel Exoneration!O1 / P1 : SUMPRODUCT(label == "Revenus d'une activité artistique irrégulière") * montant
  // On suppose que tes rows ont { label, montant } (comme ton UI).
  const LABEL = "Revenus d'une activité artistique irrégulière";
  return (rows || []).reduce((s, r) => s + (r.label === LABEL ? safeNumber(r.montant, 0) : 0), 0);
}

function round2n(x) {
  // alias si tu as déjà round2; sinon utilise round2 existant
  return round2(x);
}

function computeExonerationExcel({ dateISO, exo }) {
  const row = vlookupByDateISO(dateISO, EXO_TABLE);
  const dim = daysInMonth(dateISO);

  function calcPerson(p) {
    const jours = safeNumber(p.joursCompteur, 0);
    const prorata = jours > 0 ? (jours / dim) : 1;

    const exoGeneralMens = p.general ? safeNumber(row.generalMensuel, 0) * prorata : 0;
    const exoEtudMens = p.etudiant ? safeNumber(row.etudiantMensuel, 0) * prorata : 0;

    // Penurie = colonne 5 de Données K:O → dans notre table: penurieMensuel
    const exoPenurieMens = p.penurie ? safeNumber(row.penurieMensuel, 0) * prorata : 0;

    // Artiste socio-prof = colonne 3 (annuel) → Excel prend direct annuel si coché
    const exoArtisteAnnuel = p.artisteSP ? safeNumber(row.artistiqueAnnuel, 0) : 0;

    const totalMensuel = -(exoGeneralMens + exoEtudMens + exoPenurieMens) - (exoArtisteAnnuel / 12);
    const totalAnnuel = totalMensuel * 12;

    return {
      exoGeneralMens: -exoGeneralMens,
      exoEtudMens: -exoEtudMens,
      exoPenurieMens: -exoPenurieMens,
      exoArtisteAnnuel: -exoArtisteAnnuel,
      totalMensuel,
      totalAnnuel,
    };
  }

  const dem = calcPerson(exo.demandeur);

  return {
    demandeur: dem,
    totalMensuel: dem.totalMensuel,
    totalAnnuel: dem.totalAnnuel,
  };
}
function Button({ children, onClick, variant = "primary", icon, disabled = false, className = "" }) {
  const styles = {
    primary: {
      background: colors.primary,
      color: colors.white,
      border: "none"
    },
    secondary: {
      background: colors.secondary,
      color: colors.primary,
      border: "none"
    },
    outline: {
      background: "transparent",
      color: colors.primary,
      border: `2px solid ${colors.primary}`
    },
    danger: {
      background: colors.danger,
      color: colors.white,
      border: "none"
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{
        ...styles[variant],
        padding: "10px 20px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "'Source Sans Pro', sans-serif"
      }}
      onMouseOver={(e) => {
        if (!disabled) e.target.style.transform = "translateY(-1px)";
      }}
      onMouseOut={(e) => {
        if (!disabled) e.target.style.transform = "translateY(0)";
      }}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
function Card({ title, children, level = 3, action }) {
  const Tag = `h${level}`;
  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "20px",
      background: colors.white,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: "16px", paddingBottom: "12px", borderBottom: `2px solid #F0F4F8`
      }}>
        <Tag style={{ margin: 0, fontSize: level === 2 ? "20px" : "16px", fontWeight: "700", color: colors.primary }}>
          {title}
        </Tag>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

// Champ numérique : garde le texte brut pendant la frappe (permet "152." ou "1445,"),
// normalise à l'affichage seulement au blur, vide quand valeur = 0.
function NumInput({ value, onChange, style, disabled, placeholder, ...rest }) {
  const [draft, setDraft] = useState(() => (!value && value !== 0) || value === 0 ? "" : String(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) {
      setDraft(value === 0 || value == null ? "" : String(value));
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      placeholder={placeholder}
      style={style}
      disabled={disabled}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        const n = safeNumber(draft, 0);
        setDraft(n === 0 ? "" : String(n));
        if (onChange) onChange({ target: { value: draft } });
      }}
      onChange={(e) => {
        const filtered = e.target.value.replace(/[^0-9.,]/g, '');
        setDraft(filtered);
        if (onChange) onChange({ target: { value: filtered } });
      }}
      {...rest}
    />
  );
}

const numInputStyle = {
  padding: "10px 12px", borderRadius: "8px",
  border: `1px solid ${colors.border}`, fontSize: "14px",
  width: "100%", boxSizing: "border-box",
};

function Input({ label, type = "text", value, onChange, placeholder, hint }) {
  return (
    <Field label={label} hint={hint}>
      {type === "number"
        ? <NumInput value={value} onChange={onChange} placeholder={placeholder} style={numInputStyle} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={numInputStyle} />
      }
    </Field>
  );
}
function Sidebar({ active, onSelect, onNewCalcul, isCollapsed, onToggleCollapse }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <nav style={{
      background: colors.primary,
      borderRadius: "12px",
      padding: isCollapsed ? "16px 8px" : "16px",
      height: "fit-content",
      position: "sticky",
      top: "20px",
      transition: "width 0.3s, padding 0.3s",
      overflow: "hidden"
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px"
      }}>
        {!isCollapsed && (
          <p style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: "700",
            color: "rgba(255,255,255,0.5)",
            textTransform: "uppercase",
            letterSpacing: "1px",
            fontFamily: "'Source Sans Pro', sans-serif"
          }}>
            Navigation
          </p>
        )}
        <button
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? "Déplier le menu" : "Replier le menu"}
          style={{
            background: "rgba(255,255,255,0.1)",
            border: "none",
            color: colors.white,
            cursor: "pointer",
            fontSize: "14px",
            width: 32,
            height: 32,
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            transition: "background 0.2s"
          }}
        >
          {isCollapsed ? (
            <i className="fas fa-chevron-right" aria-hidden="true" />
          ) : (
            <i className="fas fa-chevron-left" aria-hidden="true" />
          )}
        </button>
      </div>

      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px",
            marginBottom: "8px",
            borderRadius: "8px",
            border: "none",
            background: active === s.id ? colors.secondary : "transparent",
            color: active === s.id ? colors.primary : colors.white,
            cursor: "pointer",
            fontFamily: "'Source Sans Pro', sans-serif",
            fontSize: "14px",
            fontWeight: active === s.id ? "600" : "400",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            transition: "all 0.2s"
          }}
        >
          <i className={`fas ${s.icon}`} aria-hidden="true" style={{ width: 20, textAlign: "center", fontSize: 15, flexShrink: 0 }} />
          {!isCollapsed && <span>{s.label}</span>}
        </button>
      ))}

      {/* Bouton Nouveau calcul */}
      <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
        <button
          onClick={onNewCalcul}
          title="Effacer toutes les données et repartir de zéro"
          style={{
            width: "100%",
            padding: isCollapsed ? "10px" : "10px 12px",
            borderRadius: "8px",
            border: "2px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.08)",
            color: colors.white,
            cursor: "pointer",
            fontFamily: "'Source Sans Pro', sans-serif",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: "10px",
            transition: "all 0.2s",
          }}
        >
          <i className="fas fa-rotate-left" aria-hidden="true" style={{ width: 20, textAlign: "center", fontSize: 15, flexShrink: 0 }} />
          {!isCollapsed && <span>Nouveau calcul</span>}
        </button>

        {/* Bouton Plein écran */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? "Quitter le plein écran" : "Afficher en plein écran"}
          style={{
            marginTop: 8,
            width: "100%",
            padding: isCollapsed ? "10px" : "10px 12px",
            borderRadius: "8px",
            border: "2px solid rgba(255,255,255,0.4)",
            background: "rgba(255,255,255,0.08)",
            color: colors.white,
            cursor: "pointer",
            fontFamily: "'Source Sans Pro', sans-serif",
            fontSize: "14px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            gap: "10px",
            transition: "all 0.2s",
          }}
        >
          <i className={`fas ${isFullscreen ? "fa-compress" : "fa-expand"}`} aria-hidden="true" style={{ width: 20, textAlign: "center", fontSize: 15, flexShrink: 0 }} />
          {!isCollapsed && <span>{isFullscreen ? "Quitter plein écran" : "Plein écran"}</span>}
        </button>
      </div>
    </nav>
  );
}

  function computeRIApercuExcel({ dateISO, categorie, C37_totalRessourcesAnnuelles, joursPrisEnCompte }) {
    const riAnnuelBrut = getRIAnnuel(dateISO, categorie); // Informations!F7

    console.log("DEBUG", {
      C37_totalRessourcesAnnuelles,
      riAnnuelBrut,
    });

    const eligible = C37_totalRessourcesAnnuelles < riAnnuelBrut;

    console.log("Eligible:", eligible);

    // C39 = IF(eligible, -HLOOKUP(categorie, Données!Q2:S3, 2, FALSE), "Pas de droit")
    const C39_exoSupplAnnuelle = eligible ? -safeNumber(EXO_SUPPL_ANNUEL[categorie], 0) : 0;

    console.log("C39_exoSupplAnnuelle:", C39_exoSupplAnnuelle);

    // C41 = IF(eligible, IF(C37 + C39 > 0, C37 + C39, 0), "Pas de droit")
    const C41_ressourcesApresExo = Math.max(C37_totalRessourcesAnnuelles + C39_exoSupplAnnuelle, 0);

    console.log("C41_ressourcesApresExo:", C41_ressourcesApresExo);

    // C43 = IF(eligible, riAnnuelBrut - C41, "Pas de droit")
    const C43_riAnnuelNet = eligible ? Math.max(riAnnuelBrut - C41_ressourcesApresExo, 0) : 0;

    console.log("C43_riAnnuelNet:", C43_riAnnuelNet);

    // E45 = IF(eligible, ROUND(C43/12, 2), "Pas de droit")
    const E45_montantMensuel = eligible ? round2(C43_riAnnuelNet / 12) : 0;

    console.log("E45_montantMensuel:", E45_montantMensuel);

    const dim = daysInMonth(dateISO);
    const jp = safeNumber(joursPrisEnCompte, 0);
    const montantMensuelProrata = jp > 0 ? round2((E45_montantMensuel * jp) / (dim || 1)) : E45_montantMensuel;

    return {
      eligible,
      riAnnuelBrut,
      C39_exoSupplAnnuelle,
      C41_ressourcesApresExo,
      C43_riAnnuelNet,
      E45_montantMensuel,
      montantMensuel: E45_montantMensuel,
      montantMensuelProrata,
      joursMois: dim,
      joursPrisEnCompte: jp,
    };
  }
function computeApercuExcelLike({ data, pieces }) {
  const dateISO = data.reference.dateISO || firstOfCurrentMonth();
  const dim = daysInMonth(dateISO);

  // Excel Informations!C18 : jours période (si 0 => mois complet)
  const joursPeriode = safeNumber(data.reference.joursPrisEnCompte, 0);

  const {
    categorie,
    dem,
    chom, mut, rem,
    exo, bm,
    immoTotalAnnuel, cessionsTotalAnnuel,
    avantagesMensuel,
    diversesGenerales, diversesBenevoles,
    cohabitantsMensuel = 0,
    ri, // computeRIApercuExcel(...) output
  } = pieces;

  // ---------- Section Ressources professionnelles ----------
  // Aperçu ligne 4/5: net “brut”
  const D4_netDem_Annuel = round2n(dem.net * 12);

  // Aperçu ligne 6: net après exonérations générales + étudiant + pénurie, plancher à 0
  const exoGenDem  = safeNumber(exo.demandeur?.exoGeneralMens, 0);
  const exoEtudDem = safeNumber(exo.demandeur?.exoEtudMens, 0);
  const exoPenDem  = safeNumber(exo.demandeur?.exoPenurieMens, 0);

  const netAvantExoSP_Dem_M = Math.max(dem.net + exoGenDem + exoEtudDem + exoPenDem, 0);

  const D6_netAvantExoSP_Dem_Annuel = round2n(netAvantExoSP_Dem_M * 12);

  // Aperçu ligne 8: "Montant net (avec exonérations artistique)"
  const artDem = sumIrregularArtisticMonthly(data.revenusNets.demandeur.comptabiliseRows);

  const exoArtDem_Ann = safeNumber(exo.demandeur?.exoArtisteAnnuel, 0);

  const artNetDem_M = Math.max(artDem - (exoArtDem_Ann / 12), 0);

  const netAvecArt_M = round2n(artNetDem_M);
  const D8_netAvecArt_Annuel = round2n(netAvecArt_M * 12);

  // Aperçu ligne 9-11 (chômage/mutuelle/remplacement) : on est déjà en mensuel -> annuel = *12
  const D9_chom_Annuel = round2n(chom.mensuelTotal * 12);
  const D10_mut_Annuel = round2n(mut.mensuelTotal * 12);
  const D11_rem_Annuel = round2n(rem * 12);

  // Aperçu F4 = Total ressources proratisables = SUM(C6:C11)
  const totalProratisables_M =
    netAvantExoSP_Dem_M +
    netAvecArt_M +
    chom.mensuelTotal +
    mut.mensuelTotal +
    rem;

  // F8 = IF(jours=0, ROUND(F4,2), ROUND(jours*F4/dim,2))
const F8_totalProratises_M =
  (joursPeriode === 0)
    ? round2n(totalProratisables_M)
    : round2n((joursPeriode * totalProratisables_M) / (dim || 1));


  // Aperçu ligne 14 : TOTAL des ressources pro ou assimilées (mensuel) = F8 + (Ressources diverses mensuelles)
  const ressourcesDiverses_M = round2n(diversesGenerales + diversesBenevoles);
  const F14_totalRessourcesProAssim_M = round2n(F8_totalProratises_M + ressourcesDiverses_M);

  // F12 = IF(jours=0,0, ROUND( (RI_mensuel_brut) * (jours/dim), 2 ))
  const riMensuelBrut = round2n(getRIAnnuel(dateISO, categorie) / 12);
  const F12_critereRIProrata_M =
    (joursPeriode === 0) ? 0 : round2n(riMensuelBrut * (joursPeriode / (dim || 1)));

  // ---------- Autres sections (mensuel/annuel) ----------
  const D17_diverses_Annuel = round2n(ressourcesDiverses_M * 12);
  const D20_mobiliers_Annuel = round2n(bm.totalAnnuel);
  const D23_immobiliers_Annuel = round2n(immoTotalAnnuel.totalAnnuel);
  const D26_cessions_Annuel = round2n(cessionsTotalAnnuel.totalAnnuel);
  const D29_avantages_Annuel = round2n(avantagesMensuel * 12);
  const D32_cohabitants_Annuel = round2n(cohabitantsMensuel * 12);

  // F14 (mensuel) doit être calculé juste avant
  // C37 = F32 + F29 + F26 + F23 + F20 + (F14*12)
  const C37_totalRessourcesAnnuelles = round2n(
    D32_cohabitants_Annuel +           // Total annuel des cohabitants
    D29_avantages_Annuel +             // Total annuel des avantages
    D26_cessions_Annuel +              // Total annuel des cessions
    D23_immobiliers_Annuel +           // Total annuel des biens immobiliers
    D20_mobiliers_Annuel +             // Total annuel des biens mobiliers
    (F14_totalRessourcesProAssim_M * 12) // Total annuel des ressources professionnelles
  );
  return {
    // expose tout pour affichage
    dateISO,
    dim,
    joursPeriode,

    pro: {
      D4_netDem_Annuel,
      D6_netAvantExoSP_Dem_Annuel,
      D8_netAvecArt_Annuel,
      D9_chom_Annuel, D10_mut_Annuel, D11_rem_Annuel,
      totalProratisables_M,
      F8_totalProratises_M,
      F12_critereRIProrata_M,
      ressourcesDiverses_M,
      F14_totalRessourcesProAssim_M,
    },

    autres: {
      D17_diverses_Annuel,
      D20_mobiliers_Annuel,
      D23_immobiliers_Annuel,
      D26_cessions_Annuel,
      D29_avantages_Annuel,
      D32_cohabitants_Annuel,
    },

    C37_totalRessourcesAnnuelles,

    ri, // contient déjà C39/C41/C43/E45/C52 (montantMensuelProrata etc.)
  };
}

function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Number(`${Math.round(`${x}e+2`)}e-2`);
}

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

  const countRCPos = safeRows.reduce((c, r) => c + (r.rcNonIndexe > 0 ? 1 : 0), 0);

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
function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function asNumOrZero(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Reproduit les colonnes Excel:
 * K = IF(H<>0, H*J, "")
 * L = IF(H<>0, ROUND( (exo x2 selon type)*J / COUNTIF(H19:H39,">0"), 2), "")
 * M = IF(H<>0, IF(K>=L, (K-L)*3,0), "")
 * N = IF(V<>"", IF(V<>"s. o.","voir loyer", M), "")
 * O = IF(E<>"", ROUND(E*J,2), "")
 * P = IF(N<>"voir loyer", IF(E<>"", ROUND(N/2,2),""),"s. o.")
 * Q = IF(P<>"s. o.", IF(E<>"", -MIN(O:P),""),"s.o.")
 * R = IF(F<>"", ROUND(F*J,2), "")
 * S = IF(N<>"voir loyer", IF(F<>"", ROUND(N/2,2),""),"s. o.")
 * T = IF(S<>"s. o.", IF(F<>"", -MIN(R:S),""),"s. o.")
 * U = IF(I<>"", I*J, "s. o.")
 * V = IF(U>M, U, "s. o.")
 */

function coeffTitreExcel(titre) {
  // Excel: HLOOKUP(G, Données!Q16:S17,2)
  // Mapping d’après ta liste
  if (titre === "Usufruit") return 0.4;
  if (titre === "Nu-propriété (N.P.)") return 0.6;
  return 1; // Pleine Propriété (P.P.) par défaut
}

// Excel P:
// MAX(12-1-MONTH(DateCession) + (YEAR(DateRI)-YEAR(DateCession)-1)*12 + MONTH(DateRI),0)
function monthsPExcel(dateCession, dateRI) {
  if (!dateCession || !dateRI) return 0;
  const d = new Date(dateCession);
  const k = new Date(dateRI);
  if (Number.isNaN(d.getTime()) || Number.isNaN(k.getTime())) return 0;

  const dY = d.getUTCFullYear();
  const dM = d.getUTCMonth() + 1;
  const kY = k.getUTCFullYear();
  const kM = k.getUTCMonth() + 1;

  const P = 12 - 1 - dM + (kY - dY - 1) * 12 + kM;
  return Math.max(P, 0);
}


function computeImmoExcel(rows, nbEnfants = 0) {
  const list = (rows || []).map((r) => ({
    type: r.typeBien || "", // "Bâti" | "Non bâti" | "Étranger"
    localisation: r.localisation || "",
    interets: asNumOrZero(r.interetsPaye),
    rente: asNumOrZero(r.renteAnnuelle),
    revEtranger: asNumOrZero(r.revenuImmoEtranger),
    rc: asNumOrZero(r.rcNonIndexe),
    loyer: asNumOrZero(r.loyerAnnuel),
    quote: asNumOrZero(r.quotePart) / 100,
  }));

  const countRCPos = list.reduce((c, r) => c + (r.rc > 0 ? 1 : 0), 0);

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
      totals.rowsDetail.push({ type: r.type, localisation: r.localisation, rc: 0, loyer: 0, quote: r.quote, K: 0, L: 0, M: 0, locatifs: 0, ressources: 0, dedInterets: 0, dedRente: 0, rowAnnuel: revEtr });
      continue;
    }

    const J = r.quote; 
    const H = r.rc;    
    const E = r.interets;
    const F = r.rente;
    const I = r.loyer;

    // Calculs spécifiques à Excel
    const K = H !== 0 ? round2(H * J) : null;
    const exoBase = r.type === "Bâti" ? EXO_BATI : EXO_NON_BATI;
const exoTotal = exoBase + safeNumber(nbEnfants, 0) * 125;
const L = H !== 0 && countRCPos > 0
  ? round2((exoTotal * J) / countRCPos)
  : null;
    const M = H !== 0 && K !== null && L !== null ? (K >= L ? round2((K - L) * 3) : 0) : null;
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
    totals.rowsDetail.push({ type: r.type, localisation: r.localisation, rc: r.rc, loyer: r.loyer, quote: r.quote, K: K ?? 0, L: L ?? 0, M: M ?? 0, locatifs, ressources, dedInterets, dedRente, rowAnnuel: round2(ressources + locatifs + dedInterets + dedRente) });
  }

  totals.IB.total = round2(totals.IB.ressources + totals.IB.dedInterets + totals.IB.dedRente + totals.IB.locatifs);
  totals.INB.total = round2(totals.INB.ressources + totals.INB.dedInterets + totals.INB.dedRente + totals.INB.locatifs);

  totals.etranger = round2(totals.etranger);

  totals.totalAnnuel = round2(totals.IB.total + totals.INB.total + totals.etranger);
  totals.totalMensuel = round2(totals.totalAnnuel / 12);

  return totals;
}
function computeCessionsExcel(rows, montantOAnnuel, trancheImmunisee, seuilR, seuilS) {
  let totalAnnuel = 0;

  for (const r of (rows || [])) {
    const type = r.typeBien || "";
    const E = asNumOrZero(r.valeurVenale);
    if (!E) continue;

    const F = asNumOrZero(r.partConcernee) / 100; 
    const H = asNumOrZero(r.dettesPersonnelles);
    const J = asNumOrZero(r.dispenseEquite);
    const G = r.titrePropriete || "";

    const isUnique = type === "Bien bâti (unique)" || type === "Bien non bâti (unique)";

    // N (tranche immunisée)
    const N = isUnique ? -round2(trancheImmunisee * F) : 0;

    // O (montant annuel cat) est fourni en param
    // P (nbr mois)
    const P = isUnique ? monthsPExcel(r.dateCession, r.datePriseEnCompteRI) : 0;

    // Q = E*F*coeffTitre
    const Q = round2(E * F * coeffTitreExcel(G));

    // S = -ROUND(O*P/12,2)
    const S = isUnique ? -round2((montantOAnnuel * P) / 12) : 0;

    // T = ((Q+N)-H) - (J - S)
    const T = round2((Q + N) - H - (J - S));

    // U, V, W
    const U = T === 0 ? 0 : round2(Math.min(seuilR, T) * F);
    const V = T === 0 ? 0 : (T > seuilR ? round2(Math.min(seuilS, T) * F) : 0);
    const W = T > seuilS ? T : "";

    // X=0
    const X = 0;

    // Y = IF(V>U, ROUND((V-U)*0.06,2),0)
    const Y = V > U ? round2((V - U) * 0.06) : 0;

    // Z = IF(W<>"",(W-V)*0.1,"s. o.")
    const Z = W !== "" ? round2((W - V) * 0.1) : 0;

    // M = SUM(Z,Y,X)
    const M = round2(X + Y + Z);

    totalAnnuel += M;
  }

  return {
    totalAnnuel: round2(totalAnnuel),
    totalMensuel: round2(totalAnnuel / 12),
  };
}

function computeFromForm(data) {
  const categorie =
    data.menage.situation === "isolé" ? 2 :
    data.menage.situation === "cohabitant" ? 1 :
    data.menage.situation === "famille" ? 3 : null;

  if (categorie === null) return null;

  const dateISO = data.reference.dateISO || firstOfCurrentMonth();
  const [yearStr] = dateISO.split("-");
  const year = safeNumber(yearStr, 2026);

  const dem = computeNetMonthly(data.revenusNets.demandeur);
  const chom = computeChomageOrMutuelleMonthly({ ...data.cmr.chomage, year });
  const mut = computeChomageOrMutuelleMonthly({ ...data.cmr.mutuelle, year });
  const rem = computeRemplacementMonthly(data.cmr.remplacement);

  const avantagesMensuel = Object.values(data.avantages).reduce(
    (s, v) => s + safeNumber(v, 0),
    0
  );

  const diversesGenerales = (data.ressourcesDiverses.generales || []).reduce(
    (s, r) => s + safeNumber(r.montant, 0),
    0
  );
  const diversesBenevoles = (data.ressourcesDiverses.benevoles || []).reduce(
    (s, r) => s + safeNumber(r.montant, 0),
    0
  );

  // --- Cessions (annuel) - Nouveau calcul détaillé
  const cessionsResult = computeCessionsTotalAnnuel(data.cessionsBiens?.rows || [], categorie);

  // --- Immobiliers (annuel) - Calcul correct avec computeImmoExcel
  const immoTotals = computeImmoExcel(data.biensImmobiliers?.rows || [],
  data.menage.nbEnfants
);
  
  // ✅ bm : adapte selon ton modèle (si tu as déjà computeBiensMobiliersExcel, utilise-le)
  // Sinon, on prend l’objet stocké dans data (au minimum il faut bm.totalAnnuel)
  const bm = computeBiensMobiliersExcel(data.biensMobiliers || { montantCapital: 0, partConcernee: 100 });
  
  // Calcul des cohabitants
  const cohabitantsTotals = computeCohabitantsGrouped(data.cohabitants || { rows: [] }, dateISO);
  // Exonération
  const exo = computeExonerationExcel({ dateISO, exo: data.exoneration });

  // 1) Aperçu SANS RI (pour obtenir C37)
  const apercu0 = computeApercuExcelLike({
    data,
    pieces: {
      categorie,
      dem,
      chom,
      mut,
      rem,
      exo,
      bm,
      immoTotalAnnuel: immoTotals,
      cessionsTotalAnnuel: cessionsResult,
      avantagesMensuel,
      diversesGenerales,
      diversesBenevoles,
      cohabitantsMensuel: cohabitantsTotals.totalMensuel, // ← UTILISER LE TOTAL CALCULÉ
      ri: { montantMensuel: 0 },
    },
  });


  // 2) RI à partir de C37
  const ri = computeRIApercuExcel({
    dateISO,
    categorie,
    C37_totalRessourcesAnnuelles: apercu0.C37_totalRessourcesAnnuelles,
    joursPrisEnCompte: data.reference.joursPrisEnCompte,
  });
  console.log("DEBUG RI", ri);

  // 3) Aperçu final (affichage)
  const apercu = { ...apercu0, ri };

  // NOUVEAU: Retourner aussi les cohabitants
  return {
    ...ri,
    apercu,
    cohabitants: cohabitantsTotals,
    immoDetails: immoTotals,
    cessionsDetails: cessionsResult,
  };
}

// ─── Fiches pratiques CPASConnect ────────────────────────────────────────────
const FICHES_PRATIQUES = {
  // ── En-têtes de sections ──────────────────────────────────────────────────
  revenus_nets:          { titre: "Revenus nets professionnels",                       url:"https://myportal.vandenbroeleconnect.be/contenu/highlights/detail/720858519162603253" },
  cmr:                   { titre: "Chômage / Mutuelle / Remplacement",                 url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684905" },
  cessions_biens:        { titre: "Cession de biens",                                  url: "https://myportal.vandenbroeleconnect.be/contenu/highlights/detail/720858519162603189"},
  biens_immobiliers:     { titre: "Biens immobiliers",                                 url: "https://myportal.vandenbroeleconnect.be/contenu/highlights/detail/720858519162603252" },
  biens_mobiliers:       { titre: "Biens mobiliers",                                   url: "https://myportal.vandenbroeleconnect.be/contenu/highlights/detail/720858519162603251"},
  ressources_diverses:   { titre: "Allocations & ressources diverses",                 url: "https://myportal.vandenbroeleconnect.be/contenu/livres/detail/73184593456853921/#73186792480109584" },
  cohabitants:           { titre: "Revenus des cohabitants",                           url: "https://myportal.vandenbroeleconnect.be/contenu/livres/detail/73184593456853921/#73186792480109642" }, // TODO: remplacer null par l'URL CPASConnect
  // ── Sous-catégories ───────────────────────────────────────────────────────
  date_reference:        { titre: "Date d'octroi / révision",                          url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684669" },
  insertion_sociopro:    { titre: "Montants exonérés — Insertion socioprofessionnelle",url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684907" },
  exo_generale_etudiant: { titre: "Exonération Pro. générale / étudiants",             url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684907" },
  exo_penurie:           { titre: "Exonération Pro. pénurie",                          url: "https://myportal.vandenbroeleconnect.be/perma/149746886634385151" },
  jours_compteur:        { titre: "Jours compteur socioprofessionnel",                 url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684897" },
  chomage:               { titre: "Chômage",                                           url: "https://myportal.vandenbroeleconnect.be/contenu/livres/detail/73184593456853921/#73186792480109597" },
  mutuelle:              { titre: "Mutuelle",                                          url: "https://myportal.vandenbroeleconnect.be/contenu/livres/detail/73184593456853921/#73186792480109597" },
  remplacement:          { titre: "Revenu de remplacement",                            url: "https://myportal.vandenbroeleconnect.be/contenu/livres/detail/73184593456853921/#73186792480109597" },
  handicape_arr:         { titre: "Allocation d'Handicapé ARR",                        url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684880" },
  autre_remplacement:    { titre: "Autre revenu de remplacement",                      url: "https://myportal.vandenbroeleconnect.be/perma/149746886634684904" },
  prise_en_charge:       { titre: "Prise en charge cohabitant",                        url: "https://myportal.vandenbroeleconnect.be/contenu/highlights/detail/720858519162603250" },
};

function FicheBtn({ ficheKey, onOpen }) {
  const fiche = FICHES_PRATIQUES[ficheKey];
  if (!fiche?.url) return null;
  return (
    <button
      onClick={() => onOpen(ficheKey)}
      title={`Fiche pratique : ${fiche.titre}`}
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        fontSize: "14px", color: "#767676", padding: 0, lineHeight: 1,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        minWidth: 24, minHeight: 24,
      }}
    >
      <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
    </button>
  );
}

function FicheModal({ fiche, onClose }) {
  if (!fiche) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        zIndex: 1000, display: "flex", alignItems: "center",
        justifyContent: "center", padding: "20px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "white", borderRadius: "16px",
          width: "min(480px, 95vw)",
          display: "flex", flexDirection: "column", overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.28)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: "#163E67", color: "white",
          borderRadius: "16px 16px 0 0",
        }}>
          <span style={{ fontWeight: 700, fontSize: "15px" }}>Fiche pratique CPASConnect</span>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", color: "white",
              fontSize: "22px", cursor: "pointer", padding: "0 4px", lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
        {/* Corps */}
        <div style={{ padding: "32px 28px", textAlign: "center" }}>
          <div style={{
            fontSize: "40px", marginBottom: "16px", lineHeight: 1,
          }}>📋</div>
          <div style={{
            fontSize: "18px", fontWeight: 700, color: "#163E67", marginBottom: "8px",
          }}>
            {fiche.titre}
          </div>
          <div style={{ fontSize: "14px", color: "#767676", marginBottom: "28px" }}>
            Cette fiche s'ouvre dans CPASConnect.<br />
            Assurez-vous d'être connecté pour y accéder.
          </div>
          <a
            href={fiche.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 28px",
              background: "#163E67", color: "white",
              borderRadius: "8px", textDecoration: "none",
              fontWeight: 700, fontSize: "15px",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => e.currentTarget.style.background = "#0f2d4d"}
            onMouseOut={(e) => e.currentTarget.style.background = "#163E67"}
          >
            Ouvrir dans CPASConnect ↗
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CMRSection — Chômage / Mutuelle / Remplacement (accordéons)
// ─────────────────────────────────────────────────────────────
function AccordionBlock({ open, onToggle, icon, title, ficheKey, openFiche, total, children }) {
  const hasTotal = total != null && total > 0;
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button type="button" onClick={onToggle} style={{
        width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 16px", background: open ? "#EEF4FA" : colors.white,
        border: "none", cursor: "pointer", fontFamily: "'Source Sans Pro', sans-serif",
        borderBottom: open ? `1px solid ${colors.border}` : "none",
      }}>
        <span style={{ fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 8 }}>
          {icon && <i className={`fas ${icon}`} style={{ fontSize: 14, opacity: 0.65 }} aria-hidden="true" />}
          {title}
          {ficheKey && openFiche && <FicheBtn ficheKey={ficheKey} onOpen={openFiche} />}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hasTotal
            ? <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, background: "#dbeafe", borderRadius: 20, padding: "2px 10px" }}><Money value={total} />/mois</span>
            : <span style={{ fontSize: 14, color: colors.textLight, fontStyle: "italic" }}>non saisi</span>
          }
          <i className={`fas fa-chevron-${open ? "up" : "down"}`} style={{ fontSize: 14, color: colors.textLight }} aria-hidden="true" />
        </span>
      </button>
      {open && <div style={{ padding: 16 }}>{children}</div>}
    </div>
  );
}

function CMRSection({ cmr, dateISO, setCmr, openFiche, embedded = false }) {
  const year = parseInt((dateISO || "2025-01-01").split("-")[0]) || 2025;

  const chomCalc = computeChomageOrMutuelleMonthly({ ...cmr.chomage, year });
  const mutCalc  = computeChomageOrMutuelleMonthly({ ...cmr.mutuelle, year });
  const chomTotal = round2(chomCalc.mensuelTotal);
  const mutTotal  = round2(mutCalc.mensuelTotal);
  const remTotal  = round2(
    safeNumber(cmr.remplacement.pensionMensuel, 0) +
    safeNumber(cmr.remplacement.droitPasserelleMensuel, 0) +
    safeNumber(cmr.remplacement.allocationHandicapeMensuel, 0) +
    safeNumber(cmr.remplacement.indemnisation_perte_revenus, 0) +
    safeNumber(cmr.remplacement.autres_revenus, 0)
  );
  const totalMois = round2(chomTotal + mutTotal + remTotal);

  const [openChom, setOpenChom] = useState(() => chomTotal > 0);
  const [openMut,  setOpenMut]  = useState(() => mutTotal > 0);
  const [openRem,  setOpenRem]  = useState(() => remTotal > 0);

  function setChom(patch) { setCmr({ ...cmr, chomage:      { ...cmr.chomage,      ...patch } }); }
  function setMut(patch)  { setCmr({ ...cmr, mutuelle:     { ...cmr.mutuelle,     ...patch } }); }
  function setRem(patch)  { setCmr({ ...cmr, remplacement: { ...cmr.remplacement, ...patch } }); }

  const blockStyle = { border: `1px solid ${colors.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 0 };
  const hdrStyle   = (isOpen) => ({
    width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", background: isOpen ? "#EEF4FA" : colors.white,
    border: "none", cursor: "pointer", fontFamily: "'Source Sans Pro', sans-serif",
    borderBottom: isOpen ? `1px solid ${colors.border}` : "none",
    transition: "background 0.15s",
  });
  const badge = (total) => total > 0
    ? <span style={{ fontSize: 14, fontWeight: 700, color: colors.primary, background: "#dbeafe", borderRadius: 20, padding: "2px 10px" }}><Money value={total} />/mois</span>
    : <span style={{ fontSize: 14, color: colors.textLight, fontStyle: "italic" }}>non saisi</span>;

  const inner = (
    <div style={{ display: "grid", gap: 8 }}>
      {/* ── Chomage ── */}
      <div style={blockStyle}>
        <button type="button" style={hdrStyle(openChom)} onClick={() => setOpenChom(v => !v)}>
          <span style={{ fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fas fa-circle-minus" style={{ fontSize: 14, opacity: 0.6 }} aria-hidden="true" />
            Chômage
            <FicheBtn ficheKey="chomage" onOpen={openFiche} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge(chomTotal)}
            <i className={`fas fa-chevron-${openChom ? "up" : "down"}`} style={{ fontSize: 14, color: colors.textLight }} aria-hidden="true" />
          </span>
        </button>
        {openChom && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Input label="Montant mensuel réel" type="number" value={cmr.chomage.mensuelReel}
                onChange={(e) => setChom({ mensuelReel: safeNumber(e.target.value, 0) })} />
              <Input label="Montant/jour (sur 26 jours)" type="number" value={cmr.chomage.montantJour26}
                onChange={(e) => setChom({ montantJour26: safeNumber(e.target.value, 0) })} />
              <Input label="Montant/jour (annuel)" type="number" value={cmr.chomage.montantJourAnnuel}
                onChange={(e) => setChom({ montantJourAnnuel: safeNumber(e.target.value, 0) })} />
            </div>
            {chomTotal > 0 && (
              <div style={{ marginTop: 10, fontSize: 14, color: colors.primary, fontWeight: 600 }}>
                → <Money value={chomTotal} />/mois
                {chomCalc.daysPaid > 0 && <span style={{ fontWeight: 400, color: colors.textLight, marginLeft: 6 }}>({chomCalc.daysPaid} jours payés en {year})</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Mutuelle ── */}
      <div style={blockStyle}>
        <button type="button" style={hdrStyle(openMut)} onClick={() => setOpenMut(v => !v)}>
          <span style={{ fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fas fa-circle-plus" style={{ fontSize: 14, opacity: 0.6 }} aria-hidden="true" />
            Mutuelle
            <FicheBtn ficheKey="mutuelle" onOpen={openFiche} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge(mutTotal)}
            <i className={`fas fa-chevron-${openMut ? "up" : "down"}`} style={{ fontSize: 14, color: colors.textLight }} aria-hidden="true" />
          </span>
        </button>
        {openMut && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Input label="Montant mensuel réel" type="number" value={cmr.mutuelle.mensuelReel}
                onChange={(e) => setMut({ mensuelReel: safeNumber(e.target.value, 0) })} />
              <Input label="Montant/jour (sur 26 jours)" type="number" value={cmr.mutuelle.montantJour26}
                onChange={(e) => setMut({ montantJour26: safeNumber(e.target.value, 0) })} />
              <Input label="Montant/jour (annuel)" type="number" value={cmr.mutuelle.montantJourAnnuel}
                onChange={(e) => setMut({ montantJourAnnuel: safeNumber(e.target.value, 0) })} />
            </div>
            {mutTotal > 0 && (
              <div style={{ marginTop: 10, fontSize: 14, color: colors.primary, fontWeight: 600 }}>
                → <Money value={mutTotal} />/mois
                {mutCalc.daysPaid > 0 && <span style={{ fontWeight: 400, color: colors.textLight, marginLeft: 6 }}>({mutCalc.daysPaid} jours payés en {year})</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Remplacement ── */}
      <div style={blockStyle}>
        <button type="button" style={hdrStyle(openRem)} onClick={() => setOpenRem(v => !v)}>
          <span style={{ fontWeight: 700, color: colors.primary, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fas fa-circle-dot" style={{ fontSize: 14, opacity: 0.6 }} aria-hidden="true" />
            Remplacement
            <FicheBtn ficheKey="remplacement" onOpen={openFiche} />
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {badge(remTotal)}
            <i className={`fas fa-chevron-${openRem ? "up" : "down"}`} style={{ fontSize: 14, color: colors.textLight }} aria-hidden="true" />
          </span>
        </button>
        {openRem && (
          <div style={{ padding: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
              <Input label="Pension (€/mois)" type="number" value={cmr.remplacement.pensionMensuel}
                onChange={(e) => setRem({ pensionMensuel: safeNumber(e.target.value, 0) })} />
              <Input label="Droit passerelle (€/mois)" type="number" value={cmr.remplacement.droitPasserelleMensuel}
                onChange={(e) => setRem({ droitPasserelleMensuel: safeNumber(e.target.value, 0) })} />
              <Input label={<span style={{ display: "flex", alignItems: "center", gap: 6 }}>Allocation handicap ARR (€/mois)<FicheBtn ficheKey="handicape_arr" onOpen={openFiche} /></span>}
                type="number" value={cmr.remplacement.allocationHandicapeMensuel}
                onChange={(e) => setRem({ allocationHandicapeMensuel: safeNumber(e.target.value, 0) })} />
              <Input label="Indemnisation perte de revenus (€/mois)" type="number" value={cmr.remplacement.indemnisation_perte_revenus}
                onChange={(e) => setRem({ indemnisation_perte_revenus: safeNumber(e.target.value, 0) })} />
              <Input label={<span style={{ display: "flex", alignItems: "center", gap: 6 }}>Autre revenu de remplacement (€/mois)<FicheBtn ficheKey="autre_remplacement" onOpen={openFiche} /></span>}
                type="number" value={cmr.remplacement.autres_revenus}
                onChange={(e) => setRem({ autres_revenus: safeNumber(e.target.value, 0) })} />
            </div>
            {remTotal > 0 && (
              <div style={{ marginTop: 10, fontSize: 14, color: colors.primary, fontWeight: 600 }}>
                {"->"} <Money value={remTotal} />/mois
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return inner;
  return (
    <section style={{ display: "grid", gap: 10 }}>
      <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
        Chômage / Mutuelle / Remplacement
        <FicheBtn ficheKey="cmr" onOpen={openFiche} />
      </h2>
      {totalMois > 0 && (
        <div className="summary-box">
          <b>Total CMR mensuel : <Money value={totalMois} /></b>
          <span style={{ marginLeft: 16, opacity: 0.7, fontSize: 14 }}>
            {chomTotal > 0 && `Chômage ${round2(chomTotal)} €`}
            {chomTotal > 0 && (mutTotal > 0 || remTotal > 0) && " · "}
            {mutTotal  > 0 && `Mutuelle ${round2(mutTotal)} €`}
            {mutTotal  > 0 && remTotal > 0 && " · "}
            {remTotal  > 0 && `Remplacement ${round2(remTotal)} €`}
          </span>
        </div>
      )}
      {inner}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// RevenusDemandeurPage
// ─────────────────────────────────────────────────────────────

function RevenusDemandeurPage({ data, setData, openFiche }) {
  const dateISO   = data.reference.dateISO || firstOfCurrentMonth();
  const categorie = data.menage.situation === "isolé" ? 2 : data.menage.situation === "cohabitant" ? 1 : 3;

  const demNet    = round2(computeNetMonthly(data.revenusNets.demandeur).net);

  const year      = parseInt(dateISO.split("-")[0]) || 2025;
  const chomTotal = round2(computeChomageOrMutuelleMonthly({ ...data.cmr.chomage, year }).mensuelTotal);
  const mutTotal  = round2(computeChomageOrMutuelleMonthly({ ...data.cmr.mutuelle, year }).mensuelTotal);
  const remTotal  = round2(
    safeNumber(data.cmr.remplacement.pensionMensuel, 0) +
    safeNumber(data.cmr.remplacement.droitPasserelleMensuel, 0) +
    safeNumber(data.cmr.remplacement.allocationHandicapeMensuel, 0) +
    safeNumber(data.cmr.remplacement.indemnisation_perte_revenus, 0) +
    safeNumber(data.cmr.remplacement.autres_revenus, 0)
  );
  const cmrTotal  = round2(chomTotal + mutTotal + remTotal);
  const exoCalc   = computeExonerationExcel({ dateISO, exo: data.exoneration });
  const exoTotal  = round2(exoCalc.totalMensuel);
  const exonereRowsTotal = round2((data.revenusNets.demandeur.exonereRows || []).reduce((s, r) => s + safeNumber(r.montant, 0), 0));
  const divTotal  = round2(
    data.ressourcesDiverses.generales.reduce((s, r) => s + safeNumber(r.montant, 0), 0) +
    data.ressourcesDiverses.benevoles.reduce((s, r) => s + safeNumber(r.montant, 0), 0)
  );
  const avTotal   = round2(Object.values(data.avantages).reduce((s, v) => s + safeNumber(v, 0), 0));
  const cesTotal  = round2(computeCessionsTotalAnnuel(data.cessionsBiens.rows, categorie).totalMensuel);
  const immoTotal = round2(computeImmoExcel(data.biensImmobiliers.rows, data.menage.nbEnfants).totalMensuel);
  const bmTotal   = round2(computeBiensMobiliersExcel(data.biensMobiliers).totalMensuel);

  const [open, setOpen] = useState(() => ({
    pro_dem:   demNet > 0,
    cmr:       cmrTotal > 0,
    exo:       exoTotal > 0 || exonereRowsTotal > 0,
    diverses:  divTotal > 0,
    avantages: avTotal > 0,
    cessions:  data.cessionsBiens.rows.length > 0,
    immo:      data.biensImmobiliers.rows.length > 0,
    mob:       data.biensMobiliers.montantCapital > 0,
  }));
  const tog = (key) => setOpen(s => ({ ...s, [key]: !s[key] }));

  const AB = (key, icon, title, fiche, total, children) => (
    <AccordionBlock key={key} open={open[key]} onToggle={() => tog(key)}
      icon={icon} title={title} ficheKey={fiche} openFiche={openFiche} total={total}>
      {children}
    </AccordionBlock>
  );

  return (
    <section style={{ display: "grid", gap: 8 }}>
      <h2 style={{ marginTop: 0 }}>Revenus du demandeur</h2>

      {/* Revenus professionnels nets - Demandeur */}
      {AB("pro_dem", "fa-briefcase", "Revenus professionnels nets", "revenus_nets", demNet,
        <RowsTable
          title="Demandeur"
          comptabiliseRows={data.revenusNets.demandeur.comptabiliseRows}
          onChangeComptabilise={(rows) => setData(d => ({ ...d, revenusNets: { ...d.revenusNets, demandeur: { ...d.revenusNets.demandeur, comptabiliseRows: rows } } }))}
        />
      )}

      {/* CMR */}
      {AB("cmr", "fa-file-medical", "Chomage / Mutuelle / Remplacement", "cmr", cmrTotal,
        <CMRSection embedded
          cmr={data.cmr}
          dateISO={dateISO}
          setCmr={(cmr) => setData(d => ({ ...d, cmr }))}
          openFiche={openFiche}
        />
      )}

      {/* Exonerations */}
      {AB("exo", "fa-percent", "Exonerations", "insertion_sociopro", exonereRowsTotal,
        <>
          {/* ── Exonérations sur revenus (Art. 34) ── */}
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, marginBottom: 10 }}>
            Exonérations sur revenus (Art. 34)
          </div>
          <RowsTable
            title="Demandeur"
            exonereRows={data.revenusNets.demandeur.exonereRows}
            onChangeExonere={(rows) => setData(d => ({ ...d, revenusNets: { ...d.revenusNets, demandeur: { ...d.revenusNets.demandeur, exonereRows: rows } } }))}
          />

          {/* ── Exonérations socio-professionnelles (Art. 35) ── */}
          <div style={{ fontWeight: 700, fontSize: 14, color: colors.primary, marginTop: 20, marginBottom: 10 }}>
            Exonérations socio-professionnelles (Art. 35)
          </div>
          {exoTotal < 0 && (
            <div className="summary-box" style={{ marginBottom: 14 }}>
              <b>Total exoneration mensuelle : <Money value={exoTotal} /></b>
              <span style={{ marginLeft: 12, opacity: 0.7, fontSize: 14 }}>(annuel : <Money value={exoCalc.totalAnnuel} />)</span>
            </div>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            {[
              { key: "general",   label: "Exonération générale",   fk: "exo_generale_etudiant" },
              { key: "etudiant",  label: "Exonération étudiants",  fk: "exo_generale_etudiant" },
              { key: "penurie",   label: "Exonération métiers en pénurie",    fk: "exo_penurie" },
              { key: "artisteSP", label: "Activite artistique socio-prof." },
            ].map(({ key, label: lbl, fk }) => (
              <label key={key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                <input type="checkbox"
                  checked={!!data.exoneration.demandeur[key]}
                  onChange={(e) => setData(d => ({ ...d, exoneration: { ...d.exoneration, demandeur: { ...d.exoneration.demandeur, [key]: e.target.checked } } }))} />
                {lbl}
                {fk && <FicheBtn ficheKey={fk} onOpen={openFiche} />}
              </label>
            ))}
            <Field label={<span style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>Jours (si compteur dépassé)<FicheBtn ficheKey="jours_compteur" onOpen={openFiche} /></span>}>
              <NumInput value={data.exoneration.demandeur.joursCompteur}
                onChange={(e) => setData(d => ({ ...d, exoneration: { ...d.exoneration, demandeur: { ...d.exoneration.demandeur, joursCompteur: safeNumber(e.target.value, 0) } } }))} />
            </Field>
          </div>
        </>
      )}

      {/* Ressources diverses */}
      {AB("diverses", "fa-chart-bar", "Allocations & ressources diverses", "ressources_diverses", divTotal,
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: colors.primary, marginBottom: 8 }}>Ressources generales</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
              {data.ressourcesDiverses.generales.map((r, i) => (
                <Input key={i} label={r.label} type="number" value={r.montant} hint="€ / mois"
                  onChange={(e) => {
                    const next = [...data.ressourcesDiverses.generales];
                    next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                    setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, generales: next } }));
                  }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: colors.primary, marginBottom: 8 }}>Benevoles</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
              {data.ressourcesDiverses.benevoles.map((r, i) => (
                <Input key={i} label={r.label} type="number" value={r.montant} hint="€ / mois"
                  onChange={(e) => {
                    const next = [...data.ressourcesDiverses.benevoles];
                    next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                    setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, benevoles: next } }));
                  }} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Avantages en nature */}
      {AB("avantages", "fa-house-user", "Avantages en nature", "avantages", avTotal,
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <Input label="Charges locatives par un tiers (€/mois)" type="number" value={data.avantages.chargesLocativesTiers}
            onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, chargesLocativesTiers: safeNumber(e.target.value, 0) } }))} />
          <Input label="Loyer fictif (professionnel) (€/mois)" type="number" value={data.avantages.loyerFictifProfessionnel}
            onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifProfessionnel: safeNumber(e.target.value, 0) } }))} />
          <Input label="Loyer fictif (simulateur / grille) (€/mois)" type="number" value={data.avantages.loyerFictifSimulateur}
            onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifSimulateur: safeNumber(e.target.value, 0) } }))} />
          <Input label="Pret hypothecaire par un tiers (€/mois)" type="number" value={data.avantages.pretHypothecaireTiers}
            onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, pretHypothecaireTiers: safeNumber(e.target.value, 0) } }))} />
        </div>
      )}

      {/* Cessions de biens */}
      {AB("cessions", "fa-building", "Cessions de biens", "cessions_biens", cesTotal,
        <CessionsBiensTable
          rows={data.cessionsBiens.rows}
          categorie={categorie}
          onChangeRows={(rows) => setData(d => ({ ...d, cessionsBiens: { rows } }))} />
      )}

      {/* Biens immobiliers */}
      {AB("immo", "fa-house", "Biens immobiliers", "biens_immobiliers", immoTotal,
        <BiensImmobiliersTable
          rows={data.biensImmobiliers.rows}
          onChangeRows={(rows) => setData(d => ({ ...d, biensImmobiliers: { rows } }))} />
      )}

      {/* Biens mobiliers */}
      {AB("mob", "fa-coins", "Biens mobiliers", "biens_mobiliers", bmTotal, (() => {
        const bm = computeBiensMobiliersExcel(data.biensMobiliers);
        const B  = safeNumber(data.biensMobiliers.montantCapital, 0);
        return (
          <div className="card" style={{ padding: 16 }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 700, color: colors.primary, paddingBottom: 12, borderBottom: "2px solid #F0F4F8" }}>
              Demandeur — Biens mobiliers
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
              <Input label="Capital (euro)" type="number" value={data.biensMobiliers.montantCapital}
                onChange={(e) => setData(d => ({ ...d, biensMobiliers: { ...d.biensMobiliers, montantCapital: safeNumber(e.target.value, 0) } }))} />
              <Input label="Part concernee (%)" type="number" value={data.biensMobiliers.partConcernee}
                onChange={(e) => setData(d => ({ ...d, biensMobiliers: { ...d.biensMobiliers, partConcernee: safeNumber(e.target.value, 100) } }))} />
            </div>
            {B > 0 && (
              <div style={{ fontSize: 14, color: colors.textLight }}>
                <div>inférieur ou égal {MOB_SEUIL_R.toLocaleString("fr-BE")} euro : exonéré</div>
                {B > MOB_SEUIL_R && <div>{MOB_SEUIL_R.toLocaleString("fr-BE")} - {MOB_SEUIL_S.toLocaleString("fr-BE")} euro x 6% = <strong><Money value={bm.E6} /></strong>/an</div>}
                {B > MOB_SEUIL_S && <div>sup. {MOB_SEUIL_S.toLocaleString("fr-BE")} euro x 10% = <strong><Money value={bm.E7} /></strong>/an</div>}
                <div style={{ fontWeight: 700, color: colors.primary, marginTop: 4 }}>Total : <Money value={bm.totalAnnuel} />/an - <Money value={bm.totalMensuel} />/mois</div>
              </div>
            )}
          </div>
        );
      })())}

    </section>
  );
}

export default function App() {
  const [active, setActive] = useState("informations");
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => { window.scrollTo({ top: 0 }); }, [active]);
  const [data, setData] = useState(defaultData); // Une seule déclaration ici
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [ficheOuverte, setFicheOuverte] = useState(null);
  const openFiche = (key) => { const f = FICHES_PRATIQUES[key]; if (f?.url) setFicheOuverte(f); };

  const handleExportPDF = async () => {
    if (!result || !apercu) {
      alert("Veuillez d'abord calculer l'aperçu avant d'exporter");
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      const success = await generatePDF(data, result, apercu);
      
      if (!success) {
        alert("Une erreur est survenue lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Erreur d'export PDF:", error);
      alert("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  // Fonction de réinitialisation
  const handleReset = () => {
    if (window.confirm("Êtes-vous sûr de vouloir réinitialiser toutes les données ?")) {
      setData(defaultData);
      setActive("informations");
      alert("Données réinitialisées avec succès !");
    }
  };
  const result = useMemo(() => {
    return computeFromForm(data);  // Assure-toi que computeFromForm est une fonction qui prend `data` en paramètre et renvoie les résultats attendus
  }, [
    data.reference, 
    data.identite, 
    data.menage, 
    data.revenusNets, 
    data.cmr, 
    data.avantages, 
    data.cessionsBiens, 
    data.biensImmobiliers,
    data.cohabitants, // ← AJOUTER CE CHAMP
    data.biensMobiliers, // ← AJOUTER CE CHAMP
    data.exoneration, // ← AJOUTER CE CHAMP
    data.ressourcesDiverses // ← AJOUTER CE CHAMP
  ]); 
  // Utilise uniquement les champs nécessaires
  const apercu = result?.apercu;

  return (
    <div className="app-layout-wrapper">
      <div className="app-layout" style={{ gridTemplateColumns: isNavCollapsed ? "64px 1fr" : "260px 1fr" }}>
        <Sidebar active={active} onSelect={setActive} onNewCalcul={handleReset} isCollapsed={isNavCollapsed} onToggleCollapse={() => setIsNavCollapsed(c => !c)} />

        <main className="app-main">
          {active === "informations" && (
            <div style={{ display: "grid", gap: "24px" }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, fontSize: 20, fontWeight: 800, color: colors.primary }}>Informations</h2>
              {/* Carte Référence */}
              <Card title="Référence">
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px"
                }}>
                  <Input
                    label={
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Date d'octroi / révision
                        <FicheBtn ficheKey="date_reference" onOpen={openFiche} />
                      </span>
                    }
                    type="date"
                    value={data.reference.dateISO}
                    onChange={(e) => setData(d => ({ ...d, reference: { ...d.reference, dateISO: e.target.value } }))}
                  />
                </div>
              </Card>

              {/* Carte Identité */}
              <Card title="Identité">
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: "16px"
                }}>
                  <Input
                    label="Nom"
                    value={data.identite.nom}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, nom: e.target.value } }))}
                  />
                  <Input
                    label="Prénom"
                    value={data.identite.prenom}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, prenom: e.target.value } }))}
                  />
                  <Input
                    label="Date de naissance"
                    type="date"
                    value={data.identite.dateNaissance}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, dateNaissance: e.target.value } }))}
                  />
                  
                </div>
              </Card>

              {/* Carte Ménage */}
               <Card title="Ménage">
                 <div style={{ display: "grid", gap: "16px" }}>

                   {/* Sélecteur situation familiale */}
                   <div>
                     <span style={{ fontSize: 14, opacity: 0.85 }}>
                       Situation familiale <span style={{ color: "#BF2222", fontWeight: 700 }}>*</span>
                     </span>
                     <div style={{
                       display: "grid",
                       gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                       gap: 10,
                       marginTop: 8,
                       borderRadius: 10,
                       outline: !data.menage.situation ? "2px solid #e74c3c" : "none",
                       outlineOffset: 4,
                     }}>
                       {[
                         {
                           value: "cohabitant",
                           cat: "Cat. 1",
                           label: "Cohabitant",
                           desc: "Personne qui partage un logement et met en commun ses dépenses quotidiennes avec une ou plusieurs autres personnes majeures (partenaire, colocataire, parents)."
                         },
                         {
                           value: "isolé",
                           cat: "Cat. 2",
                           label: "Isolé",
                           desc: " Personne célibataire, veuve, divorcée ou séparée vivant seule, ou personne vivant avec d'autres adultes mais sans partager les dépenses avec eux"
                         },
                         {
                           value: "famille",
                           cat: "Cat. 3",
                           label: "Famille avec charge",
                           desc: "Personne (isolée ou cohabitante) qui subvient seule aux besoins d'un ou plusieurs enfants mineurs célibataires vivant sous le même toit et économiquement à sa charge."
                         }
                       ].map(opt => {
                         const selected = data.menage.situation === opt.value;
                         return (
                           <button
                             key={opt.value}
                             onClick={() => setData(d => ({ ...d, menage: { ...d.menage, situation: opt.value } }))}
                             style={{
                               border: `2px solid ${selected ? colors.primary : colors.border}`,
                               borderRadius: 10,
                               padding: "12px 10px",
                               background: selected ? "#EEF4FA" : colors.white,
                               cursor: "pointer",
                               textAlign: "left",
                               transition: "all 0.2s",
                               fontFamily: "'Source Sans Pro', sans-serif"
                             }}
                           >
                             <div style={{
                               fontSize: 14, fontWeight: 700,
                               color: selected ? colors.primary : colors.textMuted,
                               textTransform: "uppercase", letterSpacing: 1,
                               marginBottom: 4
                             }}>
                               {opt.cat}
                             </div>
                             <div style={{
                               fontSize: 14, fontWeight: 700,
                               color: selected ? colors.primary : colors.text,
                               marginBottom: 6
                             }}>
                               {opt.label}
                             </div>
                             <div style={{ fontSize: 14, color: colors.textLight, lineHeight: 1.5 }}>
                               {opt.desc}
                             </div>
                           </button>
                         );
                       })}
                     </div>
                     {!data.menage.situation && (
                       <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, color: "#BF2222", fontSize: 14, fontWeight: 600 }}>
                         <i className="fas fa-circle-exclamation" aria-hidden="true" />
                         Veuillez sélectionner une situation familiale pour continuer.
                       </div>
                     )}
                   </div>

                   <Input
                     label="Nombre d'enfants à charge"
                     type="number"
                     min="0"
                     value={data.menage.nbEnfants}
                     onChange={(e) => setData(d => ({ ...d, menage: { ...d.menage, nbEnfants: safeNumber(e.target.value, 0) } }))}
                   />
                 </div>
               </Card>
            </div>
          )}

          {active === "revenus_demandeur" && (
            <RevenusDemandeurPage data={data} setData={setData} openFiche={openFiche} />
          )}

          {active === "cohabitants" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
                Revenus des cohabitants
                <FicheBtn ficheKey="cohabitants" onOpen={openFiche} />
              </h2>
              <CohabitantsTable
                cohabitants={data.cohabitants}
                referenceDate={data.reference.dateISO}
                onChangeCohabitants={(cohabitants) => setData(d => ({ ...d, cohabitants }))}
                categorieDemandeur={data.menage.situation === "isolé" ? 2 : data.menage.situation === "cohabitant" ? 1 : data.menage.situation === "famille" ? 3 : null}
                onOpenFiche={openFiche}
              />
            </section>
          )}

         {active === "apercu" && (
          <section style={{ display: "grid", gap: 12 }}>
            {!result && (
              <div className="alert alert--warning" style={{ fontSize: 15 }}>
                <i className="fas fa-circle-exclamation" aria-hidden="true" />
                <span>
                  Veuillez d'abord sélectionner une <strong>situation familiale</strong> dans l'onglet <strong>Référence & ménage</strong> pour calculer le droit au RI.
                </span>
              </div>
            )}
            {/* Titre et bouton d'export */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <h2 style={{ marginTop: 0, marginBottom: 0 }}>Aperçu</h2>
                {result && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 14px", borderRadius: 20, fontWeight: 700, fontSize: 14,
                    background: result.apercu?.ri?.eligible ? "#e6f2ee" : "#fde8e8",
                    color: result.apercu?.ri?.eligible ? "#067A57" : "#BF2222",
                    border: `1.5px solid ${result.apercu?.ri?.eligible ? "#9fcfbc" : "#f5a0a0"}`,
                  }}>
                    <i className={`fas fa-${result.apercu?.ri?.eligible ? "circle-check" : "circle-xmark"}`} aria-hidden="true" />
                    {result.apercu?.ri?.eligible ? "Éligible au RI" : "Non éligible au RI"}
                  </span>
                )}
              </div>
              
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <button
                  onClick={handleExportPDF}
                  disabled={isGeneratingPDF}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "10px 20px",
                    background: isGeneratingPDF ? "#ccc" : colors.primary,
                    color: "white", border: "none", borderRadius: "8px",
                    cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                    fontWeight: "600", fontSize: "14px",
                    fontFamily: "'Source Sans Pro', sans-serif", transition: "all 0.2s"
                  }}
                  onMouseOver={(e) => { if (!isGeneratingPDF) e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseOut={(e)  => { if (!isGeneratingPDF) e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <i className={`fas ${isGeneratingPDF ? "fa-spinner fa-spin" : "fa-file-arrow-down"}`} aria-hidden="true" />
                  {isGeneratingPDF ? "Génération..." : "Exporter en PDF"}
                </button>

              </div>
            </div>

            {result && <div className="card" style={{ padding: 16 }}>
              <hr style={{ margin: "0 0 12px 0" }} />

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#F0F4F8" }}>
                    {["Rubrique", "Mensuel", "Annuel"].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 0 ? "left" : "right", padding: "8px 12px", fontWeight: 700, fontSize: 14, textTransform: "uppercase", letterSpacing: "0.5px", color: "#163E67", borderBottom: "2px solid #163E67" }}>{h}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {/* ── Ressources professionnelles ── */}
                  <Sec>Ressources professionnelles</Sec>
                  <Row label="Revenu net — Demandeur" mensuel={apercu.pro.D4_netDem_Annuel / 12} annuel={apercu.pro.D4_netDem_Annuel} total={apercu.pro.D4_netDem_Annuel} />
                  {apercu.pro.D4_netDem_Annuel > apercu.pro.D6_netAvantExoSP_Dem_Annuel && (
                    <Row neg label="(−) Exonération Art. 35 — Demandeur"
                      mensuel={(apercu.pro.D4_netDem_Annuel - apercu.pro.D6_netAvantExoSP_Dem_Annuel) / 12}
                      annuel={apercu.pro.D4_netDem_Annuel - apercu.pro.D6_netAvantExoSP_Dem_Annuel}
                      total={apercu.pro.D4_netDem_Annuel - apercu.pro.D6_netAvantExoSP_Dem_Annuel}
                    />
                  )}
                  <Row label="Net après exo. Art. 35 — Demandeur" mensuel={apercu.pro.D6_netAvantExoSP_Dem_Annuel / 12} annuel={apercu.pro.D6_netAvantExoSP_Dem_Annuel} total={apercu.pro.D6_netAvantExoSP_Dem_Annuel} />
                  {apercu.pro.D8_netAvecArt_Annuel > 0 && (
                    <Row label="Net avec exo. artistique (demandeur)" mensuel={apercu.pro.D8_netAvecArt_Annuel / 12} annuel={apercu.pro.D8_netAvecArt_Annuel} total={apercu.pro.D8_netAvecArt_Annuel} />
                  )}
                  <Row highlight label="Sous-total revenus professionnels nets" mensuel={apercu.pro.F8_totalProratises_M} annuel={apercu.pro.F8_totalProratises_M * 12} total={apercu.pro.F8_totalProratises_M * 12} />

                  <Gap />

                  {/* ── Allocations & ressources diverses ── */}
                  <Sec>Allocations &amp; ressources diverses</Sec>
                  <Row label="Allocation de chômage"   mensuel={apercu.pro.D9_chom_Annuel / 12}  annuel={apercu.pro.D9_chom_Annuel}  total={apercu.pro.D9_chom_Annuel} />
                  <Row label="Mutuelle"                mensuel={apercu.pro.D10_mut_Annuel / 12}  annuel={apercu.pro.D10_mut_Annuel}  total={apercu.pro.D10_mut_Annuel} />
                  <Row label="Revenus de remplacement" mensuel={apercu.pro.D11_rem_Annuel / 12}  annuel={apercu.pro.D11_rem_Annuel}  total={apercu.pro.D11_rem_Annuel} />
                  <Row label="Allocations & ressources diverses" mensuel={apercu.autres.D17_diverses_Annuel / 12} annuel={apercu.autres.D17_diverses_Annuel} total={apercu.autres.D17_diverses_Annuel} />

                  <Gap />

                  {/* ── Biens mobiliers ── */}
                  <Sec>Biens mobiliers</Sec>
                  <Row label="Montant des biens mobiliers" mensuel={apercu.autres.D20_mobiliers_Annuel / 12} annuel={apercu.autres.D20_mobiliers_Annuel} total={apercu.autres.D20_mobiliers_Annuel} />

                  <Gap />

                  {/* ── Biens immobiliers ── */}
                  <Sec>Biens immobiliers</Sec>
                  <Row label="Montant des biens immobiliers" mensuel={apercu.autres.D23_immobiliers_Annuel / 12} annuel={apercu.autres.D23_immobiliers_Annuel} total={apercu.autres.D23_immobiliers_Annuel} />

                  <Gap />

                  {/* ── Cessions de biens ── */}
                  <Sec>Cessions de biens</Sec>
                  <Row label="Montant total des cessions" mensuel={apercu.autres.D26_cessions_Annuel / 12} annuel={apercu.autres.D26_cessions_Annuel} total={apercu.autres.D26_cessions_Annuel} />

                  <Gap />

                  {/* ── Avantages en nature ── */}
                  <Sec>Avantages en nature</Sec>
                  <Row label="Montant total des avantages en nature" mensuel={apercu.autres.D29_avantages_Annuel / 12} annuel={apercu.autres.D29_avantages_Annuel} total={apercu.autres.D29_avantages_Annuel} />

                  <Gap />

                  {/* ── Cohabitants débiteurs d'aliments ── */}
                  <Sec>Cohabitants — débiteurs d'aliments</Sec>
                  <Row label="Revenus totaux débiteurs (brut annuel)"
                    mensuel={null}
                    annuel={(result.cohabitants?.debiteurs || []).reduce((s, d) => s + safeNumber(d.ressourcesTotale, 0), 0)}
                    total={(result.cohabitants?.debiteurs || []).reduce((s, d) => s + safeNumber(d.ressourcesTotale, 0), 0)}
                  />
                  <Row highlight label="Excédent comptabilisé (au-delà du seuil RI)"
                    mensuel={result.apercu.autres.D32_cohabitants_Annuel > 0 ? result.apercu.autres.D32_cohabitants_Annuel / 12 : null}
                    annuel={result.apercu.autres.D32_cohabitants_Annuel}
                    total={result.apercu.autres.D32_cohabitants_Annuel}
                  />

                  <Gap />

                  {/* ── TOTAL C37 ── */}
                  <Row grand label="TOTAL TOUTES RESSOURCES"
                    mensuel={result.apercu.C37_totalRessourcesAnnuelles / 12}
                    annuel={result.apercu.C37_totalRessourcesAnnuelles}
                    total={result.apercu.C37_totalRessourcesAnnuelles}
                  />

                  <Gap />

                  {/* ── Calcul du droit au RI ── */}
                  <Sec>Calcul du droit au RI</Sec>
                  <Row label={`Seuil RI — Cat. ${data.menage.situation === "isolé" ? "2 (Isolé)" : data.menage.situation === "cohabitant" ? "1 (Cohabitant)" : "3 (Famille)"}`}
                    mensuel={null}
                    annuel={result.apercu.ri.riAnnuelBrut}
                    total={result.apercu.ri.riAnnuelBrut}
                  />
                  <Row highlight label="Total ressources après exonération"
                    mensuel={null}
                    annuel={result.apercu.ri.C41_ressourcesApresExo}
                    total={result.apercu.ri.C41_ressourcesApresExo}
                  />
                  <Row grand label="Revenu d’intégration annuel"
                    mensuel={null}
                    annuel={result.apercu.ri.C43_riAnnuelNet}
                    total={result.apercu.ri.C43_riAnnuelNet}
                  />
                  <Row grand label="Revenu d’intégration mensuel"
                    mensuel={result.apercu.ri.E45_montantMensuel}
                    annuel={result.apercu.ri.C43_riAnnuelNet}
                  />

                  {/* ===== Calcul du RI pour un mois incomplet (Excel) ===== */}
                  <tr>
                    <td colSpan={3} style={{ paddingTop: 16 }}>
                      <div style={{ border: `2px solid ${colors.primary}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>
                          Calcul du revenu d'intégration pour un mois incomplet
                        </div>
                        <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div>Nbre de jours pris en compte dans la période concernée :</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <NumInput
                                aria-label="Nombre de jours pris en compte"
                                style={{ width: 70, padding: "6px 8px" }}
                                value={data.reference.joursPrisEnCompte}
                                onChange={(e) =>
                                  setData((prev) => ({
                                    ...prev,
                                    reference: {
                                      ...prev.reference,
                                      joursPrisEnCompte: safeNumber(e.target.value, 0),
                                    },
                                  }))
                                }
                              />
                              <span>sur</span>
                              <input
                                aria-label="Nombre de jours dans le mois (automatique)"
                                style={{ width: 70, padding: "6px 8px", background: "#f5f5f5" }}
                                type="number"
                                value={result.apercu.ri.joursMois}
                                readOnly
                              />
                              <span>jours</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                            <div style={{ fontWeight: 700 }}>
                              Revenu d'intégration mensuel en tenant compte du nombre de jours
                            </div>
                            <div style={{ fontSize: 16, fontWeight: 900 }}>
                              <Money value={result.apercu.ri.montantMensuelProrata} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>}

          {/* ── Autres cohabitants — informatif uniquement, après le tableau ── */}
          {result && (result.cohabitants?.autresCohabitants || []).length > 0 && (
            <div className="card" style={{ padding: 16, borderLeft: "4px solid #f0d060", background: "#fdf6e3" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b8860b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Autres cohabitants — à titre informatif (non comptabilisés dans le RIS)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "4px 8px", color: "#7a6000", fontWeight: 600 }}>Cohabitant</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", color: "#7a6000", fontWeight: 600 }}>Mensuel</th>
                    <th style={{ textAlign: "right", padding: "4px 8px", color: "#7a6000", fontWeight: 600 }}>Annuel</th>
                  </tr>
                </thead>
                <tbody>
                  {result.cohabitants.autresCohabitants.map((d, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f0d060" }}>
                      <td style={{ padding: "5px 8px", color: "#7a6000" }}>
                        {d.nom || "Cohabitant"} <span style={{ fontStyle: "italic" }}>(Autre — seuil : <Money value={safeNumber(d.seuilRI, 0)} />/an)</span>
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#7a6000" }}>
                        <Money value={round2(safeNumber(d.ressourcesTotale, 0) / 12)} />
                      </td>
                      <td style={{ padding: "5px 8px", textAlign: "right", color: "#7a6000" }}>
                        <Money value={safeNumber(d.ressourcesTotale, 0)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          </section>
        )}
        </main>
      </div>
      <FicheModal fiche={ficheOuverte} onClose={() => setFicheOuverte(null)} />
    </div>
  );
}
