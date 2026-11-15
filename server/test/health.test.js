import test from 'node:test';
import assert from 'node:assert/strict';
import {createRawToken,hashToken} from '../src/utils/tokens.js';
test('one-time tokens are random and hashed',()=>{const a=createRawToken(),b=createRawToken(); assert.notEqual(a,b); assert.notEqual(hashToken(a),a); assert.equal(hashToken(a),hashToken(a));});
