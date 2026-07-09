// src/utils/calculs.test.js
// Tests Vitest pour les fonctions de calcul du simulateur RI belge.
// Lancer : npm test

import { describe, it, expect } from "vitest";
import {
  computeImmoExcel,
  computeBiensMobiliersExcel,
  computeCessionsTotalAnnuel,
} from "./calculs.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Construit un bien immobilier minimal (champs optionnels à zéro si omis). */
function bien(typeBien, rcNonIndexe, quotePart, extra = {}) {
  return { typeBien, rcNonIndexe, quotePart, ...extra };
}

// ─── computeImmoExcel ───────────────────────────────────────────────────────

describe("computeImmoExcel", () => {
  // -----------------------------------------------------------------------
  // Casus 1 — 1 enfant (exo bâti = 875 €)
  // Sources validées sur 2 casus réels
  // -----------------------------------------------------------------------
  describe("Casus 1 — 1 enfant, 6 biens mixtes", () => {
    const rows = [
      // RC=290, 100%PP, Bâti → M=0 car 290 < exo 875
      bien("Bâti",     290,  100),
      // RC=6,   100%PP, Non bâti → K=6, L=6, M=0
      bien("Non bâti",   6,  100),
      // RC=12,   20%PP, Non bâti → K=2.4, L=1.2, M=(2.4-1.2)×3=3.6
      bien("Non bâti",  12,   20),
      // RC=9,    20%PP, Non bâti → K=1.8, L=1.2, M=(1.8-1.2)×3=1.8
      bien("Non bâti",   9,   20),
      // RC=1,    10%PP, Non bâti → K=0.1, L=0.6, M=0 car K<L
      bien("Non bâti",   1,   10),
      // RC=5,    20%PP, Non bâti → K=1.0, L=1.2, M=0 car K<L
      bien("Non bâti",   5,   20),
    ];

    const result = computeImmoExcel(rows, 1);

    it("IB total = 0 (bâti exonéré)", () => {
      expect(result.IB.total).toBe(0);
    });

    it("INB total = 5.4 (3.6 + 1.8)", () => {
      expect(result.INB.total).toBe(5.4);
    });

    it("totalAnnuel = 5.4", () => {
      expect(result.totalAnnuel).toBe(5.4);
    });

    it("totalMensuel = 0.45", () => {
      expect(result.totalMensuel).toBeCloseTo(0.45, 2);
    });
  });

  // -----------------------------------------------------------------------
  // Casus 2 — 0 enfant, pleine propriété (100%)
  // RC=1279 → M = (1279 − 750) × 3 = 1587
  // -----------------------------------------------------------------------
  describe("Casus 2 — 0 enfant, 100% PP, RC=1279", () => {
    const rows = [bien("Bâti", 1279, 100)];
    const result = computeImmoExcel(rows, 0);

    it("IB total = 1587", () => {
      expect(result.IB.total).toBe(1587);
    });

    it("totalAnnuel = 1587", () => {
      expect(result.totalAnnuel).toBe(1587);
    });
  });

  // -----------------------------------------------------------------------
  // Casus 3 — 0 enfant, co-propriété 50%
  // K = 1279 × 0.5 = 639.5, L = 750 × 0.5 = 375
  // M = (639.5 − 375) × 3 = 793.5
  // -----------------------------------------------------------------------
  describe("Casus 3 — 0 enfant, 50% PP, RC=1279", () => {
    const rows = [bien("Bâti", 1279, 50)];
    const result = computeImmoExcel(rows, 0);

    it("IB total = 793.5", () => {
      expect(result.IB.total).toBe(793.5);
    });

    it("totalAnnuel = 793.5", () => {
      expect(result.totalAnnuel).toBe(793.5);
    });
  });

  // -----------------------------------------------------------------------
  // Cas limites
  // -----------------------------------------------------------------------
  describe("Cas limites", () => {
    it("tableau vide → totalAnnuel = 0", () => {
      const result = computeImmoExcel([], 0);
      expect(result.totalAnnuel).toBe(0);
      expect(result.IB.total).toBe(0);
      expect(result.INB.total).toBe(0);
    });

    it("null/undefined rows → totalAnnuel = 0", () => {
      expect(computeImmoExcel(null, 0).totalAnnuel).toBe(0);
      expect(computeImmoExcel(undefined, 0).totalAnnuel).toBe(0);
    });

    it("RC = 0 → M nul, pas de revenu", () => {
      const result = computeImmoExcel([bien("Bâti", 0, 100)], 0);
      expect(result.IB.total).toBe(0);
    });

    it("bien Étranger → etranger comptabilisé séparément", () => {
      const rows = [{ typeBien: "Étranger", revenuImmoEtranger: 1200, quotePart: 100 }];
      const result = computeImmoExcel(rows, 0);
      expect(result.etranger).toBe(1200);
      expect(result.IB.total).toBe(0);
      expect(result.INB.total).toBe(0);
      expect(result.totalAnnuel).toBe(1200);
    });

    it("1 non bâti RC=30 → M = 0 (K = L = 30×1)", () => {
      // 1 seul bien non bâti → exo = 30/1 = 30
      const result = computeImmoExcel([bien("Non bâti", 30, 100)], 0);
      expect(result.INB.total).toBe(0);
    });

    it("1 non bâti RC=200 → M = (200-30)×3 = 510", () => {
      // Exemple légal section 4.3d : RC=200, PP, 1 bien → exo=30
      const result = computeImmoExcel([bien("Non bâti", 200, 100)], 0);
      expect(result.INB.total).toBe(510);
    });

    it("1 non bâti RC=7 → M = (7-30)×3 = 0 (K<L)", () => {
      // 1 seul bien → exo=30, RC=7 < 30
      const result = computeImmoExcel([bien("Non bâti", 7, 100)], 0);
      expect(result.INB.total).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Section 4.3 — Plusieurs biens : exo divisée par le nombre de biens
  // -----------------------------------------------------------------------
  describe("Section 4.3 — Plusieurs biens bâtis (exo divisée)", () => {
    it("Exemple 4.3a — 2 bâtis PP, nbEnfants=0 : exo=375/bien", () => {
      // RC=2000, RC=1500, exo=750/2=375
      // A: (2000-375)×3=4875 ; B: (1500-375)×3=3375 → total=8250
      const rows = [bien("Bâti", 2000, 100), bien("Bâti", 1500, 100)];
      const result = computeImmoExcel(rows, 0);
      expect(result.IB.total).toBe(8250);
    });

    it("Exemple 4.3b — 2 bâtis, 2 enfants : exo=1000/2=500/bien", () => {
      // A: (2000×0.5)-(500×0.5)=750 → 750×3=2250
      // B: (1500)-(500)=1000 → 1000×3=3000 → total=5250
      const rows = [bien("Bâti", 2000, 50), bien("Bâti", 1500, 100)];
      const result = computeImmoExcel(rows, 2);
      expect(result.IB.total).toBe(5250);
    });

    it("Exemple 4.3c — 2 bâtis, bien A sous le seuil → M=0 pour A", () => {
      // exo=750/2=375 ; A: 300<375 → 0 ; B: 1200-375=825 → 825×3=2475
      const rows = [bien("Bâti", 300, 100), bien("Bâti", 1200, 100)];
      const result = computeImmoExcel(rows, 0);
      expect(result.IB.total).toBe(2475);
    });

    it("Exemple 4.3d — 1 bâti + 1 non bâti : exos indépendantes", () => {
      // Bâti RC=1500 → (1500-750)×3=2250 ; Non bâti RC=200 → (200-30)×3=510
      const rows = [bien("Bâti", 1500, 100), bien("Non bâti", 200, 100)];
      const result = computeImmoExcel(rows, 0);
      expect(result.IB.total).toBe(2250);
      expect(result.INB.total).toBe(510);
      expect(result.totalAnnuel).toBe(2760);
    });
  });
});

// ─── computeBiensMobiliersExcel ─────────────────────────────────────────────

describe("computeBiensMobiliersExcel", () => {
  // -----------------------------------------------------------------------
  // Tranche 1 : capital ≤ 6200 → exonéré (totalAnnuel = 0)
  // -----------------------------------------------------------------------
  it("capital = 0 → totalAnnuel = 0", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 0, partConcernee: 100 });
    expect(r.totalAnnuel).toBe(0);
  });

  it("capital = 5000 (< 6200) → totalAnnuel = 0", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 5000, partConcernee: 100 });
    expect(r.totalAnnuel).toBe(0);
  });

  it("capital = 6200 (exactement au seuil) → totalAnnuel = 0", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 6200, partConcernee: 100 });
    expect(r.totalAnnuel).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Tranche 2 : 6200 < capital ≤ 12500 → (capital − 6200) × 6%
  // -----------------------------------------------------------------------
  it("capital = 10 000 → E6 = 228, totalAnnuel = 228", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 10000, partConcernee: 100 });
    // (10 000 − 6 200) × 0.06 = 3 800 × 0.06 = 228
    expect(r.E6).toBe(228);
    expect(r.totalAnnuel).toBe(228);
  });

  it("capital = 12 500 (exactement au 2e seuil) → E6 = 378, E7 = 0", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 12500, partConcernee: 100 });
    // (12 500 − 6 200) × 0.06 = 6 300 × 0.06 = 378
    expect(r.E6).toBe(378);
    expect(r.E7).toBe(0);
    expect(r.totalAnnuel).toBe(378);
  });

  // -----------------------------------------------------------------------
  // Tranche 3 : capital > 12 500 → tranche 2 × 6% + (capital − 12 500) × 10%
  // -----------------------------------------------------------------------
  it("capital = 20 000 → E6=378, E7=750, totalAnnuel=1128", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 20000, partConcernee: 100 });
    // Tranche 2 : (12 500 − 6 200) × 0.06 = 378
    // Tranche 3 : (20 000 − 12 500) × 0.10 = 750
    expect(r.E6).toBe(378);
    expect(r.E7).toBe(750);
    expect(r.totalAnnuel).toBe(1128);
  });

  // -----------------------------------------------------------------------
  // Part concernée < 100%
  // -----------------------------------------------------------------------
  it("capital = 20 000, part = 50% → totalAnnuel proratisé", () => {
    // B=20 000, C=0.5
    // D5 = min(6200, 20000) × 0.5 = 3100
    // D6 = min(12500, 20000) × 0.5 = 6250
    // D7 = 20000 × 0.5 = 10000
    // E6 = (6250 − 3100) × 0.06 = 189
    // E7 = (10000 − 6250) × 0.10 = 375
    const r = computeBiensMobiliersExcel({ montantCapital: 20000, partConcernee: 50 });
    expect(r.E6).toBe(189);
    expect(r.E7).toBe(375);
    expect(r.totalAnnuel).toBe(564);
  });

  it("totalMensuel = totalAnnuel / 12", () => {
    const r = computeBiensMobiliersExcel({ montantCapital: 20000, partConcernee: 100 });
    expect(r.totalMensuel).toBeCloseTo(r.totalAnnuel / 12, 5);
  });
});

// ─── computeCessionsTotalAnnuel ─────────────────────────────────────────────

describe("computeCessionsTotalAnnuel", () => {
  // -----------------------------------------------------------------------
  // Cas vide
  // -----------------------------------------------------------------------
  it("liste vide → totalAnnuel = 0", () => {
    expect(computeCessionsTotalAnnuel([], 1).totalAnnuel).toBe(0);
    expect(computeCessionsTotalAnnuel(null, 1).totalAnnuel).toBe(0);
  });

  // -----------------------------------------------------------------------
  // Bien non unique : pas de tranche immunisée ni d'abattement
  // -----------------------------------------------------------------------
  describe("Bien non unique (Autre bien bâti)", () => {
    it("valeur = 20 000, 100% PP → totalAnnuel = 1128", () => {
      // consideration = 20 000
      // T2 = (12 500 − 6 200) × 6% = 378 ; T3 = (20 000 − 12 500) × 10% = 750
      const rows = [{ typeBien: "Autre bien bâti", valeurVenale: 20000, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalAnnuel).toBe(1128);
    });

    it("valeur = 8 000, 100% PP → totalAnnuel = 108", () => {
      // consideration = 8 000 ; T2 = (8 000 − 6 200) × 6% = 108
      const rows = [{ typeBien: "Autre bien bâti", valeurVenale: 8000, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalAnnuel).toBe(108);
    });

    it("Art. 6.1c — deux biens cumulés → tranches sur le total (28 000)", () => {
      // total consideration = 20 000 + 8 000 = 28 000
      // T2 = (12 500 − 6 200) × 6% = 378 ; T3 = (28 000 − 12 500) × 10% = 1 550
      // ATTENTION : per-bien séparé donnerait 1128+108=1236, ce qui est FAUX
      const rows = [
        { typeBien: "Autre bien bâti", valeurVenale: 20000, partConcernee: 100 },
        { typeBien: "Autre bien bâti", valeurVenale: 8000,  partConcernee: 100 },
      ];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalConsideration).toBe(28000);
      expect(r.totalAnnuel).toBe(1928);
    });

    it("valeur = 6 200 → totalAnnuel = 0 (exactement au seuil T1)", () => {
      const rows = [{ typeBien: "Autre bien bâti", valeurVenale: 6200, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalAnnuel).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Bien unique (cession onéreuse) : tranche 37 200 + abattement
  // -----------------------------------------------------------------------
  describe("Bien unique onéreux (Bien bâti unique)", () => {
    it("valeur = 50 000, sans dates → abattement = 0, totalAnnuel = 408", () => {
      // consideration = 50 000 − 37 200 = 12 800
      // T2 = 378 ; T3 = (12 800 − 12 500) × 10% = 30 → total = 408
      const rows = [{ typeBien: "Bien bâti (unique)", valeurVenale: 50000, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 3);
      expect(r.totalAnnuel).toBe(408);
    });

    it("valeur = 37 200 → totalAnnuel = 0 (entièrement couvert par tranche immunisée)", () => {
      const rows = [{ typeBien: "Bien bâti (unique)", valeurVenale: 37200, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalAnnuel).toBe(0);
    });

    it("Art. 6.2a — exemple légal : 75 000, dettes 5 000, isolé (cat 2), 38 mois", () => {
      // montantVenal = 75 000 ; dettes = 5 000 ; tranche immunisée = 37 200
      // abattement = 38/12 × 2000 = 6333.33
      // consideration = 75000 − 5000 − 37200 − 6333.33 = 26466.67
      // T2 = 378 ; T3 = (26466.67 − 12500) × 10% = 1396.67 → total = 1774.67
      const rows = [{
        typeBien: "Bien bâti (unique)",
        valeurVenale: 75000,
        partConcernee: 100,
        natureCession: "Cession à titre onéreux",
        dettesPersonnelles: 5000,
        dateCession: "2013-01-15",
        datePriseCoursRI: "2016-04-01",
      }];
      const r = computeCessionsTotalAnnuel(rows, 2);
      expect(r.details[0].abattement).toBeCloseTo(6333.33, 1);
      expect(r.details[0].montantConsideration).toBeCloseTo(26466.67, 1);
      expect(r.totalAnnuel).toBeCloseTo(1774.67, 1);
    });

    it("valeur = 0 → ignoré (null filtré), totalAnnuel = 0", () => {
      const rows = [{ typeBien: "Bien bâti (unique)", valeurVenale: 0, partConcernee: 100 }];
      const r = computeCessionsTotalAnnuel(rows, 1);
      expect(r.totalAnnuel).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Art. 6.3 — Cession gratuite : aucune déduction (ni tranche ni abattement)
  // -----------------------------------------------------------------------
  describe("Cession à titre gratuit (art. 6.3 / 6.5 / 6.7)", () => {
    it("bien unique gratuit : pas de tranche immunisée ni d'abattement", () => {
      // Si onéreux : consideration = 50000 − 37200 = 12800 → 408€
      // Si gratuit  : consideration = 50000 → T2+T3 = 378 + (50000-12500)×10% = 378+3750 = 4128€
      const rows = [{
        typeBien: "Bien bâti (unique)",
        valeurVenale: 50000,
        partConcernee: 100,
        natureCession: "Cession à titre gratuit",
        dettesPersonnelles: 5000, // ignoré
        dateCession: "2020-01-01",
        datePriseCoursRI: "2024-01-01",
      }];
      const r = computeCessionsTotalAnnuel(rows, 3);
      expect(r.details[0].trancheImmunisee).toBe(0);
      expect(r.details[0].abattement).toBe(0);
      expect(r.details[0].dettesApplicables).toBe(0);
      expect(r.details[0].montantConsideration).toBe(50000);
      expect(r.totalAnnuel).toBe(4128);
    });

    it("bien non unique gratuit : pas de dettes déduites", () => {
      const onerous = computeCessionsTotalAnnuel(
        [{ typeBien: "Autre bien bâti", valeurVenale: 20000, partConcernee: 100 }], 1
      );
      const gratuit = computeCessionsTotalAnnuel([{
        typeBien: "Autre bien bâti",
        valeurVenale: 20000,
        partConcernee: 100,
        natureCession: "Cession à titre gratuit",
        dettesPersonnelles: 5000,
      }], 1);
      expect(gratuit.totalAnnuel).toBe(onerous.totalAnnuel);
    });
  });

  // -----------------------------------------------------------------------
  // Art. 6.2a.3 — Calcul des mois d'abattement
  // -----------------------------------------------------------------------
  describe("calculateMonthsDiffCession — premier du mois suivant", () => {
    it("exemple légal : cession 15.01.2013, RI 01.04.2016 → 38 mois", () => {
      // Du 01.02.2013 au 01.04.2016 = 38 mois
      const rows = [{
        typeBien: "Bien bâti (unique)",
        valeurVenale: 75000,
        partConcernee: 100,
        dettesPersonnelles: 5000,
        dateCession: "2013-01-15",
        datePriseCoursRI: "2016-04-01",
      }];
      const r = computeCessionsTotalAnnuel(rows, 2);
      expect(r.details[0].nbMois).toBe(38);
    });

    it("cession en fin de mois (31 jan) → commence en mars (pas en fév)", () => {
      // 31.01.2020 → premier du mois suivant = 01.02.2020
      // RI 01.04.2020 → 2 mois (fév + mars)
      const rows = [{
        typeBien: "Bien bâti (unique)",
        valeurVenale: 50000,
        partConcernee: 100,
        dateCession: "2020-01-31",
        datePriseCoursRI: "2020-04-01",
      }];
      const r = computeCessionsTotalAnnuel(rows, 2);
      expect(r.details[0].nbMois).toBe(2);
    });
  });

  it("totalMensuel = totalAnnuel / 12", () => {
    const rows = [{ typeBien: "Autre bien bâti", valeurVenale: 20000, partConcernee: 100 }];
    const r = computeCessionsTotalAnnuel(rows, 1);
    expect(r.totalMensuel).toBeCloseTo(r.totalAnnuel / 12, 2);
  });
});
