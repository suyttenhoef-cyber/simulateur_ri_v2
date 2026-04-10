import { useMemo, useState } from "react";
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

// ── Injecter Source Sans Pro si pas déjà présent ──
if (!document.getElementById('ssp-cdn')) {
  const link = document.createElement('link');
  link.id = 'ssp-cdn';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700;800&display=swap';
  document.head.appendChild(link);
}

// ── Composant Topbar CPASConnect ──
function Topbar() {
  const handleRefresh = () => {
    if (!window.confirm("Toutes les données non sauvegardées seront perdues. Continuer ?")) return;
    window.location.reload();
  };

  const handleFullscreen = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el);
  };

  const topbarStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    background: "linear-gradient(135deg, #163E67 0%, #234268 100%)",
    borderRadius: "12px",
    padding: "14px 24px",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
    flexWrap: "wrap",
    gap: "10px",
    fontFamily: "'Source Sans Pro', -apple-system, sans-serif",
    marginBottom: "10px",
  };

  const brandStyle = { display: "flex", alignItems: "center", gap: "14px", position: "relative", zIndex: 1 };
  const logoStyle = { height: "32px", filter: "brightness(0) invert(1)", display: "block" };
  const sepStyle = { width: "1px", height: "28px", background: "rgba(255,255,255,.2)", flexShrink: 0 };
  const titlesH1 = { color: "#fff", fontSize: "16px", fontWeight: 800, margin: "0 0 2px", lineHeight: 1.2 };
  const titlesP = { color: "rgba(255,255,255,.75)", fontSize: "12px", fontWeight: 500, margin: 0 };
  const actionsStyle = { display: "flex", alignItems: "center", gap: "8px", position: "relative", zIndex: 1 };

  const btnBase = {
    display: "inline-flex", alignItems: "center", gap: "7px",
    padding: "8px 16px", borderRadius: "8px",
    fontFamily: "'Source Sans Pro', sans-serif", fontSize: "13px", fontWeight: 700,
    cursor: "pointer", border: "none", transition: "all .18s ease",
    textDecoration: "none", whiteSpace: "nowrap", lineHeight: 1,
  };
  const btnGhost = { ...btnBase, background: "rgba(255,255,255,.12)", color: "#fff", border: "1px solid rgba(255,255,255,.22)" };
  const btnAccent = { ...btnBase, background: "#2BEBCE", color: "#163E67", boxShadow: "0 2px 10px rgba(43,235,206,.3)" };

  const infoBarStyle = {
    display: "flex", alignItems: "center", gap: "10px",
    background: "#fff", border: "1px solid #E1E8ED", borderLeft: "4px solid #2BEBCE",
    borderRadius: "8px", padding: "10px 16px", marginBottom: "10px",
    fontSize: "14px", color: "#384142",
    fontFamily: "'Source Sans Pro', -apple-system, sans-serif",
  };

  return (
    <>
      <header style={topbarStyle}>
        {/* Halo décoratif */}
        <div style={{
          position: "absolute", right: -30, top: -40,
          width: 180, height: 180, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(43,235,206,.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={brandStyle}>
          <img
            src="https://www.cpasconnect.be/img/cpasconnect/logo.svg"
            alt="CPASConnect"
            style={logoStyle}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.nextSibling.style.display = "flex";
            }}
          />
          {/* Fallback texte si le logo ne charge pas */}
          <div style={{ display: "none", alignItems: "center", gap: 6, color: "#fff", fontSize: 15, fontWeight: 800 }}>
            <span style={{ background: "#2BEBCE", color: "#163E67", borderRadius: 5, padding: "2px 7px", fontSize: 13 }}>CPAS</span>
            Connect
          </div>
          <div style={sepStyle} />
          <div>
            <h1 style={titlesH1}>Simulateur de Revenu d'Intégration</h1>
            <p style={titlesP}>Bibliothèque digitale pour les CPAS · Calcul local et sécurisé</p>
          </div>
        </div>
        <div style={actionsStyle}>
          <button style={btnGhost} onClick={handleRefresh} type="button" aria-label="Rafraîchir le simulateur">
            <i className="fas fa-sync-alt" aria-hidden="true" />
            <span>Rafraîchir</span>
          </button>
          <button style={btnAccent} onClick={handleFullscreen} type="button" aria-label="Afficher en plein écran">
            <i className="fas fa-expand" aria-hidden="true" />
            <span>Plein écran</span>
          </button>
        </div>
      </header>
      <div style={infoBarStyle}>
        <i className="fas fa-info-circle" style={{ color: "#1BC9B0", fontSize: 14, flexShrink: 0 }} aria-hidden="true" />
        <span><strong style={{ color: "#2C3E50" }}>Outil d'aide à la décision.</strong> Les résultats sont indicatifs et doivent être validés par les services compétents du CPAS.</span>
      </div>
    </>
  );
}

// Palette de couleurs
const colors = {
  primary: "#163E67",      // Bleu foncé
  secondary: "#2BEBCE",    // Turquoise
  tertiary: "#234268",     // Bleu moyen
  background: "#F5F8FA",
  white: "#FFFFFF",
  text: "#2C3E50",
  textLight: "#7F8C8D",
  border: "#E1E8ED",
  success: "#2BEBCE",
  danger: "#E74C3C"
};
function computeCohabitantsMonthly(rows) {
  return rows.reduce((acc, row) => acc + safeNumber(row.mensuel, 0), 0);
}
function Row({ label, mensuel, annuel, total, highlight = false }) {
  const renderMoney = (v) => {
    if (v === null || v === undefined) return "";
    return <Money value={v} />;
  };

  const cellStyle = {
    padding: "6px 8px",
    ...(highlight && {
      color: "#163E67",
      fontStyle: "italic",
      fontWeight: 700,
      background: "#EEF4FA",
      borderTop: "1px solid #C5D8EE",
      borderBottom: "1px solid #C5D8EE",
    }),
  };

  return (
    <tr>
      <td style={cellStyle}>{label}</td>
      <td style={{ ...cellStyle, textAlign: "right" }}>{renderMoney(mensuel)}</td>
      <td style={{ ...cellStyle, textAlign: "right" }}>{renderMoney(annuel)}</td>
      <td style={{ ...cellStyle, textAlign: "right" }}>{renderMoney(total)}</td>
    </tr>
  );
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
  { id: "informations",      label: "Informations",         icon: "fa-address-card" },
  { id: "revenus_nets",      label: "Revenus nets",          icon: "fa-sack-dollar" },
  { id: "cmr",               label: "Chômage / Mutuelle",   icon: "fa-file-medical" },
  { id: "avantages",         label: "Avantages en nature",  icon: "fa-house-user" },
  { id: "cessions_biens",    label: "Cessions",             icon: "fa-building" },
  { id: "biens_mobiliers",   label: "Biens mobiliers",      icon: "fa-coins" },
  { id: "biens_immobiliers", label: "Immobiliers",          icon: "fa-house" },
  { id: "ressources_diverses", label: "Ressources diverses", icon: "fa-chart-bar" },
  { id: "exoneration",       label: "Exonération",          icon: "fa-shield-halved" },
  { id: "cohabitants",       label: "Revenus cohabitants",  icon: "fa-people-group" },
  { id: "apercu",            label: "Aperçu",               icon: "fa-table-list" },
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

const defaultCohabitantRow = () => ({
  nom: "",
  type: "Ascendants/descendant majeur",
  ressourcesTotale: 0,
  priseEnCharge: "Non",
  typeReport: "Report max",
  pctReport: 30,
  categorie: 1
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
    conjoint: {
      general: false,     // Excel H5
      etudiant: false,    // Excel H6
      penurie: false,     // Excel H7
      joursCompteur: 0,   // Excel H8
      artisteSP: false,   // Excel H11
    },
  },
  cohabitants: {
    rows: [defaultCohabitantRow()] // ← CHANGER de [] à [defaultCohabitantRow()]
  },
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
// =====================
// Paramètres Excel (onglet Données)
// =====================

// VLOOKUP Données!A2:D (montant du RI annuel) : date -> [cat1, cat2, cat3]

const RI_ANNUEL_TABLE = [
  { date: "2023-01-01", cat1: 9713.04, cat2: 14569.58, cat3: 19690.01 },
  { date: "2023-07-01", cat1: 9907.30, cat2: 14860.96, cat3: 20083.80 },
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
  
  const tranche1 = montantConsideration === 0 ? 0 : round2(Math.min(SEUIL_CESSION_T1, montantConsideration) * part);
  const tranche2 = montantConsideration > SEUIL_CESSION_T1 ? round2(Math.min(SEUIL_CESSION_T2, montantConsideration) * part) : 0;
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
function computeNetMonthly(rows) {
  const sumC = rows.reduce((acc, r) => acc + safeNumber(r.comptabilise, 0), 0);
  const sumE = rows.reduce((acc, r) => acc + safeNumber(r.exonere, 0), 0);
  return { sumComptabilise: sumC, sumExonere: sumE, net: sumC - sumE };
}
// 1. Ajouter la fonction de calcul pour un cohabitant individuel
function computeCohabitantRow(row, referenceDate) {
  const ressourcesTotale = safeNumber(row.ressourcesTotale, 0);
  const categorie = row.categorie || 1;
  
  // I5: VLOOKUP pour obtenir le seuil RI selon la catégorie
  const seuilRI = getRIAnnuel(referenceDate, categorie);
  
  // J5: Calcul de l'excédent
  let excedent = 0;
  let message = "";
  
  if (ressourcesTotale > seuilRI) {
    excedent = ressourcesTotale - seuilRI;
  } else {
    message = "Le cohabitant a possiblement droit au RI";
  }
  
  // K5: Montant mensuel (si excédent)
  const montantMensuel = excedent > 0 ? round2(excedent / 12) : 0;
  
  // L5: Ressources prorata selon Excel formule =SI(OU(F5=Données!$U$15;F5=Données!$U$16);K5;K5*F5)
  // F5 = pctReport, Données!$U$15 = "Oui", Données!$U$16 = "Non"
  let ressourcesProrata = 0;
  let montantReporte = 0; // ← AJOUTER CETTE LIGNE
  
  if (row.priseEnCharge === "Oui" || row.priseEnCharge === "Non") {
    ressourcesProrata = montantMensuel;
    montantReporte = montantMensuel; // ← AJOUTER CETTE LIGNE
  } else if (row.priseEnCharge === "MAX") {
    ressourcesProrata = round2(montantMensuel * (row.pctReport / 100));
    montantReporte = round2(montantMensuel * (row.pctReport / 100)); // ← AJOUTER CETTE LIGNE
  }
  
  return {
    ...row,
    seuilRI,
    excedent,
    montantMensuel,
    ressourcesProrata,
    montantReporte, // ← AJOUTER CETTE LIGNE
    message
  };
}

// 2. Fonction pour calculer le total des cohabitants
function computeCohabitantsTotal(rows, referenceDate) {
  if (!rows || rows.length === 0) {
    return { totalAnnuel: 0, totalMensuel: 0, details: [] };
  }
  
  const details = rows.map(row => computeCohabitantRow(row, referenceDate));
  // Utiliser montantReporte au lieu de ressourcesProrata
  const totalMensuel = details.reduce((sum, row) => sum + row.montantReporte, 0);
  
  return {
    totalAnnuel: round2(totalMensuel * 12),
    totalMensuel: round2(totalMensuel),
    details
  };
}

// 3. Composant CohabitantsTable (inspiré de BiensImmobiliersTable)
function CohabitantsTable({ rows, onChangeRows, referenceDate }) {
  const totals = useMemo(() => 
    computeCohabitantsTotal(rows, referenceDate), 
    [rows, referenceDate]
  );

  function updateRow(i, patch) {
    onChangeRows(rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }
  function addRow() { onChangeRows([...rows, defaultCohabitantRow()]); }
  function removeRow(i) { onChangeRows(rows.filter((_, idx) => idx !== i)); }

  return (
    <Card title="Revenus des cohabitants">
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
                    aria-label={`Supprimer cohabitant ${i + 1}`}
                  >
                    <i className="fas fa-trash" aria-hidden="true" /> Supprimer
                  </button>
                </div>
              }>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                  <Input label="Nom" value={r.nom}
                    onChange={(e) => updateRow(i, { nom: e.target.value })}
                    placeholder="Nom du cohabitant" />
                  <Input label="Type" type="select" value={r.type}
                    onChange={(e) => updateRow(i, { type: e.target.value })}>
                    <option value="Ascendants/descendant majeur">Ascendants/descendant majeur</option>
                    <option value="Conjoint">Conjoint</option>
                    <option value="Autre">Autre</option>
                  </Input>
                  <Input label="Ressources totales (€/an)" type="number" value={r.ressourcesTotale}
                    onChange={(e) => updateRow(i, { ressourcesTotale: safeNumber(e.target.value, 0) })} />
                  <Input label="Prise en charge" type="select" value={r.priseEnCharge}
                    onChange={(e) => updateRow(i, { priseEnCharge: e.target.value })}>
                    <option value="Non">Non</option>
                    <option value="Oui">Oui</option>
                    <option value="MAX">MAX</option>
                  </Input>
                  <Input label="Type de report" type="select" value={r.typeReport}
                    onChange={(e) => updateRow(i, { typeReport: e.target.value })}>
                    <option value="Report max">Report max</option>
                    <option value="Partenaire">Partenaire</option>
                  </Input>
                  <Input label="% Report" type="number" value={r.pctReport}
                    onChange={(e) => updateRow(i, { pctReport: safeNumber(e.target.value, 30) })}
                    min="0" max="100" />
                  <Input label="Catégorie" type="select" value={r.categorie}
                    onChange={(e) => updateRow(i, { categorie: parseInt(e.target.value) })}>
                    <option value={1}>1 - Cohabitant</option>
                    <option value={2}>2 - Isolé</option>
                    <option value={3}>3 - Famille</option>
                  </Input>
                </div>

                <div className="summary-box" style={{ marginTop: 10, fontSize: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                    <div><strong>Seuil RI (catégorie {calc.categorie}):</strong> <Money value={calc.seuilRI} /></div>
                    <div><strong>Excédent:</strong> <Money value={calc.excedent} /></div>
                    <div><strong>Montant mensuel:</strong> <Money value={calc.montantMensuel} /></div>
                    <div><strong>Montant reporté:</strong> <Money value={calc.montantReporte} /></div>
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

      {/* Totaux — à l'intérieur du return, après la liste */}
      <div className="summary-box" style={{ marginTop: 12 }}>
        <div><b>Total annuel des cohabitants : <Money value={totals.totalAnnuel} /></b></div>
        <div><b>Total mensuel des cohabitants : <Money value={totals.totalMensuel} /></b></div>
      </div>

      <button onClick={addRow} className="btn-add">
        + Ajouter un cohabitant
      </button>
    </Card>
  );
}
// Listes officielles des revenus
const REVENUS_COMPTABILISES_SUGGESTIONS = [
  { value: "", label: "Sélectionner un type de revenu..." },
  { value: "Accueillante enfants - revenu brut", label: "Accueillante enfants - revenu brut" },
  { value: "Allocation de formation Forem, VDAB ou Actiris", label: "Allocation de formation Forem, VDAB ou Actiris" },
  { value: "Allocation de stage d'insertion", label: "Allocation de stage d'insertion" },
  { value: "Allocation de stage Onem (ou Actiris)", label: "Allocation de stage Onem (ou Actiris)" },
  { value: "Avance reçue", label: "Avance reçue" },
  { value: "Bonus de démarrage de l'Onem", label: "Bonus de démarrage de l'Onem" },
  { value: "Chèque-repas (part patronale)", label: "Chèque-repas (part patronale)" },
  { value: "Chèque-repas (valeur faciale)", label: "Chèque-repas (valeur faciale)" },
  { value: "Eco-Chèque", label: "Eco-Chèque" },
  { value: "Flexijob", label: "Flexijob" },
  { value: "Formation en alternance", label: "Formation en alternance" },
  { value: "Impulsion Forem", label: "Impulsion Forem" },
  { value: "Indépendant - Revenus nets", label: "Indépendant - Revenus nets" },
  { value: "Indemnité de préavis (pour le mois concerné)", label: "Indemnité de préavis (pour le mois concerné)" },
  { value: "Montant imposable", label: "Montant imposable" },
  { value: "Montant net versé", label: "Montant net versé" },
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

  function handleLabelChange(i, value) {
    updateRow(i, { label: value, customLabel: value === "Autre" ? "" : null });
  }

  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, paddingBottom: 12, borderBottom: `2px solid #F0F4F8` }}>
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: colors.primary }}>{title}</h3>
        <button onClick={addRow} className="btn-add">+ Ajouter</button>
      </div>

      {/* En-têtes de colonnes */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1.2fr 2fr 1.2fr 40px",
        gap: "12px",
        marginBottom: "12px",
        padding: "0 4px",
        fontWeight: "600",
        fontSize: "13px",
        color: "#163E67"
      }}>
        <div>Type de revenu comptabilisé</div>
        <div>Montant comptabilisé (€/mois)</div>
        <div>Type de revenu exonéré</div>
        <div>Montant exonéré (€/mois)</div>
        <div></div>
      </div>

      {/* Lignes de données */}
      {rows.map((r, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 2fr 1.2fr 40px",
            gap: "12px",
            marginBottom: "12px",
            padding: "8px 4px",
            background: i % 2 === 0 ? "#FAFBFC" : "#FFFFFF",
            borderRadius: "6px",
            alignItems: "start"
          }}
        >
          {/* Colonne 1: Type de revenu comptabilisé */}
          <div style={{ display: "grid", gap: "6px" }}>
            <select
              value={r.customLabel !== undefined && r.customLabel !== null ? "Autre" : r.label}
              onChange={(e) => handleLabelChange(i, e.target.value)}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "13px",
                fontFamily: "'Source Sans Pro', sans-serif"
              }}
            >
              {REVENUS_COMPTABILISES_SUGGESTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            
            {r.label === "Autre" && (
              <input
                value={r.customLabel || ""}
                onChange={(e) => updateRow(i, { customLabel: e.target.value })}
                placeholder="Précisez le type de revenu..."
                style={{
                  width: "100%",
                  padding: "8px",
                  borderRadius: "6px",
                  border: "2px solid #2BEBCE",
                  fontSize: "13px",
                  fontFamily: "'Source Sans Pro', sans-serif",
                  background: "#F0FFFE"
                }}
              />
            )}
          </div>

          {/* Colonne 2: Montant comptabilisé */}
          <div>
            <input
              type="number"
              value={r.comptabilise}
              onChange={(e) => updateRow(i, { comptabilise: safeNumber(e.target.value, 0) })}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "13px",
                fontFamily: "'Source Sans Pro', sans-serif"
              }}
            />
          </div>

          {/* Colonne 3: Type de revenu exonéré */}
          <div style={{ display: "grid", gap: "6px" }}>
            <select
              value={r.exonereType || ""}
              onChange={(e) => updateRow(i, { exonereType: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #E1E8ED",
                fontSize: "12px",
                fontFamily: "'Source Sans Pro', sans-serif",
                color: "#7F8C8D",
                background: "#FAFBFC"
              }}
            >
              {REVENUS_EXONERES_SUGGESTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Colonne 4: Montant exonéré */}
          <div>
            <input
              type="number"
              value={r.exonere}
              onChange={(e) => updateRow(i, { exonere: safeNumber(e.target.value, 0) })}
              placeholder="0.00"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "13px",
                fontFamily: "'Source Sans Pro', sans-serif"
              }}
            />
          </div>

          {/* Colonne 5: Bouton suppression */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <button
              onClick={() => removeRow(i)}
              className="btn-remove"
              aria-label="Supprimer cette ligne"
              style={{ padding: "5px 8px" }}
            >
              <i className="fas fa-trash" aria-hidden="true" />
            </button>
          </div>
        </div>
      ))}

      {/* Footer avec totaux */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "3.2fr 2fr 1.2fr 40px",
        gap: "12px",
        marginTop: "16px",
        padding: "12px 4px",
        background: "#F5F8FA",
        borderRadius: "6px",
        fontWeight: "600",
        fontSize: "14px"
      }}>
        <div>Net mensuel</div>
        <div></div>
        <div style={{ color: "#163E67", fontSize: "15px" }}>
          <Money value={totals.net} />
        </div>
        <div></div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "3.2fr 2fr 1.2fr 40px",
        gap: "12px",
        marginTop: "8px",
        padding: "12px 4px",
        background: "#E8EFF5",
        borderRadius: "6px",
        fontWeight: "600",
        fontSize: "14px"
      }}>
        <div>Net annuel</div>
        <div></div>
        <div style={{ color: "#163E67", fontSize: "15px" }}>
          <Money value={totals.net * 12} />
        </div>
        <div></div>
      </div>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Type de bien</span>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Valeur vénale (€)</span>
                  <input type="number" value={cession.valeurVenale}
                    onChange={(e) => updateRow(i, { valeurVenale: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Part (%)</span>
                  <input type="number" value={cession.partConcernee}
                    onChange={(e) => updateRow(i, { partConcernee: safeNumber(e.target.value, 100) })}
                    style={{ padding: "6px" }} min="0" max="100" />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Titre de propriété</span>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Nature de la cession</span>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Dettes (€)</span>
                  <input 
                    type="number" 
                    value={cession.dettesPersonnelles}
                    onChange={(e) => updateRow(i, { dettesPersonnelles: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px", opacity: cession.natureCession === "Cession à titre gratuit" ? 0.5 : 1 }}
                    disabled={cession.natureCession === "Cession à titre gratuit"}
                  />
                  {cession.natureCession === "Cession à titre gratuit" && (
                    <span style={{ fontSize: 11, color: "#666" }}>Non applicable pour cession gratuite</span>
                  )}
                </label>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Dettes (€)</span>
                  <input type="number" value={cession.dettesPersonnelles}
                    onChange={(e) => updateRow(i, { dettesPersonnelles: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Dispense d'équité (€)</span>
                  <input type="number" value={cession.dispenseEquite}
                    onChange={(e) => updateRow(i, { dispenseEquite: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Date cession</span>
                  <input type="date" value={cession.dateCession}
                    onChange={(e) => updateRow(i, { dateCession: e.target.value })}
                    style={{ padding: "6px" }} />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Date prise cours RI</span>
                  <input type="date" value={cession.datePriseCoursRI || cession.datePriseEnCompteRI}
                    onChange={(e) => updateRow(i, { datePriseCoursRI: e.target.value })}
                    style={{ padding: "6px" }} />
                </label>
              </div>

              {/* Détail du calcul */}
              {cession.calc && (
                <div style={{ background: colors.white, padding: 10, borderRadius: 6, border: `1px solid ${colors.border}`, fontSize: 12 }}>
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

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Type de bien</span>
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
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Localisation</span>
                  <input
                    value={r.localisation}
                    onChange={(e) => updateRow(i, { localisation: e.target.value })}
                    placeholder="Ville, pays..."
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>RC non indexé (€)</span>
                  <input
                    type="number"
                    value={r.rcNonIndexe}
                    onChange={(e) => updateRow(i, { rcNonIndexe: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Quote-part (%)</span>
                  <input
                    type="number"
                    value={r.quotePart}
                    onChange={(e) => updateRow(i, { quotePart: safeNumber(e.target.value, 50) })}
                    style={{ padding: "6px" }}
                    min="0"
                    max="100"
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Loyer annuel (€)</span>
                  <input
                    type="number"
                    value={r.loyerAnnuel}
                    onChange={(e) => updateRow(i, { loyerAnnuel: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Intérêts payés (€)</span>
                  <input
                    type="number"
                    value={r.interetsPaye}
                    onChange={(e) => updateRow(i, { interetsPaye: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Rente annuelle (€)</span>
                  <input
                    type="number"
                    value={r.renteAnnuelle}
                    onChange={(e) => updateRow(i, { renteAnnuelle: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Revenu étranger (€)</span>
                  <input
                    type="number"
                    value={r.revenuImmoEtranger}
                    onChange={(e) => updateRow(i, { revenuImmoEtranger: safeNumber(e.target.value, 0) })}
                    style={{ padding: "6px" }}
                    disabled={r.typeBien !== "Étranger"}
                  />
                  {r.typeBien !== "Étranger" && (
                    <span style={{ fontSize: 11, color: "#666" }}>Uniquement pour biens étrangers</span>
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
  return { totalAnnuel, totalMensuel: totalAnnuel / 12 };
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
  const conj = calcPerson(exo.conjoint);

  return {
    demandeur: dem,
    conjoint: conj,
    totalMensuel: dem.totalMensuel + conj.totalMensuel,
    totalAnnuel: (dem.totalMensuel + conj.totalMensuel) * 12,
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
function Card({ title, children, level = 3 }) {
  const Tag = `h${level}`;
  return (
    <div style={{
      border: `1px solid ${colors.border}`,
      borderRadius: "12px",
      padding: "20px",
      background: colors.white,
      boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
    }}>
      <Tag style={{
        marginTop: 0,
        marginBottom: "16px",
        fontSize: level === 2 ? "20px" : "16px",
        fontWeight: "700",
        color: colors.primary,
        paddingBottom: "12px",
        borderBottom: `2px solid #F0F4F8`
      }}>
        {title}
      </Tag>
      {children}
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder, hint }) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          padding: "10px 12px",
          borderRadius: "8px",
          border: `1px solid ${colors.border}`,
          fontSize: "14px",
          width: "100%",
          boxSizing: "border-box"
        }}
      />
    </Field>
  );
}
function Sidebar({ active, onSelect }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <nav style={{
      background: colors.primary,
      borderRadius: "12px",
      padding: isCollapsed ? "16px 8px" : "16px",
      height: "fit-content",
      position: "sticky",
      top: "20px",
      transition: "all 0.3s"
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
            fontSize: "11px",
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
          onClick={() => setIsCollapsed(!isCollapsed)}
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
  const dateISO = data.reference.dateISO || "2025-02-01";
  const dim = daysInMonth(dateISO);

  // Excel Informations!C18 : jours période (si 0 => mois complet)
  const joursPeriode = safeNumber(data.reference.joursPrisEnCompte, 0);

  const {
    categorie,
    dem, conj,
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
  const D5_netConj_Annuel = round2n(conj.net * 12);

  // Aperçu ligne 6/7: net après exonérations générales + pénurie (Exoneration!N1/L1), plancher à 0
  const exoGenDem = safeNumber(exo.demandeur?.exoGeneralMens, 0);
  const exoPenDem = safeNumber(exo.demandeur?.exoPenurieMens, 0);
  const exoGenConj = safeNumber(exo.conjoint?.exoGeneralMens, 0);
  const exoPenConj = safeNumber(exo.conjoint?.exoPenurieMens, 0);

  const netAvantExoSP_Dem_M = Math.max(dem.net + exoGenDem + exoPenDem, 0);
  const netAvantExoSP_Conj_M = Math.max(conj.net + exoGenConj + exoPenConj, 0);
  console.log("DEBUG NET AVANT EXO", {
  net: dem.net,
  exoGenDem,
  exoPenDem,
  netAvant: netAvantExoSP_Dem_M
});

  const D6_netAvantExoSP_Dem_Annuel = round2n(netAvantExoSP_Dem_M * 12);
  const D7_netAvantExoSP_Conj_Annuel = round2n(netAvantExoSP_Conj_M * 12);

  // Aperçu ligne 8: "Montant net (avec exonérations artistique)"
  const artDem = sumIrregularArtisticMonthly(data.revenusNets.demandeur.rows);
  const artConj = data.revenusNets.conjoint.enabled ? sumIrregularArtisticMonthly(data.revenusNets.conjoint.rows) : 0;

  const exoArtDem_Ann = safeNumber(exo.demandeur?.exoArtisteAnnuel, 0); // positif chez toi
  const exoArtConj_Ann = safeNumber(exo.conjoint?.exoArtisteAnnuel, 0);

  const artNetDem_M = Math.max(artDem - (exoArtDem_Ann / 12), 0);
  const artNetConj_M = Math.max(artConj - (exoArtConj_Ann / 12), 0);

  const netAvecArt_M = round2n(artNetDem_M + artNetConj_M);
  const D8_netAvecArt_Annuel = round2n(netAvecArt_M * 12);

  // Aperçu ligne 9-11 (chômage/mutuelle/remplacement) : on est déjà en mensuel -> annuel = *12
  const D9_chom_Annuel = round2n(chom.mensuelTotal * 12);
  const D10_mut_Annuel = round2n(mut.mensuelTotal * 12);
  const D11_rem_Annuel = round2n(rem * 12);

  // Aperçu F4 = Total ressources proratisables = SUM(C6:C11)
  const totalProratisables_M =
    netAvantExoSP_Dem_M +
    netAvantExoSP_Conj_M +
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
      D4_netDem_Annuel, D5_netConj_Annuel,
      D6_netAvantExoSP_Dem_Annuel, D7_netAvantExoSP_Conj_Annuel,
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
  return Number.isFinite(x) ? Math.round(x * 100) / 100 : 0;
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
  };

  for (const r of list) {
    if (r.type === "Étranger" || r.type === "Etranger") {
      totals.etranger += round2(r.revEtranger);
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
    data.menage.situation === "cohabitant" ? 1 : 3;

  const dateISO = data.reference.dateISO || "2025-02-01";
  const [yearStr] = dateISO.split("-");
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
  const cohabitantsTotals = computeCohabitantsTotal(data.cohabitants?.rows || [], dateISO);
  // Exonération
  const exo = computeExonerationExcel({ dateISO, exo: data.exoneration });

  // 1) Aperçu SANS RI (pour obtenir C37)
  const apercu0 = computeApercuExcelLike({
    data,
    pieces: {
      categorie,
      dem,
      conj,
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
    cohabitants: cohabitantsTotals // ← AJOUT
  };
} 
export default function App() {
  const [active, setActive] = useState("informations");
  const [data, setData] = useState(defaultData); // Une seule déclaration ici
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
  const apercu = result?.apercu;  // ✅ Assure-toi que `result` a bien un champ `apercu`
  if (!apercu) {
    return <div>Erreur: Aperçu non défini</div>;  // Gère l'erreur si `apercu` est manquant
  }

  return (
    <div className="app-layout-wrapper">
      <Topbar />
      <div className="app-layout">
        <Sidebar active={active} onSelect={setActive} />

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
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>Date de référence (barème)</span>
                        <a 
                          href="https://myportal.vandenbroeleconnect.be/perma/149746886634684678" 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          title="Documentation CPASConnect"
                          style={{ 
                            color: colors.textLight,
                            textDecoration: "none",
                            fontSize: "12px"
                          }}
                        >
                          📋
                        </a>
                      </div>
                    }
                    type="date"
                    value={data.reference.dateISO}
                    onChange={(e) => setData(d => ({ ...d, reference: { ...d.reference, dateISO: e.target.value } }))}
                  />
                  <Input
                    label="Jours pris en compte (prorata)"
                    type="number"
                    placeholder="Laissez vide pour mois complet"
                    hint=""
                    value={data.reference.joursPrisEnCompte}
                    onChange={(e) => setData(d => ({ ...d, reference: { ...d.reference, joursPrisEnCompte: e.target.value } }))}
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
                  <Input
                    label="Nationalité"
                    value={data.identite.nationalite}
                    onChange={(e) => setData(d => ({ ...d, identite: { ...d.identite, nationalite: e.target.value } }))}
                  />
                </div>
              </Card>

              {/* Carte Ménage */}
               <Card title="Ménage">
                 <div style={{
                   display: "grid",
                   gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                   gap: "16px"
                 }}>
                   <Input
                     label="Situation"
                     type="select"
                     value={data.menage.situation}
                     onChange={(e) => setData(d => ({ ...d, menage: { ...d.menage, situation: e.target.value } }))}
                   >
                     <option value="isolé">Isolé (Cat. 2)</option>
                     <option value="cohabitant">Cohabitant (Cat. 1)</option>
                     <option value="famille">Famille (Cat. 3)</option>
                   </Input>
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

          {active === "revenus_nets" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
                Revenus nets
                <a 
                  href="https://myportal.vandenbroeleconnect.be/perma/149746886634684897" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="Documentation CPASConnect"
                  style={{ 
                    color: colors.textLight,
                    textDecoration: "none",
                    fontSize: "12px"
                  }}
                >
                  📋
                </a>
              </h2>
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
          
              <Card title={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Chômage
                  <a href="https://myportal.vandenbroeleconnect.be/perma/149746886634684905"
                    target="_blank" rel="noopener noreferrer" title="Documentation CPASConnect"
                    style={{ color: colors.textLight, textDecoration: "none", fontSize: "12px" }}>
                    📋
                  </a>
                </span>
              }>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <Input label="Montant mensuel réel" type="number" value={data.cmr.chomage.mensuelReel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, mensuelReel: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Montant/jour (sur 26 jours)" type="number" value={data.cmr.chomage.montantJour26}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, montantJour26: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Montant/jour (annuel)" type="number" value={data.cmr.chomage.montantJourAnnuel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, chomage: { ...d.cmr.chomage, montantJourAnnuel: safeNumber(e.target.value, 0) } } }))} />
                </div>
              </Card>
          
              <Card title={
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  Mutuelle
                  <a href="https://myportal.vandenbroeleconnect.be/perma/149746886634684905"
                    target="_blank" rel="noopener noreferrer" title="Documentation CPASConnect"
                    style={{ color: colors.textLight, textDecoration: "none", fontSize: "12px" }}>
                    📋
                  </a>
                </span>
              }>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <Input label="Montant mensuel réel" type="number" value={data.cmr.mutuelle.mensuelReel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, mensuelReel: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Montant/jour (sur 26 jours)" type="number" value={data.cmr.mutuelle.montantJour26}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, montantJour26: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Montant/jour (annuel)" type="number" value={data.cmr.mutuelle.montantJourAnnuel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, mutuelle: { ...d.cmr.mutuelle, montantJourAnnuel: safeNumber(e.target.value, 0) } } }))} />
                </div>
              </Card>
          
              <Card title="Remplacement">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <Input label="Pension (mensuel)" type="number" value={data.cmr.remplacement.pensionMensuel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, pensionMensuel: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Droit passerelle (mensuel)" type="number" value={data.cmr.remplacement.droitPasserelleMensuel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, droitPasserelleMensuel: safeNumber(e.target.value, 0) } } }))} />
                  <Input
                    label={
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        Allocation d'Handicapé ARR (mensuel)
                        <a href="https://myportal.vandenbroeleconnect.be/perma/149746886634684880"
                          target="_blank" rel="noopener noreferrer" title="Documentation CPASConnect"
                          style={{ color: colors.textLight, textDecoration: "none", fontSize: "12px" }}>
                          📋
                        </a>
                      </span>
                    }
                    type="number" value={data.cmr.remplacement.allocationHandicapeMensuel}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, allocationHandicapeMensuel: safeNumber(e.target.value, 0) } } }))} />
                  <Input label="Indemnisation 'accident' pour perte de revenus (mensuel)" type="number" value={data.cmr.remplacement.indemnisation_perte_revenus}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, indemnisation_perte_revenus: safeNumber(e.target.value, 0) } } }))} />
                  <Input
                    label={
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        Autre revenu de remplacement (mensuel)
                        <a href="https://myportal.vandenbroeleconnect.be/perma/149746886634684904"
                          target="_blank" rel="noopener noreferrer" title="Documentation CPASConnect"
                          style={{ color: colors.textLight, textDecoration: "none", fontSize: "12px" }}>
                          📋
                        </a>
                      </span>
                    }
                    type="number" value={data.cmr.remplacement.autres_revenus}
                    onChange={(e) => setData(d => ({ ...d, cmr: { ...d.cmr, remplacement: { ...d.cmr.remplacement, autres_revenus: safeNumber(e.target.value, 0) } } }))} />
                </div>
              </Card>
            </section>
          )}
          {active === "avantages" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Avantages en nature</h2>
              <Card title="Avantages en nature">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <Input label="Charges locatives prises en charge par un tiers (€/mois)" type="number"
                    value={data.avantages.chargesLocativesTiers}
                    onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, chargesLocativesTiers: safeNumber(e.target.value, 0) } }))} />
                  <Input label="Loyer fictif évalué par un professionnel (€/mois)" type="number"
                    value={data.avantages.loyerFictifProfessionnel}
                    onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifProfessionnel: safeNumber(e.target.value, 0) } }))} />
                  <Input label="Loyer fictif évalué via simulateur ou grille de loyers (€/mois)" type="number"
                    value={data.avantages.loyerFictifSimulateur}
                    onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, loyerFictifSimulateur: safeNumber(e.target.value, 0) } }))} />
                  <Input label="Prêt hypothécaire pris en charge par un tiers (€/mois)" type="number"
                    value={data.avantages.pretHypothecaireTiers}
                    onChange={(e) => setData(d => ({ ...d, avantages: { ...d.avantages, pretHypothecaireTiers: safeNumber(e.target.value, 0) } }))} />
                </div>
              </Card>
            </section>
          )}

          {active === "cessions_biens" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Cessions de biens</h2>
              <CessionsBiensTable 
                rows={data.cessionsBiens.rows}
                categorie={data.menage.situation === "isolé" ? 2 : data.menage.situation === "cohabitant" ? 1 : 3}
                onChangeRows={(rows) => setData(d => ({ ...d, cessionsBiens: { rows } }))} 
              />
            </section>
          )}
          {active === "exoneration" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Exonération</h2>

              {/* Résumé calculé (Excel-like) */}
              {(() => {
                const exoCalc = computeExonerationExcel({
                  dateISO: data.reference.dateISO || "2025-02-01",
                  exo: data.exoneration,
                });

                return (
                  <div className="summary-box" style={{ marginBottom: 16 }}>
                    <div>
                      <b>Total exonération mensuelle :</b>{" "}
                      <Money value={exoCalc.totalMensuel} />
                    </div>
                    <div style={{ opacity: 0.75, fontSize: 12 }}>
                      (Total annuel : <b><Money value={exoCalc.totalAnnuel} /></b>)
                    </div>

                    <hr style={{ margin: "10px 0" }} />

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div><b>Demandeur</b></div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Général: <Money value={exoCalc.demandeur.exoGeneralMens} /> / mois — Étudiant:{" "}
                          <Money value={exoCalc.demandeur.exoEtudMens} /> / mois — Pénurie:{" "}
                          <Money value={exoCalc.demandeur.exoPenurieMens} /> / mois — Artiste:{" "}
                          <Money value={exoCalc.demandeur.exoArtisteAnnuel} /> / an
                        </div>
                      </div>

                      <div>
                        <div><b>Conjoint</b></div>
                        <div style={{ fontSize: 12, opacity: 0.75 }}>
                          Général: <Money value={exoCalc.conjoint.exoGeneralMens} /> / mois — Étudiant:{" "}
                          <Money value={exoCalc.conjoint.exoEtudMens} /> / mois — Pénurie:{" "}
                          <Money value={exoCalc.conjoint.exoPenurieMens} /> / mois — Artiste:{" "}
                          <Money value={exoCalc.conjoint.exoArtisteAnnuel} /> / an
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Formulaire (les champs Excel C5/C6/C7/C8/C11 et H5/H6/H7/H8/H11) */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {/* DEMANDEUR */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, fontWeight: 700, color: colors.primary }}>Demandeur</h3>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.demandeur.general}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            demandeur: { ...d.exoneration.demandeur, general: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération générale
                    <a 
                      href="https://myportal.vandenbroeleconnect.be/perma/149746886634684907" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Documentation CPASConnect"
                      style={{ 
                        color: colors.textLight,
                        textDecoration: "none",
                        fontSize: "12px"
                      }}
                    >
                      📋
                    </a>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.demandeur.etudiant}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            demandeur: { ...d.exoneration.demandeur, etudiant: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération étudiants
                    <a 
                      href="https://myportal.vandenbroeleconnect.be/perma/149746886634684907" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Documentation CPASConnect"
                      style={{ 
                        color: colors.textLight,
                        textDecoration: "none",
                        fontSize: "12px"
                      }}
                    >
                      📋
                    </a>
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.demandeur.penurie}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            demandeur: { ...d.exoneration.demandeur, penurie: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération pénurie
                    <a 
                      href="https://myportal.vandenbroeleconnect.be/perma/149746886634385151" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="Documentation CPASConnect"
                      style={{ 
                        color: colors.textLight,
                        textDecoration: "none",
                        fontSize: "12px"
                      }}
                    >
                      📋
                    </a>
                  </label>

                  <Field label={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Jours (si compteur dépassé)
                      <a 
                        href="https://myportal.vandenbroeleconnect.be/perma/149746886634684897" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title="Documentation CPASConnect"
                        style={{ 
                          color: colors.textLight,
                          textDecoration: "none",
                          fontSize: "12px"
                        }}
                      >
                        📋
                      </a>
                    </span>
                  }>
                    <input
                      type="number"
                      value={data.exoneration.demandeur.joursCompteur}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            demandeur: {
                              ...d.exoneration.demandeur,
                              joursCompteur: safeNumber(e.target.value, 0),
                            },
                          },
                        }))
                      }
                    />
                  </Field>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.demandeur.artisteSP}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            demandeur: { ...d.exoneration.demandeur, artisteSP: e.target.checked },
                          },
                        }))
                      }
                    />
                    Activité artistique socio-prof (annuel)
                  </label>
                </div>

                {/* CONJOINT */}
                <div className="card" style={{ padding: 16 }}>
                  <h3 style={{ marginTop: 0, fontSize: 15, fontWeight: 700, color: colors.primary }}>Conjoint</h3>

                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.conjoint.general}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            conjoint: { ...d.exoneration.conjoint, general: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération générale
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.conjoint.etudiant}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            conjoint: { ...d.exoneration.conjoint, etudiant: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération étudiant
                  </label>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.conjoint.penurie}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            conjoint: { ...d.exoneration.conjoint, penurie: e.target.checked },
                          },
                        }))
                      }
                    />
                    Exonération pénurie
                  </label>
                  <Field label={
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      Jours (si compteur dépassé)
                      <a 
                        href="https://myportal.vandenbroeleconnect.be/perma/149746886634684897" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title="Documentation CPASConnect"
                        style={{ 
                          color: colors.textLight,
                          textDecoration: "none",
                          fontSize: "12px"
                        }}
                      >
                        📋
                      </a>
                    </span>
                  }>
                    <input
                      type="number"
                      value={data.exoneration.conjoint.joursCompteur}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            conjoint: {
                              ...d.exoneration.conjoint,
                              joursCompteur: safeNumber(e.target.value, 0),
                            },
                          },
                        }))
                      }
                    />
                  </Field>

                  <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={!!data.exoneration.conjoint.artisteSP}
                      onChange={(e) =>
                        setData((d) => ({
                          ...d,
                          exoneration: {
                            ...d.exoneration,
                            conjoint: { ...d.exoneration.conjoint, artisteSP: e.target.checked },
                          },
                        }))
                      }
                    />
                    Activité artistique socio-prof (annuel) (H11)
                  </label>
                </div>
              </div>
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
              <Card title="Ressources diverses générales">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  {data.ressourcesDiverses.generales.map((r, i) => (
                    <Input key={i} label={r.label} type="number" value={r.montant}
                      onChange={(e) => {
                        const next = [...data.ressourcesDiverses.generales];
                        next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                        setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, generales: next } }));
                      }} />
                  ))}
                </div>
              </Card>
          
              <Card title="Ressources diverses — Bénévoles">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  {data.ressourcesDiverses.benevoles.map((r, i) => (
                    <Input key={i} label={r.label} type="number" value={r.montant}
                      onChange={(e) => {
                        const next = [...data.ressourcesDiverses.benevoles];
                        next[i] = { ...next[i], montant: safeNumber(e.target.value, 0) };
                        setData(d => ({ ...d, ressourcesDiverses: { ...d.ressourcesDiverses, benevoles: next } }));
                      }} />
                  ))}
                </div>
              </Card>
            </section>
          )}
          {active === "cohabitants" && (
            <section style={{ display: "grid", gap: 12 }}>
              <h2 style={{ marginTop: 0 }}>Revenus des cohabitants</h2>
              <CohabitantsTable 
                rows={data.cohabitants.rows}
                referenceDate={data.reference.dateISO}
                onChangeRows={(rows) => setData(d => ({
                  ...d, 
                  cohabitants: { ...d.cohabitants, rows }
                }))} 
              />
            </section>
          )}

         {active === "apercu" && (
          <section style={{ display: "grid", gap: 12 }}>
            {/* Titre et bouton d'export */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <h2 style={{ marginTop: 0 }}>Aperçu</h2>
              
              <button
                onClick={handleExportPDF}
                disabled={isGeneratingPDF}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "10px 20px",
                  background: isGeneratingPDF ? "#ccc" : colors.primary,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isGeneratingPDF ? "not-allowed" : "pointer",
                  fontWeight: "600",
                  fontSize: "14px",
                  fontFamily: "'Source Sans Pro', sans-serif",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => {
                  if (!isGeneratingPDF) e.target.style.transform = "translateY(-1px)";
                }}
                onMouseOut={(e) => {
                  if (!isGeneratingPDF) e.target.style.transform = "translateY(0)";
                }}
              >
                {isGeneratingPDF ? "⏳ Génération..." : "📄 Exporter en PDF"}
              </button>
            </div>

            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontSize: 13, opacity: 0.7 }}>Statut</div>
              <div style={{ fontSize: 24, fontWeight: 750 }}>
                {result.eligible ? "Éligible" : "Non éligible"}
              </div>

              <hr style={{ margin: "12px 0" }} />

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Rubrique</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Mensuel</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Annuel</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #ddd" }}>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {/* Ressources professionnelles */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Ressources professionnelles</td></tr>

                  <Row label="Revenu net demandeur" mensuel={apercu.pro.D4_netDem_Annuel / 12} annuel={apercu.pro.D4_netDem_Annuel} total={apercu.pro.D4_netDem_Annuel} />
                  <Row label="Revenu net conjoint" mensuel={apercu.pro.D5_netConj_Annuel / 12} annuel={apercu.pro.D5_netConj_Annuel} total={apercu.pro.D5_netConj_Annuel} />

                  <Row label="Montant net (avant exo.) - Demandeur" mensuel={apercu.pro.D6_netAvantExoSP_Dem_Annuel / 12} annuel={apercu.pro.D6_netAvantExoSP_Dem_Annuel} total={apercu.pro.D6_netAvantExoSP_Dem_Annuel} />
                  <Row label="Montant net (avant exo.) - Conjoint" mensuel={apercu.pro.D7_netAvantExoSP_Conj_Annuel / 12} annuel={apercu.pro.D7_netAvantExoSP_Conj_Annuel} total={apercu.pro.D7_netAvantExoSP_Conj_Annuel} />

                  <Row label="Montant net (avec exo. artistique) - Demandeur" mensuel={apercu.pro.D8_netAvecArt_Annuel / 12} annuel={apercu.pro.D8_netAvecArt_Annuel} total={apercu.pro.D8_netAvecArt_Annuel} />
                  <Row label="Montant net (avec exo. artistique) - Conjoint" mensuel={apercu.pro.D8_netAvecArt_Annuel / 12} annuel={apercu.pro.D8_netAvecArt_Annuel} total={apercu.pro.D8_netAvecArt_Annuel} />

                  <Row label="Allocation de chômage" mensuel={apercu.pro.D9_chom_Annuel / 12} annuel={apercu.pro.D9_chom_Annuel} total={apercu.pro.D9_chom_Annuel} />
                  <Row label="Mutuelle" mensuel={apercu.pro.D10_mut_Annuel / 12} annuel={apercu.pro.D10_mut_Annuel} total={apercu.pro.D10_mut_Annuel} />
                  <Row label="Revenus de remplacement" mensuel={apercu.pro.D11_rem_Annuel / 12} annuel={apercu.pro.D11_rem_Annuel} total={apercu.pro.D11_rem_Annuel} />

                  <Row label="Total ressources proratisables" 
                    mensuel={apercu.pro.totalProratisables_M} 
                    annuel={apercu.pro.totalProratisables_M * 12} 
                    total={apercu.pro.totalProratisables_M * 12} />

                  <Row label="Critère du montant du revenu d’intégration (proratisé)" mensuel={apercu.pro.critereRIProrata_M} annuel={apercu.pro.critereRIProrata_M * 12} total={apercu.pro.critereRIProrata_M * 12} />

                  <Row highlight label="TOTAL des ressources professionnelles ou assimilées (mensuel)" mensuel={apercu.pro.F14_totalRessourcesProAssim_M} annuel={apercu.pro.F14_totalRessourcesProAssim_M * 12} total={apercu.pro.F14_totalRessourcesProAssim_M * 12} />

                  {/* Ressources diverses */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Ressources diverses</td></tr>
                  <Row label="Montant total des ressources diverses" mensuel={apercu.autres.D17_diverses_Annuel / 12} annuel={apercu.autres.D17_diverses_Annuel} total={apercu.autres.D17_diverses_Annuel} />

                  {/* Ressources de biens immobiliers */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Ressources de biens immobiliers</td></tr>
                  <Row label="Montant des biens immobiliers" mensuel={apercu.autres.D23_immobiliers_Annuel / 12} annuel={apercu.autres.D23_immobiliers_Annuel} total={apercu.autres.D23_immobiliers_Annuel} />

                  {/* Ressources de biens mobiliers */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Ressources de biens mobiliers</td></tr>
                  <Row label="Montant des biens mobiliers" mensuel={apercu.autres.D20_mobiliers_Annuel / 12} annuel={apercu.autres.D20_mobiliers_Annuel} total={apercu.autres.D20_mobiliers_Annuel} />

                  {/* Cessions de biens */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Cessions de biens</td></tr>
                  <Row label="Montant total des cessions" mensuel={apercu.autres.D26_cessions_Annuel / 12} annuel={apercu.autres.D26_cessions_Annuel} total={apercu.autres.D26_cessions_Annuel} />

                  {/* Avantages en nature */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Avantages en nature</td></tr>
                  <Row label="Montant total des avantages en nature" mensuel={apercu.autres.D29_avantages_Annuel / 12} annuel={apercu.autres.D29_avantages_Annuel} total={apercu.autres.D29_avantages_Annuel} />

                  {/* Co-habitants */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>Cohabitants</td></tr>
                  <Row 
                    highlight label="Total des revenus des cohabitants" 
                    mensuel={result.apercu.autres.D32_cohabitants_Annuel / 12}  // ← Division par 12 pour obtenir le mensuel
                    annuel={result.apercu.autres.D32_cohabitants_Annuel}        // ← Annuel directement
                    total={result.apercu.autres.D32_cohabitants_Annuel}         // ← Annuel aussi dans le total
                  />
                  {/* ================= C39 ================= */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>
                    Exonération supplémentaire annuelle
                  </td></tr>

                  <Row
                    label="Exonération supplémentaire annuelle"
                    mensuel={null}
                    annuel={result.apercu.ri.C39_exoSupplAnnuelle}
                    total={result.apercu.ri.C39_exoSupplAnnuelle}
                  />

                  {/* ================= C41 ================= */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>
                    Total annuel après exonération
                  </td></tr>

                  <Row
                    label="Total annuel après exonération"
                    mensuel={null}
                    annuel={result.apercu.ri.C41_ressourcesApresExo}
                    total={result.apercu.ri.C41_ressourcesApresExo}
                  />

                  {/* ================= C43 ================= */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>
                    Revenu d’intégration annuel
                  </td></tr>

                  <Row
                    label="Revenu d’intégration annuel"
                    mensuel={null}
                    annuel={result.apercu.ri.C43_riAnnuelNet}
                    total={result.apercu.ri.C43_riAnnuelNet}
                  />

                  {/* ================= E45 ================= */}
                  <tr><td colSpan={4} style={{ padding: "10px 8px", fontWeight: 700 }}>
                    Revenu d’intégration mensuel
                  </td></tr>

                  <Row
                    highlight label="Revenu d’intégration mensuel"
                    mensuel={result.apercu.ri.E45_montantMensuel}
                    annuel={null}
                    total={result.apercu.ri.E45_montantMensuel * 12}
                    />
                  {/* ===== Calcul du RI pour un mois incomplet (Excel) ===== */}
                  <tr>
                    <td colSpan={4} style={{ paddingTop: 16 }}>
                      <div style={{ border: `2px solid ${colors.primary}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontWeight: 800, marginBottom: 10 }}>
                          Calcul du revenu d'intégration pour un mois incomplet
                        </div>
                        <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div>Nbre de jours pris en compte dans la période concernée :</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <input
                                style={{ width: 70, padding: "6px 8px" }}
                                type="number"
                                min={0}
                                value={data.reference.joursPrisEnCompte ?? 0}
                                onChange={(e) =>
                                  setData((prev) => ({
                                    ...prev,
                                    reference: {
                                      ...prev.reference,
                                      joursPrisEnCompte: e.target.value === "" ? 0 : Number(e.target.value),
                                    },
                                  }))
                                }
                              />
                              <span>sur</span>
                              <input
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
            </div>
          </section>
        )}
          {active === "biens_mobiliers" && (
            <section style={{ display: "grid", gap: 12 }}>
              <Card title="Biens mobiliers">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                  <Input label="Montant du capital" type="number"
                    value={data.biensMobiliers.montantCapital}
                    onChange={(e) => setData((d) => ({
                      ...d,
                      biensMobiliers: { ...d.biensMobiliers, montantCapital: safeNumber(e.target.value, 0) },
                    }))} />
                  <Input label="Part concernée (%)" type="number"
                    value={data.biensMobiliers.partConcernee}
                    onChange={(e) => setData((d) => ({
                      ...d,
                      biensMobiliers: { ...d.biensMobiliers, partConcernee: safeNumber(e.target.value, 100) },
                    }))} />
                </div>
                <div className="summary-box" style={{ marginTop: 12 }}>
                  {(() => {
                    const bm = computeBiensMobiliersExcel(data.biensMobiliers);
                    return (
                      <>
                        <div><b>Total annuel :</b> <Money value={bm.totalAnnuel} /></div>
                        <div><b>Total mensuel :</b> <Money value={bm.totalMensuel} /></div>
                      </>
                    );
                  })()}
                </div>
              </Card>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
