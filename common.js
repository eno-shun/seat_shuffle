const STORAGE_KEY='seatShuffleGift_v2';
const LEGACY_STORAGE_KEY='seatShuffleGift_v1';
const ACTIVE_KEY='seatShuffleGift_activeClass';
const CHANNEL_NAME='seatShuffleGift_channel';
const MIN_ROWS=1,MAX_ROWS=10,MIN_COLS=1,MAX_COLS=12;

function normalizeDimension(value,min,max,fallback){
 const n=Math.trunc(Number(value));
 return Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
}
function dimensions(cls){
 return {
  rows:normalizeDimension(cls?.rows,MIN_ROWS,MAX_ROWS,6),
  cols:normalizeDimension(cls?.cols,MIN_COLS,MAX_COLS,7)
 };
}
function defaultClass(){
 const roster=[];
 const boys=[[1,'A'],[11,'B'],[12,'C'],[14,'D'],[15,'E'],[16,'F'],[17,'G'],[19,'H'],[20,'I'],[21,'J'],[22,'K'],[23,'L'],[33,'M'],[34,'N'],[35,'O'],[36,'P'],[37,'Q']];
 const girls=[[2,'AA'],[3,'AB'],[4,'AC'],[5,'AD'],[6,'AE'],[7,'AF'],[8,'AG'],[9,'AH'],[10,'AI'],[13,'AJ'],[18,'AK'],[24,'AL'],[25,'AM'],[26,'AN'],[27,'AO'],[28,'AP'],[29,'AQ'],[30,'AR'],[31,'AS'],[32,'AT']];
 boys.forEach(([number,name])=>roster.push({number:String(number),name,gender:'M'}));
 girls.forEach(([number,name])=>roster.push({number:String(number),name,gender:'F'}));
 roster.sort((a,b)=>Number(a.number)-Number(b.number));
 const rows=5,cols=8,target={};
 roster.forEach((s,i)=>{if(i<rows*cols)target[`${Math.floor(i/cols)}-${i%cols}`]=s.number});
 return {id:'class-1',name:'サンプルクラス',rows,cols,rounds:20,speed:500,roster,target};
}
function migrateClass(c){
 const migrated={...c};
 const d=dimensions(migrated);
 migrated.rows=d.rows;migrated.cols=d.cols;
 migrated.roster=Array.isArray(migrated.roster)?migrated.roster:[];
 migrated.target=migrated.target&&typeof migrated.target==='object'?migrated.target:{};
 migrated.rounds=Math.max(1,Number(migrated.rounds)||20);
 migrated.speed=Number(migrated.speed)||500;
 return migrated;
}
function loadStore(){
 try{
  let raw=localStorage.getItem(STORAGE_KEY);
  if(!raw)raw=localStorage.getItem(LEGACY_STORAGE_KEY);
  if(raw){const x=JSON.parse(raw);if(x&&Array.isArray(x.classes))return{...x,classes:x.classes.map(migrateClass)}}
 }catch(e){}
 return{classes:[defaultClass()]};
}
function saveStore(store){
 localStorage.setItem(STORAGE_KEY,JSON.stringify(store));
 try{new BroadcastChannel(CHANNEL_NAME).postMessage({type:'updated'})}catch(e){}
}
function getActiveId(store){let id=localStorage.getItem(ACTIVE_KEY);if(!store.classes.some(c=>c.id===id))id=store.classes[0]?.id||'';return id}
function setActiveId(id){localStorage.setItem(ACTIVE_KEY,id);try{new BroadcastChannel(CHANNEL_NAME).postMessage({type:'active',id})}catch(e){}}
function studentMap(cls){return Object.fromEntries(cls.roster.map(s=>[String(s.number).trim(),s]))}
function validateClass(cls){
 if(!cls)return 'クラス設定がありません。';
 const {rows,cols}=dimensions(cls);
 const cleanRoster=cls.roster.filter(s=>String(s.number).trim()||String(s.name).trim());
 if(cleanRoster.length===0)return '名簿を1人以上登録してください。';
 for(const s of cleanRoster){
  if(!String(s.number).trim())return '名簿に出席番号が未入力の生徒がいます。';
  if(!String(s.name).trim())return `出席番号${String(s.number).trim()}の名前が未入力です。`;
  if(s.gender!=='M'&&s.gender!=='F')return `出席番号${String(s.number).trim()}の性別設定が不正です。`;
 }
 const nums=cleanRoster.map(s=>String(s.number).trim());
 if(nums.length!==new Set(nums).size)return '名簿に重複した出席番号があります。';
 if(nums.length>rows*cols)return `登録人数${nums.length}人に対して、座席が${rows*cols}席しかありません。`;
 const assigned=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const n=String(cls.target?.[`${r}-${c}`]||'').trim();
  if(n)assigned.push(n);
 }
 if(assigned.length!==new Set(assigned).size)return '最終座席に同じ出席番号が複数あります。';
 const rosterSet=new Set(nums);
 for(const n of assigned)if(!rosterSet.has(n))return `最終座席の「${n}」は名簿にありません。`;
 const missing=nums.filter(n=>!assigned.includes(n));
 if(missing.length)return `登録した生徒を全員配置してください。未配置：${missing.join('、')}`;
 if(assigned.length!==nums.length)return '最終座席には、登録した生徒だけを1回ずつ配置してください。';
 return '';
}
function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function randomLayout(cls){
 const {rows,cols}=dimensions(cls),map=studentMap(cls),maleSeats=[],femaleSeats=[];
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
  const key=`${r}-${c}`,number=String(cls.target?.[key]||'').trim();
  if(!number)continue;
  const s=map[number];
  if(s?.gender==='M')maleSeats.push(key);else if(s?.gender==='F')femaleSeats.push(key);
 }
 const males=shuffle(cls.roster.filter(s=>s.gender==='M'&&String(s.number).trim()));
 const females=shuffle(cls.roster.filter(s=>s.gender==='F'&&String(s.number).trim()));
 const out={};
 maleSeats.forEach((k,i)=>out[k]=males[i]?.number||'');
 femaleSeats.forEach((k,i)=>out[k]=females[i]?.number||'');
 return out;
}
function finalLayout(cls){return {...(cls.target||{})}}
function displayText(cls,number){const s=studentMap(cls)[String(number).trim()];return s?`${s.number}\n${s.name}`:''}
function makeBoard(container,{editable=false,values={},onChange=null,cls=null,rows=null,cols=null}){
 const d=cls?dimensions(cls):{rows:normalizeDimension(rows,MIN_ROWS,MAX_ROWS,5),cols:normalizeDimension(cols,MIN_COLS,MAX_COLS,8)};
 container.innerHTML='';container.className='board';container.style.setProperty('--board-cols',d.cols);
 for(let r=0;r<d.rows;r++){
  const row=document.createElement('div');row.className='board-row';row.style.setProperty('--board-cols',d.cols);
  for(let c=0;c<d.cols;c++){
   const key=`${r}-${c}`,cell=document.createElement('div');cell.className='seat';
   if(editable){
    cell.classList.add('target-input');const inp=document.createElement('input');inp.inputMode='numeric';inp.value=values[key]||'';inp.setAttribute('aria-label',`座席 ${r+1}-${c+1}`);inp.addEventListener('input',()=>onChange?.(key,inp.value.trim()));cell.appendChild(inp);
   }else{
    const n=values[key]||'';cell.textContent=displayText(cls,n);if(!n)cell.classList.add('empty');
   }
   row.appendChild(cell);
  }
  container.appendChild(row);
 }
}
function rotateLayout(layout,cls){
 const {rows,cols}=dimensions(cls),out={};
 for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)out[`${r}-${c}`]=layout[`${rows-1-r}-${cols-1-c}`]||'';
 return out;
}
window.SeatApp={STORAGE_KEY,ACTIVE_KEY,CHANNEL_NAME,MIN_ROWS,MAX_ROWS,MIN_COLS,MAX_COLS,dimensions,defaultClass,loadStore,saveStore,getActiveId,setActiveId,validateClass,randomLayout,finalLayout,displayText,makeBoard,rotateLayout};
