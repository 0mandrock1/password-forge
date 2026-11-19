import { randomPassword, randomPhrase, characterEntropy, phraseEntropy, estimateSeconds, strength, humanTime } from './logic.js';

const el = id => document.getElementById(id);
const toggles = ['lower','upper','digits','symbols','unambiguous'];
let mode = 'random';
let words = null;
let current = '';
let visible = true;

function error(message) {
  el('feedback').textContent = message;
  el('status').textContent = 'ERROR';
}
function opts() {
  return {length:Number(el('length').value), ...Object.fromEntries(toggles.map(k => [k, el(k).checked]))};
}
function clampRange(name,min,max) {
  const slider=el(name), number=el(name+'-number');
  const raw=Number(number.value);
  if (!Number.isFinite(raw)) {number.value=slider.value;return;}
  const v=Math.max(min,Math.min(max,Math.round(raw)));
  slider.value=String(v); number.value=String(v); el(name+'-value').textContent=String(v);
}
function render() {
  if (!current || (mode === 'phrase' && !words)) return;
  el('password').textContent = visible ? current : '•'.repeat(Math.min(current.length,128));
  const bits = mode==='random' ? characterEntropy(opts()) : phraseEntropy(words.length,Number(el('words').value));
  const grade = strength(bits);
  el('strength-label').textContent = grade.text;
  const meter = el('meter-fill').parentElement;
  meter.dataset.strength=grade.status;
  el('meter-fill').style.width = [17,40,70,100][grade.grade]+'%';
  el('entropy').textContent = bits.toFixed(1);
  el('time').textContent = humanTime(estimateSeconds(bits));
  el('attack-desc').textContent = (mode==='random'
    ? 'Модель: повний перебір випадкових комбінацій.'
    : 'Модель: словниковий перебір комбінацій зі списку EFF, якщо алгоритм генерації відомий.')
    + ' Швидкість: 10 млрд спроб/с офлайн; показано очікуваний час (половина простору пошуку). Оцінка не є гарантією.';
}
function generate() {
  try {
    if (mode==='phrase' && !words) { current=''; el('password').textContent='Завантаження словника…'; error('Словник ще завантажується.');return; }
    const value = mode==='random' ? randomPassword(opts()) : randomPhrase(words,Number(el('words').value),el('separator').value);
    current=value; el('status').textContent='READY';
    el('feedback').textContent='Пароль готовий. Згенеровано локально у браузері.';
    render();
  } catch (e) { current=''; el('password').textContent='—'; error(e.message); }
}
function switchMode(next) {
  mode=next;
  for(const kind of ['random','phrase']) {
    el('mode-'+kind).classList.toggle('active',kind===next);
    el('mode-'+kind).setAttribute('aria-pressed',kind===next?'true':'false');
    el(kind+'-options').hidden=kind!==next;
  }
  generate();
}
el('mode-random').addEventListener('click',()=>switchMode('random'));
el('mode-phrase').addEventListener('click',()=>switchMode('phrase'));
for(const name of ['length','words']) {
  const range=el(name), number=el(name+'-number'), min=Number(range.min), max=Number(range.max);
  range.addEventListener('input',()=>{
    number.value=range.value; el(name+'-value').textContent=range.value;
  });
  range.addEventListener('change',generate);
  number.addEventListener('change',()=>{clampRange(name,min,max);generate()});
}
for (const name of toggles) el(name).addEventListener('change',generate);
el('separator').addEventListener('change',generate);
el('generate').addEventListener('click',generate);
el('show').addEventListener('click',()=>{
  visible=!visible;
  el('show').setAttribute('aria-pressed',String(visible));
  el('show').setAttribute('aria-label',visible?'Приховати пароль':'Показати пароль');
  render();
});
el('copy').addEventListener('click',async()=>{
  if(!current)return;
  try{
    await navigator.clipboard.writeText(current);
    el('feedback').textContent='Скопійовано. Буфер обміну може зберігати пароль після закриття сторінки.';
  }catch{error('Браузер заборонив копіювання. Спробуй вручну виділити пароль.');}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter' && (e.ctrlKey||e.metaKey)){
    e.preventDefault();generate();
  }
});
if(!globalThis.crypto?.getRandomValues) {
  error('Браузер не підтримує криптографічний генератор. Генерація недоступна.');
  el('generate').disabled=true;
} else {
  generate();
  fetch('./wordlist.txt',{cache:'force-cache'})
    .then(resp=>{if(!resp.ok)throw Error('dictionary HTTP '+resp.status);return resp.text()})
    .then(text=>{
      const list=text.trim().split(/\r?\n/);
      if(list.length!==7772 || !list.every(w=>/^[a-z]+$/.test(w)) || new Set(list).size!==list.length) throw Error('dictionary integrity check failed');
      words=list;
      if(mode==='phrase')generate();
    })
    .catch(()=>{if(mode==='phrase')error('Не вдалося завантажити словник. Спробуй оновити сторінку.');});
}
