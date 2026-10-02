import { describe, expect, it } from '@jest/globals';
import { endStroke, fitArtboard, shapePath, smoothPoint, strokePath, toPath } from '@/lib/sketch';

describe('fitArtboard', () => {
  it('fills the width of a tall space, keeping the 2:3 shape', () => {
    expect(fitArtboard({ width: 360, height: 700 })).toEqual({ width: 360, height: 540 });
  });

  it('fills the height of a wide space', () => {
    expect(fitArtboard({ width: 800, height: 600 })).toEqual({ width: 400, height: 600 });
  });

  it('is empty before the space is known', () => {
    expect(fitArtboard({ width: 0, height: 0 })).toEqual({ width: 0, height: 0 });
  });
});

describe('smoothPoint', () => {
  it('keeps the first point where the finger is', () => {
    expect(smoothPoint(undefined, { x: 10, y: 20 })).toEqual({ x: 10, y: 20 });
  });

  it('drops a point too close to the last one', () => {
    expect(smoothPoint({ x: 10, y: 10 }, { x: 11, y: 11 })).toBeNull();
  });

  it('pulls a new point a little towards the last one', () => {
    const next = smoothPoint({ x: 0, y: 0 }, { x: 100, y: 0 });

    expect(next!.x).toBeCloseTo(70);
    expect(next!.y).toBe(0);
  });
});

describe('endStroke', () => {
  it('ends the stroke where the finger lifted', () => {
    expect(
      endStroke(
        [
          { x: 0, y: 0 },
          { x: 70, y: 0 },
        ],
        { x: 100, y: 0 },
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 70, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it("doesn't add a point where the stroke already ends", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 50 },
    ];

    expect(endStroke(points, { x: 50.4, y: 50 })).toBe(points);
  });

  it('ends a tap where it started', () => {
    expect(endStroke([{ x: 5, y: 5 }], { x: 5, y: 5 })).toEqual([{ x: 5, y: 5 }]);
  });
});

describe('toPath', () => {
  it('draws nothing without points', () => {
    expect(toPath([])).toEqual([]);
  });

  it('draws a tap as a dot', () => {
    expect(toPath([{ x: 10, y: 20 }])).toEqual(['M10,20', 'L10.1,20']);
  });

  it('draws two points as a straight line', () => {
    expect(
      toPath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toEqual(['M0,0', 'L10,10']);
  });

  it('curves through the midpoints between points, ending at the last point', () => {
    const path = toPath([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
    ]);

    expect(path).toEqual(['M0,0', 'Q10,0 15,5', 'Q20,10 25,10', 'L30,10']);
  });

  it('rounds to a tenth of a unit', () => {
    expect(toPath([{ x: 1.234, y: 5.678 }])).toEqual(['M1.2,5.7', 'L1.3,5.7']);
  });
});

describe('shapePath', () => {
  it('draws a line from where the drag began to where it ended', () => {
    expect(shapePath('line', { x: 10, y: 20 }, { x: 110, y: 70 })).toEqual(['M10,20', 'L110,70']);
  });

  it('draws a closed rectangle with the drag as its diagonal, in any direction', () => {
    expect(shapePath('rectangle', { x: 100, y: 80 }, { x: 20, y: 10 })).toEqual([
      'M100,80',
      'L20,80',
      'L20,10',
      'L100,10',
      'Z',
    ]);
  });

  it('draws an ellipse inside the box the drag makes', () => {
    const [start, ...curves] = shapePath('ellipse', { x: 0, y: 0 }, { x: 200, y: 100 });

    expect(start).toBe('M200,50');
    expect(curves.map((curve) => curve.split(' ').at(-1))).toEqual(['100,100', '0,50', '100,0', '200,50', 'Z']);
    expect(curves[0]).toBe('C200,77.6 155.2,100 100,100');
  });

  it('draws nothing from a drag too short to be meant', () => {
    expect(shapePath('ellipse', { x: 50, y: 50 }, { x: 52, y: 53 })).toEqual([]);
  });
});

describe('strokePath', () => {
  it('joins new segments into valid path data', () => {
    expect(strokePath({ path: ['M0,0', 'Q10,0 15,5', 'L30,10'], color: '#000', size: 4 })).toBe('M0,0Q10,0 15,5L30,10');
  });

  it('joins the segments of strokes drawn before the artboard', () => {
    expect(strokePath({ path: ['M1,1 ', '2,2 '], color: '#000', size: 4 })).toBe('M1,1 2,2 ');
  });
});
