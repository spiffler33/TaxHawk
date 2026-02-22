/**
 * Indian Rupee formatting helpers.
 *
 * Uses the Indian numbering system: lakhs (1,00,000) and crores (1,00,00,000).
 * toLocaleString('en-IN') handles comma placement automatically.
 */

/**
 * Format a number as ₹ with Indian comma grouping.
 * @param {number} amount - Amount in ₹
 * @returns {string} e.g. "₹18,00,000"
 */
export function formatINR(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

/**
 * Short format for display: ₹18L, ₹1.2Cr, ₹8.5K.
 * @param {number} amount - Amount in ₹
 * @returns {string}
 */
export function formatINRShort(amount) {
  if (amount == null || isNaN(amount)) return '₹0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) {
    const cr = abs / 1_00_00_000;
    return sign + '₹' + (cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(1)) + 'Cr';
  }
  if (abs >= 1_00_000) {
    const l = abs / 1_00_000;
    return sign + '₹' + (l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)) + 'L';
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return sign + '₹' + (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K';
  }
  return sign + '₹' + Math.round(abs).toString();
}

/**
 * Parse a "lakhs" string to rupees. e.g. "18.5" → 18,50,000.
 * @param {string} str
 * @returns {number} Amount in ₹ (0 if invalid)
 */
export function lakhsToRupees(str) {
  const num = parseFloat(str);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 1_00_000);
}

/**
 * Convert rupees to lakhs string for display in inputs.
 * @param {number} rupees
 * @returns {string}
 */
export function rupeesToLakhs(rupees) {
  if (!rupees) return '';
  return String(rupees / 1_00_000);
}
