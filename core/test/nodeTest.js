import * as cachejs from '../dist/index.js';
import mocha from 'mocha';
import fc from 'fast-check';
import chai from 'chai';
import sinon from 'sinon';
import * as testSource from './testSource.js';

testSource.test(cachejs, mocha, fc, chai, sinon);
