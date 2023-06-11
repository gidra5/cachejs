import { GenericQueryStorage } from '../src/index';
import { describe, expect } from 'vitest';
import { it, fc } from '@fast-check/vitest';

// pass fixed seed, so that test are deterministic
describe('generic query storage', function () {
  it.prop([fc.string(), fc.anything(), fc.anything()])(
    'should store and retrieve values correctly',
    (key, params, value) => {
      const queryStorage = new GenericQueryStorage();

      queryStorage.set(key, params, value);
      const retrievedValue = queryStorage.get(key, params);
      expect(retrievedValue).to.equal(value);
    }
  );

  it.prop([fc.string(), fc.clone(fc.anything(), 2)])(
    'should compare params structurally',
    (key, [params, paramsClone]) => {
      const queryStorage = new GenericQueryStorage();      

      queryStorage.set(key, params, {});
      const retrievedValue = queryStorage.get(key, params);
      const retrievedValue2 = queryStorage.get(key, paramsClone);
      expect(retrievedValue).to.equal(retrievedValue2);
    }
  );

  it.prop([fc.string(), fc.anything(), fc.anything()], {
    examples: [
      ['', [], ''],
      ['', {}, false],
      ['', [], {}],
    ],
  })('should correctly check if a key exists', (key, params, value) => {
    const queryStorage = new GenericQueryStorage();

    expect(queryStorage.has(key, params)).to.be.false;
    queryStorage.set(key, params, value);
    expect(queryStorage.has(key, params)).to.be.true;
  });

  it.prop([fc.string(), fc.anything(), fc.anything()], {
    examples: [['toString', {}, '']],
  })('should clear values correctly', (key, params, value) => {
    const queryStorage = new GenericQueryStorage();

    queryStorage.set(key, params, value);
    expect(queryStorage.has(key, params)).to.be.true;
    queryStorage.clear(key, params);
    expect(queryStorage.has(key, params)).to.be.false;
  });

  it.prop([fc.string(), fc.anything(), fc.anything(), fc.anything()], {
    examples: [['toString', false, [], []]],
  })(
    'should always return the last set value for a key',
    (key, params, value1, value2) => {
      const queryStorage = new GenericQueryStorage();

      queryStorage.set(key, params, value1);
      queryStorage.set(key, params, value2);
      const retrievedValue = queryStorage.get(key, params);
      expect(retrievedValue).to.equal(value2);
    }
  );
});
