import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { randomPassword, randomPhrase, characterEntropy, phraseEntropy, secureInt, strength, humanTime, LOWER, UPPER, DIGITS, SYMBOLS, PHRASE_SYMBOLS } from './logic.js';
const base = {length: 24, lower:true, upper:true, digits:true, symbols:true, unambiguous:false};
test('password length, required categories',()=>{
 for(let i=0;i<200;i++) {
   const p=randomPassword(base);
   assert.equal(p.length,24);
   for(const set of [LOWER,UPPER,DIGITS,SYMBOLS]) assert.ok([...p].some(ch=>set.includes(ch)));
 }
});
test('exclude ambiguous characters',()=>{
 for(let i=0;i<50;i++) assert.doesNotMatch(randomPassword({...base,unambiguous:true}),/[Il1O0o|]/);
});
test('invalid options and crypto failure',()=>{
 assert.throws(()=>randomPassword({...base,length:7}));
 assert.throws(()=>randomPassword({...base,lower:false,upper:false,digits:false,symbols:false}));
 assert.throws(()=>secureInt(4,{}));
});
test('rejection sampler discards overflowing values',()=>{
 const values=[0xffffffff, 6]; let n=0;
 const fake={getRandomValues(v){v[0]=values[n++];}};
 assert.equal(secureInt(10,fake),6);
 assert.equal(n,2);
});
test('phrase has exact count and correct dictionary entropy',()=>{
 const dictionary=Array.from({length:1296},(_,i)=>'word'+ String(i).replace(/\d/g,x=>'abcdefghij'[x]));
 const t=randomPhrase(dictionary,6,'-');
 assert.equal(t.split('-').length,6);
 assert.ok(Math.abs(phraseEntropy(7776,6)-77.55)<.1);
});
test('entropy of constrained charsets less than raw pool formula',()=>{
 const s={length:8,lower:true,upper:true,digits:true,symbols:true,unambiguous:false};
 const entropy=characterEntropy(s);
 assert.ok(entropy>0 && entropy<8*Math.log2(26+26+10+SYMBOLS.length));
});
test('display grading/time',()=>{
 assert.equal(strength(35).grade,0);
 assert.equal(strength(90).grade,3);
 assert.equal(humanTime(0),'менше секунди');
});

test('bundled EFF dictionary is valid, unique and phrase generation works',()=>{
 const list=readFileSync(new URL('./wordlist.txt',import.meta.url),'utf8').trim().split(String.fromCharCode(10));
 assert.equal(list.length,7772);
 assert.equal(new Set(list).size,7772);
 assert.ok(list.every(w=>/^[a-z]+$/.test(w)));
 for(let i=0;i<20;i++){
  const phrase=randomPhrase(list,6,'_');
  assert.equal(phrase.split('_').length,6);
  assert.ok(phrase.split('_').every(w=>list.includes(w)));
 }
});

test('memorable extras are independent and all combinations are respected',()=>{
 const dictionary=readFileSync(new URL('./wordlist.txt',import.meta.url),'utf8').trim().split(String.fromCharCode(10));
 const baseBits=phraseEntropy(dictionary.length,6);
 for(let mask=0;mask<8;mask++){
   const opts={uppercase:!!(mask&1),digits:!!(mask&2),symbols:!!(mask&4)};
   const expected=baseBits
      +(opts.uppercase?Math.log2(63):0)
      +(opts.digits?Math.log2(100):0)
      +(opts.symbols?Math.log2(PHRASE_SYMBOLS.length):0);
   assert.ok(Math.abs(phraseEntropy(dictionary.length,6,opts)-expected)<1e-9);
   for(let n=0;n<30;n++){
     const output=randomPhrase(dictionary,6,'-',globalThis.crypto,opts);
     const suffix=(opts.digits?'[0-9]{2}':'')+(opts.symbols?'['+PHRASE_SYMBOLS.replace(/[\\\]\[\-^]/g,'\\$&')+']':'');
     const parts=output.match(/^[A-Za-z]+(?:-[A-Za-z]+){5}/)?.[0].split('-');
     assert.equal(parts?.length,6);
     assert.equal(output.slice(parts.join('-').length).length,(opts.digits?2:0)+(opts.symbols?1:0));
     if(opts.uppercase)assert.ok(parts.some(w=>/^[A-Z]/.test(w)));
     else assert.ok(parts.every(w=>/^[a-z]/.test(w)));
     if(opts.digits)assert.match(output.slice(parts.join('-').length,parts.join('-').length+2),/^[0-9]{2}$/);
     if(opts.symbols)assert.ok(PHRASE_SYMBOLS.includes(output.at(-1)));
   }
 }
});
test('memorable has known random cardinality from fake generator',()=>{
 const dictionary=Array.from({length:1000},(_,i)=>'w'+String(i).replace(/[0-9]/g,d=>'abcdefghij'[d]));
 const cryptoSource={getRandomValues(view){view[0]=0;return view}};
 // The chosen casing mask is 1, both digit positions pick 0, symbol picks first.
 const result=randomPhrase(dictionary,4,'_',cryptoSource,{uppercase:true,digits:true,symbols:true});
 assert.equal(result,'Wa_wa_wa_wa00!');
});
