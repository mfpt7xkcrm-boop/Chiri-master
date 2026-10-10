'use strict';
const KEY='chiriMaster_v2';
const $=id=>document.getElementById(id);
const ids=new Set(QUESTIONS.map(q=>q.id));
const blank=()=>({answered:0,correct:0,weak:[],mistakes:[],per:{}});
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Number.isFinite(x.answered)&&Number.isFinite(x.correct)&&Array.isArray(x.weak)&&Array.isArray(x.mistakes)&&x.per&&typeof x.per==='object')return x;}catch{}return blank();}
let db=load(),quiz=[],position=0,records=[],locked=false,currentMode='',lastMode='',lastCategory='',lastCount='';
function save(){try{localStorage.setItem(KEY,JSON.stringify(db));}catch{}}
function shuffled(a){let b=[...a];for(let i=b.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function show(id){for(const s of ['home','quiz','result'])$(s).classList.toggle('hidden',s!==id);window.scrollTo(0,0);}
function eligible(q,mode){if(mode==='graph')return q.type==='graph';if(mode==='country')return q.type==='country';if(mode==='write')return q.type==='term'||q.type==='country';if(mode==='write')return q.type==='term';if(mode==='choice')return true;return true;}
function start(source){const mode=$('mode').value,category=$('category').value,count=$('count').value;lastMode=mode;lastCategory=category;lastCount=count;
let pool=QUESTIONS.filter(q=>(category==='all'||q.category===category)&&eligible(q,mode));
if(source==='weak')pool=pool.filter(q=>db.weak.includes(q.id));if(source==='mistake')pool=pool.filter(q=>db.mistakes.includes(q.id));
if(mode==='mock'){pool=shuffled(QUESTIONS);}
if(!pool.length){alert('この条件に該当する問題がありません。分野やモードを変えてください。');return;}
quiz=shuffled(pool).slice(0,mode==='mock'?Math.min(20,pool.length):(count==='all'?pool.length:Math.min(Number(count),pool.length)));position=0;records=[];show('quiz');render();}
function questionMode(q){let m=$('mode').value;if(m==='write')return 'write';if(m==='country')return 'choice';if(m==='graph' || q.type==='graph')return 'choice';if(q.type==='choice')return 'choice';if(m==='mixed'||m==='mock')return Math.random()<.35?'write':'choice';return 'choice';}
let presentation=null;
function render(){locked=false;const q=quiz[position];const mode=questionMode(q);presentation={q,mode};$('meta').textContent=`${position+1} / ${quiz.length}　${q.category}　${mode==='write'?'記述':'4択'}`;$('progress').style.width=`${position/quiz.length*100}%`;
$('choices').replaceChildren();$('feedback').className='feedback hidden';$('feedback').textContent='';$('next').classList.add('hidden');$('writeArea').classList.toggle('hidden',mode!=='write');$('climograph').classList.toggle('hidden',q.type!=='graph');$('countryMap').classList.toggle('hidden',q.type!=='country');if(q.type==='country')drawCountryMap(q.number);$('textAnswer').value='';$('favorite').textContent=db.weak.includes(q.id)?'⭐ 苦手から外す':'⭐ 苦手に登録';
if(q.type==='country' && mode==='write'){$('question').textContent=q.question;}else if(q.type==='term'){$('question').textContent=mode==='write'?`次の説明に当てはまる用語を答えなさい。\n${q.meaning}`:`「${q.term}」の意味として最も適切なのは？`;}else $('question').textContent=q.question;
if(q.type==='graph')drawGraph(q.climate);
if(mode==='choice'){let answer=q.type==='term'?q.meaning:q.answer;let wrong=[];
if(q.type==='choice')wrong=[...q.wrong];else if(q.type==='graph')wrong=CLIMATES.filter(c=>c.name!==q.answer).map(c=>c.name);else if(q.type==='country')wrong=shuffled(COUNTRIES.filter(c=>c.number!==q.number)).map(c=>c.name);else {const close=QUESTIONS.filter(x=>x.type==='term'&&x.category===q.category&&x.id!==q.id);const others=QUESTIONS.filter(x=>x.type==='term'&&x.id!==q.id&&x.category!==q.category);wrong=[...shuffled(close),...shuffled(others)].map(x=>x.meaning);}
wrong=[...new Set(wrong)].filter(x=>x!==answer).slice(0,3);for(const value of shuffled([answer,...wrong])){const b=document.createElement('button');b.className='choice';b.textContent=value;b.onclick=()=>grade(value,answer);$('choices').append(b);}}
}
function normalize(s){return String(s).normalize('NFKC').replace(/[\s\u3000・＝=（）()―ー‐－-]/g,'').toLowerCase();}
function grade(value,answer){if(locked)return;locked=true;const q=presentation.q;const correct=normalize(value)===normalize(answer);db.answered++;if(correct)db.correct++;db.per[q.id]??={tries:0,correct:0};db.per[q.id].tries++;if(correct)db.per[q.id].correct++;
if(!correct&&!db.mistakes.includes(q.id))db.mistakes.push(q.id);if(correct)db.mistakes=db.mistakes.filter(id=>id!==q.id);save();records.push({id:q.id,correct,answer,value,category:q.category});
for(const b of $('choices').children){b.disabled=true;if(b.textContent===answer)b.classList.add('correct');if(b.textContent===value&&!correct)b.classList.add('wrong');}
$('feedback').textContent=`${correct?'⭕ 正解！':'❌ 不正解'}\n正解：${answer}\n\n解説：${q.explanation}`;$('feedback').className=`feedback ${correct?'good':'bad'}`;$('next').textContent=position+1===quiz.length?'結果を見る':'次の問題';$('next').classList.remove('hidden');homeStats();}
$('check').onclick=()=>{const value=$('textAnswer').value.trim();if(!value){alert('解答を入力してください');return;}grade(value,presentation.q.term||presentation.q.answer);};$('textAnswer').addEventListener('keydown',e=>{if(e.key==='Enter'&&!locked){e.preventDefault();$('check').click();}});
$('next').onclick=()=>{if(position+1===quiz.length){finish();return;}position++;render();};
$('favorite').onclick=()=>{const id=quiz[position].id;db.weak=db.weak.includes(id)?db.weak.filter(x=>x!==id):[...db.weak,id];save();$('favorite').textContent=db.weak.includes(id)?'⭐ 苦手から外す':'⭐ 苦手に登録';homeStats();};
$('abort').onclick=()=>{if(records.length&&!confirm('途中で終了しますか？回答済みの学習記録は保存されています。'))return;homeStats();show('home');};
function finish(){const correct=records.filter(r=>r.correct).length;$('resultScore').textContent=correct;$('resultCount').textContent=records.length;const rate=Math.round(correct/Math.max(1,records.length)*100);$('resultRate').textContent=rate+'%';$('resultMessage').textContent=rate===100?'全問正解！ 理由を説明できるかも確認しよう。':rate>=80?'よくできています。間違えた問題を確認しよう。':'間違い直しを使って知識を定着させよう。';$('reviewList').replaceChildren();for(const r of records){let q=QUESTIONS.find(q=>q.id===r.id);const div=document.createElement('div');div.className='review';const head=document.createElement('strong');head.textContent=(r.correct?'○ ':'× ')+(q.term||q.question);const detail=document.createElement('p');detail.className='muted';detail.textContent=`正解：${r.answer}\n${q.explanation}`;div.append(head,detail);$('reviewList').append(div);}homeStats();show('result');}
$('start').onclick=()=>start('all');$('weak').onclick=()=>start('weak');$('mistake').onclick=()=>start('mistake');$('goHome').onclick=()=>show('home');$('again').onclick=()=>{start('all');};
function homeStats(){$('countStat').textContent=db.answered;$('accuracyStat').textContent=(db.answered?Math.round(db.correct/db.answered*100):0)+'%';$('dueStat').textContent=db.mistakes.length;$('info').textContent=`収録 ${QUESTIONS.length} 問｜苦手 ${db.weak.length} 問｜間違い直し ${db.mistakes.length} 問`;
$('categoryStats').replaceChildren();for(const cat of [...new Set(QUESTIONS.map(q=>q.category))]){let items=QUESTIONS.filter(q=>q.category===cat).map(q=>db.per[q.id]).filter(Boolean);let total=items.reduce((s,x)=>s+x.tries,0),correct=items.reduce((s,x)=>s+x.correct,0),rate=total?Math.round(correct/total*100):0;const row=document.createElement('div');row.className='barrow';const title=document.createElement('span');title.textContent=cat;const track=document.createElement('div');track.className='bartrack';const fill=document.createElement('div');fill.className='barfill';fill.style.width=rate+'%';track.append(fill);const text=document.createElement('span');text.textContent=total?rate+'%':'未学習';row.append(title,track,text);$('categoryStats').append(row);}}
function drawGraph(c){const svg=$('climograph');svg.replaceChildren();const NS='http://www.w3.org/2000/svg';const node=(name,attrs,text)=>{const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;svg.append(e);return e;};const left=53,top=30,width=456,height=230,base=top+height,maxR=Math.max(400,Math.ceil(Math.max(...c.rain)/100)*100);node('text',{x:16,y:18,'font-size':13,fill:'#50617c'},'mm');node('text',{x:518,y:18,'font-size':13,fill:'#d65348'},'℃');
for(let j=0;j<=4;j++){let y=base-j*height/4;node('line',{x1:left,y1:y,x2:left+width,y2:y,stroke:'#dfe5ee'});node('text',{x:8,y:y+5,'font-size':12,fill:'#50617c'},String(Math.round(maxR*j/4)));node('text',{x:516,y:y+5,'font-size':12,fill:'#d65348'},String(Math.round(-10+j*12.5)));}
const bw=width/12;for(let i=0;i<12;i++){let x=left+i*bw+4;let h=c.rain[i]/maxR*height;node('rect',{x,y:base-h,width:bw-8,height:h,fill:'#6c9fe1'});node('text',{x:x+12,y:base+19,'font-size':12,'text-anchor':'middle',fill:'#50617c'},i+1);}
const points=c.temp.map((v,i)=>[left+(i+.5)*bw,base-(v+10)/50*height]);node('polyline',{points:points.map(p=>p.join(',')).join(' '),fill:'none',stroke:'#e26753','stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'});node('text',{x:280,y:310,'font-size':12,'text-anchor':'middle',fill:'#627187'},'棒：降水量（mm）　線：平均気温（℃）　※模式図');}
$('backupBtn').onclick=()=>{const file=new Blob([JSON.stringify({app:'chiri-master',version:2,exported:new Date().toISOString(),data:db},null,2)],{type:'application/json'});const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download='chiri-master-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};$('importBtn').onclick=()=>$('importFile').click();$('importFile').onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const obj=JSON.parse(await f.text());let next=obj?.data;if(obj?.app!=='chiri-master'||!next||!Number.isFinite(next.answered)||next.answered<0||!Number.isFinite(next.correct)||next.correct<0||next.correct>next.answered||!Array.isArray(next.weak)||!Array.isArray(next.mistakes)||typeof next.per!=='object'||next.per===null)throw Error();if(!confirm('現在の学習記録をバックアップの内容で置き換えますか？'))return;next.weak=next.weak.filter(id=>ids.has(id));next.mistakes=next.mistakes.filter(id=>ids.has(id));db=next;save();homeStats();alert('復元しました');}catch{alert('対応していないバックアップ形式です');}finally{e.target.value='';}};
$('resetBtn').onclick=()=>$('confirmDialog').showModal();$('cancelReset').onclick=()=>$('confirmDialog').close();$('confirmReset').onclick=()=>{db=blank();save();homeStats();$('confirmDialog').close();};
// 旧版の記録を一度だけ取り込む。元のキーは削除しない。
try{if(!localStorage.getItem(KEY)){const legacyStats=JSON.parse(localStorage.getItem('stats')||'null');const w=JSON.parse(localStorage.getItem('weakQuestions')||'[]');const m=JSON.parse(localStorage.getItem('mistakeQuestions')||'[]');if(legacyStats&&Number.isFinite(legacyStats.answered)){db.answered=Math.max(0,legacyStats.answered);db.correct=Math.min(db.answered,Math.max(0,legacyStats.correct||0));/* 旧IDは新IDとは異なるため、誤った設問への紐付けを防ぎ移行しない */save();}}}catch{}
homeStats();

function drawCountryMap(active){
 const svg=$('countryMap'),NS='http://www.w3.org/2000/svg';svg.replaceChildren();
 const el=(tag,attrs,content)=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(content!==undefined)n.textContent=content;svg.append(n);return n;};
 const xy=(lat,lon)=>[55+(lon+20)/85*620,40+(44-lat)/85*450];
 // 概略的な陸地の形を表示。国境を厳密に表す地図ではない。
 const africa=[[-17,37],[-6,36],[10,37],[22,33],[32,31],[34,24],[42,12],[51,11],[43,2],[41,-10],[34,-20],[29,-32],[19,-35],[12,-28],[10,-18],[4,-7],[-1,4],[-8,5],[-17,15]];
 const arabia=[[34,30],[39,32],[49,30],[56,26],[60,22],[56,17],[48,12],[43,13],[39,19],[35,28]];
 const anatolia=[[26,41],[44,42],[46,36],[38,35],[30,36]];
 const iran=[[44,39],[56,40],[64,33],[60,25],[54,24],[46,29]];
 for(const poly of [africa,arabia,anatolia,iran])el('polygon',{points:poly.map(([lon,lat])=>xy(lat,lon).join(',')).join(' '),fill:'#e9eef5',stroke:'#778aa4','stroke-width':2});
 el('text',{x:20,y:20,'font-size':14,fill:'#536781'},'模式位置図（プリントの国境と照合して覚えよう）');
 for(const c of COUNTRIES){const [x,y]=xy(c.lat,c.lon),on=c.number===active;el('circle',{cx:x,cy:y,r:on?13:10,fill:on?'#ed6b47':'#315bea',stroke:'#fff','stroke-width':2});el('text',{x,y:y+4,'font-size':on?12:10,'text-anchor':'middle','font-weight':'bold',fill:'white'},String(c.number));}
}
