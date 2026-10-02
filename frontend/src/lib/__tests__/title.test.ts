import { describe, expect, it } from '@jest/globals';
import { suggestTitle, TITLE_MAX_LENGTH } from '../title';

describe('suggestTitle', () => {
  it.each([
    ['a red velvet couch in a sunny living room', 'Red velvet couch'],
    ['A cat asleep on a red sofa', 'Cat asleep'],
    ['the lighthouse at dusk, with waves crashing', 'Lighthouse'],
    ['sunset over the mountains', 'Sunset'],
    ['my dog playing fetch at the beach', 'Dog playing fetch'],
    ['cup of coffee', 'Cup of coffee'],
    ['a big old wooden boat with tall white sails', 'Big old wooden boat'],
    ['a tall glass castle floating high above the clouds', 'Tall glass castle floating high'],
    ['cat', 'Cat'],
    ['  ', ''],
  ])('names "%s" as "%s"', (description, title) => {
    expect(suggestTitle(description)).toBe(title);
  });

  it('keeps a single long word to the maximum length', () => {
    expect(suggestTitle('x'.repeat(100))).toHaveLength(TITLE_MAX_LENGTH);
  });
});
