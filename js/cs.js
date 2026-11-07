// Oslovení zákazníka ve správném českém tvaru (5. pád): „Dobrý den, pane Nováku,“ / „Dobrý den, paní Nováková,“.
// Firmy, více osob a nejisté případy dostanou neutrální „Dobrý den,“. Text lze v e-mailu před odesláním upravit.
const MALE_A = new Set(['honza', 'jirka', 'kuba', 'míra', 'mira', 'láďa', 'ladja', 'sáva', 'vláďa', 'vlada', 'jenda', 'standa', 'tonda', 'pepa', 'franta', 'olda', 'radek', 'dan', 'luka', 'nikola', 'barnabáš', 'jonáš', 'tomáš', 'matyáš', 'lukáš', 'ondřej', 'vojta', 'péťa', 'peťa', 'kryštof', 'saša', 'sasha', 'boba', 'béda', 'mikuláš', 'dalibor', 'ilja', 'ivo']);
const FEM_CONS = new Set(['dagmar', 'ester', 'miriam', 'mirjam', 'ingrid', 'karin', 'iren', 'ruth', 'margit', 'beatrix', 'alice', 'lilian', 'ketrin', 'carmen', 'rút', 'jarmila', 'ines', 'nikol', 'maruš', 'ljuba', 'dorothy', 'eleonor', 'sharon']);
const TITLES = /^(ing\.?|mgr\.?|bc\.?|mudr\.?|judr\.?|phdr\.?|rndr\.?|doc\.?|prof\.?|paeddr\.?|ph\.?d\.?|csc\.?|dr\.?|mba|dis\.?|arch\.?|bca?\.?|manželé|manželů|pan|paní|p\.|pí|rodina|fam\.?)$/i;
const COMPANY = /(\bs\.?\s?r\.?\s?o\b|\ba\.?\s?s\b|\bspol\b|\bv\.?\s?o\.?\s?s\b|\bk\.?\s?s\b|\bz\.?\s?s\b|\bs\.?\s?p\.?\b|\bsvj\b|\bobec\b|\bměsto\b|\bměstys\b|\bfirma\b|družstvo|sdružení|\bstavby?\b|stavební|\bbytov|\bhotel\b|\brestaurace\b|\bpenzion\b|\bnadace\b|\búřad\b|\bškola\b|\bmateřská\b|\bholding\b|\bgroup\b|\bltd\b|\bgmbh\b|\binc\b|\bcz\b|&)/i;

function vocSurnameMale(s) {
  const l = s.toLowerCase();
  const keep = (x) => s.slice(0, s.length - x) ; // zkrátí z konce
  if (/^(král|havlíček)$/.test(l) && l === 'král') return s + 'i'; // Král → Králi
  if (/[ýí]$/.test(l)) return s; // adjektivní příjmení (Novotný, Krejčí) mají stejný tvar
  if (/ů$/.test(l) || /ův$/.test(l)) return s;
  if (/ek$/.test(l) && l.length > 3) return keep(2) + 'ku'; // Hájek → Hájku
  if (/ec$/.test(l)) return keep(2) + 'če'; // Němec → Němče
  if (/a$/.test(l)) return keep(1) + 'o'; // Svoboda → Svobodo
  if (/o$/.test(l)) return s;
  if (/e$/.test(l)) return s;
  if (/(ch|[khg])$/.test(l)) return s + 'u'; // Novák → Nováku, Černoch → Černochu
  if (/ř$/.test(l)) return s + 'i'; // Kolář → Koláři
  if (/[šžčcjďťň]$/.test(l) || /[sz]$/.test(l) && false) return s + 'i'; // Beneš → Beneši
  if (/[cs]h?$/.test(l) && false) return s;
  if (/(?<![aeiouyáéíóúůýě])r$/.test(l)) return keep(1) + 'ře'; // Petr → Petře
  if (/el$/.test(l) && /^(pav|hav|mich|dan|ráf|gabr|manu|rafa)/.test(l) && false) return s;
  if (/[bcdfhjklmnpqrstvwxzsz]$/.test(l)) return s + 'e'; // Pospíšil → Pospíšile, Mráz → Mráze
  return s;
}

export function parseCustomer(raw) {
  const clean = String(raw || '').replace(/[,;() ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean || COMPANY.test(clean) || /\s(a|i|\+|\/)\s/i.test(clean) || /manžel|rodina|fam\./i.test(clean)) return null;
  const toks = clean.split(' ').filter((t) => !TITLES.test(t) && !/^\d/.test(t));
  if (!toks.length || toks.length > 3) return null;
  const sur = toks[toks.length - 1];
  const first = toks.length > 1 ? toks[0] : '';
  if (!/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž'-]{1,}$/.test(sur)) return null;
  return { first, sur };
}

export function genderOf({ first, sur }) {
  const s = sur.toLowerCase(), f = first.toLowerCase();
  if (/ová$/.test(s) || (/á$/.test(s) && s.length > 3)) return 'f';
  if (f) {
    if (MALE_A.has(f)) return 'm';
    if (/[aeiy]$/.test(f) && !/^(ondřej|tomáš)$/.test(f)) return /(a|e|ie|ia|ye)$/.test(f) ? 'f' : 'm';
    if (FEM_CONS.has(f)) return 'f';
    return 'm';
  }
  return /ý$|ek$|ák$|[^a]$/.test(s) && !/a$/.test(s) ? 'm' : null; // jen příjmení: spoléháme na koncovku
}

export function greeting(name) {
  const p = parseCustomer(name);
  if (!p) return 'Dobrý den,';
  const g = genderOf(p);
  if (g === 'f') return `Dobrý den, paní ${p.sur},`; // ženská příjmení mají 5. pád stejný (Nováková, Černá, Smith)
  if (g === 'm') return `Dobrý den, pane ${vocSurnameMale(p.sur)},`;
  return 'Dobrý den,';
}
