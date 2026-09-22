# Manuel du simulateur RI
**Vanden Broele / CPASConnect — Septembre 2026**
*Barèmes en vigueur au 01/09/2026*

---

## Comment lire ce manuel

Chaque rubrique est présentée en deux niveaux :

- **le texte courant** explique la règle en langage métier — c'est ce qu'il faut avoir compris pour encoder correctement ;
- **l'encadré « Base légale et formule »** donne l'article et le calcul exact — à consulter pour motiver une décision, répondre à un contrôle ou vérifier un montant contesté.

Vous pouvez travailler avec le premier niveau seul. Le second est là quand une justification écrite est nécessaire.

> **Le simulateur assiste, il ne décide pas.** Le calcul reproduit la réglementation, mais l'octroi reste une décision du CPAS, motivée par l'agent. Sur quelques points la réglementation ne tranche pas : ils sont signalés par la mention **Point d'interprétation** et présentent les lectures possibles plutôt qu'une réponse unique.

---

## Sommaire

1. [Principe général du calcul](#1-principe-général-du-calcul)
2. [Onglet Informations](#2-onglet-informations)
3. [Onglet Revenus du demandeur](#3-onglet-revenus-du-demandeur)
   - [3.1 Revenus professionnels nets](#31-revenus-professionnels-nets)
   - [3.2 Chômage, mutuelle et revenus de remplacement](#32-chômage-mutuelle-et-revenus-de-remplacement)
   - [3.3 Exonérations](#33-exonérations)
   - [3.4 Allocations et ressources diverses](#34-allocations-et-ressources-diverses)
   - [3.5 Avantages en nature](#35-avantages-en-nature)
   - [3.6 Biens mobiliers](#36-biens-mobiliers)
   - [3.7 Biens immobiliers](#37-biens-immobiliers)
   - [3.8 Cessions de biens](#38-cessions-de-biens)
4. [Onglet Revenus des cohabitants](#4-onglet-revenus-des-cohabitants)
5. [Onglet Aperçu du calcul](#5-onglet-aperçu-du-calcul)
6. [Le mois incomplet et la nouvelle demande](#6-le-mois-incomplet-et-la-nouvelle-demande)
7. [Hors périmètre](#7-hors-périmètre)
8. [Mémo des barèmes](#8-mémo-des-barèmes)

---

## 1. Principe général du calcul

Le revenu d'intégration comble l'écart entre un **seuil** propre à la catégorie du demandeur et les **ressources** dont il dispose. Tout le travail d'encodage consiste à établir ces ressources.

Le simulateur suit toujours le même enchaînement :

```
  Ressources professionnelles et assimilées
+ Ressources diverses
+ Avantages en nature
+ Biens mobiliers
+ Biens immobiliers
+ Cessions de biens
+ Ressources reportées des cohabitants
─────────────────────────────────────────────
= Total des ressources annuelles
− Exonération supplémentaire annuelle
─────────────────────────────────────────────
= Ressources retenues
                                                 Seuil RI de la catégorie
                                               − Ressources retenues
                                               ─────────────────────────
                                               = RI annuel net    ÷ 12
                                                                  × prorata éventuel
```

Deux conséquences pratiques à retenir dès maintenant.

**Tout est ramené à l'année.** Un montant mensuel encodé est multiplié par douze avant d'entrer dans le total. C'est pourquoi l'unité affichée sous chaque champ (« € / mois », « € / an », « € / jour ») doit être respectée : une erreur d'unité se propage sur douze mois.

**Le droit existe seulement si les ressources sont inférieures au seuil.** Si le total des ressources atteint le seuil, il n'y a pas de droit — et l'exonération supplémentaire n'est alors même pas appliquée.

> **Base légale et formule**
> Art. 14 de la loi du 26/05/2002 (montants du RI) ; Art. 16 (prise en compte des ressources).
> Éligibilité : `total ressources annuelles < seuil RI annuel`
> Ressources retenues : `max(0, total ressources − exonération supplémentaire)`
> RI mensuel : `(seuil RI annuel − ressources retenues) ÷ 12`

---

## 2. Onglet Informations

Trois cartes à remplir avant tout calcul.

### Référence

**Date d'octroi / révision** — c'est la date qui commande tout le reste. Le simulateur y lit le barème applicable : si vous encodez une date antérieure, il applique automatiquement les montants de l'époque. Indispensable pour une révision ou une régularisation.

Cette date détermine aussi le prorata. Si elle ne tombe pas le premier du mois, le simulateur calcule seul le nombre de jours couverts, du jour d'octroi à la fin du mois.

**Nouvelle demande** — case à cocher, juste sous la date. Elle indique une première demande ou une reprise après une interruption d'au moins deux mois complets. Son effet est détaillé au [chapitre 6](#6-le-mois-incomplet-et-la-nouvelle-demande) ; retenez pour l'instant qu'elle agit sur deux choses : le prorata des revenus professionnels, et l'accès aux exonérations de l'article 35.

### Identité

Nom, prénom, date de naissance, nationalité. Ces champs n'entrent dans aucun calcul : ils servent à identifier le dossier sur le rapport PDF.

### Ménage

**Situation familiale** — le choix le plus lourd de conséquences de tout l'encodage, puisqu'il fixe la catégorie et donc le seuil :

| Situation | Catégorie | Seuil annuel | Seuil mensuel |
|---|---|---|---|
| Cohabitant | 1 | 10 938,74 € | 911,56 € |
| Isolé | 2 | 16 408,11 € | 1 367,34 € |
| Famille à charge | 3 | 22 174,69 € | 1 847,89 € |

À ressources identiques, passer de cohabitant à isolé change le droit de plus de 450 €/mois. C'est souvent là que se joue l'essentiel d'un dossier.

**Nombre d'enfants à charge** — utilisé pour la catégorie 3, et repris dans le calcul des biens immobiliers, où l'exonération augmente avec chaque enfant.

---

## 3. Onglet Revenus du demandeur

Huit rubriques, présentées en accordéons dépliables. Chacune affiche son total dans son bandeau, ce qui permet de vérifier d'un coup d'œil qu'aucune saisie n'a été oubliée. Un bouton de fiche pratique renvoie à la documentation juridique de la rubrique.

Les rubriques vides n'ont pas besoin d'être ouvertes : un accordéon fermé et sans total ne contribue rien.

### 3.1 Revenus professionnels nets

Deux tableaux à distinguer soigneusement.

**Comptabilisé** — ce que la personne perçoit. Choisissez le type de revenu dans la liste déroulante ; elle couvre les cas courants (revenu net professionnel, indépendant, flexijob, chèques-repas, allocation de stage, formation en alternance, activité artistique, pécule de vacances, indemnité de préavis…). Une entrée « Autre (saisie libre) » permet de nommer un revenu absent de la liste.

**Exonéré** — ce qui vient en déduction : précompte professionnel, cotisations sociales et dépenses professionnelles d'un indépendant, part personnelle des chèques-repas, forfait employeur d'un PFI, indemnité à charge de l'employeur.

Le net retenu est la différence entre les deux totaux.

> **Attention au libellé, il n'est pas décoratif.** Certains revenus **ne bloquent pas** les exonérations de l'article 35, parce que le simulateur les reconnaît à leur libellé : les revenus de formation — allocation de formation Forem/VDAB/Actiris, allocation de stage d'insertion, allocation de stage Onem, formation en alternance — et les chèques ALE. Si vous encodez l'un d'eux via « Autre (saisie libre) », le simulateur ne peut pas le reconnaître : il le traite comme un revenu professionnel ordinaire, ce qui neutralise l'article 35 pour tout le dossier. Choisissez toujours le libellé de la liste quand il existe.

#### Les chèques ALE, et le wijk-werken en Flandre

Le régime ALE fait travailler des personnes éloignées de l'emploi sur des tâches que les circuits réguliers ne couvrent pas. Son traitement est dérogatoire.

La part de la rémunération prise en charge par l'éditeur des chèques est **exonérée à concurrence de 6 € par chèque non invalidé**, et les indemnités afférentes le sont également. Ce n'est donc pas une ressource.

En pratique, aujourd'hui, cette part est intégralement exonérée sur tout le territoire : les entités fédérées fixent la rémunération à 4,10 €, sauf la Communauté germanophone qui est passée à 6 € au 01/01/2023. Aucune ne dépasse le plafond.

**Comment l'encoder.** Choisissez « Chèques ALE / wijk-werken » dans le tableau comptabilisé, et portez le même montant dans le tableau exonéré via « Chèques ALE / wijk-werken - part exonérée ». Le net retenu est nul, le dossier garde une trace du travail effectué, et le rapport PDF le documente.

L'allocation de chômage que la personne conserve par ailleurs se saisit normalement dans la rubrique Chômage / Mutuelle / Remplacement.

> **Un revenu ALE ne neutralise pas l'article 35.** N'étant pas une ressource, il ne déclenche pas le blocage réservé aux revenus professionnels antérieurs à la demande. Une personne qui cumule chèques ALE et emploi entamé pendant le RI conserve donc son exonération sur ce second revenu.

> **Base légale et formule**
> Art. 22 §1 d) AR 11/07/2002, modifié par l'AR du 01/10/2023 (M.B. 27/11/2023), en vigueur au 01/01/2023 — plafond porté de 4,10 € à 6 € par chèque.
> Circulaire SPP IS du 12/12/2023.
> Cloisonnement : un éventuel surplus au-delà de 6 €/chèque compterait comme ressource sans pouvoir bénéficier ni de l'exonération Art. 35, ni de l'exonération supplémentaire annuelle — seule l'immunisation horaire propre à l'ALE s'applique. Le cas est aujourd'hui sans objet, aucune entité fédérée ne rémunérant au-delà de 6 €.

> **Base légale et formule**
> Art. 16 de la loi du 26/05/2002 ; Art. 22 AR 11/07/2002 (ressources à prendre en compte).
> `net mensuel = Σ montants comptabilisés − Σ montants exonérés`

### 3.2 Chômage, mutuelle et revenus de remplacement

**Chômage** et **mutuelle** offrent trois façons d'encoder la même allocation, selon le document que vous avez sous les yeux. Vous n'en utilisez normalement qu'une :

| Champ | Quand l'utiliser |
|---|---|
| Montant mensuel réel | Vous disposez du montant mensuel versé |
| Montant journalier × 26 | Vous avez le taux journalier et le régime des 26 jours |
| Montant journalier annualisé | Vous avez le taux journalier et voulez la conversion annuelle exacte |

La troisième option est la plus précise : elle compte tous les jours indemnisables de l'année civile, dimanches exclus — 313 jours en 2026, soit 26,08 jours par mois en moyenne, au lieu du forfait de 26.

**Revenus de remplacement** regroupe cinq postes : pension, droit passerelle, allocation d'handicapé ARR, indemnisation pour perte de revenus, et un poste libre. Ils sont simplement additionnés.

> **Base légale et formule**
> Art. 22 §1 AR 11/07/2002.
> `mensuel = montant mensuel réel + (journalier × 26) + (journalier annualisé × 313 ÷ 12)`
> Le nombre de jours est recalculé pour l'année de la date de référence.

### 3.3 Exonérations

Deux blocs de nature différente.

**Exonérations sur revenus (Art. 34)** — le tableau « exonéré » décrit en 3.1.

**Exonérations socio-professionnelles (Art. 35)** — quatre cases à cocher :

| Exonération | Montant au 01/09/2026 |
|---|---|
| Générale | 321,99 €/mois |
| Étudiants | 321,99 €/mois |
| Métiers en pénurie | 461,45 €/mois |
| Activité artistique socio-professionnelle | 3 863,93 €/an |

Le champ **Jours (si compteur dépassé)** proratise l'exonération sur une partie du mois seulement. Laissé à zéro, l'exonération s'applique en entier.

L'article 35 vise l'insertion : il récompense la reprise d'une activité **pendant** la perception du revenu d'intégration. Il ne s'applique donc pas à un revenu qui préexistait à la demande.

Le simulateur applique cette condition automatiquement. Si vous êtes en **nouvelle demande** et qu'un revenu professionnel non lié à une formation est encodé, les quatre cases sont grisées et un bandeau l'explique — le revenu précède le RI, l'exonération n'est pas due.

> **Si les cases sont grisées à tort**, deux vérifications, dans cet ordre :
> 1. **S'agit-il réellement d'une nouvelle demande ?** Si la personne était déjà bénéficiaire et que l'emploi a commencé en cours de RI, décochez « Nouvelle demande » dans l'onglet Informations. C'est une révision, et l'article 35 est dû.
> 2. **Le libellé du revenu est-il le bon ?** Un revenu de formation encodé en saisie libre n'est pas reconnu comme tel (voir l'encadré en 3.1).

> **Base légale et formule**
> Art. 35 §1 AR 11/07/2002 (exonération générale et étudiants), §2 (métiers en pénurie), §3 (activité artistique).
> `exonération mensuelle = montant du barème × (jours compteur ÷ jours du mois)`, ou le montant plein si le compteur est à zéro.
> Blocage : `nouvelle demande = oui` **et** au moins un revenu comptabilisé non reconnu comme revenu de formation.

### 3.4 Allocations et ressources diverses

**Ressources générales** — allocations familiales, pension alimentaire perçue, allocation récurrente d'une haute école ou université, part d'une bourse couvrant les frais de séjour, et un poste libre. Montants mensuels.

#### Les prestations familiales — la rubrique la plus nuancée

Le principe de départ est une **exonération** : les prestations familiales ne comptent pas comme ressource lorsque la personne en est l'allocataire, élève les enfants et en a la charge. Trois conditions cumulatives.

Les prestations familiales couvrent l'ensemble du dispositif : allocation de naissance, prime d'adoption, allocations familiales proprement dites, allocations majorées pour orphelins, prime de rentrée scolaire, et les suppléments — d'âge, sociaux, pour enfant handicapé.

Deux situations distinctes se présentent ensuite.

**Le demandeur perçoit lui-même les allocations pour ses propres enfants.** L'exonération joue pleinement : rien n'est compté. La notion de « charge » est une notion de fait, appréciée sur la situation réelle et non sur le seul domicile.

**Le demandeur est un jeune majeur pour qui un tiers perçoit les allocations.** C'est ici que la réforme du 1er mars 2026 a changé la pratique. Lorsqu'un **débiteur alimentaire majeur cohabitant** — typiquement un parent — perçoit les allocations pour le demandeur, un **forfait de 240 €/mois** est imputé au demandeur comme ressource.

Ce forfait n'est pas une valeur figée :

- si les allocations réellement perçues pour le demandeur sont **inférieures**, le montant réel est retenu — mais **sur preuve uniquement** (attestation de la caisse, extraits de compte) ;
- un **calcul rétrospectif** portant sur une période antérieure peut appeler un autre montant de référence ;
- une situation de **handicap** peut appeler un traitement propre.

Le champ du simulateur est donc volontairement libre : un montant différent de 240 € n'est pas une erreur de saisie.

> **Avant mars 2026**, les allocations versées aux parents pour un jeune majeur cohabitant n'étaient imputées ni aux parents ni au jeune, au motif qu'il ne les percevait pas lui-même. Les agents formés antérieurement ont appris cette règle : sur un dossier type, l'écart entre les deux pratiques atteint 227 €/mois.

**Les cas particuliers à connaître**

| Situation | Traitement |
|---|---|
| Allocations versées sur un **compte bloqué** | Jamais prises en compte, en aucun cas |
| **Supplément pour enfant handicapé** que le jeune perçoit lui-même, ou que l'allocataire lui reverse | Exonéré — cette exonération ne vise que ce supplément, pas les allocations classiques |
| Jeune **placé en institution**, 2/3 versés à l'institution et 1/3 au jeune | Seul le 1/3 est retenu, et à condition qu'il puisse en disposer |
| **Placement temporaire** d'un enfant | Le parent qui perçoit est considéré comme l'élevant ; l'exonération reste acquise |
| Parents percevant les allocations et les **rétrocédant** à un jeune domicilié ailleurs | Comptées chez le jeune, au titre des **dons réguliers** |

**En Flandre — le Groeipakket.** L'essentiel du dispositif est exonéré sur la base de l'Art. 22 §1 b) : montant de base, prime de naissance, prime de rentrée scolaire, supplément social, suppléments de soins, supplément garde d'enfants, supplément enseignement maternel. L'allocation de soutien l'est sur la base de l'Art. 22 §1 m).

Le **supplément scolaire** relève d'une base différente, l'Art. 22 §1 g), par analogie avec la bourse d'étude de l'enseignement supérieur. C'est la seule partie du Groeipakket exonérée non seulement pour les parents, mais aussi pour le jeune qui la reçoit pour lui-même.

> **Base légale**
> Art. 22 §1 b) AR 11/07/2002 (prestations familiales), §1 g) (bourses et supplément scolaire), §1 m) (allocation de soutien).
> Art. 22 §1 a) : l'aide accordée par les CPAS au titre de la loi organique du 08/07/1976 n'est jamais prise en compte.
> Forfait de 240 €/mois : réforme applicable depuis le 01/03/2026.

**Défraiement du volontaire** — cette rubrique mérite une attention particulière, parce que sa logique n'est pas celle des autres.

Encodez deux montants : l'indemnité **par jour de prestation** et l'indemnité **totale perçue sur l'année**. Le simulateur affiche alors le verdict.

L'exonération est **tout ou rien**. Tant que les deux plafonds sont respectés, l'indemnité est intégralement exonérée : elle ne compte pas du tout. Dès que l'un des deux est dépassé — même d'un centime — la **totalité** de l'indemnité annuelle devient une ressource. Pas l'excédent : la totalité.

| Plafond au 01/09/2026 | Montant |
|---|---|
| Par jour de prestation | 44,02 € |
| Par an | 1 760,83 € |
| Indemnité kilométrique vélo | 0,37 €/km |

Une case permet de signaler une **catégorie à plafond annuel relevé** : entraîneur ou arbitre sportif, garde de nuit, transport non urgent de patients couchés, volontaire du secteur santé déployé en 2022. Ce plafond relevé n'étant pas publié avec les autres montants RIS, il est à saisir manuellement — il valait 2 987,70 € en 2023.

> **Base légale et formule**
> Art. 22 §1 q) AR 11/07/2002, renvoyant aux articles 10 et 12 de la loi du 03/07/2005 relative aux droits des volontaires.
> `si (journalier ≤ plafond jour) et (annuel ≤ plafond an) → ressource = 0`
> `sinon → ressource = indemnité annuelle entière`
> Le texte est explicite : « Si une des conditions n'est pas remplie, tous les revenus sont à prendre en considération. »

### 3.5 Avantages en nature

Quatre champs mensuels, pour ce qu'un tiers prend en charge à la place du bénéficiaire : charges locatives payées par un tiers, loyer fictif professionnel, loyer fictif issu de la grille du simulateur, remboursement d'un prêt hypothécaire par un tiers.

Ces montants sont additionnés sans exonération ni abattement.

> **Base légale**
> Art. 22 §1 AR 11/07/2002 — les avantages en nature constituent des ressources, évaluées à leur valeur réelle.

### 3.6 Biens mobiliers

Encodez le **capital** détenu et la **part concernée** en pourcentage. Le simulateur n'y voit pas une ressource en soi : il calcule le revenu que ce capital est censé produire.

Le mécanisme est progressif, par tranches :

| Tranche de capital | Revenu retenu |
|---|---|
| Jusqu'à 6 200 € | Exonéré |
| De 6 200 € à 12 500 € | 6 % de la part dans cette tranche |
| Au-delà de 12 500 € | 10 % de la part au-delà |

Un capital de 6 200 € ou moins ne génère donc aucune ressource, quel que soit son montant réel de rendement.

> **Base légale et formule**
> Art. 27 AR 11/07/2002.
> `tranche 2 = (min(12 500, capital) − min(6 200, capital)) × part × 6 %`
> `tranche 3 = (capital − 12 500) × part × 10 %` si le capital dépasse 12 500 €
> `ressource annuelle = tranche 2 + tranche 3`

### 3.7 Biens immobiliers

Une ligne par bien. Trois types : **Bâti**, **Non bâti**, **Étranger**.

Pour les biens belges, le champ déterminant est le **revenu cadastral non indexé** — le RC brut du bien, pas sa valeur vénale ni le loyer perçu. Ajoutez la **quote-part** détenue en pourcentage, et le cas échéant les intérêts d'emprunt payés, la rente annuelle et le loyer annuel perçu.

Le principe : on retranche du RC une exonération, puis on multiplie le solde par trois. Si le RC est inférieur à l'exonération, le bien ne génère aucune ressource.

L'exonération dépend du type de bien et du nombre d'enfants à charge :

| Type | Exonération |
|---|---|
| Bâti | 750 € + 125 € par enfant à charge |
| Non bâti | 30 € |

**Point important quand il y a plusieurs biens du même type** : l'exonération n'est pas accordée par bien, elle est **divisée entre eux**. Deux biens bâtis sans enfant à charge se partagent les 750 €, soit 375 € chacun. C'est une source d'erreur fréquente quand on calcule à la main.

Les biens **Étranger** suivent une autre voie : encodez directement le revenu, il est repris tel quel.

> **Base légale et formule**
> Art. 23 §1 AR 11/07/2002 ; Art. 4.3 pour la division de l'exonération.
> `exonération bâtie = 750 + 125 × nb enfants` — `exonération non bâtie = 30`
> `ressource du bien = max(0, (RC × quote-part − (exonération ÷ nb biens du type) × quote-part) × 3)`
> Exemple : RC 1 279 €, pleine propriété, 0 enfant → `(1 279 − 750) × 3 = 1 587 €/an`.
> Note : pour un cohabitant, le calcul est mené avec zéro enfant à charge.

### 3.8 Cessions de biens

La rubrique la plus technique de l'outil. Elle traite les biens dont la personne s'est dessaisie, pour éviter qu'un patrimoine cédé peu avant la demande n'échappe au calcul.

Pour chaque cession, encodez : le **type de bien** (bâti ou non bâti, unique ou non, ou bien meuble), la **nature** de la cession, le **titre de propriété**, la **valeur vénale**, la **part concernée**, les **dates** de cession et de prise de cours du RI, les éventuelles **dettes personnelles** et une **dispense pour raisons d'équité**.

Le calcul se fait en deux temps.

**Premier temps — la considération, cession par cession.** La valeur vénale est ajustée selon le titre détenu, puis diminuée des déductions applicables :

| Titre de propriété | Coefficient |
|---|---|
| Pleine propriété | 100 % |
| Nu-propriété | 60 % |
| Usufruit | 40 % |

Les déductions dépendent de deux conditions cumulatives : le bien doit être **unique** et la cession **à titre onéreux**. Dans ce cas s'appliquent une tranche immunisée de 37 200 € (au prorata de la part) et un abattement lié au temps écoulé depuis la cession. Les dettes personnelles ne sont déductibles que pour une cession onéreuse.

L'abattement est proportionnel au nombre de mois écoulés, comptés à partir du premier jour du mois **suivant** la cession :

| Catégorie | Abattement annuel |
|---|---|
| 1 — cohabitant | 1 250 € |
| 2 — isolé | 2 000 € |
| 3 — famille | 2 500 € |

**Une cession à titre gratuit ne donne droit à aucune déduction** : ni tranche immunisée, ni abattement, ni déduction des dettes. Les tranches s'appliquent directement sur la valeur vénale ajustée. C'est le point qui surprend le plus, et il est délibéré : une donation ne doit pas être plus avantageuse qu'une vente.

**Second temps — les tranches, une seule fois sur le total.** Les considérations de toutes les cessions sont additionnées, puis le barème progressif est appliqué au total — et non bien par bien. Encoder deux cessions séparément ou une seule d'un montant équivalent donne donc le même résultat.

| Tranche du total | Revenu retenu |
|---|---|
| Jusqu'à 6 200 € | Exonéré |
| De 6 200 € à 12 500 € | 6 % |
| Au-delà de 12 500 € | 10 % |

> **Base légale et formule**
> Art. 24 à 26 AR 11/07/2002 ; Art. 6.1c pour l'application unique des tranches ; Art. 6.2a.3 pour le décompte des mois ; Art. 6.3 et 6.5 pour l'absence de déduction en cession gratuite.
> `valeur ajustée = valeur vénale × part × coefficient du titre`
> `abattement = abattement annuel de la catégorie × nb mois ÷ 12`
> `considération = max(0, valeur ajustée − dettes − tranche immunisée − abattement − dispense équité)`
> Puis, sur `Σ considérations` : `6 % entre 6 200 et 12 500`, `10 % au-delà`.

---

## 4. Onglet Revenus des cohabitants

Les ressources de certaines personnes vivant sous le même toit influencent le droit du demandeur. Cet onglet établit ce qui remonte, et à quelle hauteur.

### Qui encoder, et avec quel effet

Le type de cohabitant détermine entièrement le traitement. C'est le premier choix à faire, et le plus important.

| Type | Badge | Traitement de ses ressources |
|---|---|---|
| Partenaire de vie | §1 | Prises en compte, avec son propre seuil |
| Père, mère, fils, fille, beau-parent marié, gendre, belle-fille, ex-conjoint | §2 | Débiteur d'aliments — prises en compte |
| Grand-parent, petit-enfant | §2b | Débiteur d'aliments — prises en compte |
| Autre (frère, sœur, oncle, tante…) | §3 | **Non prises en compte** — affichage indicatif seulement |
| Partenaire avec enfant(s) mineur(s) | §4 | **Toutes** prises en compte, sans seuil |

Deux cas méritent d'être soulignés.

Le **§3** couvre la fratrie et la famille collatérale. Ces personnes ne sont pas débitrices d'aliments : leurs ressources sont affichées à titre informatif mais n'entrent dans aucun calcul, ni leurs ressources ni leur seuil. Vous pouvez les encoder pour documenter le dossier sans fausser le résultat.

Le **§4** est le plus sévère : le seuil est mis à zéro, donc l'intégralité des ressources du partenaire remonte.

### Encoder les ressources d'un cohabitant

Pour chaque cohabitant, indiquez sa **catégorie** — celle qui serait la sienne s'il demandait le RI, généralement cohabitant — puis ses ressources par nature : revenus professionnels nets, allocation de chômage, indemnité de mutuelle, pension, revenu de remplacement, allocation d'handicapé, ressources diverses, biens immobiliers, biens mobiliers, autres revenus.

Les rubriques patrimoniales d'un cohabitant suivent exactement les mêmes règles que celles du demandeur, décrites en 3.6 à 3.8.

### Ce qui remonte vers le demandeur

Le mécanisme est un test de moyens : on compare les ressources annuelles du cohabitant au seuil annuel de sa propre catégorie. Seul l'**excédent** remonte — ce qu'il possède au-delà de ce dont il aurait lui-même besoin.

Un cohabitant dont les ressources restent sous son seuil ne fait donc rien remonter. Le simulateur l'indique alors explicitement : « le cohabitant a possiblement droit au RI ».

Le champ **Prise en charge** module ce report :

| Réglage | Effet |
|---|---|
| Report max | L'excédent entier remonte |
| Report partiel | Un pourcentage de l'excédent, à préciser |
| Pas de report | Rien ne remonte |

Le réglage **Prise en compte** distingue l'application du barème légal d'un montant retenu **en équité**, que vous fixez alors vous-même — utile quand le CPAS décide de ne retenir qu'une partie des ressources au vu de la situation concrète.

Enfin, **Nombre de bénéficiaires du RI** divise l'excédent entre plusieurs demandeurs du même ménage. Trois enfants majeurs demandeurs se partagent l'excédent des parents, chacun n'en supportant qu'un tiers.

> **Base légale et formule**
> Art. 34 AR 11/07/2002 ; circulaire du 16/01/2026 pour le calcul groupé.
> `excédent = max(0, ressources annuelles du cohabitant − seuil RI de sa catégorie)`
> `montant reporté = excédent × pourcentage de prise en charge`
> §4 : `seuil = 0`. §3 : exclu du calcul, ressources et seuil ignorés.

### Mode groupé ou mode individuel

> **Point d'interprétation**
>
> Quand plusieurs débiteurs d'aliments cohabitent — typiquement les deux parents — l'article 34 prescrit d'« additionner l'ensemble des ressources » sans préciser si l'on agrège les personnes ou si on les évalue séparément. Les deux lectures existent en pratique, et le simulateur les permet toutes deux.
>
> **Mode groupé** — les ressources des débiteurs sont cumulées et comparées à la somme de leurs seuils. Le déficit de l'un absorbe l'excédent de l'autre.
>
> **Mode individuel** — chaque débiteur est évalué sur sa seule situation, et les excédents constatés sont additionnés.
>
> L'écart n'est pas marginal. Exemple d'un père disposant de 1 681,58 €/an et d'une mère de 14 635,08 €/an, tous deux cohabitants :
>
> | Mode | Calcul | Excédent reporté |
> |---|---|---|
> | Groupé | 16 316,66 € contre 21 447,50 € de seuils cumulés | **0 €** |
> | Individuel | Père 0 € ; mère 14 635,08 − 10 723,75 | **3 911,33 €** |
>
> Sur un enfant demandeur, cela représente plus de 300 €/mois de différence. Une question complémentaire reste ouverte en mode individuel : l'excédent d'un parent se reporte-t-il en entier sur chaque enfant demandeur, ou se divise-t-il entre eux ?
>
> Le choix relève de la position du service, pas d'un défaut de l'outil. En cas de doute persistant, la voie est de soumettre la question au SPP Intégration sociale pour obtenir une position écrite applicable à l'ensemble du service.

> **Base légale et formule**
> Mode groupé : `excédent = max(0, Σ ressources − Σ seuils) ÷ nb bénéficiaires`
> Mode individuel : `report total = Σ des excédents individuels`

---

## 5. Onglet Aperçu du calcul

Cet onglet ne se remplit pas : il restitue le calcul, ligne par ligne, du détail des ressources jusqu'au montant mensuel.

Sa fonction principale est le **contrôle**. Chaque rubrique encodée apparaît avec son montant mensuel et son équivalent annuel, ce qui permet de repérer immédiatement une erreur d'unité ou une saisie oubliée. Un montant qui vous surprend se retrouve à sa ligne, et vous savez quel onglet corriger.

On y lit successivement le sous-total des ressources professionnelles, chaque catégorie de ressources, le total annuel, l'exonération supplémentaire, le seuil de la catégorie, puis le RI annuel et mensuel.

L'**exonération supplémentaire annuelle** apparaît ici sans avoir été encodée : elle est automatique dès lors que le droit est ouvert.

| Catégorie | Exonération supplémentaire |
|---|---|
| 1 — cohabitant | 155 €/an |
| 2 — isolé | 250 €/an |
| 3 — famille | 310 €/an |

Le dernier bloc traite le mois incomplet, décrit au chapitre suivant.

Enfin, le bouton d'**export PDF** produit un rapport détaillant chaque étape du calcul. C'est la pièce à verser au dossier : elle documente non seulement le montant, mais le chemin qui y mène.

> **Base légale**
> Art. 22 §2 AR 11/07/2002. L'exonération supplémentaire n'est appliquée que si le droit est ouvert ; si les ressources atteignent le seuil, il n'y a pas de droit et l'exonération ne s'applique pas.

---

## 6. Le mois incomplet et la nouvelle demande

Deux mécanismes se combinent ici, et les confondre est la cause d'erreur la plus fréquente.

### Le prorata du montant RI

Quand le droit s'ouvre en cours de mois, le montant dû ne couvre que les jours concernés. Le simulateur détecte une date d'octroi qui n'est pas le premier du mois et calcule le nombre de jours, du jour d'octroi à la fin du mois. Vous pouvez remplacer ce nombre par une valeur manuelle.

Ce prorata s'applique **au montant du RI**, en toute fin de chaîne, une fois le droit mensuel établi.

### Le prorata des revenus, lié à la nouvelle demande

En **nouvelle demande** — première demande, ou reprise après une interruption d'au moins deux mois complets — les revenus professionnels et assimilés du demandeur sont eux aussi proratisés. La raison : une partie de ces revenus se rapporte à la période antérieure à l'ouverture du droit, qui n'est pas couverte.

Si la case est décochée, il s'agit d'une continuation : les revenus du mois sont pris en compte en entier, et seul le montant du RI est proratisé à la fin.

### Ce que le prorata ne touche pas

> **Point d'interprétation**
>
> Le prorata de la nouvelle demande porte **uniquement sur les revenus professionnels et assimilés du demandeur** : salaire, chômage, mutuelle, revenus de remplacement. Ne sont pas proratisés : les ressources des cohabitants, les biens mobiliers, les biens immobiliers, les cessions, les avantages en nature.
>
> Cette délimitation surprend, et la question revient régulièrement. Le raisonnement qui la soutient : l'excédent d'un cohabitant est un test de moyens **annuel**, comparé au seuil annuel de sa catégorie. Réduire ses ressources à onze jours tout en les comparant à un seuil annuel non réduit reviendrait à confronter onze jours de revenus à douze mois de besoin — et ferait disparaître l'excédent dans pratiquement tout dossier ouvert en cours de mois. De plus, la pension d'un cohabitant est bien perçue en entier pendant ces onze jours, contrairement à un salaire du demandeur dont une part peut relever de la période antérieure.
>
> La lecture inverse — proratiser toutes les ressources de la période — se défend, à condition de proratiser aussi les seuils pour rester cohérent. Le simulateur retient la première lecture ; si votre service retient l'autre, le calcul doit être ajusté manuellement.
>
> Exemple : demandeuse catégorie 3, sans revenus, droit du 21 au 31 août ; mère cohabitante percevant 1 812,33 €/mois de pension.
>
> | | Traitement |
> |---|---|
> | Pension de la mère | 21 747,96 €/an, **non proratisée** |
> | Excédent reporté | 918,68 €/mois |
> | RI mensuel plein | 918,73 € |
> | RI dû pour 11 jours sur 31 | **326,00 €** |

### L'autre effet de la case

La case « Nouvelle demande » conditionne aussi l'accès aux exonérations de l'article 35, comme expliqué en 3.3. C'est pourquoi elle se trouve dans l'onglet Informations, à côté de la date : elle relève du cadrage du dossier, pas du seul calcul du prorata.

> **Base légale et formule**
> Art. 16 de la loi du 26/05/2002.
> `revenus proratisés = revenus proratisables × jours couverts ÷ jours du mois`
> `RI dû = RI mensuel × jours couverts ÷ jours du mois`

---

## 7. Hors périmètre

Le simulateur calcule le droit au revenu d'intégration. Trois mécanismes voisins n'en relèvent pas et doivent être traités en dehors de l'outil.

**La récupération auprès des débiteurs d'aliments.** À ne pas confondre avec l'article 34. L'article 34 détermine quelles ressources d'un cohabitant comptent dans le calcul du demandeur — c'est ce que fait l'outil. La récupération règle ce que le CPAS peut réclamer à un débiteur, selon ses propres plafonds et sa propre échelle. C'est la confusion la plus fréquente.

**L'argent de poche** des personnes en institution.

**Les aides sociales** autres que le revenu d'intégration.

---

## 8. Mémo des barèmes

Montants au **01/09/2026**, appliqués automatiquement selon la date d'octroi encodée.

**Seuils du revenu d'intégration**

| Catégorie | Annuel | Mensuel |
|---|---|---|
| 1 — cohabitant | 10 938,74 € | 911,56 € |
| 2 — isolé | 16 408,11 € | 1 367,34 € |
| 3 — famille à charge | 22 174,69 € | 1 847,89 € |

**Exonérations socio-professionnelles (Art. 35)**

| Exonération | Montant |
|---|---|
| Générale | 321,99 €/mois |
| Étudiants | 321,99 €/mois |
| Métiers en pénurie | 461,45 €/mois |
| Activité artistique | 3 863,93 €/an |

**Exonération supplémentaire annuelle (Art. 22 §2)**

| Catégorie 1 | Catégorie 2 | Catégorie 3 |
|---|---|---|
| 155 € | 250 € | 310 € |

**Défraiement du volontaire**

| Par jour | Par an | Kilométrique vélo |
|---|---|---|
| 44,02 € | 1 760,83 € | 0,37 €/km |

**Seuils patrimoniaux** — montants forfaitaires, non indexés

| Élément | Montant |
|---|---|
| Biens mobiliers — tranche exonérée | 6 200 € |
| Biens mobiliers — seuil de la tranche à 10 % | 12 500 € |
| Cessions — tranche immunisée (bien unique, cession onéreuse) | 37 200 € |
| Cessions — abattement annuel par catégorie | 1 250 / 2 000 / 2 500 € |
| Biens immobiliers — exonération bâtie | 750 € + 125 €/enfant |
| Biens immobiliers — exonération non bâtie | 30 € |

---

*Document à usage interne — Formation et référence, agents CPAS*
*Simulateur RI — Vanden Broele / CPASConnect*
