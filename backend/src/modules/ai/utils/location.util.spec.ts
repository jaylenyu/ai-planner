import { normalizeLocation, stripLocationParticles } from './location.util';

describe('location.util', () => {
  it('removes 조사 such as "에서" and "에"', () => {
    expect(normalizeLocation('상주에서')).toBe('상주');
    expect(normalizeLocation('당진에')).toBe('당진');
  });

  it('maps aliases like 성수/뚝섬 to canonical names', () => {
    expect(normalizeLocation('성수')).toBe('성수동');
    expect(normalizeLocation('뚝섬에서')).toBe('성수동');
  });

  it('strips polite endings and punctuation when scanning raw text', () => {
    expect(stripLocationParticles('상주에서요')).toBe('상주');
    expect(stripLocationParticles('문경에서요?!')).toBe('문경');
  });
});
