# Casus de formation — Simulateur RI
**Vanden Broele / CPASConnect — Septembre 2026**

> **Barèmes de référence : 01/09/2026.** Tous les montants attendus ci-dessous
> ont été calculés à cette date. Le simulateur applique le barème de la date
> d'octroi encodée : si vous modifiez les dates des casus, les résultats
> changeront. À revérifier à chaque indexation.

---

## Objectifs pédagogiques

Les casus sont répartis en deux séries.

**Casus courts (1A à 2B)** — un ou deux champs à encoder, pour installer les mécanismes de base. 5 minutes chacun.

- L'impact du **taux** (cohabitant vs isolé) sur le montant du RI
- Le traitement des **revenus des cohabitants** (débiteurs d'aliments)
- Le **forfait de 240 €** pour les allocations familiales perçues par un débiteur cohabitant (réforme du 01/03/2026)
- L'effet de l'**exonération Art. 35** sur un revenu professionnel partiel
- Le rôle de la case **« Nouvelle demande »** dans l'accès à cette exonération

**Casus étendus (3 à 5)** — plusieurs rubriques à encoder, pour parcourir la largeur de l'outil. 10 à 12 minutes chacun.

- Le **chômage** encodé au montant journalier, le **patrimoine** mobilier et immobilier, les **avantages en nature**
- Les **cessions de biens**, et l'écart entre cession onéreuse et cession gratuite
- Les **types de cohabitants** et leur traitement différencié, le **défraiement du volontaire**, le **prorata** d'un mois incomplet

Chaque casus étendu comporte un détail du calcul ligne par ligne, à confronter avec l'onglet Aperçu du simulateur.

---

## Casus 1A — Sophie vit chez ses parents bénéficiaires du RI

**Énoncé**

Sophie Mertens, 24 ans, étudiante, vit chez ses parents. Ceux-ci sont tous deux bénéficiaires du RI au taux cohabitant (Cat. 1). Sophie n'a aucun revenu professionnel. Elle perçoit une allocation récurrente du service social de son université, de 347 €/mois, versée sur son propre compte.

**Données à encoder dans le simulateur**

- Date d'octroi : 01/09/2026
- Situation familiale : **Cohabitante (Cat. 1)**
- Revenus professionnels : néant
- Onglet Revenus du demandeur → Allocations & ressources diverses → **« Allocation récurrente prov. soc. H.E. ou Université » : 347 €/mois**

*Onglet « Revenus des cohabitants »*

| Cohabitant | Type | Ressources annuelles | Catégorie | Prise en charge |
|---|---|---|---|---|
| Père | Père / Mère (§2) | 10 938,74 € | Cat. 1 | Report max |
| Mère | Père / Mère (§2) | 10 938,74 € | Cat. 1 | Report max |

> Les ressources des parents correspondent exactement au seuil RI Cat. 1 → excédent = 0 → aucun report.

**Résultat attendu**

> RI mensuel ≈ **577,48 €**

---

## Casus 1B — Sophie vit seule (même profil, autre situation)

**Énoncé**

Même dossier que 1A. Sophie s'est installée seule dans un logement. Son allocation du service social universitaire reste identique (347 €/mois). Il n'y a plus de cohabitants.

**Données à encoder dans le simulateur**

- Date d'octroi : 01/09/2026
- Situation familiale : **Isolée (Cat. 2)**
- Revenus professionnels : néant
- Allocations & ressources diverses → **« Allocation récurrente prov. soc. H.E. ou Université » : 347 €/mois**
- Cohabitants : aucun

> **Un seul champ change entre 1A et 1B** : la situation familiale. La ressource, elle, est inchangée — elle appartient à Sophie et la suit quand elle déménage. C'est ce qui rend la comparaison propre.

**Résultat attendu**

> RI mensuel ≈ **1 041,18 €**

**Enseignement**

> À ressources identiques, le fait de vivre seule (Cat. 2) ouvre droit à un seuil RI plus élevé. Sophie touche **463,70 €/mois de plus** simplement parce qu'elle ne cohabite plus.
>
> C'est le plus gros levier de tout le simulateur : un seul menu déroulant, plus de 5 500 €/an d'écart.

---

## Casus 1C — Thomas et le forfait « allocations familiales » de 240 €

> **Ce casus illustre un changement de pratique.** Avant la réforme, l'Art. 22 §1 b) conduisait à n'imputer les prestations familiales versées aux parents **ni aux parents, ni au jeune** — au motif qu'il ne les percevait pas lui-même. Elles n'entraient dans les ressources que si le jeune les touchait personnellement, typiquement un étudiant majeur domicilié ailleurs.
>
> Depuis le **1er mars 2026**, un forfait est imputé au demandeur dès qu'un débiteur alimentaire majeur cohabitant perçoit les allocations pour lui. Sur le dossier de Thomas, l'écart entre l'ancienne pratique et la nouvelle est de **227,08 €/mois** : 911,56 € contre 684,48 €.
>
> Attendez-vous à ce que les agents formés avant 2026 aient appris l'inverse. C'est une des raisons pour lesquelles ce casus mérite sa place dans la série.

**Énoncé**

Thomas, le frère de Sophie, a 22 ans et vit lui aussi chez leurs parents. Il n'a aucun revenu. Ce sont **ses parents qui perçoivent les allocations familiales pour lui**, à hauteur de 310 €/mois.

Depuis la réforme du **1er mars 2026**, cette situation déclenche l'imputation d'un forfait : lorsqu'un débiteur alimentaire majeur cohabitant perçoit les allocations familiales pour le demandeur, **240 €/mois sont comptabilisés comme ressource du demandeur**.

**Données à encoder dans le simulateur**

- Date d'octroi : 01/09/2026
- Situation familiale : **Cohabitant (Cat. 1)**
- Revenus professionnels : néant
- Allocations & ressources diverses → **« Allocations familiales (forfait max. 240 €/mois) » : 240 €/mois**

*Onglet Revenus des cohabitants* — les deux parents, comme au casus 1A, sans excédent.

> **N'encodez pas les 310 € réellement perçus.** Dans ce cas de figure, c'est le forfait de 240 € qui constitue la ressource, pas le montant versé aux parents.
>
> Le simulateur ne plafonne pas ce champ, et c'est délibéré : le montant à retenir n'est pas toujours 240 €. Il peut être inférieur sur preuve, ou différent dans d'autres situations (voir les points ci-dessous). Le champ reste donc libre, et l'appréciation vous revient.

**Résultat attendu**

> RI mensuel ≈ **684,48 €**

### Variante — les allocations réelles sont inférieures au forfait

Thomas fournit une attestation de sa caisse d'allocations familiales établissant que le montant perçu pour lui n'est que de **200,51 €/mois**. Le CPAS retient alors le montant réel.

Remplacez 240 € par **200,51 €**.

> RI mensuel ≈ **723,97 €**

**Points à observer**

> **Dans le cas courant, le forfait plafonne.** Les 310 € réellement versés à la famille de Thomas ne changent rien : on retient 240 €. En dessous, et **sur preuve uniquement** (attestation de la caisse ou extraits de compte), on descend au montant réel. Les 39,49 €/mois d'écart, soit 473,88 €/an, dépendent donc entièrement d'un document que l'agent doit penser à réclamer.
>
> **Mais 240 € n'est pas une valeur figée.** Plusieurs situations conduisent à retenir un autre montant, supérieur ou inférieur :
>
> - un **calcul rétrospectif** portant sur une période antérieure, où le montant de référence n'était pas celui d'aujourd'hui ;
> - le traitement d'un **supplément pour enfant en situation de handicap** ;
> - un **montant réel prouvé** inférieur au forfait.
>
> C'est pourquoi le champ n'est pas verrouillé. Un montant différent de 240 € n'est pas une erreur de saisie : il peut être exactement ce que le dossier commande. En séance, énoncez 240 € comme le cas de référence, pas comme une règle absolue.
>
> **Le supplément pour enfant handicapé suit une règle propre, désormais établie.** Il est **exonéré** du calcul des ressources lorsque le bénéficiaire le perçoit lui-même, ou lorsque l'allocataire le lui reverse. L'exonération ne vise que ce supplément : les allocations familiales classiques restent soumises au forfait. *(Art. 22 §1 b) AR 11/07/2002, modifié par l'AR du 12/09/2023 — circulaire SPP IS du 12/12/2023, en vigueur depuis le 09/12/2023.)*
>
> **La condition est la cohabitation avec le débiteur.** Si Thomas déménageait, plus aucun débiteur alimentaire majeur cohabitant ne percevrait d'allocations pour lui : le forfait disparaîtrait. Combiné au passage en catégorie isolé, son droit passerait de 684,48 € à 1 367,34 €/mois.

---

## Casus 2A — Bruno travaille en intérim depuis avant sa demande

**Énoncé**

Bruno Lecomte, 28 ans, vit seul. Il effectue des missions d'intérim depuis plusieurs mois et perçoit en moyenne 105,50 €/mois net. **Il travaillait déjà lorsqu'il a introduit sa demande de RI.** Ses revenus sont donc intégralement pris en compte : l'exonération Art. 35 récompense une activité entamée *pendant* la perception du RI, pas un revenu qui la précède.

**Données à encoder dans le simulateur**

- Date d'octroi : 01/09/2026
- Situation familiale : **Isolé (Cat. 2)**
- Onglet Informations → **« Nouvelle demande » : cochée** *(c'est l'état par défaut)*
- Revenus professionnels — ligne « comptabilisé » : **105,50 €/mois**
- Revenus professionnels — ligne « exonéré » : néant

> **À montrer en séance.** Ouvrez la rubrique « Exonérations » : les quatre cases de l'article 35 sont **grisées et inaccessibles**, avec un bandeau d'explication. Vous n'avez rien désactivé — le simulateur applique la règle seul, à partir de la case « Nouvelle demande » et du revenu encodé. L'agent n'a pas à s'en souvenir.

**Résultat attendu**

> RI mensuel ≈ **1 282,68 €**

---

## Casus 2B — Bruno commence à travailler après sa demande (exonération Art. 35)

**Énoncé**

Même dossier que 2A. Bruno n'avait aucun emploi lors de sa demande. Il débute des missions d'intérim **après l'octroi du RI** et gagne 105,50 €/mois net. Il s'agit donc d'une révision, pas d'une nouvelle demande. L'exonération générale Art. 35 §1 s'applique — plafond 321,99 €/mois au 01/09/2026. Son revenu de 105,50 € étant inférieur au plafond, il est **intégralement exonéré**.

**Données à encoder dans le simulateur**

- Date d'octroi : 01/09/2026
- Situation familiale : **Isolé (Cat. 2)**
- Onglet Informations → **« Nouvelle demande » : DÉCOCHÉE** ← *l'étape décisive*
- Revenus professionnels — ligne « comptabilisé » : **105,50 €/mois**
- Revenus professionnels — ligne « exonéré » : néant
- Exonération Art. 35 générale : **cochée**

> **Attention à l'ordre des manipulations.** Décochez « Nouvelle demande » *avant* d'aller dans les exonérations : tant que la case est cochée, les cases Art. 35 restent grisées et vous ne pourrez pas les activer.
>
> N'encodez rien dans la ligne « exonéré » : c'est l'exonération Art. 35 qui neutralise le revenu. Le saisir aussi manuellement exonérerait deux fois et masquerait le mécanisme que le casus veut démontrer.

**Résultat attendu**

> RI mensuel ≈ **1 367,34 € (= taux maximum Cat. 2)**

**Enseignement**

> Même salaire que le casus 2A, mais le démarrage de l'emploi **après** la demande change tout. L'exonération Art. 35 neutralise entièrement le revenu → Bruno touche le RI **maximum**, soit **84,66 €/mois de plus** que dans le casus 2A.
>
> Toute la différence tient dans une seule case à cocher. C'est aussi la cause la plus fréquente des tickets utilisateurs : un agent en révision qui laisse « Nouvelle demande » cochée voit l'exonération refusée et croit à un bug.

---

## Casus 3 — Martine : allocation de chômage et patrimoine

> **Casus étendu.** Quatre rubriques à encoder. Compter 10 minutes.

**Énoncé**

Martine Delcourt, 54 ans, vit seule. Elle perçoit une allocation de chômage de 25 €/jour en régime 26 jours. Elle est propriétaire de deux immeubles bâtis : sa maison, dont le revenu cadastral non indexé est de 1 200 €, et la moitié indivise d'un immeuble hérité de ses parents, dont le RC est de 800 €. Elle dispose par ailleurs de 15 000 € d'économies sur un compte. Enfin, son fils prend en charge ses charges locatives, à hauteur de 80 €/mois.

**Données à encoder dans le simulateur**

*Onglet Informations*

- Date d'octroi : 01/09/2026
- Situation familiale : **Isolée (Cat. 2)**
- Enfants à charge : 0

*Onglet Revenus du demandeur*

| Rubrique | Champ | Valeur |
|---|---|---|
| Chômage / Mutuelle / Remplacement | Chômage — montant journalier × 26 | **25,00 €** |
| Biens immobiliers — ligne 1 | Type / RC non indexé / Quote-part | Bâti · **1 200 €** · **100 %** |
| Biens immobiliers — ligne 2 | Type / RC non indexé / Quote-part | Bâti · **800 €** · **50 %** |
| Biens mobiliers | Montant du capital / Part concernée | **15 000 €** · **100 %** |
| Avantages en nature | Charges locatives par un tiers | **80 €/mois** |

**Détail du calcul**

| Étape | Montant annuel |
|---|---|
| Chômage — 25 € × 26 = 650 €/mois | 7 800,00 € |
| Biens immobiliers — exonération 750 € **divisée par 2** → 375 € par bien | |
| &nbsp;&nbsp;• Bien 1 : (1 200 − 375) × 3 | 2 475,00 € |
| &nbsp;&nbsp;• Bien 2 : (400 − 187,50) × 3 | 637,50 € |
| Biens mobiliers — (12 500 − 6 200) × 6 % + (15 000 − 12 500) × 10 % | 628,00 € |
| Avantages en nature — 80 € × 12 | 960,00 € |
| **Total des ressources** | **12 500,50 €** |
| − exonération supplémentaire Cat. 2 | − 250,00 € |
| Seuil RI Cat. 2 − 12 250,50 € | 4 157,61 € |

**Résultat attendu**

> RI mensuel ≈ **346,47 €**

**Points à observer**

> **L'exonération immobilière se divise entre les biens du même type.** Avec deux immeubles bâtis, chacun ne bénéficie que de 375 € et non de 750 €. C'est l'erreur la plus fréquente du calcul manuel : accorder l'exonération entière à chaque bien donnerait ici 1 912,50 € au lieu de 3 112,50 €.
>
> **La quote-part s'applique aussi à l'exonération.** Sur le bien détenu à 50 %, on compare 400 € de RC à 187,50 € d'exonération, pas à 375 €.
>
> **Les 15 000 € d'économies ne sont pas une ressource de 15 000 €.** Seul le revenu théorique du capital est retenu : 628 €/an. La première tranche de 6 200 € est totalement exonérée.

---

## Casus 4 — Karim : une cession de bien

> **Casus étendu.** La rubrique la plus technique de l'outil. Compter 12 minutes, variante comprise.

**Énoncé**

Karim Benali, 46 ans, vit seul et n'a aucun revenu. Il a vendu le 15 mars 2024 l'appartement qui constituait son unique bien immobilier, pour une valeur vénale de 95 000 €. Il en détenait la pleine propriété. Il a remboursé 12 000 € de dettes personnelles au moment de la vente. Il introduit sa demande de RI le 1er septembre 2026.

**Données à encoder dans le simulateur**

*Onglet Informations*

- Date d'octroi : 01/09/2026
- Situation familiale : **Isolé (Cat. 2)**

*Onglet Revenus du demandeur → Cessions de biens*

| Champ | Valeur |
|---|---|
| Type de bien | **Bien bâti (unique)** |
| Nature de la cession | **Cession à titre onéreux** |
| Titre de propriété | **Pleine Propriété (P.P.)** |
| Valeur vénale | **95 000 €** |
| Part concernée | **100 %** |
| Date de cession | **15/03/2024** |
| Date de prise de cours du RI | **01/09/2026** |
| Dettes personnelles | **12 000 €** |
| Dispense pour équité | 0 € |

**Détail du calcul**

| Étape | Montant |
|---|---|
| Valeur vénale × part × coefficient du titre (PP = 100 %) | 95 000,00 € |
| − dettes personnelles | − 12 000,00 € |
| − tranche immunisée (bien unique + cession onéreuse) | − 37 200,00 € |
| − abattement : 29 mois × 2 000 € ÷ 12 | − 4 833,33 € |
| **= considération** | **40 966,67 €** |
| Tranche 6 200 → 12 500 à 6 % | 378,00 € |
| Tranche au-delà de 12 500 à 10 % | 2 846,67 € |
| **Ressource annuelle retenue** | **3 224,67 €** |

Les 29 mois se comptent à partir du **1er avril 2024**, premier jour du mois qui suit la cession, jusqu'au 1er septembre 2026.

**Résultat attendu**

> RI mensuel ≈ **1 119,45 €**

### Variante — le même bien cédé à titre gratuit

Reprenez le dossier et changez un seul champ : **Nature de la cession → Cession à titre gratuit**.

| Étape | Montant |
|---|---|
| Valeur vénale ajustée | 95 000,00 € |
| Déductions applicables | **aucune** |
| **= considération** | **95 000,00 €** |
| **Ressource annuelle retenue** | **8 628,00 €** |

> RI mensuel ≈ **669,18 €**

**Points à observer**

> **Une donation ne bénéficie d'aucune déduction.** Ni tranche immunisée, ni abattement, ni déduction des dettes : les tranches s'appliquent directement sur la valeur vénale. Karim perd **450,27 €/mois**, soit plus de 5 400 €/an, pour avoir donné plutôt que vendu. La règle est délibérée : une donation ne doit pas être plus avantageuse qu'une vente.
>
> **La tranche immunisée et l'abattement exigent deux conditions cumulatives** : le bien doit être unique *et* la cession onéreuse. Encodez « Autre bien bâti » au lieu de « Bien bâti (unique) » et les deux déductions disparaissent également.
>
> **L'abattement récompense le temps écoulé.** Plus la cession est ancienne, plus il est élevé — 2 000 €/an en catégorie 2. Une cession de la veille ne donne aucun abattement.

---

## Casus 5 — Léa : cohabitants de statuts différents et mois incomplet

> **Casus étendu.** Le plus complet. Compter 12 minutes.

**Énoncé**

Léa Vromant, 22 ans, vit dans la maison de sa mère avec sa sœur aînée. Elle n'a aucun revenu professionnel mais perçoit une pension alimentaire de 150 €/mois de son père. Elle est volontaire dans une maison de repos, où elle reçoit un défraiement de 30 € par jour de prestation, pour un total de 900 € sur l'année.

Sa mère perçoit un salaire net de 18 000 €/an. Sa sœur, 27 ans, gagne 14 000 €/an.

Léa introduit sa demande le **12 septembre 2026**.

**Données à encoder dans le simulateur**

*Onglet Informations*

- Date d'octroi : **12/09/2026**
- Situation familiale : **Cohabitante (Cat. 1)**
- « Nouvelle demande » : **cochée**

*Onglet Revenus du demandeur*

| Rubrique | Champ | Valeur |
|---|---|---|
| Allocations & ressources diverses | Pension alimentaire perçue | **150 €/mois** |
| Défraiement du volontaire | Indemnité par jour de prestation | **30,00 €** |
| Défraiement du volontaire | Indemnité totale perçue sur l'année | **900,00 €** |

*Onglet Revenus des cohabitants*

| Cohabitant | Type | Ressources annuelles | Catégorie | Prise en charge |
|---|---|---|---|---|
| Mère | **Père / Mère (§2)** | 18 000 € | Cat. 1 | Report max |
| Sœur | **Autre (frère, sœur…) — §3** | 14 000 € | Cat. 1 | Report max |

Mode de calcul : **individuel** · Nombre de bénéficiaires du RI : **1**

**Détail du calcul**

| Étape | Montant annuel |
|---|---|
| Pension alimentaire — 150 € × 12 | 1 800,00 € |
| Défraiement volontaire — sous les deux plafonds → **exonéré** | 0,00 € |
| Mère (§2) — 18 000 € − seuil Cat. 1 de 10 938,74 € | 7 061,26 € |
| &nbsp;&nbsp;→ montant reporté : 588,44 €/mois | 7 061,28 € |
| Sœur (§3) — **non prise en compte** | 0,00 € |
| **Total des ressources** | **8 861,28 €** |
| − exonération supplémentaire Cat. 1 | − 155,00 € |
| Seuil RI Cat. 1 − 8 706,28 € | 2 232,46 € |
| RI mensuel plein | 186,04 € |
| **Prorata — 19 jours sur 30** | **117,83 €** |

**Points à observer**

> **Les ressources de la sœur ne comptent pas.** Une sœur relève du §3 : elle n'est pas débitrice d'aliments. Le simulateur affiche ses 14 000 € à titre indicatif mais ne les fait pas entrer dans le calcul — ni ses ressources, ni son seuil. C'est une erreur classique de l'encodage manuel, et elle coûterait ici tout le droit de Léa.
>
> **Vérifiez le type de cohabitant, pas le lien de parenté supposé.** Le badge affiché à côté de chaque cohabitant (§1, §2, §2b, §3, §4) indique le traitement réel. C'est le champ le plus lourd de conséquences de cet onglet.
>
> **Le défraiement de volontaire est exonéré, mais de justesse dans l'esprit du texte.** 30 €/jour est sous le plafond de 44,02 € et 900 €/an sous celui de 1 760,83 €. Faites l'essai en portant l'annuel à 1 800 € : le montant retenu ne devient pas 39,17 € d'excédent, mais **1 800 € en entier**. L'exonération est tout ou rien.
>
> **Le prorata s'applique en fin de chaîne, au montant du RI.** La pension alimentaire et le report de la mère ne sont pas proratisés : ils entrent en année pleine. Seul le montant final est ramené à 19 jours sur 30.

---

## Tableau récapitulatif

Montants au **01/09/2026**.

| Casus | Situation | Ressources | RI mensuel | Point clé |
|---|---|---|---|---|
| **1A** | Cohabitante (Cat. 1) | Allocation univ. 347 €/mois | **577,48 €** | Cohabitants sans excédent |
| **1B** | Isolée (Cat. 2) | Allocation univ. 347 €/mois | **1 041,18 €** | Taux plus favorable — écart de 463,70 € |
| **1C** | Cohabitant (Cat. 1) | Forfait AF 240 €/mois | **684,48 €** | Forfait imputé — réforme du 01/03/2026 |
| **1C bis** | Cohabitant (Cat. 1) | AF réelles 200,51 €/mois sur preuve | **723,97 €** | Le montant réel l'emporte, sur attestation |
| **2A** | Isolé (Cat. 2) | Intérim 105,50 €/mois, emploi antérieur | **1 282,68 €** | Art. 35 bloqué par le simulateur |
| **2B** | Isolé (Cat. 2) | Intérim 105,50 €/mois, emploi en cours de RI | **1 367,34 €** | Art. 35 appliqué — taux maximum |
| **3** | Isolée (Cat. 2) | Chômage, 2 biens bâtis, capital 15 000 €, avantage | **346,47 €** | Exonération immobilière divisée entre biens |
| **4** | Isolé (Cat. 2) | Cession onéreuse d'un bien unique, 95 000 € | **1 119,45 €** | Tranche immunisée et abattement |
| **4 bis** | Isolé (Cat. 2) | La même cession, à titre gratuit | **669,18 €** | Aucune déduction — écart de 450,27 € |
| **5** | Cohabitante (Cat. 1) | Pension alim., volontariat, mère §2, sœur §3, octroi le 12/09 | **117,83 €** | §3 ignoré · volontariat exonéré · prorata |

**Rubriques couvertes par la série**

| Rubrique | Casus |
|---|---|
| Situation familiale et catégorie | 1A, 1B |
| Revenus professionnels et Art. 35 | 2A, 2B |
| Chômage au montant journalier | 3 |
| Biens immobiliers | 3 |
| Biens mobiliers | 3 |
| Avantages en nature | 3 |
| Cessions de biens | 4, 4 bis |
| Allocations et ressources diverses | 1A, 1B, 5 |
| Défraiement du volontaire | 5 |
| Types de cohabitants (§2, §3) | 1A, 5 |
| Prorata d'un mois incomplet | 5 |

**Seuils utilisés** — voir le [manuel](manuel_simulateur_ri.md), chapitre 8.

| Catégorie | Seuil annuel | Seuil mensuel |
|---|---|---|
| 1 — cohabitant | 10 938,74 € | 911,56 € |
| 2 — isolé | 16 408,11 € | 1 367,34 € |

**Exonération supplémentaire annuelle** — appliquée automatiquement : 155 € en Cat. 1, 250 € en Cat. 2.

---

*Document à usage interne — Formation agents CPAS*
*Simulateur RI — Vanden Broele / CPASConnect*
