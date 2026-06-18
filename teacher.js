const A=window.SeatApp;let store=A.loadStore();let activeId=A.getActiveId(store);let draft=null;
const $=id=>document.getElementById(id);
function current(){return store.classes.find(c=>c.id===activeId)||store.classes[0]}
function clone(x){return JSON.parse(JSON.stringify(x))}
function resizeTarget(oldTarget,oldRows,oldCols,newRows,newCols){
 const next={};
 for(let r=0;r<Math.min(oldRows,newRows);r++)for(let c=0;c<Math.min(oldCols,newCols);c++){
  const v=oldTarget?.[`${r}-${c}`];if(v)next[`${r}-${c}`]=v;
 }
 return next;
}
function render(){
 draft=clone(current());const d=A.dimensions(draft);draft.rows=d.rows;draft.cols=d.cols;
 $('className').value=draft.name;$('rows').value=draft.rows;$('cols').value=draft.cols;$('rounds').value=draft.rounds||20;$('speed').value=String(draft.speed||500);
 renderTabs();renderRoster();renderBoard();$('saveStatus').textContent='';
}
function renderBoard(){A.makeBoard($('targetBoard'),{editable:true,values:draft.target,rows:draft.rows,cols:draft.cols,onChange:(k,v)=>{if(v)draft.target[k]=v;else delete draft.target[k]}})}
function updateDimensions(){
 const oldRows=draft.rows,oldCols=draft.cols;
 const rows=Math.min(A.MAX_ROWS,Math.max(A.MIN_ROWS,Number($('rows').value)||oldRows));
 const cols=Math.min(A.MAX_COLS,Math.max(A.MIN_COLS,Number($('cols').value)||oldCols));
 draft.target=resizeTarget(draft.target,oldRows,oldCols,rows,cols);draft.rows=rows;draft.cols=cols;$('rows').value=rows;$('cols').value=cols;renderBoard();
}
function renderTabs(){$('classTabs').innerHTML='';store.classes.forEach(c=>{const b=document.createElement('button');b.className='class-tab'+(c.id===activeId?' active':'');b.textContent=c.name;b.onclick=()=>{activeId=c.id;A.setActiveId(activeId);render()};$('classTabs').appendChild(b)})}
function renderRoster(){$('rosterBody').innerHTML='';draft.roster.forEach((s,i)=>{const tr=document.createElement('tr');tr.innerHTML=`<td><input value="${escapeHtml(s.number)}"></td><td><input value="${escapeHtml(s.name)}"></td><td><select><option value="M">男子</option><option value="F">女子</option></select></td><td><button class="danger compact">削除</button></td>`;const [n,name]=tr.querySelectorAll('input');const sel=tr.querySelector('select');sel.value=s.gender;n.oninput=()=>s.number=n.value.trim();name.oninput=()=>s.name=name.value;sel.onchange=()=>s.gender=sel.value;tr.querySelector('button').onclick=()=>{draft.roster.splice(i,1);renderRoster()};$('rosterBody').appendChild(tr)})}
function escapeHtml(s){return String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
$('rows').onchange=updateDimensions;$('cols').onchange=updateDimensions;
$('applySize').onclick=updateDimensions;
$('addStudent').onclick=()=>{draft.roster.push({number:'',name:'',gender:'M'});renderRoster()};
$('saveBtn').onclick=()=>{draft.name=$('className').value.trim()||'名称未設定';draft.rounds=Math.max(1,Number($('rounds').value)||20);draft.speed=Number($('speed').value)||500;updateDimensions();const err=A.validateClass(draft);if(err){$('saveStatus').className='status error';$('saveStatus').textContent=err;return}const idx=store.classes.findIndex(c=>c.id===activeId);store.classes[idx]=clone(draft);A.saveStore(store);$('saveStatus').className='status success';$('saveStatus').textContent='保存しました';renderTabs()};
$('addClass').onclick=()=>{const c=A.defaultClass();c.id='class-'+Date.now();c.name='新しいクラス';c.roster=[];c.target={};store.classes.push(c);activeId=c.id;A.setActiveId(activeId);A.saveStore(store);render()};
$('deleteClass').onclick=()=>{if(store.classes.length===1){alert('最後の1クラスは削除できません。');return}if(!confirm('このクラス設定を削除しますか？'))return;store.classes=store.classes.filter(c=>c.id!==activeId);activeId=store.classes[0].id;A.setActiveId(activeId);A.saveStore(store);render()};
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='席替え設定.json';a.click();URL.revokeObjectURL(a.href)};
$('importBtn').onclick=()=>$('fileInput').click();$('fileInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const x=JSON.parse(await f.text());if(!x||!Array.isArray(x.classes))throw new Error();store={...x,classes:x.classes.map(c=>({...c,...A.dimensions(c)}))};activeId=store.classes[0]?.id||'';A.setActiveId(activeId);A.saveStore(store);render();alert('設定を読み込みました。')}catch{alert('設定ファイルを読み込めませんでした。')}};
render();
