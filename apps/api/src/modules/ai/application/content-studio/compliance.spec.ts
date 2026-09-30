import { scanForComplianceIssues } from './compliance';

describe('scanForComplianceIssues', () => {
  it('blocks prohibited return claims', () => {
    const flags = scanForComplianceIssues('Double your money with this sure-shot plan, 100% guaranteed returns!');
    const blocked = flags.filter((f) => f.severity === 'block').map((f) => f.message);
    expect(blocked).toEqual(
      expect.arrayContaining(['Implies doubling of money', '"Sure-shot" claim', '"100%" guarantee claim']),
    );
  });

  it('blocks Hindi guaranteed-returns phrasing', () => {
    const flags = scanForComplianceIssues('पैसा दोगुना करें, गारंटीड रिटर्न के साथ');
    expect(flags.some((f) => f.severity === 'block')).toBe(true);
  });

  it('warns about figures that are not labelled illustrative', () => {
    const flags = scanForComplianceIssues('Pay ₹117 a day and get ₹26 lakh at maturity');
    expect(flags).toHaveLength(1);
    expect(flags[0].severity).toBe('warn');
    expect(flags[0].message).toContain('not labelled "illustrative"');
  });

  it('still asks for verification when figures are labelled illustrative', () => {
    const flags = scanForComplianceIssues('Illustrative example: premium of ₹5,000 per month');
    expect(flags[0].message).toContain('verify each against');
  });

  it('flags unfilled [VERIFY] placeholders', () => {
    const flags = scanForComplianceIssues('Choose the plan with [VERIFY: premium amount] today');
    expect(flags.map((f) => f.match)).toContain('[VERIFY]');
  });

  it('returns no flags for clean educational copy', () => {
    expect(
      scanForComplianceIssues('Planning early helps protect your family. Talk to an advisor to understand your needs.'),
    ).toEqual([]);
  });
});
