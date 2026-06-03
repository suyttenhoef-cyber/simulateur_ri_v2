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
            <div><strong>Date de référence :</strong> ${data.reference.dateISO}</div>
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
              <td style="text-align: right;">${formatCurrency(apercu.pro.F14_totalRessourcesProAssim_M)}</td>
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
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
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
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    
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

    // ─── LIGNES DEMANDEUR ───────────────────────────────────────────────────
    const demRows = [];

    for (const row of (data.revenusNets?.demandeur?.rows || [])) {
      const comp = safeN(row.comptabilise);
      const exo  = safeN(row.exonere);
      const net  = comp - exo;
      if (comp === 0 && exo === 0) continue;
      const label = row.customLabel || row.label || 'Revenus professionnels';
      const hauteur = exo > 0
        ? `${fmt(comp)}/mois − exon. ${fmt(exo)} → net ${fmt(net)}/mois`
        : `${fmt(comp)}/mois`;
      demRows.push({ nature: label, hauteur, annuel: r2(net * 12) });
    }

    if (data.revenusNets?.conjoint?.enabled) {
      for (const row of (data.revenusNets.conjoint.rows || [])) {
        const comp = safeN(row.comptabilise);
        const exo  = safeN(row.exonere);
        const net  = comp - exo;
        if (comp === 0 && exo === 0) continue;
        const label = (row.customLabel || row.label || 'Revenus') + ' (conjoint)';
        const hauteur = exo > 0
          ? `${fmt(comp)}/mois − exon. ${fmt(exo)} → net ${fmt(net)}/mois`
          : `${fmt(comp)}/mois`;
        demRows.push({ nature: label, hauteur, annuel: r2(net * 12) });
      }
    }

    const chomAnnuel = safeN(apercu?.pro?.D9_chom_Annuel);
    if (chomAnnuel > 0) {
      const chomJour   = safeN(data.cmr?.chomage?.montantJourAnnuel);
      const chomJour26 = safeN(data.cmr?.chomage?.montantJour26);
      const hauteur = chomJour > 0
        ? `${fmt(chomJour)}/jour × ${nbJours} jours`
        : chomJour26 > 0
          ? `${fmt(chomJour26)}/jour × 26 jours/mois`
          : `${fmt(chomAnnuel / 12)}/mois`;
      demRows.push({ nature: 'Allocation de chômage', hauteur, annuel: chomAnnuel });
    }

    const mutAnnuel = safeN(apercu?.pro?.D10_mut_Annuel);
    if (mutAnnuel > 0) {
      const mutJour   = safeN(data.cmr?.mutuelle?.montantJourAnnuel);
      const mutJour26 = safeN(data.cmr?.mutuelle?.montantJour26);
      const hauteur = mutJour > 0
        ? `${fmt(mutJour)}/jour × ${nbJours} jours`
        : mutJour26 > 0
          ? `${fmt(mutJour26)}/jour × 26 jours/mois`
          : `${fmt(mutAnnuel / 12)}/mois`;
      demRows.push({ nature: 'Indemnité de mutuelle', hauteur, annuel: mutAnnuel });
    }

    const remAnnuel = safeN(apercu?.pro?.D11_rem_Annuel);
    if (remAnnuel > 0) {
      const cmrR = data.cmr?.remplacement || {};
      const subs = [
        { label: 'Pension',                       val: safeN(cmrR.pensionMensuel) },
        { label: 'Droit passerelle',              val: safeN(cmrR.droitPasserelleMensuel) },
        { label: 'Allocation handicapé (ARR)',    val: safeN(cmrR.allocationHandicapeMensuel) },
        { label: 'Indemnisation perte revenus',   val: safeN(cmrR.indemnisation_perte_revenus) },
        { label: 'Autre revenu de remplacement',  val: safeN(cmrR.autres_revenus) },
      ].filter(s => s.val > 0);
      const hauteur = subs.length === 1
        ? `${fmt(subs[0].val)}/mois (${subs[0].label})`
        : subs.map(s => `${s.label} : ${fmt(s.val)}/mois`).join(' + ');
      demRows.push({ nature: 'Revenus de remplacement', hauteur, annuel: remAnnuel });
    }

    for (const r of [...(data.ressourcesDiverses?.generales || []), ...(data.ressourcesDiverses?.benevoles || [])]) {
      const m = safeN(r.montant);
      if (m > 0) demRows.push({ nature: r.label, hauteur: `${fmt(m)}/mois`, annuel: r2(m * 12) });
    }

    const totalDemandeur = r2(demRows.reduce((s, r) => s + r.annuel, 0));

    // ─── COHABITANTS ────────────────────────────────────────────────────────
    const cohDetails = result.cohabitants?.details || [];

    // ─── CONSTRUCTION HTML ──────────────────────────────────────────────────
    const cell  = (html, style = '') => `<td style="padding:7px 9px;border:1px solid #dee2e6;vertical-align:top;${style}">${html ?? ''}</td>`;
    const hcell = (html, style = '') => `<th style="padding:9px;border:1px solid #1a3e60;text-align:left;${style}">${html}</th>`;

    let tbody = '';

    // Demandeur
    if (demRows.length === 0) {
      tbody += `<tr>
        ${cell(`<b>${prenomNom}</b><br/><span style="color:#666;font-size:11px;">${catLabel}</span>`, 'background:#f8f9fa;')}
        ${cell('Aucun revenu enregistré', 'color:#aaa;font-style:italic;')}
        ${cell('')}${cell('0,00 €', 'text-align:right;')}
      </tr>`;
    } else {
      tbody += `<tr>
        <td rowspan="${demRows.length + 1}" style="padding:7px 9px;border:1px solid #dee2e6;vertical-align:top;background:#f8f9fa;font-weight:bold;">
          ${prenomNom}<br/><span style="font-weight:normal;color:#555;font-size:11px;">${catLabel}</span>
        </td>
        ${cell(demRows[0].nature)}
        ${cell(demRows[0].hauteur, 'font-size:12px;color:#444;')}
        ${cell(fmt(demRows[0].annuel), 'text-align:right;')}
      </tr>`;
      for (let i = 1; i < demRows.length; i++) {
        tbody += `<tr>
          ${cell(demRows[i].nature)}
          ${cell(demRows[i].hauteur, 'font-size:12px;color:#444;')}
          ${cell(fmt(demRows[i].annuel), 'text-align:right;')}
        </tr>`;
      }
      tbody += `<tr style="background:#eaf3ea;">
        ${cell('<b>Sous-total ' + prenomNom + '</b>', 'font-style:italic;')}
        ${cell('')}
        ${cell('<b>' + fmt(totalDemandeur) + '</b>', 'text-align:right;font-weight:bold;')}
      </tr>`;
    }

    // Séparateur
    tbody += `<tr><td colspan="4" style="padding:0;height:3px;background:#163E67;border:none;"></td></tr>`;

    // Cohabitants (on ignore les lignes vides sans ressources saisies)
    for (const coh of cohDetails) {
      if (safeN(coh.ressourcesTotale) === 0) continue;
      const catLabelCoh = coh.categorie === 1 ? 'Cat. 1 - Cohabitant' : coh.categorie === 2 ? 'Cat. 2 - Isolé' : 'Cat. 3 - Famille';
      const cohName  = coh.nom  || 'Cohabitant';
      const cohType  = coh.type || 'Ascendant/Descendant';
      const hasExced = coh.excedent > 0;
      const reportAn = r2(coh.montantReporte * 12);

      tbody += `<tr>
        <td rowspan="3" style="padding:7px 9px;border:1px solid #dee2e6;vertical-align:top;background:#f8f9fa;font-weight:bold;">
          ${cohName}<br/><span style="font-weight:normal;color:#555;font-size:11px;">${cohType}</span>
        </td>
        ${cell('Ressources annuelles totales')}
        ${cell(fmt(coh.ressourcesTotale) + '/an', 'font-size:12px;color:#444;')}
        ${cell(fmt(coh.ressourcesTotale), 'text-align:right;')}
      </tr>
      <tr>
        ${cell('Seuil RI (' + catLabelCoh + ')')}
        ${cell('Seuil à ne pas dépasser : ' + fmt(coh.seuilRI), 'font-size:12px;color:#444;')}
        ${cell('−' + fmt(coh.seuilRI), 'text-align:right;color:#888;')}
      </tr>
      <tr style="${hasExced ? 'background:#fff8dc;' : ''}">
        ${cell(hasExced ? '<b>Montant excédant le seuil (reporté)</b>' : `<i style="color:#888;">${coh.message || "Pas d'excédent"}</i>`)}
        ${cell(hasExced ? fmt(coh.montantMensuel) + '/mois' : '', 'font-size:12px;color:#444;')}
        ${cell(hasExced ? '<b>' + fmt(reportAn) + '</b>' : fmt(0), 'text-align:right;' + (hasExced ? 'font-weight:bold;color:#163E67;' : 'color:#aaa;'))}
      </tr>`;

      tbody += `<tr><td colspan="4" style="padding:0;height:1px;background:#dee2e6;border:none;"></td></tr>`;
    }

    // Total général
    const grandTotal = safeN(apercu?.C37_totalRessourcesAnnuelles);
    tbody += `<tr style="background:#163E67;color:white;">
      ${cell('<b>TOTAL DES RESSOURCES (C37)</b>', 'color:white;font-weight:bold;border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('', 'border-color:#163E67;')}
      ${cell('<b>' + fmt(grandTotal) + '</b>', 'text-align:right;font-weight:bold;color:white;border-color:#163E67;')}
    </tr>`;

    // Résultat RI
    const eligible  = result.eligible;
    const riAnnuel  = safeN(apercu?.ri?.C43_riAnnuelNet);
    const riMensuel = safeN(apercu?.ri?.E45_montantMensuel);
    const riSeuil   = safeN(apercu?.ri?.riAnnuelBrut);
    const bgRI = eligible ? '#d4edda' : '#f8d7da';
    const colRI = eligible ? '#155724' : '#721c24';
    tbody += `<tr style="background:${bgRI};">
      ${cell(`<b>${eligible ? '✅ Éligible au RI' : '❌ Non éligible au RI'}</b>`, `color:${colRI};font-weight:bold;`)}
      ${cell(eligible
        ? `Seuil RI (${catLabel}) : ${fmt(riSeuil)}`
        : `Ressources ${fmt(grandTotal)} ≥ seuil ${fmt(riSeuil)}`)}
      ${cell(eligible ? `Mensuel : ${fmt(riMensuel)}` : '', 'font-size:12px;')}
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
      <div style="font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#333;width:820px;padding:30px;background:white;">
        <div style="display:flex;align-items:center;margin-bottom:18px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height:38px;margin-right:14px;"/>` : ''}
          <div>
            <div style="font-size:18px;font-weight:bold;color:#163E67;">Tableau des ressources — Droit à l'intégration sociale</div>
            <div style="font-size:11px;color:#888;margin-top:2px;">Date de référence : ${dateISO} &nbsp;|&nbsp; Généré le ${new Date().toLocaleDateString('fr-BE')}</div>
          </div>
        </div>
        <div style="margin-bottom:14px;padding:8px 12px;background:#f0f4f8;border-radius:6px;font-size:12px;">
          <b>${prenomNom}</b> — ${catLabel} — ${data.menage.nbEnfants} enfant(s) à charge
          ${safeN(data.reference.joursPrisEnCompte) > 0 ? ` &nbsp;|&nbsp; Prorata : ${data.reference.joursPrisEnCompte} jours sur ${apercu?.ri?.joursMois || '?'}` : ''}
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
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
        <div style="margin-top:20px;font-size:10px;color:#bbb;text-align:center;">
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