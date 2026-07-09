// 运行：npx tsx scripts/test-deck-analytics.mts
import assert from 'node:assert/strict';

import { isBot } from '../src/lib/bot-filter.ts';

let n = 0;
const ok = (m: string) => console.log(`  ✓ ${m}`) || n++;

assert.equal(isBot(null), true);
ok('null UA 视为 bot');
assert.equal(isBot(''), true);
ok('空 UA 视为 bot');
assert.equal(isBot('Googlebot/2.1 (+http://www.google.com/bot.html)'), true);
ok('Googlebot');
assert.equal(isBot('Mozilla/5.0 (compatible; bingbot/2.0)'), true);
ok('bingbot');
assert.equal(isBot('curl/8.4.0'), true);
ok('curl');
assert.equal(
  isBot(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
  ),
  false
);
ok('正常 Chrome 不是 bot');
assert.equal(
  isBot(
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
  ),
  false
);
ok('iPhone Safari 不是 bot');

console.log(`\n全部通过 (${n})`);
