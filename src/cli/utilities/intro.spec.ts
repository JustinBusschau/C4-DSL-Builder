import { jest } from '@jest/globals';

jest.unstable_mockModule('figlet', () => ({
  default: {
    textSync: () => '<<ASCII ART>>',
  },
}));

const { getIntroText } = await import('./intro.js');

describe('Intro', () => {
  it('should return formatted intro text with version', () => {
    const version = '1.2.3';
    const text = getIntroText(version);

    expect(text).toContain('<<ASCII ART>>');
    expect(text).toContain(`Version ${version}`);
    expect(text).toContain('Enhance your C4 Modelling');
  });
});
