import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Fonction helper pour convertir un Blob en base64
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Détecte si l'application est dans un iframe
 */
function isInIframe() {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
}

/**
 * Convertir une image en base64 pour éviter les problèmes CORS
 */
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
  } catch (error) {
    console.warn('Impossible de charger l\'image:', url, error);
    // Retourner une image par défaut ou vide
    return '';
  }
}

/**
 * Télécharge le PDF dans le navigateur
 */
async function downloadPDF(pdfBlob, fileName) {
  if (isInIframe()) {
    // Dans un iframe : envoyer au parent
    try {
      const base64Data = await blobToBase64(pdfBlob);
      window.parent.postMessage({
        type: 'DOWNLOAD_PDF',
        fileName: fileName,
        pdfData: base64Data
      }, '*'); // En production, remplacez '*' par l'URL exacte du parent
      
      console.log('PDF envoyé à la fenêtre parente');
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du PDF au parent:', error);
      // Fallback : ouvrir dans un nouvel onglet
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
      return true;
    }
  } else {
    // Pas dans un iframe : téléchargement normal
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

/**
 * Génère un PDF à partir des données de simulation
 */
export async function generatePDF(data, result, apercu) {
  try {
    // Précharger le logo en base64 pour éviter les problèmes CORS
    const logoBase64 = await imageToBase64('https://www.cpasconnect.be/img/cpasconnect/logo.svg');
    
    // Créer un élément HTML temporaire pour le PDF
    const pdfElement = document.createElement('div');
    pdfElement.style.position = 'absolute';
    pdfElement.style.left = '-9999px';
    pdfElement.style.top = '0';
    pdfElement.style.width = '800px';
    pdfElement.style.background = 'white';
    pdfElement.style.padding = '30px';
    pdfElement.style.fontFamily = "'Source Sans Pro', sans-serif";
    document.body.appendChild(pdfElement);

    // Helpers pour construire les lignes de revenus du simple PDF
    const fmtS = formatCurrency;
    const safeNS = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
    const rowS = (label, monthly, annual, style = '') =>
      annual > 0 || monthly > 0
        ? `<tr${style ? ` style="${style}"` : ''}><td style="padding:6px 8px;">${label}</td><td style="text-align:right;padding:6px 8px;">${fmtS(monthly)}</td><td style="text-align:right;padding:6px 8px;">${fmtS(annual)}</td></tr>`
        : '';
    const secS = (label) =>
      `<tr><td colspan="3" style="padding:10px 8px;font-weight:bold;background:#f0f8ff;">${label}</td></tr>`;

    // Revenus professionnels demandeur (ligne par ligne, filtrés à > 0)
    const proRows = (() => {
      let html = '';
      for (const r of (data.revenusNets?.demandeur?.comptabiliseRows || [])) {
        const m = safeNS(r.montant);
        if (m > 0) html += rowS(r.customLabel || r.label || 'Revenu net professionnel', m, m * 12);
      }
      for (const r of (data.revenusNets?.demandeur?.exonereRows || [])) {
        const m = safeNS(r.montant);
        if (m > 0) html += rowS(`(−) ${r.customLabel || r.label || 'Revenu exonéré'}`, m, m * 12, 'color:#c0392b;');
      }
      return html;
    })();

    // Allocations & ressources diverses (chômage, mutuelle, remplacement, diverses)
    const allocRows = (() => {
      let html = '';
      const chom = safeNS(apercu?.pro?.D9_chom_Annuel);
      const mut  = safeNS(apercu?.pro?.D10_mut_Annuel);
      const rem  = safeNS(apercu?.pro?.D11_rem_Annuel);
      const div  = safeNS(apercu?.autres?.D17_diverses_Annuel);
      if (chom > 0) html += rowS('Allocation de chômage', chom / 12, chom);
      if (mut  > 0) html += rowS('Indemnité de mutuelle', mut / 12, mut);
      if (rem  > 0) html += rowS('Revenus de remplacement', rem / 12, rem);
      if (div  > 0) {
        for (const r of [...(data.ressourcesDiverses?.generales || []), ...(data.ressourcesDiverses?.benevoles || [])]) {
          const m = safeNS(r.montant);
          if (m > 0) html += rowS(r.label || 'Allocation diverse', m, m * 12);
        }
      }
      return html;
    })();

    // Autres ressources (biens, cessions, avantages)
    const autresRows = (() => {
      let html = '';
      const immo = safeNS(apercu?.autres?.D23_immobiliers_Annuel);
      const mob  = safeNS(apercu?.autres?.D20_mobiliers_Annuel);
      const cess = safeNS(apercu?.autres?.D26_cessions_Annuel);
      const avt  = safeNS(apercu?.autres?.D29_avantages_Annuel);
      if (immo > 0) html += rowS('Revenus immobiliers', immo / 12, immo);
      if (mob  > 0) html += rowS('Biens mobiliers', mob / 12, mob);
      if (cess > 0) html += rowS('Cessions de biens', cess / 12, cess);
      if (avt  > 0) html += rowS('Avantages en nature', avt / 12, avt);
      return html;
    })();

    // Cohabitants débiteurs uniquement dans le tableau revenus (autresCohabitants → section séparée après calcul)
    const cohRows = (() => {
      let html = '';
      const debs = (result.cohabitants?.debiteurs || []);
      const coh32 = safeNS(apercu?.autres?.D32_cohabitants_Annuel);
      if (debs.length > 0) {
        for (const d of debs) {
          const res = safeNS(d.ressourcesTotale);
          html += rowS(d.nom ? `Cohabitant : ${d.nom} (${d.type})` : `Cohabitant (${d.type})`, res / 12, res);
        }
        if (coh32 > 0) html += rowS('<b>Excédent comptabilisé</b>', coh32 / 12, coh32, 'font-style:italic;');
      }
      return html;
    })();

    // Section "Autres cohabitants" (informatif) — sera rendue après le calcul détaillé
    const autresCohabSection = (() => {
      const autres = (result.cohabitants?.autresCohabitants || []);
      if (autres.length === 0) return '';
      let rows = '';
      for (const d of autres) {
        const res = safeNS(d.ressourcesTotale);
        rows += `<tr style="border-top:1px solid #f0d060;">
          <td style="padding:6px 8px;color:#7a6000;">${d.nom || 'Cohabitant'} <span style="font-style:italic;">(Autre — seuil : ${fmtS(safeNS(d.seuilRI))}/an)</span></td>
          <td style="text-align:right;padding:6px 8px;color:#7a6000;">${fmtS(res/12)}</td>
          <td style="text-align:right;padding:6px 8px;color:#7a6000;">${fmtS(res)}</td>
        </tr>`;
      }
      return `<div style="margin-top:20px;padding:14px;background:#fdf6e3;border-left:4px solid #f0d060;border-radius:4px;">
        <div style="font-size:12px;font-weight:700;color:#b8860b;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:8px;">
          Autres cohabitants — à titre informatif (non comptabilisés dans le RIS)
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead><tr style="color:#b8860b;font-weight:600;">
            <th style="text-align:left;padding:4px 8px;">Cohabitant</th>
            <th style="text-align:right;padding:4px 8px;">Mensuel</th>
            <th style="text-align:right;padding:4px 8px;">Annuel</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
    })();

    // Générer le contenu HTML pour le PDF
    pdfElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 20px;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="CPAS Connect" style="height: 50px; margin-right: 15px;" />` : '<div style="width: 50px; height: 50px; margin-right: 15px;"></div>'}
          <div style="border-left: 2px solid #163E67; height: 40px; margin-right: 15px;"></div>
          <div>
            <h1 style="margin: 0; color: #163E67; font-size: 24px;">Simulateur de Revenu d'Intégration</h1>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">${new Date().toLocaleDateString('fr-BE')}</p>
          </div>
        </div>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
      </div>

      <!-- Informations de base -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #163E67; border-bottom: 2px solid #2BEBCE; padding-bottom: 8px;">Informations du demandeur</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">
          <div><strong>Nom :</strong> ${data.identite.nom || 'Non renseigné'}</div>
          <div><strong>Prénom :</strong> ${data.identite.prenom || 'Non renseigné'}</div>
          <div><strong>Date de naissance :</strong> ${data.identite.dateNaissance || 'Non renseignée'}</div>
          <div><strong>Nationalité :</strong> ${data.identite.nationalite || 'Non renseignée'}</div>
          <div><strong>Situation familiale :</strong> ${data.menage.situation}</div>
          <div><strong>Enfants à charge :</strong> ${data.menage.nbEnfants}</div>
        </div>
      </div>

      <!-- Statut d'éligibilité -->
      <div style="background: ${result.eligible ? '#d4edda' : '#f8d7da'}; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
        <h3 style="margin: 0; color: ${result.eligible ? '#155724' : '#721c24'}">
          ${result.eligible ? '✅ ÉLIGIBLE AU REVENU D\'INTÉGRATION' : '❌ NON ÉLIGIBLE AU REVENU D\'INTÉGRATION'}
        </h3>
        ${result.eligible ? `
          <div style="margin-top: 15px;">
            <div><strong>Montant mensuel :</strong> ${formatCurrency(result.apercu.ri.E45_montantMensuel)}</div>
            <div><strong>Montant annuel :</strong> ${formatCurrency(result.apercu.ri.C43_riAnnuelNet)}</div>
            <div><strong>Date d'octroi / révision :</strong> ${data.reference.dateISO}</div>
          </div>
        ` : ''}
      </div>

      <!-- Synthèse des revenus -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #163E67; border-bottom: 2px solid #2BEBCE; padding-bottom: 8px;">Synthèse des revenus</h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="text-align: left; padding: 8px; border-bottom: 2px solid #dee2e6;">Rubrique</th>
              <th style="text-align: right; padding: 8px; border-bottom: 2px solid #dee2e6;">Mensuel</th>
              <th style="text-align: right; padding: 8px; border-bottom: 2px solid #dee2e6;">Annuel</th>
            </tr>
          </thead>
          <tbody>
            ${proRows ? secS('Revenus professionnels nets') + proRows : ''}
            ${allocRows ? secS('Allocations &amp; ressources diverses') + allocRows : ''}
            ${autresRows ? secS('Autres ressources') + autresRows : ''}
            ${cohRows ? secS('Cohabitants') + cohRows : ''}
            <tr style="background: #e8f4f8; font-weight: bold; border-top: 2px solid #163E67;">
              <td style="padding:8px;">Total des ressources</td>
              <td style="text-align:right;padding:8px;">${formatCurrency(apercu.C37_totalRessourcesAnnuelles / 12)}</td>
              <td style="text-align:right;padding:8px;">${formatCurrency(apercu.C37_totalRessourcesAnnuelles)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Calcul détaillé -->
      <div style="margin-bottom: 30px;">
        <h2 style="color: #163E67; border-bottom: 2px solid #2BEBCE; padding-bottom: 8px;">Calcul détaillé</h2>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 15px;">
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #163E67;">Seuils applicables</h4>
            <div><strong>Seuil RI annuel :</strong> ${formatCurrency(result.apercu.ri.riAnnuelBrut)}</div>
            <div><strong>Catégorie :</strong> ${data.menage.situation === 'isolé' ? '2 (Isolé)' : data.menage.situation === 'cohabitant' ? '1 (Cohabitant)' : '3 (Famille)'}</div>
            <div><strong>Exonération supplémentaire :</strong> ${formatCurrency(result.apercu.ri.C39_exoSupplAnnuelle)}</div>
          </div>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0; color: #163E67;">Résultat final</h4>
            <div><strong>Ressources après exonération :</strong> ${formatCurrency(result.apercu.ri.C41_ressourcesApresExo)}</div>
            <div><strong>Revenu d'intégration annuel :</strong> ${formatCurrency(result.apercu.ri.C43_riAnnuelNet)}</div>
            <div><strong>Revenu d'intégration mensuel :</strong> ${formatCurrency(result.apercu.ri.E45_montantMensuel)}</div>
          </div>
        </div>
      </div>

      <!-- Prorata jours -->
      ${data.reference.joursPrisEnCompte ? `
        <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 2px solid #1f6feb;">
          <h3 style="margin-top: 0; color: #163E67;">Calcul prorata jours</h3>
          <div><strong>Jours pris en compte :</strong> ${data.reference.joursPrisEnCompte} / ${result.apercu.ri.joursMois} jours</div>
          <div><strong>Revenu d'intégration proratisé :</strong> ${formatCurrency(result.apercu.ri.montantMensuelProrata)}</div>
        </div>
      ` : ''}

      <!-- Autres cohabitants (informatif) — après le calcul détaillé -->
      ${autresCohabSection}

      <!-- Pied de page -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 14px;">
        <p>Document généré automatiquement par le Simulateur de Revenu d'Intégration - CPASConnect</p>
        <p>Vanden Broele - ${new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    `;

    // Générer le PDF avec html2canvas
    const canvas = await html2canvas(pdfElement, {
      scale: 2,
      useCORS: false, // Désactivé car on utilise base64
      allowTaint: true, // Permet les images cross-origin
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pxPerMm = canvas.height / imgHeight;
    const pageHpx = Math.floor(pageHeight * pxPerMm);

    // Trouver une ligne de coupe propre : on remonte depuis le point idéal
    // jusqu'à trouver la ligne la plus blanche (evite de couper en plein texte)
    const findCleanBreak = (idealPx) => {
      const windowPx = Math.min(Math.round(40 * pxPerMm), 200); // ≈40mm ou 200px max
      const ctx = canvas.getContext('2d');
      let bestLine = idealPx;
      let bestScore = -1;
      for (let y = idealPx; y > idealPx - windowPx && y > 0; y--) {
        const data = ctx.getImageData(0, y, canvas.width, 1).data;
        let whiteCount = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) whiteCount++;
        }
        const score = whiteCount / (canvas.width);
        if (score > bestScore) { bestScore = score; bestLine = y; }
        if (score > 0.97) break; // ligne quasi-blanche trouvée, on s'arrête
      }
      return bestLine;
    };

    let offsetY = 0;
    let pageIndex = 0;
    while (offsetY < canvas.height) {
      const idealEnd = offsetY + pageHpx;
      const cutPx = idealEnd >= canvas.height ? canvas.height : findCleanBreak(idealEnd);
      const sliceH = cutPx - offsetY;
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      sliceCanvas.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHmm = (sliceH / pxPerMm);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(sliceData, 'PNG', 0, 0, imgWidth, sliceHmm);
      offsetY = cutPx;
      pageIndex++;
    }
    
    // Nettoyer l'élément temporaire
    document.body.removeChild(pdfElement);

    // Générer le nom du fichier
    const fileName = `RI_${data.identite.nom || 'simulation'}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Créer le blob du PDF
    const pdfBlob = pdf.output('blob');
    
    // Télécharger le PDF (gère automatiquement iframe ou non)
    await downloadPDF(pdfBlob, fileName);

    return true;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    return false;
  }
}

function daysPaidInYear(year) {
  let count = 0;
  for (let d = new Date(Date.UTC(year, 0, 1)); d.getUTCFullYear() === year; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0) count++;
  }
  return count;
}

/**
 * Génère un PDF au format "Tableau CPAS" (personne / nature / hauteur / montant annuel)
 */
export async function generateTableauCPAS(data, result, apercu) {
  try {
    const fmt = formatCurrency;
    const safeN = (x) => { const n = Number(x); return isFinite(n) ? n : 0; };
    const r2 = (x) => Math.round(x * 100) / 100;

    const dateISO = data.reference.dateISO || '2025-02-01';
    const year = parseInt(dateISO.split('-')[0]) || 2025;
    const nbJours = daysPaidInYear(year);

    const categorie = data.menage.situation === 'isolé' ? 2 : data.menage.situation === 'cohabitant' ? 1 : 3;
    const prenomNom = [data.identite.prenom, data.identite.nom].filter(Boolean).join(' ') || 'Demandeur';
    const catLabel = categorie === 1 ? 'Cohabitant (Cat. 1)' : categorie === 2 ? 'Isolé (Cat. 2)' : 'Famille (Cat. 3)';

    // ─── HELPERS ────────────────────────────────────────────────────────────
    const cell  = (html, style = '') => `<td style="padding:7px 9px;border:1px solid #dee2e6;vertical-align:top;${style}">${html ?? ''}</td>`;
    const hcell = (html, style = '') => `<th style="padding:9px;border:1px solid #1a3e60;text-align:left;${style}">${html}</th>`;

    // En-tête de section (4 colonnes, bordure gauche colorée)
    // La ligne blanche avant le titre crée un espace propre pour les coupures de page
    const SEC = (title) => `<tr><td colspan="4" style="padding:0;height:28px;border:none;background:white;"></td></tr>
    <tr style="background:#eef2f7;">
      <td colspan="4" style="padding:8px 10px;border:1px solid #dee2e6;font-weight:bold;color:#163E67;border-left:4px solid #2BEBCE;">${title}</td>
    </tr>`;

    // Ligne de données : personne | nature | hauteur | montant annuel
    const ROW = (person, nature, hauteur, annuel, neg = false) => `<tr>
      ${cell(`<b>${person}</b>`)}
      ${cell(nature)}
      ${cell(hauteur || '', 'color:#444;')}
      ${cell((neg ? '−' : '') + fmt(Math.abs(annuel)), 'text-align:right;' + (neg ? 'color:#c0392b;' : ''))}
    </tr>`;

    // Ligne de sous-total
    const SUBTOT = (label, annuel) => `<tr style="background:#f0f4f8;">
      <td colspan="3" style="padding:7px 9px;border:1px solid #dee2e6;font-style:italic;color:#555;">${label}</td>
      <td style="padding:7px 9px;border:1px solid #dee2e6;text-align:right;font-weight:bold;color:#163E67;">${fmt(annuel)}</td>
    </tr>`;

    // Séparateur léger
    const SEP = () => `<tr><td colspan="4" style="padding:0;height:1px;background:#dee2e6;border:none;"></td></tr>`;

    // Séparateur fort (entre grandes sections)
    const SEP_STRONG = () => `<tr><td colspan="4" style="padding:0;height:3px;background:#163E67;border:none;"></td></tr>`;

    // Constantes apercu
    const cohDetails = result.cohabitants?.details || [];
    const hasAutreCohabitants = cohDetails.some(c => c.type === 'Autre' && safeN(c.ressourcesTotale) > 0);

    // Le nom du demandeur n'est affiché qu'une seule fois (première ligne du tableau)
    let demShown = false;
    const demCell = () => { const n = demShown ? '' : prenomNom; demShown = true; return n; };

    let tbody = '';

    // ════════════════════════════════════════════════════════════════════
    // SECTION 1 — Revenus professionnels nets
    // ════════════════════════════════════════════════════════════════════
    // Pré-calcul Art. 35 (utilisé dans Section 1 en sous-ligne)
    const art35DemAn = r2(safeN(apercu?.pro?.D4_netDem_Annuel) - safeN(apercu?.pro?.D6_netAvantExoSP_Dem_Annuel));

    // Helper : libellé du type d'exo Art. 35 depuis les cases cochées
    const art35Label = () => {
      const e = data.exoneration?.demandeur || {};
      const types = [
        e.general    && 'général',
        e.etudiant   && 'étudiant',
        e.penurie    && 'pénurie',
        e.artisteSP  && 'artiste SP',
      ].filter(Boolean);
      return `(−) Exonération Art. 35${types.length ? ' (' + types.join(' + ') + ')' : ''}`;
    };

    // Sous-ligne Art. 35 insérée directement après les revenus de la personne
    const art35SubRow = (label, annuel) => `<tr style="background:#fff5f5;">
      ${cell('')}
      ${cell(`<span style="color:#c0392b;font-style:italic;">${label}</span>`)}
      ${cell(fmt(annuel / 12) + '/mois', 'color:#c0392b;font-style:italic;')}
      ${cell('−&nbsp;' + fmt(annuel), 'text-align:right;color:#c0392b;font-style:italic;')}
    </tr>`;

    // ════════════════════════════════════════════════════════════════════
    // SECTION 1 — Revenus professionnels nets + Art. 35 en sous-ligne
    // ════════════════════════════════════════════════════════════════════
    const comptAnnuel = r2(
      (data.revenusNets?.demandeur?.comptabiliseRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12
    );
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
    // SECTION 2 — Revenus professionnels exonérés (par ligne)
    // ════════════════════════════════════════════════════════════════════
    const exonLigneAnnuel = r2(
      (data.revenusNets?.demandeur?.exonereRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12
    );
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
    // SECTION 4 — Chômage / Mutuelle / Remplacement
    // ════════════════════════════════════════════════════════════════════
    const chomAnnuel = safeN(apercu?.pro?.D9_chom_Annuel);
    const mutAnnuel  = safeN(apercu?.pro?.D10_mut_Annuel);
    const remAnnuel  = safeN(apercu?.pro?.D11_rem_Annuel);
    if (chomAnnuel + mutAnnuel + remAnnuel > 0) {
      tbody += SEC('Chômage / Mutuelle / Remplacement');

      // Helper : détailler les composantes d'une allocation (chômage ou mutuelle)
      const cmrSubRows = (fields, annuelTotal, shortLabel) => {
        const m1    = safeN(fields?.mensuelReel);
        const m2r   = safeN(fields?.montantJour26);
        const m2m   = r2(m2r * 26);
        const m3r   = safeN(fields?.montantJourAnnuel);
        const m3m   = r2(m3r * nbJours / 12);
        const subs  = [
          m1  > 0 ? { nature: `${shortLabel} — mensuel réel`,            hauteur: `${fmt(m1)}/mois`,                                                annuel: r2(m1 * 12)   } : null,
          m2r > 0 ? { nature: `${shortLabel} — taux/j × 26 j/mois`,      hauteur: `${fmt(m2r)}/j × 26 = ${fmt(m2m)}/mois`,                          annuel: r2(m2m * 12)  } : null,
          m3r > 0 ? { nature: `${shortLabel} — taux/j × ${nbJours} j/an`,hauteur: `${fmt(m3r)}/j × ${nbJours} j = ${fmt(m3m)}/mois`,                annuel: r2(m3m * 12)  } : null,
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
          { label: 'Pension',                      val: safeN(cmrR.pensionMensuel) },
          { label: 'Droit passerelle',             val: safeN(cmrR.droitPasserelleMensuel) },
          { label: 'Allocation handicapé (ARR)',   val: safeN(cmrR.allocationHandicapeMensuel) },
          { label: 'Indemnisation perte revenus',  val: safeN(cmrR.indemnisation_perte_revenus) },
          { label: 'Autre revenu remplacement',    val: safeN(cmrR.autres_revenus) },
        ].filter(s => s.val > 0);
        subs.forEach(s => tbody += ROW(demCell(), s.label, `${fmt(s.val)}/mois`, r2(s.val * 12)));
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 5 — Ressources diverses (toutes, y compris celles exonérées = 0 €)
    // ════════════════════════════════════════════════════════════════════
    const divItemsAll = [...(data.ressourcesDiverses?.generales || []), ...(data.ressourcesDiverses?.benevoles || [])].filter(r => safeN(r.montant) > 0);
    if (divItemsAll.length > 0) {
      tbody += SEC('Ressources diverses');
      for (const r of divItemsAll) {
        tbody += ROW(demCell(), r.label, `${fmt(safeN(r.montant))}/mois`, r2(safeN(r.montant) * 12));
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 6 — Avantages en nature
    // ════════════════════════════════════════════════════════════════════
    const avantItems = [
      { label: 'Charges locatives prises en charge par un tiers',      val: safeN(data.avantages?.chargesLocativesTiers) },
      { label: 'Loyer fictif évalué par un professionnel',             val: safeN(data.avantages?.loyerFictifProfessionnel) },
      { label: 'Loyer fictif (simulateur / grille de loyers)',         val: safeN(data.avantages?.loyerFictifSimulateur) },
      { label: 'Prêt hypothécaire pris en charge par un tiers',       val: safeN(data.avantages?.pretHypothecaireTiers) },
    ].filter(a => a.val > 0);
    if (avantItems.length > 0) {
      tbody += SEC('Avantages en nature');
      avantItems.forEach(a => tbody += ROW(demCell(), a.label, `${fmt(a.val)}/mois`, r2(a.val * 12)));
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 7 — Biens mobiliers
    // ════════════════════════════════════════════════════════════════════
    const bmAnnuel = safeN(apercu?.autres?.D20_mobiliers_Annuel);
    if (bmAnnuel > 0) {
      const bm = data.biensMobiliers || {};
      const B = safeN(bm.montantCapital);
      const C = safeN(bm.partConcernee) / 100;
      const MOB_R = 6200, MOB_S = 12500;
      const D5 = B === 0 ? 0 : Math.min(MOB_R, B) * C;
      const D6 = B > MOB_R ? Math.min(MOB_S, B) * C : 0;
      const D7 = B > MOB_S ? B * C : null;
      const E6 = D6 > D5 ? r2((D6 - D5) * 0.06) : 0;
      const E7 = D7 !== null ? r2((D7 - D6) * 0.10) : 0;
      tbody += SEC('Biens mobiliers');
      tbody += ROW(demCell(), `Capital : ${fmt(B)} × ${safeN(bm.partConcernee)}%`, `Tranche ≤ ${MOB_R.toLocaleString('fr-BE')} € → exonéré`, 0);
      if (B > MOB_R) tbody += ROW('', `Tranche ${MOB_R.toLocaleString('fr-BE')}–${MOB_S.toLocaleString('fr-BE')} €`, `${fmt(D6 - D5)} × 6 %`, E6);
      if (B > MOB_S)  tbody += ROW('', `Tranche > ${MOB_S.toLocaleString('fr-BE')} €`, `${fmt(D7 - D6)} × 10 %`, E7);
      tbody += SUBTOT('Total biens mobiliers', bmAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 8 — Biens immobiliers
    // ════════════════════════════════════════════════════════════════════
    const immoAnnuel = safeN(apercu?.autres?.D23_immobiliers_Annuel);
    if (immoAnnuel > 0) {
      tbody += SEC('Biens immobiliers');
      for (const bien of (data.biensImmobiliers?.rows || [])) {
        const rc = safeN(bien.rcNonIndexe);
        const loyer = safeN(bien.loyerAnnuel);
        const type = bien.typeBien || 'Bien immobilier';
        const loc = bien.localisation ? ` (${bien.localisation})` : '';
        const hauteur = rc > 0 ? `RC non indexé : ${fmt(rc)} × ${safeN(bien.quotePart)}%` : loyer > 0 ? `Loyer : ${fmt(loyer)}/an` : '—';
        tbody += ROW(demCell(), type + loc, hauteur, 0);
      }
      tbody += SUBTOT('Total biens immobiliers (calculé)', immoAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 9 — Cessions de biens
    // ════════════════════════════════════════════════════════════════════
    const cessionsAnnuel = safeN(apercu?.autres?.D26_cessions_Annuel);
    if (cessionsAnnuel > 0) {
      tbody += SEC('Cessions de biens');
      for (const c of (data.cessionsBiens?.rows || [])) {
        const vv = safeN(c.valeurVenale);
        if (!vv) continue;
        const type = c.typeBien || 'Bien cédé';
        const nat = c.natureCession || 'Cession';
        const hauteur = `${nat} — Valeur vénale : ${fmt(vv)} × ${safeN(c.partConcernee)}% (${c.titrePropriete || 'P.P.'})`;
        tbody += ROW(demCell(), type, hauteur, 0);
      }
      tbody += SUBTOT('Total cessions (calculé)', cessionsAnnuel);
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 10 — Cohabitants
    // ════════════════════════════════════════════════════════════════════
    const debiteursCoh = cohDetails.filter(c => c.type !== 'Autre');
    const autresCoh    = cohDetails.filter(c => c.type === 'Autre');

    function renderCohDetail(coh) {
      const cohName      = coh.nom  || 'Cohabitant';
      const cohType      = coh.type || 'Ascendant/Descendant';
      const excedentBrut = safeN(coh.excedent);
      const reportAn     = r2(safeN(coh.montantReporte) * 12);
      const priseEnCharge = coh.priseEnCharge || 'Report max';
      const isPasReport  = priseEnCharge === 'Pas de report';
      const isPartiel    = priseEnCharge === 'Report partiel';
      const pct          = safeN(coh.pctReport) || 100;

      let html = '';

      // ── En-tête : nom + type ──────────────────────────────────────────
      html += `<tr style="background:#eef2f7;">
        <td style="padding:7px 9px;border:1px solid #dee2e6;font-weight:700;color:#163E67;">${cohName}</td>
        <td colspan="3" style="padding:7px 9px;border:1px solid #dee2e6;color:#666;font-style:italic;">${cohType}</td>
      </tr>`;

      // ── Revenus détaillés ─────────────────────────────────────────────
      const bk = coh.breakdown || {};
      const hasBreakdown = Object.values(bk).some(v => v > 0);
      if (hasBreakdown) {
        // CMR : utiliser les sous-totaux individuels si disponibles (nouveau format)
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
          { label: 'Cessions de biens', val: bk.cessionsAnnuel },
          { label: 'Biens immobiliers', val: bk.immoAnnuel },
          { label: 'Biens mobiliers', val: bk.mobAnnuel },
          { label: 'Avantages en nature', val: bk.avantagesAnnuel },
          { label: 'Ressources diverses', val: bk.diversesAnnuel },
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

      // ── Calcul explicite ──────────────────────────────────────────────
      // Total revenus
      html += `<tr style="background:#e8f0f8;border-top:2px solid #b8cfe8;">
        ${cell('')}
        ${cell('<b>Total revenus</b>', 'color:#163E67;')}
        ${cell('')}
        ${cell('<b>' + fmt(safeN(coh.ressourcesTotale)) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
      </tr>`;

      // (−) Seuil RI
      html += `<tr style="background:#fef6f6;">
        ${cell('')}
        ${cell('(−) Seuil RI', 'color:#c0392b;')}
        ${cell('')}
        ${cell('−&nbsp;' + fmt(safeN(coh.seuilRI)), 'text-align:right;color:#c0392b;')}
      </tr>`;

      if (excedentBrut > 0) {
        // = Excédent brut
        html += `<tr style="background:#fff8dc;border-top:2px solid #f0c040;">
          ${cell('')}
          ${cell('<b>= Excédent</b>', 'color:#163E67;')}
          ${cell('')}
          ${cell('<b>' + fmt(excedentBrut) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
        </tr>`;

        // × % si report partiel
        if (isPartiel) {
          html += `<tr style="background:#fff8dc;">
            ${cell('')}
            ${cell(`× ${pct}&nbsp;% <span style="font-style:italic;color:#b8860b;">(report partiel)</span>`, 'color:#b8860b;')}
            ${cell('')}
            ${cell(fmt(reportAn), 'text-align:right;color:#b8860b;')}
          </tr>`;
        }

        // → Montant reporté (résultat final)
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
        // Pas d'excédent
        html += `<tr style="background:#f9f9f9;border-top:2px solid #ddd;">
          ${cell('')}
          ${cell(`<i style="color:#888;">${coh.message || 'Pas d\'excédent (revenus ≤ seuil RI)'}</i>`)}
          ${cell('')}
          ${cell(fmt(0), 'text-align:right;color:#aaa;')}
        </tr>`;
      }

      return html;
    }

    // Spacer blanc entre cohabitants pour favoriser les coupures de page propres
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
    // TOTAL C37 + RÉSULTAT RI
    // ════════════════════════════════════════════════════════════════════
    tbody += SEP_STRONG();

    const grandTotal = safeN(apercu?.C37_totalRessourcesAnnuelles);
    tbody += `<tr style="background:#163E67;color:white;">
      ${cell('<b>TOTAL DES RESSOURCES</b>', 'color:white;font-weight:bold;border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('<b>' + fmt(grandTotal) + '</b>', 'text-align:right;font-weight:bold;color:white;border-color:#163E67;')}
    </tr>`;

    const eligible  = result.eligible;
    const riAnnuel  = safeN(apercu?.ri?.C43_riAnnuelNet);
    const riMensuel = safeN(apercu?.ri?.E45_montantMensuel);
    const bgRI = eligible ? '#d4edda' : '#f8d7da';
    const colRI = eligible ? '#155724' : '#721c24';
    tbody += `<tr style="background:${bgRI};">
      ${cell(`<b>${eligible ? '✅ Éligible au RI' : '❌ Non éligible au RI'}</b>`, `color:${colRI};font-weight:bold;`)}
      ${cell(eligible ? `Mensuel : ${fmt(riMensuel)}` : '')}
      ${cell(eligible ? '<b>' + fmt(riAnnuel) + '</b>' : '−', 'text-align:right;font-weight:bold;')}
    </tr>`;

    if (safeN(data.reference.joursPrisEnCompte) > 0) {
      const prorata = safeN(apercu?.ri?.montantMensuelProrata);
      tbody += `<tr style="background:#e8f4f8;">
        ${cell('<b>RI proratisé (mois incomplet)</b>')}
        ${cell(`${data.reference.joursPrisEnCompte} jours sur ${apercu?.ri?.joursMois || '?'}`)}
        ${cell(`Mensuel proratisé : ${fmt(prorata)}`)}
        ${cell('<b>' + fmt(prorata) + '</b>/mois', 'text-align:right;font-weight:bold;')}
      </tr>`;
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION FINALE — Autres cohabitants (informatif, tout en bas)
    // ════════════════════════════════════════════════════════════════════
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
    const logoBase64 = await imageToBase64('https://www.cpasconnect.be/img/cpasconnect/logo.svg');

    const html = `
      <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:14px;color:#333;width:820px;padding:30px;background:white;">
        <div style="display:flex;align-items:center;margin-bottom:18px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height:38px;margin-right:14px;"/>` : ''}
          <div>
            <div style="font-size:18px;font-weight:bold;color:#163E67;">Tableau des ressources — Droit à l'intégration sociale</div>
            <div style="font-size:14px;color:#888;margin-top:2px;">Date d'octroi / révision : ${dateISO} &nbsp;|&nbsp; Généré le ${new Date().toLocaleDateString('fr-BE')}</div>
          </div>
        </div>
        <div style="margin-bottom:14px;padding:8px 12px;background:#f0f4f8;border-radius:6px;font-size:14px;">
          <b>${prenomNom}</b> — ${catLabel} — ${data.menage.nbEnfants} enfant(s) à charge
          &nbsp;|&nbsp; <b>Seuil RI : ${fmt(safeN(apercu?.ri?.riAnnuelBrut))}/an</b> (${fmt(r2(safeN(apercu?.ri?.riAnnuelBrut) / 12))}/mois)
          ${safeN(data.reference.joursPrisEnCompte) > 0 ? ` &nbsp;|&nbsp; Prorata : ${data.reference.joursPrisEnCompte} jours sur ${apercu?.ri?.joursMois || '?'}` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#163E67;color:white;">
              ${hcell('Personne', 'width:18%;color:white;')}
              ${hcell('Nature des revenus', 'width:24%;color:white;')}
              ${hcell('Hauteur des revenus', 'width:38%;color:white;')}
              ${hcell('Montant annuel', 'width:20%;text-align:right;color:white;')}
            </tr>
          </thead>
          <tbody>${tbody}</tbody>
        </table>
        <div style="margin-top:20px;font-size:14px;color:#bbb;text-align:center;">
          Simulateur RI — Vanden Broele CPASConnect — ${new Date().toLocaleDateString('fr-BE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>`;

    // ─── RENDU → PDF ─────────────────────────────────────────────────────────
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:-9999px;top:0;background:white;';
    el.innerHTML = html;
    document.body.appendChild(el);

    const canvas = await html2canvas(el, { scale: 2, useCORS: false, allowTaint: true, logging: false, backgroundColor: '#ffffff' });
    document.body.removeChild(el);

    const imgData   = canvas.toDataURL('image/png');
    const pdf       = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const imgWidth  = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageH     = 297;

    // Coupe intelligente : remonte depuis le point idéal pour trouver une ligne blanche
    const findCleanBreakCPAS = (canvas, idealPx, pxPerMm) => {
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
    };

    const MARGIN_MM = 8;
    const usableH   = pageH - MARGIN_MM * 2;
    if (imgHeight <= usableH) {
      pdf.addImage(imgData, 'PNG', 0, MARGIN_MM, imgWidth, imgHeight);
    } else {
      const pxPerMm = canvas.width / imgWidth;
      const pageHpx = Math.floor(usableH * pxPerMm);
      let offsetY   = 0;
      let pageIdx   = 0;
      while (offsetY < canvas.height) {
        if (pageIdx > 0) pdf.addPage();
        const idealEnd = offsetY + pageHpx;
        const cutPx = idealEnd >= canvas.height ? canvas.height : findCleanBreakCPAS(canvas, idealEnd, pxPerMm);
        const sliceH  = cutPx - offsetY;
        const sliceCv = document.createElement('canvas');
        sliceCv.width  = canvas.width;
        sliceCv.height = sliceH;
        sliceCv.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceImg = sliceCv.toDataURL('image/png');
        pdf.addImage(sliceImg, 'PNG', 0, MARGIN_MM, imgWidth, (sliceH / pxPerMm));
        offsetY = cutPx;
        pageIdx++;
      }
    }

    const fileName = `Tableau_RI_${data.identite.nom || 'simulation'}_${dateISO}.pdf`;
    await downloadPDF(pdf.output('blob'), fileName);
    return true;
  } catch (err) {
    console.error('Erreur tableau CPAS:', err);
    return false;
  }
}

// Fonction d'aide pour formater la monnaie
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '0,00 €';
  return new Intl.NumberFormat('fr-BE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}