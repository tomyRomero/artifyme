export const TITLE_MAX_LENGTH = 60;

const LEADING_WORDS = /^(a|an|the|my|some)\s+/i;
// Where the subject usually ends: "a red couch | in a sunny room"
const BREAK_WORDS = new Set([
  'in',
  'on',
  'at',
  'with',
  'by',
  'under',
  'near',
  'over',
  'above',
  'below',
  'across',
  'through',
  'into',
  'around',
  'between',
  'from',
  'and',
  'while',
  'that',
  'who',
  'which',
  'during',
  'behind',
  'beside',
  'inside',
  'next',
  'against',
]);
const MAX_WORDS = 5;

// A short title from a description: "a red velvet couch in a sunny living room" -> "Red velvet couch"
export function suggestTitle(description: string): string {
  const firstClause = description
    .trim()
    .split(/[,.;:!?\n]/)[0]
    .trim()
    .replace(LEADING_WORDS, '');
  const words = firstClause.split(/\s+/).filter(Boolean);
  const breakAt = words.findIndex((word, index) => index > 0 && BREAK_WORDS.has(word.toLowerCase()));
  const kept = words.slice(0, breakAt === -1 ? MAX_WORDS : Math.min(breakAt, MAX_WORDS));

  let title = '';
  for (const word of kept) {
    const longer = title ? `${title} ${word}` : word;
    if (longer.length > TITLE_MAX_LENGTH) {
      break;
    }
    title = longer;
  }
  title ||= firstClause.slice(0, TITLE_MAX_LENGTH);
  return title.charAt(0).toUpperCase() + title.slice(1);
}
