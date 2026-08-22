import { HelmodFactory } from './helmodFactory';

describe('HelmodFactory.luaToPython', () => {
  test('parses unquoted (identifier) keys', () => {
    expect(HelmodFactory.luaToPython('{foo="bar"}')).toEqual({ foo: 'bar' });
  });

  test('parses quoted keys, both single and double quotes', () => {
    expect(HelmodFactory.luaToPython('{["foo-bar"]="baz"}')).toEqual({ 'foo-bar': 'baz' });
    expect(HelmodFactory.luaToPython("{['weird key']='val'}")).toEqual({ 'weird key': 'val' });
  });

  test('parses booleans and nil', () => {
    expect(HelmodFactory.luaToPython('{a=true,b=false,c=nil}')).toEqual({
      a: true,
      b: false,
      c: null,
    });
  });

  test('parses negative and floating point numbers', () => {
    expect(HelmodFactory.luaToPython('{a=-5,b=3.14,c=-2.5,d=1e3}')).toEqual({
      a: -5,
      b: 3.14,
      c: -2.5,
      d: 1000,
    });
  });

  test('parses bare (array-style) entries with 1-based indices', () => {
    expect(HelmodFactory.luaToPython('{"x","y","z"}')).toEqual({ 1: 'x', 2: 'y', 3: 'z' });
  });

  test('parses empty tables', () => {
    expect(HelmodFactory.luaToPython('{}')).toEqual({});
  });

  test('parses nested tables', () => {
    const result = HelmodFactory.luaToPython('{a={b={c=1}},d={1,2,3}}');
    expect(result).toEqual({ a: { b: { c: 1 } }, d: { 1: 1, 2: 2, 3: 3 } });
  });

  test('parses a realistic Helmod-shaped table', () => {
    const lua =
      '{type="recipe",name="iron-gear-wheel",factory={name="assembling-machine-1",count=2.5},children={}}';
    const result = HelmodFactory.luaToPython(lua);
    expect(result).toEqual({
      type: 'recipe',
      name: 'iron-gear-wheel',
      factory: { name: 'assembling-machine-1', count: 2.5 },
      children: {},
    });
  });

  test('parses single-quoted strings', () => {
    expect(HelmodFactory.luaToPython("{name='iron-plate'}")).toEqual({ name: 'iron-plate' });
  });

  test('throws on an unterminated string', () => {
    expect(() => HelmodFactory.luaToPython('{a="unterminated}')).toThrow(/Unterminated string/);
  });

  test('throws on an unterminated bracket key', () => {
    expect(() => HelmodFactory.luaToPython('{[a=1}')).toThrow(/Unterminated '\[' key/);
  });

  test('throws when "=" is missing after a bracket key', () => {
    expect(() => HelmodFactory.luaToPython('{[1]1}')).toThrow(/Expected '=' after key/);
  });

  test('throws on an unparsable value', () => {
    expect(() => HelmodFactory.luaToPython('{a=$$$}')).toThrow(/Unable to parse/);
  });

  test('throws when a table is not closed', () => {
    expect(() => HelmodFactory.luaToPython('{a=1')).toThrow(/Expected '}'/);
  });
});

describe('HelmodFactory.pythonToLua', () => {
  test('serializes plain objects with identifier keys unquoted', () => {
    expect(HelmodFactory.pythonToLua({ foo: 'bar' })).toBe('{foo="bar"}');
  });

  test('quotes keys that are not valid Lua identifiers', () => {
    expect(HelmodFactory.pythonToLua({ 'foo-bar': 1 })).toBe('{["foo-bar"]=1}');
  });

  test('serializes arrays as bare Lua tables', () => {
    expect(HelmodFactory.pythonToLua(['a', 'b'])).toBe('{"a","b"}');
  });

  test('serializes booleans, null and numbers', () => {
    expect(HelmodFactory.pythonToLua({ a: true, b: false, c: null, d: -3.5 })).toBe(
      '{a=true,b=false,c=nil,d=-3.5}'
    );
  });

  test('serializes nested objects', () => {
    expect(HelmodFactory.pythonToLua({ a: { b: 1 } })).toBe('{a={b=1}}');
  });
});

describe('HelmodFactory encode/decode round-trip', () => {
  test('round-trips a nested structure through deflate + base64', () => {
    const data = {
      type: 'recipe',
      name: 'electronic-circuit',
      factory: { name: 'assembling-machine-2', count: 3 },
      flag: true,
      empty: {},
      list: { 1: 'a', 2: 'b' },
    };
    const encoded = HelmodFactory.encodeHelmod(data);
    expect(typeof encoded).toBe('string');
    const decoded = HelmodFactory.decodeHelmod(encoded);
    expect(decoded).toEqual(data);
  });

  test('strips whitespace/newlines from the encoded string before decoding', () => {
    const data = { a: 1, b: 'x' };
    const encoded = HelmodFactory.encodeHelmod(data);
    // Simulate a pasted multi-line export with embedded whitespace/newlines.
    const withWhitespace = encoded.match(/.{1,20}/g).join('\n ');
    const decoded = HelmodFactory.decodeHelmod(withWhitespace);
    expect(decoded).toEqual(data);
  });
});
