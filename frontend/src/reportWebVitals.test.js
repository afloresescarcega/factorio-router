// Jest hoists jest.mock() factories above imports and forbids them from
// closing over normal out-of-scope variables; names prefixed with "mock"
// are special-cased as allowed.
const mockGetCLS = jest.fn();
const mockGetFID = jest.fn();
const mockGetFCP = jest.fn();
const mockGetLCP = jest.fn();
const mockGetTTFB = jest.fn();

jest.mock('web-vitals', () => ({
  getCLS: (...args) => mockGetCLS(...args),
  getFID: (...args) => mockGetFID(...args),
  getFCP: (...args) => mockGetFCP(...args),
  getLCP: (...args) => mockGetLCP(...args),
  getTTFB: (...args) => mockGetTTFB(...args),
}));

import reportWebVitals from './reportWebVitals';

describe('reportWebVitals', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('reports each web vital to the provided callback', async () => {
    // jest.fn() mocks are created in a different VM realm than jsdom's
    // globals in this Jest/jsdom setup, which makes `instanceof Function`
    // (as used inside reportWebVitals) false for them. Wrap in a plain
    // function, which passes that check the same way a real callback would.
    const spy = jest.fn();
    const onPerfEntry = (...args) => spy(...args);
    reportWebVitals(onPerfEntry);

    // The vitals functions are loaded via a dynamic import(); flush microtasks.
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mockGetCLS).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetFID).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetFCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetLCP).toHaveBeenCalledWith(onPerfEntry);
    expect(mockGetTTFB).toHaveBeenCalledWith(onPerfEntry);
  });

  test('does nothing when called without a callback', async () => {
    reportWebVitals();
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockGetCLS).not.toHaveBeenCalled();
  });

  test('does nothing when called with a non-function argument', async () => {
    reportWebVitals('not a function');
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockGetCLS).not.toHaveBeenCalled();
  });
});
