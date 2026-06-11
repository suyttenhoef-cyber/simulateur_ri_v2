# Casus de formation — Simulateur RIS
**Vanden Broele / CPASConnect — Juin 2026**

---

## Objectifs pédagogiques

Ces quatre casus permettent de parcourir les situations les plus fréquentes rencontrées en pratique :

- L'impact du **taux** (cohabitant vs isolé) sur le montant du RIS
- Le traitement des **revenus des cohabitants** (débiteurs d'aliments)
- L'effet de l'**exonération Art. 35** sur un revenu professionnel partiel

---

## Casus 1A — Sophie vit chez ses parents bénéficiaires du RIS

**Énoncé**

Sophie Mertens, 24 ans, vit chez ses parents. Ceux-ci sont tous deux bénéficiaires du RIS au taux cohabitant (Cat. 1). Sophie n'a aucun revenu professionnel. Elle perçoit encore des allocations familiales de 347 €/mois.

**Données à encoder dans le simulateur**

- Date de référence : 01/06/2026
- Situation familiale : **Cohabitante (Cat. 1)**
- Revenus professionnels : néant
- Allocations familiales (ressources diverses) : **347 €/mois**

*Onglet « Revenus cohabitants »*

| Cohabitant | Type | Ressources annuelles | Catégorie | Prise en charge |
|---|---|---|---|---|
| Père | Ascendant majeur | 10 723,80 € | Cat. 1 | Report max |
| Mère | Ascendant majeur | 10 723,80 € | Cat. 1 | Report max |

> Les ressources des parents correspondent exactement au seuil RI Cat. 1 → excédent ≈ 0 → aucun report.

**Résultat attendu**

> RIS mensuel ≈ **559 €**

---

## Casus 1B — Sophie vit seule (même profil, autre situation)

**Énoncé**

Même dossier que 1A. Sophie s'est installée seule dans un logement. Les allocations familiales restent identiques (347 €/mois). Il n'y a plus de cohabitants.

**Données à encoder dans le simulateur**

- Date de référence : 01/06/2026
- Situation familiale : **Isolée (Cat. 2)**
- Revenus professionnels : néant
- Allocations familiales (ressources diverses) : **347 €/mois**
- Cohabitants : aucun

**Résultat attendu**

> RIS mensuel ≈ **865 €**

**Enseignement**

> À ressources identiques, le fait de vivre seule (Cat. 2) ouvre droit à un seuil RI plus élevé. Sophie touche environ **306 €/mois de plus** simplement parce qu'elle ne cohabite plus.

---

## Casus 2A — Bruno travaille en intérim depuis avant sa demande

**Énoncé**

Bruno Lecomte, 28 ans, vit seul. Il effectue des missions d'intérim depuis plusieurs mois et perçoit en moyenne 105,50 €/mois net. Il travaillait déjà lorsqu'il a introduit sa demande de RIS. Ses revenus sont donc intégralement pris en compte, sans bénéficier de l'exonération Art. 35.

**Données à encoder dans le simulateur**

- Date de référence : 01/02/2026
- Situation familiale : **Isolé (Cat. 2)**
- Revenus professionnels — ligne « comptabilisé » : **105,50 €/mois**
- Revenus professionnels — ligne « exonéré » : néant
- Exonération Art. 35 générale : **non activée**

**Résultat attendu**

> RIS mensuel ≈ **1 107 €**

---

## Casus 2B — Bruno commence à travailler après sa demande (exonération Art. 35)

**Énoncé**

Même dossier que 2A. Bruno n'avait aucun emploi lors de sa demande. Il débute des missions d'intérim après l'octroi du RIS et gagne 105,50 €/mois net. Étant donné qu'il commence à travailler après la demande, l'exonération générale Art. 35 §1 (plafond : 315,67 €/mois) s'applique. Son revenu (105,50 €) étant inférieur au plafond, il est **intégralement exonéré**.

**Données à encoder dans le simulateur**

- Date de référence : 01/02/2026
- Situation familiale : **Isolé (Cat. 2)**
- Revenus professionnels — ligne « comptabilisé » : **105,50 €/mois**
- Revenus professionnels — ligne « exonéré » : **105,50 €/mois**
- Exonération Art. 35 générale : **activée**

**Résultat attendu**

> RIS mensuel ≈ **1 191 € (= taux maximum Cat. 2)**

**Enseignement**

> Même salaire que le casus 2A, mais le démarrage de l'emploi **après** la demande change tout. L'exonération Art. 35 neutralise entièrement le revenu → Bruno touche le RIS **maximum**, soit environ **84 €/mois de plus** que dans le casus 2A.

---

## Tableau récapitulatif

| Casus | Situation | Ressources | RIS mensuel | Point clé |
|---|---|---|---|---|
| **1A** | Cohabitante (Cat. 1) | AF 347 €/mois | ≈ 559 € | Cohabitants sans excédent |
| **1B** | Isolée (Cat. 2) | AF 347 €/mois | ≈ 865 € | Taux plus favorable |
| **2A** | Isolé (Cat. 2) | Intérim 105,50 €/mois, sans exo | ≈ 1 107 € | Revenu intégralement compté |
| **2B** | Isolé (Cat. 2) | Intérim 105,50 €/mois, exo Art. 35 | ≈ 1 191 € | Revenu intégralement exonéré |

---

*Document à usage interne — Formation agents CPAS*
*Simulateur RIS v2 — Vanden Broele*
