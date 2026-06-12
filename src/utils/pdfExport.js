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
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="text-align: left; padding: 12px 8px; border-bottom: 2px solid #dee2e6;">Rubrique</th>
              <th style="text-align: right; padding: 12px 8px; border-bottom: 2px solid #dee2e6;">Mensuel</th>
              <th style="text-align: right; padding: 12px 8px; border-bottom: 2px solid #dee2e6;">Annuel</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="3" style="padding: 10px 8px; font-weight: bold; background: #f0f8ff;">Ressources professionnelles</td></tr>
            <tr><td>Revenu net demandeur</td><td style="text-align: right;">${formatCurrency(apercu.pro.D4_netDem_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.pro.D4_netDem_Annuel)}</td></tr>
            <tr><td>Revenu net conjoint</td><td style="text-align: right;">${formatCurrency(apercu.pro.D5_netConj_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.pro.D5_netConj_Annuel)}</td></tr>
            <tr><td>Allocation de chômage</td><td style="text-align: right;">${formatCurrency(apercu.pro.D9_chom_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.pro.D9_chom_Annuel)}</td></tr>
            
            <tr><td colspan="3" style="padding: 10px 8px; font-weight: bold; background: #f0f8ff; border-top: 1px solid #dee2e6;">Autres ressources</td></tr>
            <tr><td>Ressources diverses</td><td style="text-align: right;">${formatCurrency(apercu.autres.D17_diverses_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.autres.D17_diverses_Annuel)}</td></tr>
            <tr><td>Biens immobiliers</td><td style="text-align: right;">${formatCurrency(apercu.autres.D23_immobiliers_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.autres.D23_immobiliers_Annuel)}</td></tr>
            <tr><td>Biens mobiliers</td><td style="text-align: right;">${formatCurrency(apercu.autres.D20_mobiliers_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.autres.D20_mobiliers_Annuel)}</td></tr>
            <tr><td>Cessions de biens</td><td style="text-align: right;">${formatCurrency(apercu.autres.D26_cessions_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.autres.D26_cessions_Annuel)}</td></tr>
            <tr><td>Cohabitants</td><td style="text-align: right;">${formatCurrency(apercu.autres.D32_cohabitants_Annuel / 12)}</td><td style="text-align: right;">${formatCurrency(apercu.autres.D32_cohabitants_Annuel)}</td></tr>
            
            <tr style="background: #e8f4f8; font-weight: bold; border-top: 2px solid #163E67;">
              <td>Total des ressources</td>
              <td style="text-align: right;">${formatCurrency(apercu.C37_totalRessourcesAnnuelles / 12)}</td>
              <td style="text-align: right;">${formatCurrency(apercu.C37_totalRessourcesAnnuelles)}</td>
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

    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
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
    const SEC = (title) => `<tr style="background:#eef2f7;">
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

    let tbody = '';

    // ════════════════════════════════════════════════════════════════════
    // SECTION 1 — Revenus professionnels nets
    // ════════════════════════════════════════════════════════════════════
    const comptAnnuel = r2(
      (data.revenusNets?.demandeur?.comptabiliseRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12 +
      (data.revenusNets?.conjoint?.enabled
        ? (data.revenusNets.conjoint.comptabiliseRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12
        : 0)
    );
    if (comptAnnuel > 0) {
      tbody += SEC('Revenus professionnels nets');
      for (const row of (data.revenusNets?.demandeur?.comptabiliseRows || [])) {
        const m = safeN(row.montant);
        if (!m) continue;
        tbody += ROW(prenomNom, row.customLabel || row.label || 'Revenus professionnels', `${fmt(m)}/mois`, r2(m * 12));
      }
      if (data.revenusNets?.conjoint?.enabled) {
        for (const row of (data.revenusNets.conjoint.comptabiliseRows || [])) {
          const m = safeN(row.montant);
          if (!m) continue;
          tbody += ROW('Conjoint', row.customLabel || row.label || 'Revenus professionnels', `${fmt(m)}/mois`, r2(m * 12));
        }
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 2 — Revenus professionnels exonérés (par ligne)
    // ════════════════════════════════════════════════════════════════════
    const exonLigneAnnuel = r2(
      (data.revenusNets?.demandeur?.exonereRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12 +
      (data.revenusNets?.conjoint?.enabled
        ? (data.revenusNets.conjoint.exonereRows || []).reduce((s, r) => s + safeN(r.montant), 0) * 12
        : 0)
    );
    if (exonLigneAnnuel > 0) {
      tbody += SEC('Revenus professionnels exonérés');
      for (const row of (data.revenusNets?.demandeur?.exonereRows || [])) {
        const m = safeN(row.montant);
        if (!m) continue;
        tbody += ROW(prenomNom, row.type || 'Revenu exonéré', `${fmt(m)}/mois`, r2(m * 12), true);
      }
      if (data.revenusNets?.conjoint?.enabled) {
        for (const row of (data.revenusNets.conjoint.exonereRows || [])) {
          const m = safeN(row.montant);
          if (!m) continue;
          tbody += ROW('Conjoint', row.type || 'Revenu exonéré', `${fmt(m)}/mois`, r2(m * 12), true);
        }
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 3 — Exonérations légales Art. 35 (général / étudiant / pénurie)
    // ════════════════════════════════════════════════════════════════════
    const art35DemAn = r2(safeN(apercu?.pro?.D4_netDem_Annuel) - safeN(apercu?.pro?.D6_netAvantExoSP_Dem_Annuel));
    const art35ConjAn = r2(safeN(apercu?.pro?.D5_netConj_Annuel) - safeN(apercu?.pro?.D7_netAvantExoSP_Conj_Annuel));
    if (art35DemAn > 0 || art35ConjAn > 0) {
      tbody += SEC('Montants exonérés — Insertion socioprofessionnelle (Art. 35 AR)');
      if (art35DemAn > 0)
        tbody += ROW(prenomNom, 'Exonération Art. 35 (général / étudiant / pénurie)', `${fmt(art35DemAn / 12)}/mois`, art35DemAn, true);
      if (art35ConjAn > 0)
        tbody += ROW('Conjoint', 'Exonération Art. 35 (général / étudiant / pénurie)', `${fmt(art35ConjAn / 12)}/mois`, art35ConjAn, true);
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
      if (chomAnnuel > 0) {
        const cj = safeN(data.cmr?.chomage?.montantJourAnnuel);
        const cj26 = safeN(data.cmr?.chomage?.montantJour26);
        const h = cj > 0 ? `${fmt(cj)}/jour × ${nbJours} jours` : cj26 > 0 ? `${fmt(cj26)}/jour × 26` : `${fmt(chomAnnuel / 12)}/mois`;
        tbody += ROW(prenomNom, 'Allocation de chômage', h, chomAnnuel);
      }
      if (mutAnnuel > 0) {
        const mj = safeN(data.cmr?.mutuelle?.montantJourAnnuel);
        const mj26 = safeN(data.cmr?.mutuelle?.montantJour26);
        const h = mj > 0 ? `${fmt(mj)}/jour × ${nbJours} jours` : mj26 > 0 ? `${fmt(mj26)}/jour × 26` : `${fmt(mutAnnuel / 12)}/mois`;
        tbody += ROW(prenomNom, 'Indemnité de mutuelle', h, mutAnnuel);
      }
      if (remAnnuel > 0) {
        const cmrR = data.cmr?.remplacement || {};
        const subs = [
          { label: 'Pension',                      val: safeN(cmrR.pensionMensuel) },
          { label: 'Droit passerelle',             val: safeN(cmrR.droitPasserelleMensuel) },
          { label: 'Allocation handicapé (ARR)',   val: safeN(cmrR.allocationHandicapeMensuel) },
          { label: 'Indemnisation perte revenus',  val: safeN(cmrR.indemnisation_perte_revenus) },
          { label: 'Autre revenu remplacement',    val: safeN(cmrR.autres_revenus) },
        ].filter(s => s.val > 0);
        subs.forEach(s => tbody += ROW(prenomNom, s.label, `${fmt(s.val)}/mois`, r2(s.val * 12)));
      }
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 5 — Ressources diverses
    // ════════════════════════════════════════════════════════════════════
    const divItems = [...(data.ressourcesDiverses?.generales || []), ...(data.ressourcesDiverses?.benevoles || [])].filter(r => safeN(r.montant) > 0);
    if (divItems.length > 0) {
      tbody += SEC('Ressources diverses');
      divItems.forEach(r => tbody += ROW(prenomNom, r.label, `${fmt(safeN(r.montant))}/mois`, r2(safeN(r.montant) * 12)));
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
      avantItems.forEach(a => tbody += ROW(prenomNom, a.label, `${fmt(a.val)}/mois`, r2(a.val * 12)));
      tbody += SEP();
    }

    // ════════════════════════════════════════════════════════════════════
    // SECTION 7 — Biens mobiliers
    // ════════════════════════════════════════════════════════════════════
    const bmAnnuel = safeN(apercu?.autres?.D20_mobiliers_Annuel);
    if (bmAnnuel > 0) {
      const bm = data.biensMobiliers || {};
      tbody += SEC('Biens mobiliers');
      tbody += ROW(prenomNom, 'Capital mobilier', `${fmt(safeN(bm.montantCapital))} × ${safeN(bm.partConcernee)}%`, bmAnnuel);
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
        tbody += ROW(prenomNom, type + loc, hauteur, 0);
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
        tbody += ROW(prenomNom, type, hauteur, 0);
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
      const catLabelCoh = coh.categorie === 1 ? 'Cat. 1 - Cohabitant' : coh.categorie === 2 ? 'Cat. 2 - Isolé' : 'Cat. 3 - Famille';
      const cohName    = coh.nom  || 'Cohabitant';
      const cohType    = coh.type || 'Ascendant/Descendant';
      const hasExced   = coh.excedent > 0;
      const reportAn   = r2(coh.montantReporte * 12);

      let html = ROW(
        `${cohName}<br/><span style="font-size:13px;font-weight:normal;color:#666;">${cohType}</span>`,
        'Ressources annuelles totales',
        `${fmt(coh.ressourcesTotale)}/an`,
        coh.ressourcesTotale
      );

      // Détail des revenus encodés (filtré : montant > 0)
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
      }

      html += ROW('', `Seuil RI (${catLabelCoh})`, `Seuil : ${fmt(coh.seuilRI)}`, coh.seuilRI, true);
      if (hasExced) {
        html += `<tr style="background:#fff8dc;">
          ${cell('')}
          ${cell('<b>Excédent reporté</b>')}
          ${cell(fmt(coh.montantMensuel) + '/mois', 'color:#444;')}
          ${cell('<b>' + fmt(reportAn) + '</b>', 'text-align:right;font-weight:bold;color:#163E67;')}
        </tr>`;
      } else {
        html += `<tr><td></td>${cell(`<i style="color:#888;">${coh.message || "Pas d'excédent"}</i>`)}${cell('')}${cell(fmt(0), 'text-align:right;color:#aaa;')}</tr>`;
      }
      return html;
    }

    if (debiteursCoh.length > 0) {
      tbody += SEC('Revenus des cohabitants — débiteurs d\'aliments');
      for (const coh of debiteursCoh) {
        tbody += renderCohDetail(coh);
        tbody += SEP();
      }
    }

    if (autresCoh.length > 0) {
      tbody += `<tr style="background:#fdf6e3;">
        <td colspan="4" style="padding:8px 12px;font-size:13px;font-weight:700;color:#b8860b;border:1px solid #dee2e6;letter-spacing:0.4px;">
          Autres cohabitants — à titre indicatif (non pris en compte dans le calcul du RI)
        </td>
      </tr>`;
      for (const coh of autresCoh) {
        const cohName = coh.nom || 'Cohabitant';
        tbody += `<tr style="background:#fdf6e3;">
          ${cell(`${cohName} <span style="font-style:italic;color:#b8860b;">(Autre)</span>`)}
          ${cell('Ressources annuelles')}
          ${cell(fmt(coh.ressourcesTotale) + '/an', 'color:#7a6000;')}
          ${cell(fmt(coh.ressourcesTotale), 'text-align:right;color:#b8860b;')}
        </tr>
        <tr style="background:#fdf6e3;"><td></td>
          <td colspan="3" style="padding:5px 9px;border:1px solid #dee2e6;font-style:italic;color:#b8860b;font-size:12px;">
            Non reporté dans le calcul du RI
          </td>
        </tr>`;
        tbody += SEP();
      }
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
          ${hasAutreCohabitants ? ` &nbsp;|&nbsp; <span style="color:#b8860b;">⚠ Cohabitant(s) de type « Autre » repris à titre indicatif uniquement — non pris en compte dans le calcul du RI</span>` : ''}
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

    if (imgHeight <= pageH) {
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    } else {
      const pxPerMm    = canvas.width / imgWidth;
      const pageHpx    = pageH * pxPerMm;
      let   offsetY    = 0;
      while (offsetY < canvas.height) {
        if (offsetY > 0) pdf.addPage();
        const sliceH  = Math.min(pageHpx, canvas.height - offsetY);
        const sliceCv = document.createElement('canvas');
        sliceCv.width  = canvas.width;
        sliceCv.height = sliceH;
        sliceCv.getContext('2d').drawImage(canvas, 0, offsetY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceImg = sliceCv.toDataURL('image/png');
        pdf.addImage(sliceImg, 'PNG', 0, 0, imgWidth, (sliceH * imgWidth) / canvas.width);
        offsetY += pageHpx;
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