#!/usr/bin/env node
// Veille réglementaire — simulateur RI
//
//   node tools/veille/veille.mjs            récupère, écrit les instantanés, signale les changements
//   node tools/veille/veille.mjs --check    n'écrit rien, sort en code 1 si dérive (usage CI)
//   node tools/veille/veille.mjs --baremes  contrôle seul des barèmes du code contre la source officielle
//
// Les instantanés sont versionnés dans docs/kb/ : `git diff` après exécution
// montre donc littéralement ce qui a changé dans la réglementation.
//
// Ne récupère que les sources marquées `actif: true` dans sources.json.
// Les sources de statut "editeur" sont laissées inactives à dessein : robots.txt
// n'autorise pas la réutilisation, et leurs conditions d'utilisation s'appliquent.

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..", "..");
const KB = join(RACINE, "docs", "kb");
const APP = join(RACINE, "src", "App.jsx");
const UA = "VdB-RI-veille/1.0 (veille reglementaire simulateur RI; contact via vandenbroele.be)";
const PAUSE_MS = 1500; // courtoisie entre deux requêtes sur un même hôte

const args = new Set(process.argv.slice(2));
const CHECK = args.has("--check");
const BAREMES_SEULS = args.has("--baremes");

let derive = false;

// ── Utilitaires ─────────────────────────────────────────────────────────────

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** 10938.74 → "10.938,74" — pour l'affichage du rapport uniquement. */
const versTexteBe = (n) =>
  n.toLocaleString("fr-BE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    .replace(/[  ]/g, ".");

const SEPARATEURS = /[   ]/g;

/**
 * Convertit un jeton numérique belge en nombre, quel que soit le séparateur.
 * La page officielle du SPP mélange les conventions — « 3.863,93/an » et
 * « 461.45/mois » cohabitent dans la même ligne — d'où cette tolérance.
 * Règle : le dernier séparateur suivi d'exactement deux chiffres est décimal ;
 * un séparateur suivi de trois chiffres marque les milliers.
 */
function jetonVersNombre(jeton) {
  const t = jeton.replace(SEPARATEURS, "");
  const dernierPoint = t.lastIndexOf(".");
  const derniereVirgule = t.lastIndexOf(",");
  const pos = Math.max(dernierPoint, derniereVirgule);
  if (pos === -1) return Number(t);
  const decimales = t.length - pos - 1;
  if (decimales === 3) return Number(t.replace(/[.,]/g, "")); // séparateur de milliers
  return Number(t.slice(0, pos).replace(/[.,]/g, "") + "." + t.slice(pos + 1));
}

/** Tous les montants présents dans un texte, dédoublonnés. */
function montantsDuTexte(texte) {
  const jetons = texte.match(/\d[\d.,   ]*\d/g) || [];
  const vus = new Set();
  for (const j of jetons) {
    const n = jetonVersNombre(j);
    if (Number.isFinite(n) && n > 0) vus.add(Math.round(n * 100) / 100);
  }
  return vus;
}

/** HTML → texte lisible, stable d'une exécution à l'autre. */
function enTexte(html) {
  return html
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/t[dh]>/gi, " | ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&eacute;/g, "é").replace(/&egrave;/g, "è").replace(/&agrave;/g, "à")
    .replace(/&ccedil;/g, "ç").replace(/&ecirc;/g, "ê").replace(/&euro;/g, "€")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
    .trim();
}

async function recuperer(url) {
  const rep = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
  return rep.text();
}

// ── Contrôle des barèmes du code contre la source officielle ────────────────

/** Extrait les tables datées de src/App.jsx. */
async function baremesDuCode() {
  const src = await readFile(APP, "utf8");
  const bloc = (nom) => {
    const m = src.match(new RegExp(`const ${nom} = \\[([\\s\\S]*?)\\n\\];`));
    return m ? m[1] : "";
  };
  const lignes = (txt) =>
    [...txt.matchAll(/\{\s*date:\s*"([\d-]+)"([^}]*)\}/g)].map(([, date, reste]) => ({
      date,
      valeurs: [...reste.matchAll(/(\w+):\s*([\d.]+)/g)].map(([, cle, v]) => ({
        cle,
        valeur: Number(v),
      })),
    }));
  return {
    RI_ANNUEL_TABLE: lignes(bloc("RI_ANNUEL_TABLE")),
    EXO_TABLE: lignes(bloc("EXO_TABLE")),
  };
}

/**
 * Contrôle de présence : chaque montant que le code applique à la date la plus
 * récente doit se retrouver sur la page officielle. Comparaison numérique et non
 * textuelle, pour rester insensible à la mise en page et aux séparateurs.
 * Les montants annuels sont aussi cherchés sous leur forme mensuelle.
 */
function controlerBaremes(texte, tables) {
  const montants = montantsDuTexte(texte);
  const present = (n) => montants.has(Math.round(n * 100) / 100);
  const resultats = [];
  for (const [nom, entrees] of Object.entries(tables)) {
    if (!entrees.length) continue;
    const derniere = entrees[entrees.length - 1];
    for (const { cle, valeur } of derniere.valeurs) {
      const direct = present(valeur);
      const mensuel = !direct && present(Math.round((valeur / 12) * 100) / 100);
      resultats.push({
        table: nom, date: derniere.date, cle, valeur,
        trouve: direct || mensuel,
        forme: direct ? "annuel" : mensuel ? "mensuel" : null,
      });
    }
  }
  return resultats;
}

// ── Programme principal ─────────────────────────────────────────────────────

const conf = JSON.parse(await readFile(join(ICI, "sources.json"), "utf8"));
const actives = conf.sources.filter((s) => s.actif);
const inactives = conf.sources.filter((s) => !s.actif);

if (!existsSync(KB)) await mkdir(KB, { recursive: true });

console.log(`Veille réglementaire — ${actives.length} source(s) active(s)\n`);

const aujourdhui = new Date().toISOString().slice(0, 10);
let textePourBaremes = "";

for (const [i, s] of actives.entries()) {
  if (i > 0) await dormir(PAUSE_MS);
  process.stdout.write(`  ${s.id.padEnd(22)} `);

  let texte;
  try {
    texte = enTexte(await recuperer(s.url));
  } catch (e) {
    console.log(`ÉCHEC — ${e.message}`);
    derive = true;
    continue;
  }

  if (s.baremes) textePourBaremes += "\n" + texte;

  const fichier = join(KB, `${s.id}.md`);
  const ancien = existsSync(fichier) ? await readFile(fichier, "utf8") : null;
  const ancienCorps = ancien ? ancien.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n+/, "") : null;

  if (ancienCorps !== null && ancienCorps.trimEnd() === texte.trimEnd()) {
    console.log("inchangé");
    continue;
  }

  const etat = ancien === null ? "NOUVEAU" : "MODIFIÉ";
  console.log(`${etat}  (${sha(texte)})`);
  if (etat === "MODIFIÉ") derive = true;

  if (!CHECK && !BAREMES_SEULS) {
    const entete = [
      "---",
      `source: ${s.url}`,
      `titre: ${s.titre}`,
      `statut: ${s.statut}`,
      `releve_le: ${aujourdhui}`,
      `empreinte: ${sha(texte)}`,
      "---",
      "",
    ].join("\n");
    await writeFile(fichier, entete + texte + "\n", "utf8");
  }
}

// ── Barèmes ─────────────────────────────────────────────────────────────────

if (textePourBaremes) {
  console.log("\nContrôle des barèmes du code contre la source officielle\n");
  const tables = await baremesDuCode();
  const res = controlerBaremes(textePourBaremes, tables);
  const manquants = res.filter((r) => !r.trouve);

  for (const r of res) {
    const marque = r.trouve ? "ok  " : "ABSENT";
    console.log(
      `  ${marque} ${r.table.padEnd(17)} ${r.date}  ${r.cle.padEnd(18)} ${versTexteBe(r.valeur).padStart(10)} €` +
        (r.forme === "mensuel" ? "  (trouvé sous forme mensuelle)" : "")
    );
  }

  if (manquants.length) {
    derive = true;
    console.log(
      `\n  ${manquants.length} montant(s) appliqué(s) par le simulateur sont introuvables sur la page officielle.`
    );
    console.log("  Soit une indexation est intervenue, soit la page a changé de forme. À vérifier.");
  } else {
    console.log("\n  Tous les barèmes de la dernière entrée sont confirmés par la source officielle.");
  }
}

// ── Sources déclarées mais non récupérées ───────────────────────────────────

if (inactives.length) {
  console.log("\nSources déclarées, non récupérées :");
  for (const s of inactives) {
    console.log(`  ${s.id.padEnd(22)} (${s.statut}) ${s.titre}`);
  }
  console.log("  Les sources de statut « editeur » requièrent une validation juridique avant activation.");
}

if (CHECK && derive) {
  console.log("\nDérive détectée.");
  process.exit(1);
}
console.log("");
