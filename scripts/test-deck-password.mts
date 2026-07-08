// 运行：AUTH_SECRET=test-secret npx tsx scripts/test-deck-password.mts
// 纯库断言测试（本仓无测试框架，用可运行脚本代替）。
import assert from 'node:assert/strict';

import {
  hashDeckPassword,
  signAccessToken,
  verifyAccessToken,
  verifyDeckPassword,
} from '../src/lib/deck-password.ts';

let n = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`) || n++;

// 密码哈希往返
const h = await hashDeckPassword('s3cret');
assert.match(h, /^pbkdf2\$\d+\$[^$]+\$[^$]+$/);
ok('hash 格式正确');
assert.equal(await verifyDeckPassword('s3cret', h), true);
ok('正确密码通过');
assert.equal(await verifyDeckPassword('wrong', h), false);
ok('错误密码拒绝');
assert.equal(await verifyDeckPassword('s3cret', 'garbage'), false);
ok('非法 stored 拒绝');
const h2 = await hashDeckPassword('s3cret');
assert.notEqual(h, h2);
ok('相同密码两次哈希不同(随机盐)');

// token 签名往返
const tok = await signAccessToken('deck_A');
assert.equal(await verifyAccessToken('deck_A', tok), true);
ok('有效 token 通过');
assert.equal(await verifyAccessToken('deck_B', tok), false);
ok('换 deckId 拒绝');
assert.equal(await verifyAccessToken('deck_A', undefined), false);
ok('空 token 拒绝');
assert.equal(await verifyAccessToken('deck_A', tok.replace(/.$/, 'x')), false);
ok('篡改签名拒绝');
const expired = await signAccessToken('deck_A', -10);
assert.equal(await verifyAccessToken('deck_A', expired), false);
ok('过期 token 拒绝');

console.log(`\n全部通过 (${n})`);
