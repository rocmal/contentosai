import {
  InvalidSceneGraphError,
  SceneGraph,
  compileOmniPrompt,
  sceneGraphDurationSeconds,
} from './omni-prompt-compiler';

function graph(overrides: Partial<SceneGraph> = {}): SceneGraph {
  return {
    shots: [
      { startSecond: 0, endSecond: 3, description: 'A person walks', referenceImageIndexes: [] },
    ],
    singleContinuousShot: false,
    brandDirectives: [],
    metaDirectives: [],
    audioDirection: null,
    negatives: [],
    referenceImages: [],
    ...overrides,
  };
}

describe('compileOmniPrompt', () => {
  it('emits timecoded lines for a multi-shot scene', () => {
    const prompt = compileOmniPrompt(
      graph({
        shots: [
          { startSecond: 0, endSecond: 3, description: 'A person walks', referenceImageIndexes: [] },
          { startSecond: 3, endSecond: 6, description: 'They turn around', referenceImageIndexes: [] },
        ],
      }),
    );

    expect(prompt).toContain('[0-3s] A person walks');
    expect(prompt).toContain('[3-6s] They turn around');
  });

  it('drops the timecode for a single continuous shot and adds the directive', () => {
    const prompt = compileOmniPrompt(graph({ singleContinuousShot: true }));

    expect(prompt).not.toContain('[0-3s]');
    expect(prompt).toContain('single continuous, unbroken shot');
  });

  it('renders negatives as positive "No X." statements', () => {
    // The model has no negative-prompt parameter, so suppression has to be
    // expressed inside the prompt body.
    const prompt = compileOmniPrompt(graph({ negatives: ['dialogue', 'text overlays'] }));

    expect(prompt).toContain('No dialogue.');
    expect(prompt).toContain('No text overlays.');
  });

  it('flattens brand directives into the prompt body', () => {
    const prompt = compileOmniPrompt(
      graph({ brandDirectives: ['Use a warm, optimistic tone.'] }),
    );

    expect(prompt).toContain('Use a warm, optimistic tone.');
  });

  it('tags referenced images inline and declares their roles', () => {
    const prompt = compileOmniPrompt(
      graph({
        shots: [
          { startSecond: 0, endSecond: 4, description: 'A woman holds a cup', referenceImageIndexes: [0] },
        ],
        referenceImages: [{ data: 'AAA', mimeType: 'image/png', isFirstFrame: false }],
      }),
    );

    expect(prompt).toContain('<IMAGE_REF_0>');
    expect(prompt).toContain('[# References <IMAGE_REF_0>@Image1]');
  });

  it('binds a first-frame image to <FIRST_FRAME> and keeps reference numbering zero-based', () => {
    const prompt = compileOmniPrompt(
      graph({
        shots: [
          { startSecond: 0, endSecond: 4, description: 'She walks off', referenceImageIndexes: [0] },
        ],
        referenceImages: [
          { data: 'AAA', mimeType: 'image/png', isFirstFrame: true },
          { data: 'BBB', mimeType: 'image/png', isFirstFrame: false },
        ],
      }),
    );

    expect(prompt).toContain('[# Sources <FIRST_FRAME>@Image1]');
    expect(prompt).toContain('[# References <IMAGE_REF_0>@Image2]');
  });

  it('rejects an empty scene graph', () => {
    expect(() => compileOmniPrompt(graph({ shots: [] }))).toThrow(InvalidSceneGraphError);
  });

  it('rejects overlapping shots', () => {
    expect(() =>
      compileOmniPrompt(
        graph({
          shots: [
            { startSecond: 0, endSecond: 4, description: 'A', referenceImageIndexes: [] },
            { startSecond: 2, endSecond: 6, description: 'B', referenceImageIndexes: [] },
          ],
        }),
      ),
    ).toThrow(InvalidSceneGraphError);
  });

  it('rejects a shot that ends before it starts', () => {
    expect(() =>
      compileOmniPrompt(
        graph({
          shots: [{ startSecond: 5, endSecond: 5, description: 'A', referenceImageIndexes: [] }],
        }),
      ),
    ).toThrow(InvalidSceneGraphError);
  });

  it('rejects a reference index with no matching image', () => {
    expect(() =>
      compileOmniPrompt(
        graph({
          shots: [{ startSecond: 0, endSecond: 3, description: 'A', referenceImageIndexes: [2] }],
          referenceImages: [{ data: 'AAA', mimeType: 'image/png', isFirstFrame: false }],
        }),
      ),
    ).toThrow(InvalidSceneGraphError);
  });

  it('rejects more than one first-frame image', () => {
    expect(() =>
      compileOmniPrompt(
        graph({
          referenceImages: [
            { data: 'AAA', mimeType: 'image/png', isFirstFrame: true },
            { data: 'BBB', mimeType: 'image/png', isFirstFrame: true },
          ],
        }),
      ),
    ).toThrow(InvalidSceneGraphError);
  });
});

describe('sceneGraphDurationSeconds', () => {
  it('returns the last shot end second', () => {
    const duration = sceneGraphDurationSeconds(
      graph({
        shots: [
          { startSecond: 0, endSecond: 3, description: 'A', referenceImageIndexes: [] },
          { startSecond: 3, endSecond: 8, description: 'B', referenceImageIndexes: [] },
        ],
      }),
    );

    expect(duration).toBe(8);
  });
});
