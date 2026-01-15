// src/engine/ri.js

// Table "Données" (montants ANNUELS par catégorie, par date d'entrée en vigueur)
const RI_ANNUAL_BY_DATE = [
  { date: "2023-01-01", cat1: 9713.04,  cat2: 14569.58, cat3: 19690.01 },
  { date: "2023-07-01", cat1: 9907.3,   cat2: 14860.96, cat3: 20083.8 },
  { date: "2023-11-01", cat1: 10105.38, cat2: 15158.08, cat3: 20485.33 },
  { date: "2024-05-01", cat1: 10307.68, cat2: 15461.53, cat3: 20895.43 },
  { date: "2025-02-01", cat1: 10513.6,  cat2: 15770.41, cat3: 21312.87 },
];

// Exonération supplémentaire annuelle par catégorie (valeurs de la table Données Q2:S3)
const EXON_SUP_ANNUAL = { 1: 155, 2: 250, 3: 310 };

function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function lastApplicableRate(dateISO) {
  const target = parseISODate(dateISO).getTime();
  const sorted = [...RI_ANNUAL_BY_DATE].sort((a, b) => (a.date < b.date ? -1 : 1));
  let found = null;
  for (const row of sorted) {
    if (parseISODate(row.date).getTime() <= target) found = row;
  }
  return found;
}

function daysInMonth(dateISO) {
  const [y, m] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function computeRI({
  dateISO, // "YYYY-MM-01" recommandé
  categorie, // 1|2|3
  totalRessourcesAnnuelles, // équivalent C37
  joursPrisEnCompte = null, // si null => mois complet
}) {
  const rate = lastApplicableRate(dateISO);
  if (!rate) {
    return {
      eligible: false,
      error: "Aucun barème trouvé pour cette date (date trop ancienne).",
    };
  }

  const A =
    categorie === 1 ? rate.cat1 :
    categorie === 2 ? rate.cat2 :
    rate.cat3; // équivalent Informations!F7

  const B = Number(totalRessourcesAnnuelles || 0); // C37
  const C = -(EXON_SUP_ANNUAL[categorie] ?? 0); // C39 (négatif)
  const D = Math.max(0, B + C); // C41

  const eligible = B < A; // condition utilisée pour E45
  if (!eligible) {
    return {
      eligible: false,
      montantMensuel: 0,
      montantMensuelProratise: 0,
      details: { A, B, C, D },
      explications: [`Ressources annuelles (${B}€) ≥ base annuelle RI (${A}€).`],
    };
  }

  const riAnnuel = A - D; // C43
  const riMensuel = Math.round((riAnnuel / 12) * 100) / 100; // E45 arrondi 2 décimales

  const dim = daysInMonth(dateISO); // E50
  const jp = joursPrisEnCompte == null ? dim : Number(joursPrisEnCompte);
  const riMensuelProratise = Math.round((riMensuel * jp / dim) * 100) / 100; // C52

  return {
    eligible: true,
    montantMensuel: riMensuel,
    montantMensuelProratise: riMensuelProratise,
    details: { A, B, C, D, riAnnuel, dim, jp },
    explications: [
      `Base annuelle RI (A) = ${A}€`,
      `Ressources annuelles (B) = ${B}€`,
      `Exonération annuelle (C) = ${C}€`,
      `Ressources retenues (D=max(0,B+C)) = ${D}€`,
    ],
  };
}
