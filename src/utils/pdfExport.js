import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function isInIframe() {
  try { return window.self !== window.top; } catch (e) { return true; }
}

async function imageToBase64(url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return '';
  }
}

async function downloadPDF(pdfBlob, fileName) {
  if (isInIframe()) {
    // Dans un iframe, les téléchargements via <a download> sont bloqués par la Permissions Policy.
    // On ouvre le PDF dans un nouvel onglet (ne nécessite pas la feature "downloads").
    const url = URL.createObjectURL(pdfBlob);
    const opened = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (!opened) {
      // Popup bloqué par le navigateur — dernier recours via postMessage au parent
      try {
        const base64Data = await blobToBase64(pdfBlob);
        window.parent.postMessage({ type: 'DOWNLOAD_PDF', fileName, pdfData: base64Data }, '*');
      } catch {}
    }
    return true;
  } else {
    const link = document.createElement('a');
    const url = URL.createObjectURL(pdfBlob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    return true;
  }
}

function daysPaidInYear(year) {
  let count = 0;
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) count++;
  }
  return count;
}

// Coupe intelligente : remonte depuis le point idéal pour trouver une ligne blanche
function findCleanBreak(canvas, idealPx, pxPerMm) {
  const windowPx = Math.min(Math.round(60 * pxPerMm), 300);
  const ctx = canvas.getContext('2d');
  let bestLine = idealPx;
  let bestScore = -1;
  for (let y = idealPx; y > idealPx - windowPx && y > 0; y--) {
    const row = ctx.getImageData(0, y, canvas.width, 1).data;
    let whiteCount = 0;
    for (let i = 0; i < row.length; i += 4) {
      if (row[i] > 240 && row[i + 1] > 240 && row[i + 2] > 240) whiteCount++;
    }
    const score = whiteCount / canvas.width;
    if (score > bestScore) { bestScore = score; bestLine = y; }
    if (score > 0.97) break;
  }
  return bestLine;
}

/**
 * Génère un PDF complet : identité + éligibilité + tableau détaillé des ressources
 */
export async function generatePDF(data, result, apercu) {
  try {
    const logoBase64 = await imageToBase64('https://www.cpasconnect.be/img/cpasconnect/logo.svg');

    const fmt   = formatCurrency;
    const safeN = (x) => { const n = Number(x); return isFinite(n) ? n : 0; };
    const r2    = (x) => Math.round(x * 100) / 100;

    const dateISO  = data.reference.dateISO || '';
    const year     = parseInt(dateISO.split('-')[0]) || new Date().getFullYear();
    const nbJours  = daysPaidInYear(year);

    const categorie  = data.menage.situation === 'isolé' ? 2 : data.menage.situation === 'cohabitant' ? 1 : 3;
    const prenomNom  = [data.identite.prenom, data.identite.nom].filter(Boolean).join(' ') || 'Demandeur';
    const catLabel   = categorie === 1 ? 'Cohabitant (Cat. 1)' : categorie === 2 ? 'Isolé (Cat. 2)' : 'Famille (Cat. 3)';

    const eligible    = result.eligible;
    const riAnnuelBrut = safeN(apercu?.ri?.riAnnuelBrut);
    const riAnnuel    = safeN(apercu?.ri?.C43_riAnnuelNet);
    const riMensuel   = safeN(apercu?.ri?.E45_montantMensuel);
    const exoSuppl    = safeN(apercu?.ri?.C39_exoSupplAnnuelle);
    const ressApresExo = safeN(apercu?.ri?.C41_ressourcesApresExo);

    // ─── Helpers tableau ────────────────────────────────────────────────────────
    const cell  = (html, style = '') => `<td style="padding:7px 9px;border:1px solid #dee2e6;vertical-align:top;${style}">${html ?? ''}</td>`;
    const hcell = (html, style = '') => `<th style="padding:9px;border:1px solid #1a3e60;text-align:left;${style}">${html}</th>`;

    const SEC = (title) => `<tr><td colspan="4" style="padding:0;height:24px;border:none;background:white;"></td></tr>
    <tr style="background:#eef2f7;">
      <td colspan="4" style="padding:8px 10px;border:1px solid #dee2e6;font-weight:bold;color:#163E67;border-left:4px solid #2BEBCE;">${title}</td>
    </tr>`;

    const ROW = (person, nature, hauteur, annuel, neg = false) => `<tr>
      ${cell(`<b>${person}</b>`)}
      ${cell(nature)}
      ${cell(hauteur || '', 'color:#444;')}
      ${cell((neg ? '−' : '') + fmt(Math.abs(annuel)), 'text-align:right;' + (neg ? 'color:#BF2222;' : ''))}
    </tr>`;

    const SUBTOT = (label, annuel) => `<tr style="background:#f0f4f8;">
      <td colspan="3" style="padding:7px 9px;border:1px solid #dee2e6;font-style:italic;color:#555;">${label}</td>
      <td style="padding:7px 9px;border:1px solid #dee2e6;text-align:right;font-weight:bold;color:#163E67;">${fmt(annuel)}</td>
    </tr>`;

    const SEP = () => `<tr><td colspan="4" style="padding:0;height:1px;background:#dee2e6;border:none;"></td></tr>`;
    const SEP_STRONG = () => `<tr><td colspan="4" style="padding:0;height:3px;background:#163E67;border:none;"></td></tr>`;

    const ROWSUB = (nature, detail) => `<tr style="font-size:12px;background:#f9fbfc;">
      ${cell('')}
      ${cell(`<span style="color:#666;font-style:italic;padding-left:12px;">↳ ${nature}</span>`)}
      ${cell(detail || '', 'color:#777;font-style:italic;')}
      ${cell('', 'text-align:right;')}
    </tr>`;

    const ROWAMOUNT = (nature, detail, annuel) => `<tr style="font-size:12px;background:#f9fbfc;">
      ${cell('')}
      ${cell(`<span style="color:#666;font-style:italic;padding-left:12px;">↳ ${nature}</span>`)}
      ${cell(detail || '', 'color:#777;font-style:italic;')}
      ${cell(fmt(annuel), 'text-align:right;color:#555;')}
    </tr>`;

    const cohDetails = result.cohabitants?.details || [];

    let demShown = false;
    const demCell = () => { const n = demShown ? '' : prenomNom; demShown = true; return n; };

    let tbody = '';

    // ════════════════════════════════════════════════════════════════════
    // SECTION 1 — Revenus professionnels nets + Art. 35
    // ════════════════════════════════════════════════════════════════════
    const art35DemAn = r2(safeN(apercu?.pro?.D4_netDem_Annuel) - safeN(apercu?.pro?.D6_netAvantExoSP_Dem_Annuel));

    const art35Label = () => {
      const e = data.exoneration?.demandeur || {};
      const types = [
        e.general   && 'général',
        e.etudiant  && 'étudiant',
        e.penurie   && 'pénurie',
        e.artisteSP && 'artiste SP',
      ].filter(Boolean);
      return `(−) Exonération Art. 35${types.length ? ' (' + types.join(' + ') + ')' : ''}`;
    };

    const art35SubRow = (label, annuel) => `<tr style="background:#fff5f5;">
      ${cell('')}
      ${cell(`<span style="color:#BF2222;font-style:italic;">${label}</span>`)}
      ${cell(fmt(annuel / 12) + '/mois', 'color:#BF2222;font-style:italic;')}
      ${cell('−&nbsp;' + fmt(annuel), 'text-align:right;color:#BF2222;font-style:italic;')}
    </tr>`;

    const comptAnnuel = r2((data.revenusNets?.demandeur?.comptabiliseRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12);
    if (comptAnnuel > 0 || art35DemAn > 0) {
      tbody += SEC('Revenus professionnels nets');
      for (const row of (data.revenusNets?.demandeur?.comptabiliseRows || [])) {
        const m = safeN(row.montant);
        if (!m) continue;
        tbody += ROW(demCell(), row.customLabel || row.label || 'Revenus professionnels', `${fmt(m)}/mois`, r2(m * 12));
      }
      if (art35DemAn > 0) tbody += art35SubRow(art35Label(), art35DemAn);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 2 — Revenus professionnels exonérés (Art. 34)
    // ════════════════════════════════════════════════════════════════════
    const exonLigneAnnuel = r2((data.revenusNets?.demandeur?.exonereRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12);
    if (exonLigneAnnuel > 0) {
      tbody += SEC('Revenus professionnels exonérés (Art. 34)');
      for (const row of (data.revenusNets?.demandeur?.exonereRows || [])) {
        const m = safeN(row.montant);
        if (!m) continue;
        tbody += ROW(demCell(), row.type || 'Revenu exonéré', `${fmt(m)}/mois`, r2(m * 12), true);
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 3 — Chômage / Mutuelle / Remplacement
    // ════════════════════════════════════════════════════════════════════
    const chomAnnuel = safeN(apercu?.pro?.D9_chom_Annuel);
    const mutAnnuel  = safeN(apercu?.pro?.D10_mut_Annuel);
    const remAnnuel  = safeN(apercu?.pro?.D11_rem_Annuel);
    if (chomAnnuel + mutAnnuel + remAnnuel > 0) {
      tbody += SEC('Chômage / Mutuelle / Remplacement');

      const cmrSubRows = (fields, annuelTotal, shortLabel) => {
        const m1  = safeN(fields?.mensuelReel);
        const m2r = safeN(fields?.montantJour26);
        const m2m = r2(m2r * 26);
        const m3r = safeN(fields?.montantJourAnnuel);
        const m3m = r2(m3r * nbJours / 12);
        const subs = [
          m1  > 0 ? { nature: `${shortLabel} — mensuel réel`,             hauteur: `${fmt(m1)}/mois`,                                annuel: r2(m1 * 12)  } : null,
          m2r > 0 ? { nature: `${shortLabel} — taux/j × 26 j/mois`,       hauteur: `${fmt(m2r)}/j × 26 = ${fmt(m2m)}/mois`,          annuel: r2(m2m * 12) } : null,
          m3r > 0 ? { nature: `${shortLabel} — taux/j × ${nbJours} j/an`, hauteur: `${fmt(m3r)}/j × ${nbJours} j = ${fmt(m3m)}/mois`, annuel: r2(m3m * 12) } : null,
        ].filter(Boolean);
        let out = '';
        if (subs.length <= 1) {
          const h = subs.length ? subs[0].hauteur : `${fmt(r2(annuelTotal / 12))}/mois`;
          out += ROW(demCell(), shortLabel, h, annuelTotal);
        } else {
          for (let i = 0; i < subs.length; i++) {
            out += ROW(i === 0 ? demCell() : '', subs[i].nature, subs[i].hauteur, subs[i].annuel);
          }
          out += SUBTOT(`Total ${shortLabel.toLowerCase()}`, annuelTotal);
        }
        return out;
      };

      if (chomAnnuel > 0) tbody += cmrSubRows(data.cmr?.chomage, chomAnnuel, 'Allocation de chômage');
      if (mutAnnuel  > 0) tbody += cmrSubRows(data.cmr?.mutuelle, mutAnnuel, 'Indemnité de mutuelle');
      if (remAnnuel  > 0) {
        const cmrR = data.cmr?.remplacement || {};
        const subs = [
          { label: 'Pension',                     val: safeN(cmrR.pensionMensuel) },
          { label: 'Droit passerelle',            val: safeN(cmrR.droitPasserelleMensuel) },
          { label: 'Allocation handicapé (ARR)',  val: safeN(cmrR.allocationHandicapeMensuel) },
          { label: 'Indemnisation perte revenus', val: safeN(cmrR.indemnisation_perte_revenus) },
          { label: 'Autre revenu remplacement',   val: safeN(cmrR.autres_revenus) },
        ].filter(s => s.val > 0);
        subs.forEach(s => tbody += ROW(demCell(), s.label, `${fmt(s.val)}/mois`, r2(s.val * 12)));
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 4 — Ressources diverses
    // ════════════════════════════════════════════════════════════════════
    const divItems = [...(data.ressourcesDiverses?.generales || []), ...(data.ressourcesDiverses?.benevoles || [])].filter(r => safeN(r.montant) > 0);
    if (divItems.length > 0) {
      tbody += SEC('Ressources diverses');
      for (const r of divItems) {
        tbody += ROW(demCell(), r.label, `${fmt(safeN(r.montant))}/mois`, r2(safeN(r.montant) * 12));
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 5 — Avantages en nature
    // ════════════════════════════════════════════════════════════════════
    const avantItems = [
      { label: 'Charges locatives prises en charge par un tiers',    val: safeN(data.avantages?.chargesLocativesTiers) },
      { label: 'Loyer fictif évalué par un professionnel',           val: safeN(data.avantages?.loyerFictifProfessionnel) },
      { label: 'Loyer fictif (simulateur / grille de loyers)',       val: safeN(data.avantages?.loyerFictifSimulateur) },
      { label: 'Prêt hypothécaire pris en charge par un tiers',     val: safeN(data.avantages?.pretHypothecaireTiers) },
    ].filter(a => a.val > 0);
    if (avantItems.length > 0) {
      tbody += SEC('Avantages en nature');
      avantItems.forEach(a => tbody += ROW(demCell(), a.label, `${fmt(a.val)}/mois`, r2(a.val * 12)));
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 6 — Biens mobiliers
    // ════════════════════════════════════════════════════════════════════
    const bmAnnuel = safeN(apercu?.autres?.D20_mobiliers_Annuel);
    if (bmAnnuel > 0) {
      const bm = data.biensMobiliers || {};
      const B  = safeN(bm.montantCapital);
      const C  = safeN(bm.partConcernee) / 100;
      const MOB_R = 6200, MOB_S = 12500;
      const D5 = B === 0 ? 0 : Math.min(MOB_R, B) * C;
      const D6 = B > MOB_R ? Math.min(MOB_S, B) * C : 0;
      const D7 = B > MOB_S ? B * C : null;
      const E6 = D6 > D5 ? r2((D6 - D5) * 0.06) : 0;
      const E7 = D7 !== null ? r2((D7 - D6) * 0.10) : 0;
      tbody += SEC('Biens mobiliers');
      tbody += ROW(demCell(), `Capital : ${fmt(B)} × ${safeN(bm.partConcernee)}%`, `Tranche ≤ ${MOB_R.toLocaleString('fr-BE')} € → exonéré`, 0);
      if (B > MOB_R) tbody += ROW('', `Tranche ${MOB_R.toLocaleString('fr-BE')}–${MOB_S.toLocaleString('fr-BE')} €`, `${fmt(D6 - D5)} × 6 %`, E6);
      if (B > MOB_S) tbody += ROW('', `Tranche > ${MOB_S.toLocaleString('fr-BE')} €`, `${fmt(D7 - D6)} × 10 %`, E7);
      tbody += SUBTOT('Total biens mobiliers', bmAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 7 — Biens immobiliers
    // ════════════════════════════════════════════════════════════════════
    const immoAnnuel = safeN(apercu?.autres?.D23_immobiliers_Annuel);
    if (immoAnnuel > 0) {
      tbody += SEC('Biens immobiliers');
      const immoRowsDetail = result.immoDetails?.rowsDetail || [];
      if (immoRowsDetail.length > 0) {
        for (const r of immoRowsDetail) {
          const type = r.type || 'Bien immobilier';
          const loc  = r.localisation ? ` (${r.localisation})` : '';
          let hauteur;
          if (r.type === 'Étranger' || r.type === 'Etranger') {
            hauteur = 'Revenu immobilier étranger';
          } else {
            const pct   = r2(r.quote * 100);
            const parts = [];
            if (r.rc > 0) {
              parts.push(`RC non indexé : ${fmt(r.rc)} × ${pct}%`);
              if (r.L > 0) parts.push(`Exo. : ${fmt(r.L)}`);
              if (r.M > 0) parts.push(`(RC − Exo.) × 3 = ${fmt(r.M)}`);
            }
            if (r.locatifs > 0) parts.push(`Loyer : ${fmt(r.loyer)}/an × ${pct}% = ${fmt(r.locatifs)}`);
            if (r.dedInterets < 0) parts.push(`Int. déduits : ${fmt(r.dedInterets)}`);
            if (r.dedRente < 0)    parts.push(`Rente déduite : ${fmt(r.dedRente)}`);
            hauteur = parts.join(' — ') || '—';
          }
          tbody += ROW(demCell(), type + loc, hauteur, r.rowAnnuel);
        }
      } else {
        for (const bien of (data.biensImmobiliers?.rows || [])) {
          const rc    = safeN(bien.rcNonIndexe);
          const loyer = safeN(bien.loyerAnnuel);
          const type  = bien.typeBien || 'Bien immobilier';
          const loc   = bien.localisation ? ` (${bien.localisation})` : '';
          const hauteur = rc > 0 ? `RC non indexé : ${fmt(rc)} × ${safeN(bien.quotePart)}%` : loyer > 0 ? `Loyer : ${fmt(loyer)}/an` : '—';
          tbody += ROW(demCell(), type + loc, hauteur, 0);
        }
      }
      tbody += SUBTOT('Total biens immobiliers', immoAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 8 — Cessions de biens
    // ════════════════════════════════════════════════════════════════════
    const cessionsAnnuel = safeN(apercu?.autres?.D26_cessions_Annuel);
    if (cessionsAnnuel > 0) {
      tbody += SEC('Cessions de biens');
      const cessionsDetailList = result.cessionsDetails?.details || [];
      const cTranches = result.cessionsDetails?.tranches || {};
      const cessionsRows = data.cessionsBiens?.rows || [];
      let detailIdx = 0;
      for (const c of cessionsRows) {
        const vv = safeN(c.valeurVenale);
        if (!vv) continue;
        const calc = cessionsDetailList[detailIdx++];
        const type = c.typeBien || 'Bien cédé';
        const nat  = c.natureCession || 'Cession';
        if (calc) {
          tbody += ROW(demCell(), type, nat, calc.montantConsideration);
          tbody += ROWSUB('Valeur vénale', `${fmt(vv)} × ${safeN(c.partConcernee)}% (${c.titrePropriete || 'P.P.'}) = ${fmt(calc.montantVenal)}`);
          if (calc.trancheImmunisee > 0) tbody += ROWSUB('(−) Tranche immunisée', fmt(calc.trancheImmunisee));
          if (calc.abattement > 0)       tbody += ROWSUB(`(−) Abattement (${calc.nbMois} mois)`, fmt(calc.abattement));
          if (calc.dettesApplicables > 0) tbody += ROWSUB('(−) Dettes personnelles', fmt(calc.dettesApplicables));
          if (calc.dispenseEquite > 0)   tbody += ROWSUB('(−) Dispense équité', fmt(calc.dispenseEquite));
          tbody += ROWSUB('Montant à considérer', fmt(calc.montantConsideration));
        } else {
          tbody += ROW(demCell(), type, `${nat} — Valeur vénale : ${fmt(vv)} × ${safeN(c.partConcernee)}% (${c.titrePropriete || 'P.P.'})`, 0);
        }
      }
      // Art. 6.1c : tranches appliquées une fois sur le total des considérations
      if (cTranches.revenu2 > 0) tbody += ROWAMOUNT('Tranche T2 (6.200 – 12.500 €)', `${fmt(cTranches.t2 - cTranches.t1)} × 6 %`, cTranches.revenu2);
      if (cTranches.revenu3 > 0) tbody += ROWAMOUNT('Tranche T3 (> 12.500 €)', `${fmt(cTranches.t3 - cTranches.t2)} × 10 %`, cTranches.revenu3);
      tbody += SUBTOT('Total cessions', cessionsAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 9 — Cohabitants débiteurs
    // ════════════════════════════════════════════════════════════════════
    const debiteursCoh = cohDetails.filter(c => c.type !== 'Autre');
    const autresCoh    = cohDetails.filter(c => c.type === 'Autre');

    function renderCohDetail(coh) {
      const cohName       = coh.nom  || 'Cohabitant';
      const cohType       = coh.type || 'Ascendant/Descendant';
      const excedentBrut  = safeN(coh.excedent);
      const reportAn      = r2(safeN(coh.montantReporte) * 12);
      const priseEnCharge = coh.priseEnCharge || 'Report max';
      const isPasReport   = priseEnCharge === 'Pas de report';
      const isPartiel     = priseEnCharge === 'Report partiel';
      const pct           = safeN(coh.pctReport) || 100;
      let html = '';

      html += `<tr style="background:#eef2f7;">
        <td style="padding:7px 9px;border:1px solid #dee2e6;font-weight:700;color:#163E67;">${cohName}</td>
        <td colspan="3" style="padding:7px 9px;border:1px solid #dee2e6;color:#666;font-style:italic;">${cohType}</td>
      </tr>`;

      const bk = coh.breakdown || {};
      const hasBreakdown = Object.values(bk).some(v => v > 0);
      if (hasBreakdown) {
        const hasCmrDetail = (bk.chomAnnuel > 0 || bk.mutAnnuel > 0 || bk.remAnnuel > 0);
        const cmrLines = hasCmrDetail
          ? [
              { label: 'Allocation de chômage',   val: bk.chomAnnuel || 0 },
              { label: 'Indemnité de mutuelle',   val: bk.mutAnnuel  || 0 },
              { label: 'Revenus de remplacement', val: bk.remAnnuel  || 0 },
            ]
          : [{ label: 'Chômage / mutuelle / remplacement', val: bk.cmrAnnuel }];
        const bkLines = [
          { label: 'Revenus professionnels nets', val: bk.proAnnuel },
          ...cmrLines,
          { label: 'Cessions de biens',    val: bk.cessionsAnnuel },
          { label: 'Biens immobiliers',    val: bk.immoAnnuel },
          { label: 'Biens mobiliers',      val: bk.mobAnnuel },
          { label: 'Avantages en nature',  val: bk.avantagesAnnuel },
          { label: 'Ressources diverses',  val: bk.diversesAnnuel },
        ].filter(l => l.val > 0);
        for (const l of bkLines) {
          html += `<tr style="background:#f8fbff;">
            ${cell('')}
            ${cell(`<span style="color:#555;font-style:italic;">${l.label}</span>`)}
            ${cell(fmt(r2(l.val / 12)) + '/mois', 'color:#555;')}
            ${cell(fmt(l.val), 'text-align:right;color:#555;')}
          </tr>`;
        }
      } else {
        const details = (coh.revenusDetailes || []).filter(d => safeN(d.montant) > 0);
        if (details.length > 0) {
          for (const d of details) {
            const annualise = d.periode === 'annuel' ? safeN(d.montant) : r2(safeN(d.montant) * 12);
            html += `<tr style="background:#f8fbff;">
              ${cell('')}
              ${cell(`<span style="color:#555;font-style:italic;">${d.nature || 'Revenu'}</span>`)}
              ${cell(`${fmt(safeN(d.montant))}/${d.periode === 'annuel' ? 'an' : 'mois'}`, 'color:#555;')}
              ${cell(fmt(annualise), 'text-align:right;color:#555;')}
            </tr>`;
          }
        } else {
          html += `<tr style="background:#f8fbff;">
            ${cell('')}
            ${cell('<span style="color:#555;font-style:italic;">Ressources annuelles déclarées</span>')}
            ${cell(fmt(safeN(coh.ressourcesTotale)) + '/an', 'color:#555;')}
            ${cell(fmt(safeN(coh.ressourcesTotale)), 'text-align:right;color:#555;')}
          </tr>`;
        }
      }

      html += `<tr style="background:#e8f0f8;border-top:2px solid #b8cfe8;">
        ${cell('')}
        ${cell('<b>Total revenus</b>', 'color:#163E67;')}
        ${cell('')}
        ${cell('<b>' + fmt(safeN(coh.ressourcesTotale)) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
      </tr>`;
      html += `<tr style="background:#fef6f6;">
        ${cell('')}
        ${cell('(−) Seuil RI', 'color:#BF2222;')}
        ${cell('')}
        ${cell('−&nbsp;' + fmt(safeN(coh.seuilRI)), 'text-align:right;color:#BF2222;')}
      </tr>`;

      if (excedentBrut > 0) {
        html += `<tr style="background:#fff8dc;border-top:2px solid #f0c040;">
          ${cell('')}
          ${cell('<b>= Excédent</b>', 'color:#163E67;')}
          ${cell('')}
          ${cell('<b>' + fmt(excedentBrut) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
        </tr>`;
        if (isPartiel) {
          html += `<tr style="background:#fff8dc;">
            ${cell('')}
            ${cell(`× ${pct}&nbsp;% <span style="font-style:italic;color:#b8860b;">(report partiel)</span>`, 'color:#b8860b;')}
            ${cell('')}
            ${cell(fmt(reportAn), 'text-align:right;color:#b8860b;')}
          </tr>`;
        }
        if (!isPasReport) {
          html += `<tr style="background:#e8f5e9;border-top:2px solid #81c784;">
            ${cell('')}
            ${cell('<b>→ Montant reporté</b>', 'color:#155724;font-weight:bold;')}
            ${cell(fmt(safeN(coh.montantReporte)) + '/mois', 'color:#155724;')}
            ${cell('<b>' + fmt(reportAn) + '</b>', 'text-align:right;font-weight:bold;color:#155724;')}
          </tr>`;
        } else {
          html += `<tr style="background:#f9f9f9;">
            ${cell('')}
            ${cell('<i style="color:#888;">Pas de report (décision)</i>')}
            ${cell('')}
            ${cell(fmt(0), 'text-align:right;color:#aaa;')}
          </tr>`;
        }
      } else {
        html += `<tr style="background:#f9f9f9;border-top:2px solid #ddd;">
          ${cell('')}
          ${cell(`<i style="color:#888;">${coh.message || 'Pas d\'excédent (revenus ≤ seuil RI)'}</i>`)}
          ${cell('')}
          ${cell(fmt(0), 'text-align:right;color:#aaa;')}
        </tr>`;
      }
      return html;
    }

    const SEP_COH = () => `<tr><td colspan="4" style="padding:0;height:20px;border:none;background:white;"></td></tr>`;

    if (debiteursCoh.length > 0) {
      tbody += SEC('Revenus des cohabitants — débiteurs d\'aliments');
      for (let ci = 0; ci < debiteursCoh.length; ci++) {
        if (ci > 0) tbody += SEP_COH();
        tbody += renderCohDetail(debiteursCoh[ci]);
      }
      tbody += SEP_COH();
    }

    // ════════════════════════════════════════════════════════════════════
    // RÉSULTAT FINAL
    // ════════════════════════════════════════════════════════════════════
    tbody += SEP_STRONG();

    const grandTotal = safeN(apercu?.C37_totalRessourcesAnnuelles);
    tbody += `<tr style="background:#163E67;color:white;">
      ${cell('<b>TOTAL DES RESSOURCES</b>', 'color:white;font-weight:bold;border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('<b>' + fmt(grandTotal) + '</b>', 'text-align:right;font-weight:bold;color:white;border-color:#163E67;')}
    </tr>`;

    if (exoSuppl > 0) {
      tbody += `<tr style="background:#fff5f5;">
        ${cell('(−) Exonération supplémentaire (Art. 36)', 'color:#BF2222;font-style:italic;')}
        ${cell('', 'border-color:#ccc;')}
        ${cell('', 'border-color:#ccc;')}
        ${cell('−&nbsp;' + fmt(exoSuppl), 'text-align:right;color:#BF2222;font-style:italic;')}
      </tr>`;
      tbody += `<tr style="background:#e8f4f8;">
        ${cell('<b>= Ressources prises en compte</b>', 'color:#163E67;font-weight:bold;')}
        ${cell('', 'border-color:#ccc;')}
        ${cell('', 'border-color:#ccc;')}
        ${cell('<b>' + fmt(ressApresExo) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
      </tr>`;
    }

    tbody += `<tr style="background:#f0f4f8;">
      ${cell('Seuil RI (taux catégorie)', 'font-weight:bold;color:#163E67;')}
      ${cell(catLabel, 'border-color:#ccc;')}
      ${cell('', 'border-color:#ccc;')}
      ${cell(fmt(riAnnuelBrut), 'text-align:right;font-weight:bold;color:#163E67;')}
    </tr>`;

    const bgRI = eligible ? '#d4edda' : '#f8d7da';
    const colRI = eligible ? '#155724' : '#721c24';
    tbody += `<tr style="background:${bgRI};">
      ${cell(`<b>${eligible ? '✅ Revenu d\'intégration net' : '❌ Non éligible au RI'}</b>`, `color:${colRI};font-weight:bold;`)}
      ${cell(eligible ? `Mensuel : <b>${fmt(riMensuel)}</b>` : '', `color:${colRI};`)}
      ${cell('')}
      ${cell(eligible ? '<b>' + fmt(riAnnuel) + '</b>' : '−', `text-align:right;font-weight:bold;color:${colRI};`)}
    </tr>`;

    if (safeN(data.reference.joursPrisEnCompte) > 0) {
      const prorata = safeN(apercu?.ri?.montantMensuelProrata);
      tbody += `<tr style="background:#e8f4f8;">
        ${cell('<b>RI proratisé (mois incomplet)</b>')}
        ${cell(`${data.reference.joursPrisEnCompte} j sur ${apercu?.ri?.joursMois || '?'}`)}
        ${cell(`Mensuel proratisé : ${fmt(prorata)}`)}
        ${cell('<b>' + fmt(prorata) + '</b>/mois', 'text-align:right;font-weight:bold;')}
      </tr>`;
    }

    // Autres cohabitants (informatif)
    if (autresCoh.length > 0) {
      tbody += `<tr><td colspan="4" style="padding:0;height:8px;border:none;background:white;"></td></tr>`;
      tbody += `<tr style="background:#fdf6e3;">
        <td colspan="4" style="padding:8px 12px;font-size:13px;font-weight:700;color:#b8860b;border-top:2px solid #f0d060;border-bottom:1px solid #f0d060;letter-spacing:0.3px;">
          Autres cohabitants — à titre indicatif (non pris en compte dans le calcul du RI)
        </td>
      </tr>`;
      for (const coh of autresCoh) {
        const cohName = coh.nom || 'Cohabitant';
        tbody += `<tr style="background:#fdf6e3;">
          ${cell(`${cohName} <span style="font-style:italic;color:#b8860b;font-size:12px;">(Autre)</span>`)}
          ${cell('Ressources annuelles')}
          ${cell(fmt(safeN(coh.ressourcesTotale)) + '/an', 'color:#7a6000;')}
          ${cell(fmt(safeN(coh.ressourcesTotale)), 'text-align:right;color:#b8860b;')}
        </tr>
        <tr style="background:#fdf6e3;border-bottom:1px solid #f0d060;">
          <td style="border:1px solid #dee2e6;"></td>
          ${cell('Seuil RI', 'font-style:italic;color:#b8860b;')}
          ${cell(fmt(safeN(coh.seuilRI)) + '/an', 'color:#7a6000;font-style:italic;')}
          ${cell(fmt(safeN(coh.seuilRI)), 'text-align:right;color:#b8860b;font-style:italic;')}
        </tr>`;
      }
    }

    // ─── HTML COMPLET ────────────────────────────────────────────────────────
    const dateGen = new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#333;width:820px;padding:30px;background:white;">

        <!-- EN-TÊTE -->
        <div style="display:flex;align-items:center;margin-bottom:14px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height:40px;margin-right:16px;"/>` : ''}
          <div>
            <div style="font-size:19px;font-weight:bold;color:#163E67;">Rapport de simulation — Droit à l'intégration sociale</div>
            <div style="font-size:13px;color:#888;margin-top:3px;">
              Date d'octroi / révision : <b>${dateISO || '—'}</b> &nbsp;|&nbsp; Généré le ${new Date().toLocaleDateString('fr-BE')}
            </div>
          </div>
        </div>
        <div style="height:2px;background:linear-gradient(to right,#163E67,#2BEBCE);border-radius:2px;margin-bottom:16px;"></div>

        <!-- IDENTITÉ -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;padding:14px 16px;background:#f8f9fa;border-radius:8px;margin-bottom:14px;font-size:14px;">
          <div><b>Nom :</b> ${data.identite.nom || '—'}</div>
          <div><b>Prénom :</b> ${data.identite.prenom || '—'}</div>
          <div><b>Date de naissance :</b> ${data.identite.dateNaissance || '—'}</div>
          <div><b>Nationalité :</b> ${data.identite.nationalite || '—'}</div>
          <div><b>Situation :</b> ${catLabel} — ${data.menage.nbEnfants} enfant(s) à charge</div>
          <div><b>Seuil RI :</b> ${fmt(riAnnuelBrut)}/an (${fmt(r2(riAnnuelBrut / 12))}/mois)</div>
        </div>

        <!-- BOX ÉLIGIBILITÉ -->
        <div style="background:${eligible ? '#d4edda' : '#f8d7da'};padding:14px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid ${eligible ? '#28a745' : '#dc3545'};">
          <div style="font-weight:700;font-size:15px;color:${eligible ? '#155724' : '#721c24'};">
            ${eligible ? '✅ ÉLIGIBLE AU REVENU D\'INTÉGRATION' : '❌ NON ÉLIGIBLE AU REVENU D\'INTÉGRATION'}
          </div>
          ${eligible ? `
            <div style="margin-top:10px;display:flex;gap:28px;font-size:14px;color:${eligible ? '#155724' : '#721c24'};">
              <div><b>Mensuel :</b> ${fmt(riMensuel)}</div>
              <div><b>Annuel :</b> ${fmt(riAnnuel)}</div>
              ${safeN(data.reference.joursPrisEnCompte) > 0 ? `<div><b>Proratisé :</b> ${fmt(safeN(apercu?.ri?.montantMensuelProrata))}/mois (${data.reference.joursPrisEnCompte} j)</div>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- TABLEAU DÉTAILLÉ -->
        <div style="font-size:15px;font-weight:700;color:#163E67;border-bottom:2px solid #2BEBCE;padding-bottom:6px;margin-bottom:12px;">
          Tableau détaillé des ressources
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#163E67;color:white;">
              ${hcell('Personne', 'width:17%;color:white;')}
              ${hcell('Nature des revenus', 'width:23%;color:white;')}
              ${hcell('Hauteur des revenus', 'width:40%;color:white;')}
              ${hcell('Montant annuel', 'width:20%;text-align:right;color:white;')}
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>

        <!-- PIED DE PAGE -->
        <div style="margin-top:20px;font-size:12px;color:#aaa;text-align:center;border-top:1px solid #eee;padding-top:12px;">
          Simulateur RI — Vanden Broele CPASConnect — ${dateGen}
        </div>
      </div>`;

    // ─── RENDU → PDF ─────────────────────────────────────────────────────────
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:-9999px;top:0;background:white;';
    el.innerHTML = html;
    document.body.appendChild(el);

    const canvas = await html2canvas(el, { scale: 2, useCORS: false, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
    document.body.removeChild(el);

    const imgWidth  = 210;
    const pageH     = 297;
    const MARGIN_MM = 8;
    const usableH   = pageH - MARGIN_MM * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    if (imgHeight <= usableH) {
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, MARGIN_MM, imgWidth, imgHeight);
    } else {
      const pxPerMm = canvas.width / imgWidth;
      const pageHpx = Math.floor(usableH * pxPerMm);
      let offsetY = 0, pageIdx = 0;
      while (offsetY < canvas.height) {
        if (pageIdx > 0) pdf.addPage();
        const idealEnd = offsetY + pageHpx;
        const cutPx = idealEnd >= canvas.height ? canvas.height : findCleanBreak(canvas, idealEnd, pxPerMm);
        const sliceH  = cutPx - offsetY;
        const sliceCv = document.createElement('canvas');
        sliceCv.width  = canvas.width;
        sliceCv.height = sliceH;
        sliceCv.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        pdf.addImage(sliceCv.toDataURL('image/png'), 'PNG', 0, MARGIN_MM, imgWidth, (sliceH / pxPerMm));
        offsetY = cutPx;
        pageIdx++;
      }
    }

    const fileName = `RI_${data.identite.nom || 'simulation'}_${dateISO || new Date().toISOString().split('T')[0]}.pdf`;
    await downloadPDF(pdf.output('blob'), fileName);
    return true;
  } catch (err) {
    console.error('Erreur génération PDF:', err);
    return false;
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '0,00 €';
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
