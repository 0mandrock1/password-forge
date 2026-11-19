import test from 'node:test';
import assert from 'node:assert/strict';
import { randomPassword, randomPhrase, characterEntropy, phraseEntropy, secureInt, strength, humanTime, LOWER, UPPER, DIGITS, SYMBOLS } from './logic.mjs';
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
