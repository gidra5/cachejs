/**
 * A test definition, that accepts all dependencies
 * @param {import('../src/index')} cachejs the source library module
 * @param {import('mocha')} mocha mocha module
 * @param {import('fast-check')} fc fast-check module
 * @param {import('chai')} chai chai module
 * @param {import('sinon')} sinon sinon module
 */
export const test = (
  cachejs,
  { describe, it, beforeEach },
  fc,
  { expect },
  sinon
) => {
  // pass fixed seed, so that test are deterministic
  fc.configureGlobal({ ...fc.readConfigureGlobal(), seed: 585656205 });
  describe('generic query storage', function () {
    const { GenericQueryStorage } = cachejs;
    let queryStorage;
    beforeEach(function () {
      queryStorage = new GenericQueryStorage();
    });

    it('should store and retrieve values correctly', function () {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          fc.anything(),
          (key, params, value) => {
            queryStorage.set(key, params, value);
            const retrievedValue = queryStorage.get(key, params);
            expect(retrievedValue).to.equal(value);
          }
        )
      );
    });

    it('should compare params structurally', function () {
      fc.assert(
        fc.property(
          fc.string(),
          fc.clone(fc.anything(), 2),
          (key, [params, paramsClone]) => {
            queryStorage.set(key, params, {});
            const retrievedValue = queryStorage.get(key, params);
            const retrievedValue2 = queryStorage.get(key, paramsClone);
            expect(retrievedValue).to.equal(retrievedValue2);
          }
        )
      );
    });

    it('should correctly check if a key exists', function () {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          fc.anything(),
          (key, params, value) => {
            expect(queryStorage.has(key, params)).to.be.false;
            queryStorage.set(key, params, value);
            expect(queryStorage.has(key, params)).to.be.true;
          }
        ),
        {
          examples: [
            ['', [], ''],
            ['', {}, false],
          ],
        }
      );
    });

    it('should clear values correctly', function () {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          fc.anything(),
          (key, params, value) => {
            queryStorage.set(key, params, value);
            expect(queryStorage.has(key, params)).to.be.true;
            queryStorage.clear(key, params);
            expect(queryStorage.has(key, params)).to.be.false;
          }
        ),
        {
          examples: [['toString', {}, '']],
        }
      );
    });

    it('should always return the last set value for a key', function () {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          fc.anything(),
          fc.anything(),
          (key, params, value1, value2) => {
            queryStorage.set(key, params, value1);
            queryStorage.set(key, params, value2);
            const retrievedValue = queryStorage.get(key, params);
            expect(retrievedValue).to.equal(value2);
          }
        ),
        {
          examples: [['toString', false, [], []]],
        }
      );
    });
  });
};
