export type ComplianceSeverity = 'block' | 'warn';

export interface ComplianceFlag {
  severity: ComplianceSeverity;
  message: string;
  match: string;
}

interface Rule {
  pattern: RegExp;
  severity: ComplianceSeverity;
  message: string;
}

/** Phrases regulated-industry (insurance) advertising must not use unless the
 * exact approved product documentation supports them. Matching is a safety
 * net on top of the instructions given to the model - not a legal review. */
const PROHIBITED_PHRASES: Rule[] = [
  { pattern: /double(?:s|d)?\s+(?:your|the)\s+money/i, severity: 'block', message: 'Implies doubling of money' },
  { pattern: /sure[\s-]?shot/i, severity: 'block', message: '"Sure-shot" claim' },
  { pattern: /risk[\s-]?free|no\s+risk/i, severity: 'block', message: 'Claims no risk' },
  { pattern: /guaranteed\s+(?:profit|profits)/i, severity: 'block', message: 'Guaranteed profit claim' },
  { pattern: /100\s*%\s*(?:guaranteed|safe|secure|returns?)/i, severity: 'block', message: '"100%" guarantee claim' },
  { pattern: /highest\s+returns?/i, severity: 'block', message: '"Highest returns" needs approved substantiation' },
  { pattern: /(?:best|no\.?\s*1|number\s+(?:one|1)|#\s*1)\s+(?:plan|policy|insurance|insurer|company)/i, severity: 'block', message: '"Best / No.1" claim needs substantiation' },
  { pattern: /guaranteed\s+returns?/i, severity: 'warn', message: 'Guarantee must state its conditions and limitations' },
  { pattern: /suitable\s+for\s+(?:everyone|all)/i, severity: 'warn', message: 'Claims a plan suits everyone' },
  { pattern: /दोगुना|दुगना|दुगुना/, severity: 'block', message: 'Implies doubling of money (Hindi)' },
  { pattern: /गारंटीड\s*रिटर्न|पक्का\s*मुनाफा|100\s*%\s*गारंटी/, severity: 'block', message: 'Guaranteed-returns claim (Hindi)' },
  // Models drift into "invest" language for savings-type plans. Insurance copy should describe protection and plan features, not an investment return.
  { pattern: /\binvest(?:ment|ments|ing|s|ed)?\b/i, severity: 'warn', message: 'Describes insurance as an investment - check the wording against the approved product document' },
  { pattern: /निवेश/, severity: 'warn', message: 'Describes insurance as an investment (Hindi) - check the wording against the approved product document' },
];

const FIGURE_PATTERN = /(?:₹|rs\.?|inr)\s?[\d,]+|[\d,.]+\s?(?:lakh|lakhs|crore|crores|लाख|करोड़|%)/i;

export function scanForComplianceIssues(text: string): ComplianceFlag[] {
  const flags: ComplianceFlag[] = [];
  for (const rule of PROHIBITED_PHRASES) {
    const match = text.match(rule.pattern);
    if (match) {
      flags.push({ severity: rule.severity, message: rule.message, match: match[0] });
    }
  }

  const figure = text.match(FIGURE_PATTERN);
  if (figure) {
    const labelledIllustrative = /illustrative|उदाहरण|ਉਦਾਹਰਣ/i.test(text);
    flags.push({
      severity: 'warn',
      message: labelledIllustrative
        ? 'Contains figures - verify each against the exact product documentation before publishing'
        : 'Contains figures that are not labelled "illustrative" - verify and label before publishing',
      match: figure[0],
    });
  }

  if (/\[VERIFY/i.test(text)) {
    flags.push({
      severity: 'warn',
      message: 'Contains [VERIFY] placeholders that must be filled with confirmed details',
      match: '[VERIFY]',
    });
  }

  return flags;
}

export const INSURANCE_DISCLAIMER =
  'Insurance is the subject matter of solicitation. Please read the sales brochure / policy document carefully before concluding a sale. Benefits, if any, are subject to policy terms and conditions.';
