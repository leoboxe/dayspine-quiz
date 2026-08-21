/*
 * A4 screen-list changes, split out of patch-reveal.js because that one failed
 * silently: the repo is CRLF and the replacement string ended in a bare \n, so
 * String.replace matched nothing and returned the original. The guard checked
 * for `emailScreen({})` without the line ending, so it passed and the script
 * reported success on a no-op. Everything below is line-ending agnostic.
 *
 *   - A4 loses emailScreen()  -> it renders after the reveal instead (q.html)
 *   - A4 gains reviewsScreen() immediately before the build
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const f = path.join(root, 'q-all.js');
let a = fs.readFileSync(f, 'utf8');

if (a.includes('reviewsScreen()')) { console.log('already patched'); process.exit(0); }

/* 1. import it */
if (!/reviewsScreen[,\s]/.test(a.slice(0, 400))) {
  a = a.replace(
    'openerBlock, bodyBlock, trainingBlock, foodBlock, goalBridge, offerBridge, emailScreen,',
    'openerBlock, bodyBlock, trainingBlock, foodBlock, goalBridge, offerBridge, emailScreen,\n'
    + '  reviewsScreen,');
}

/* 2. swap the screen inside the A4 block only */
const i4 = a.search(/\bA4\s*:\s*\{/);
const i5 = a.search(/\bA5\s*:\s*\{/);
if (i4 < 0 || i5 < 0 || i5 < i4) throw new Error('A4/A5 boundaries not found');

let blk = a.slice(i4, i5);
const before = blk;
blk = blk.replace(/^([ \t]*)emailScreen\(\{\}\),[ \t]*\r?\n/m,
  '$1/* The review wall sits immediately before the build — the last moment she is\r\n'
  + '$1   still deciding whether to finish rather than whether to buy. Email is NOT\r\n'
  + '$1   here any more: it renders after the reveal, at peak investment. */\r\n'
  + '$1reviewsScreen(),\r\n');
if (blk === before) throw new Error('A4 emailScreen line did not match');

a = a.slice(0, i4) + blk + a.slice(i5);
fs.writeFileSync(f, a);
console.log('q-all.js: A4 emailScreen -> reviewsScreen, import added');
