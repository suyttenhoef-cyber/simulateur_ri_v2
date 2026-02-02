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
          <img src="https://www.cpasconnect.be/img/cpasconnect/logo.svg" alt="CPAS Connect" style="height: 50px; margin-right: 15px;" />
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
      useCORS: true,
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