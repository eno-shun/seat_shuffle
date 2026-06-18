const A=window.SeatApp;const $=id=>document.getElementById(id);let store=A.loadStore(),activeId=A.getActiveId(store),running=false,stopToken=0;
function cls(){return store.classes.find(c=>c.id===activeId)||store.classes[0]}
function renderClassOptions(){const sel=$('classSelect');sel.innerHTML='';store.classes.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=c.name;sel.appendChild(o)});sel.value=activeId}
function render(layout){const c=cls();A.makeBoard($('topBoard'),{values:layout,cls:c});A.makeBoard($('bottomBoard'),{values:A.rotateLayout(layout,c),cls:c})}
function loadClass(){store=A.loadStore();if(!store.classes.some(c=>c.id===activeId))activeId=A.getActiveId(store);renderClassOptions();const c=cls();$('title').textContent=`${c?.name||''} 席替え抽選`;$('rounds').value=c?.rounds||20;const err=c?A.validateClass(c):'クラス設定がありません。';if(err){$('message').textContent=err;$('status').textContent='設定未完了';render({});}else{$('message').textContent='';$('status').textContent='準備完了';render(A.finalLayout(c))}}
$('classSelect').onchange=e=>{activeId=e.target.value;A.setActiveId(activeId);loadClass()};
$('startBtn').onclick=async()=>{if(running)return;const c=cls(),err=A.validateClass(c);if(err){alert(err);return}running=true;$('startBtn').disabled=true;$('classSelect').disabled=true;const rounds=Math.max(1,Number($('rounds').value)||c.rounds||20),speed=Number(c.speed)||500,token=++stopToken;
 for(let i=1;i<=rounds;i++){if(token!==stopToken)break;const last=i===rounds;render(last?A.finalLayout(c):A.randomLayout(c));$('status').textContent=`抽選中 ${i} / ${rounds}`;if(!last&&speed>0)await new Promise(r=>setTimeout(r,speed))}
 $('status').textContent='抽選完了';running=false;$('startBtn').disabled=false;$('classSelect').disabled=false};
$('fullscreenBtn').onclick=()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()};$('printBtn').onclick=()=>window.print();
try{const bc=new BroadcastChannel(A.CHANNEL_NAME);bc.onmessage=()=>{if(!running)loadClass()}}catch(e){}window.addEventListener('storage',()=>{if(!running)loadClass()});loadClass();
