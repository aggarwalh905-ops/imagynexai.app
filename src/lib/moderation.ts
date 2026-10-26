// src/lib/moderation.ts

// --- Exact Categorized Denylist ---
const BANNED_PATTERNS: string[] = [
  // Explicit Sexual & NSFW
  'nsfw', 'nude', 'nudity', 'naked', 'porn', 'porno', 'pornography', 'xxx', 'sex', 'sexual',
  'intercourse', 'erotic', 'erotica', 'hentai', 'ecchi', 'lewd', 'lust', 'orgasm',
  'penis', 'vagina', 'dick', 'cock', 'pussy', 'clitoris', 'boob', 'boobs', 'breast',
  'breasts', 'nipple', 'nipples', 'areola', 'tits', 'titties', 'anus', 'anal', 'asshole',
  'buttocks', 'crotch', 'genital', 'genitals', 'ejaculation', 'cum', 'sperm', 'deepthroat',
  'blowjob', 'handjob', 'dildo', 'vibrator', 'masturbate', 'masturbation',

  // Provocative Clothing & Undergarments
  'lingerie', 'underwear', 'panties', 'panty', 'bra', 'bralette', 'thong', 'g-string',
  'bikini', 'micro-bikini', 'topless', 'bottomless', 'see-through', 'sheer clothing',
  'translucent dress', 'cameltoe', 'cleavage', 'plunging neckline', 'exposed skin',
  'upskirt', 'downblouse', 'stripper', 'striptease', 'bdsm', 'bondage', 'fetish',

  // Violence, Gore & Harm
  'gore', 'bloody', 'blood', 'decapitated', 'beheaded', 'mutilated', 'dismembered',
  'corpse', 'dead body', 'slaughter', 'massacre', 'torture', 'suicide', 'self-harm',
  'strangle', 'hanging body', 'snuff', 'autopsy', 'guts', 'viscera',

  // Minor Protection & Illegal Acts
  'lolita', 'shota', 'underage', 'child', 'minor', 'teen nude', 'jailbait', 'pedophile',
  'rape', 'assault', 'incest', 'bestiality', 'zoophilia', 'snuff', 'deepfake nude'
];

/**
 * Converts leetspeak and symbols to plain characters
 */
function decodeLeetspeak(str: string): string {
  return str
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i');
}

/**
 * Builds boundary-safe regex for evasion patterns (e.g. "p.o.r.n" or "p o r n")
 * Prevents substring collisions like "drapery", "grapes", "cumulus", "analysis"
 */
function buildSafePatternRegex(pattern: string): RegExp {
  const words = pattern.trim().toLowerCase().split(/\s+/);

  const wordRegexes = words.map(w => {
    // Allows optional dots/dashes/spaces between letters: p[\s._-]*o[\s._-]*r[\s._-]*n
    const letterGroup = w
      .split('')
      .map(char => char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('[\\s._-]*');

    return `\\b${letterGroup}\\b`;
  });

  return new RegExp(wordRegexes.join('\\s+'), 'i');
}

export function validatePromptSafety(prompt: string): { isSafe: boolean; reason?: string } {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { isSafe: false, reason: 'Invalid or empty prompt provided.' };
  }

  const rawClean = prompt.toLowerCase();
  const leetDecoded = decodeLeetspeak(rawClean);

  for (const pattern of BANNED_PATTERNS) {
    const evasionRegex = buildSafePatternRegex(pattern);

    // Tests across raw input & leet-decoded input with strict word boundaries
    if (evasionRegex.test(rawClean) || evasionRegex.test(leetDecoded)) {
      return {
        isSafe: false,
        reason: `Your prompt contains restricted or unsafe keywords ("${pattern}"). Please ensure prompts are family-friendly.`
      };
    }
  }

  return { isSafe: true };
}