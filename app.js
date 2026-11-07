"use strict";
const VERSION="2.1.0",VAT=1.21,KEY="revizio_app_state_v3";
const CATALOG={"Verificare":[["Verificare inspecție IU 1 PDA",190],["Verificare inspecție IU 2 PDA",230],["Verificare inspecție IU 3 PDA",300],["Verificare inspecție IU 4+ PDA",380]],"Revizie":[["Revizie inspecție IU 1 PDA",230],["Revizie inspecție IU 2 PDA",290],["Revizie inspecție IU 3 PDA",375],["Revizie inspecție IU 4+ PDA",480]],"Detectoare":[["Detector HD100 PRO Double Control",310],["Detector Homplex HD300 PRO",485]],"Servexpress":[["Servexpress",190,true]]};
const CAT_COLOR={Verificare:"blue",Revizie:"green",Detectoare:"orange",Servexpress:"purple"};
const AV_COLORS=["#007aff","#34c759","#ff9500","#af52de","#ff2d55","#5856d6","#00a3a3"];
const TITLES={home:"Azi",stats:"Statistici",history:"Istoric",appointments:"Programări",settings:"Setări"};
let state={target:1500,executions:[],clients:[],appointments:[],theme:"auto",includeSaturday:false};
let view="home",activeService="Verificare",addDate=null,selectedDay=null,calendarCursor=new Date(),undoFn=null,undoTimer=null,waitingWorker=null;

const $=id=>document.getElementById(id);
const money=n=>Number(n||0).toLocaleString("ro-RO",{minimumFractionDigits:2,maximumFractionDigits:2});
const moneyInt=n=>Number(n||0).toLocaleString("ro-RO",{maximumFractionDigits:0});
const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const ic=n=>`<svg class="ic"><use href="#i-${n}"/></svg>`;
const uid=p=>p+Date.now().toString(36)+Math.random().toString(16).slice(2,8);
const dateOf=k=>new Date(k+"T12:00:00");

/* ---------- date & state ---------- */
function load(){
  try{
    const raw=localStorage.getItem(KEY)||localStorage.getItem("revizio_app_state_v2")||localStorage.getItem("revizio_app_state");
    if(raw)state={...state,...JSON.parse(raw)};
  }catch(e){console.warn("load",e)}
  normalize();save();
}
function normalize(){
  if(!Array.isArray(state.executions))state.executions=[];
  if(!Array.isArray(state.clients))state.clients=[];
  if(!Array.isArray(state.appointments))state.appointments=[];
  if(!["light","dark","auto"].includes(state.theme))state.theme="auto";
  state.target=Number(state.target)>0?Number(state.target):1500;
  state.executions=state.executions.map(x=>({...x,amountNoVat:Number(x.amountNoVat??(x.priceVat/VAT))||0,category:x.category||categoryFor(x.name)}));
}
function save(){try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){toast("Nu s-au putut salva datele (memorie plină?)")}}
function categoryFor(name){const n=String(name).toLowerCase();if(n.includes("servexpress"))return"Servexpress";if(n.includes("revizie"))return"Revizie";if(n.includes("detector")||n.includes("homplex"))return"Detectoare";return"Verificare"}
const totals=()=>{const o={};state.executions.forEach(x=>o[x.date]=(o[x.date]||0)+x.amountNoVat);return o};
const totalFor=d=>state.executions.filter(x=>x.date===d).reduce((a,x)=>a+x.amountNoVat,0);
const monthItems=(y,m)=>state.executions.filter(x=>{const d=dateOf(x.date);return d.getFullYear()===y&&d.getMonth()===m});
function isWorkday(d){const w=d.getDay();return(w>=1&&w<=5)||(state.includeSaturday&&w===6)}
function workdays(y,m,fromToday=false){const t=new Date();t.setHours(0,0,0,0);let d=new Date(y,m,1),c=0;while(d.getMonth()===m){if(isWorkday(d)&&(!fromToday||d>=t))c++;d.setDate(d.getDate()+1)}return c}

/* ---------- theme ---------- */
function applyTheme(){
  let t=state.theme;if(t==="auto")t=matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";
  document.documentElement.dataset.theme=t;
  $("themeColor").content=t==="dark"?"#000000":"#f2f2f7";
  document.querySelectorAll("[data-theme-choice]").forEach(b=>b.classList.toggle("active",b.dataset.themeChoice===state.theme));
}

/* ---------- shared row builders ---------- */
const swipeRow=(inner,delAttr,extra="")=>`<div class="swipe"><button class="swipe-del" ${delAttr}>Șterge</button><div class="swipe-body" ${extra}>${inner}</div></div>`;
function jobInner(x){const c=x.category||categoryFor(x.name);return`<span class="badge ${CAT_COLOR[c]}">${c[0]}</span><div class="grow"><strong>${esc(x.name)}</strong><small>${x.pricingMode==="integral"?"încasare integrală":"fără TVA"}</small></div><span class="amt">+${money(x.amountNoVat)}</span>`}
const jobHTML=x=>swipeRow(jobInner(x),`data-del-job="${x.id}"`);

/* ---------- Home ---------- */
function renderHome(){
  const now=new Date(),k=key(now),sum=totalFor(k),pct=Math.min(100,Math.round(sum/state.target*100)),items=state.executions.filter(x=>x.date===k).slice().reverse();
  $("homeDate").textContent=now.toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long"});
  const[p,d]=money(sum).split(",");
  $("todayInt").textContent=p;$("todayDec").textContent=","+d;
  $("ringArc").style.strokeDashoffset=326.73*(1-pct/100);$("ringArc").parentElement.parentElement.classList.toggle("done",pct>=100);
  $("ringPct").textContent=pct+"%";
  $("dailyRemaining").textContent=pct>=100?"Target atins ✓":`${money(Math.max(0,state.target-sum))} RON până la target`;
  $("todayCount").textContent=items.length;
  $("todayList").innerHTML=items.length?items.map(jobHTML).join(""):'<div class="empty">Nicio lucrare azi.<br>Apasă „Adaugă lucrare” pentru a începe.</div>';
  const t=totals(),best=Math.max(0,...Object.values(t));$("recordValue").textContent=moneyInt(best)+" RON";
  let streak=0,c=new Date();if((t[key(c)]||0)<state.target)c.setDate(c.getDate()-1);
  for(let i=0;i<400;i++){if(!isWorkday(c)){c.setDate(c.getDate()-1);continue}if((t[key(c)]||0)>=state.target){streak++;c.setDate(c.getDate()-1)}else break}
  $("streakValue").textContent=streak+(streak===1?" zi":" zile");
  const y=now.getFullYear(),m=now.getMonth(),msum=monthItems(y,m).reduce((a,x)=>a+x.amountNoVat,0),days=workdays(y,m),left=workdays(y,m,true),target=state.target*days,rem=Math.max(0,target-msum),mp=target?Math.min(100,Math.round(msum/target*100)):0;
  $("monthLabel").textContent=now.toLocaleDateString("ro-RO",{month:"long"});
  $("monthAmount").textContent=`${moneyInt(msum)} / ${moneyInt(target)} RON`;$("monthPercent").textContent=mp+"%";$("monthProgress").style.width=mp+"%";
  $("monthRemaining").textContent=moneyInt(rem)+" RON";$("monthNeeded").textContent=moneyInt(left?rem/left:rem)+" RON";$("workDays").textContent=days;
}

/* ---------- Stats ---------- */
function renderStats(){
  const t=totals(),today=new Date(),arr=[];let max=state.target,total=0;
  for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const v=t[key(d)]||0;max=Math.max(max,v);total+=v;arr.push({d,v,i})}
  $("sevenTotal").textContent=money(total)+" RON";$("sevenAvg").textContent=`Medie ${moneyInt(total/7)} RON / zi`;
  $("weekChart").innerHTML=`<div class="plot"><i class="tline" style="bottom:${state.target/max*100}%"></i><div class="cols">${arr.map(x=>`<div class="col ${x.i===0?"today":""}"><span class="v">${x.v?(x.v>=1000?(x.v/1000).toFixed(1).replace(".",",")+"k":Math.round(x.v)):""}</span><div class="bar ${x.v>=state.target?"hit":""}" style="height:${x.v/max*100}%"></div></div>`).join("")}</div></div><div class="days">${arr.map(x=>`<span>${x.d.toLocaleDateString("ro-RO",{weekday:"short"}).replace(".","")}</span>`).join("")}</div>`;
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),items=monthItems(y,m),k=key(n);
  const days=workdays(y,m),left=workdays(y,m,true),elapsed=days-left,before=items.filter(x=>x.date<k).reduce((a,x)=>a+x.amountNoVat,0),diff=before-state.target*elapsed;
  $("paceInsight").textContent=elapsed<=0?"Luna abia a început. Ritmul se calculează de mâine.":diff>=0?`Ești cu ${money(diff)} RON peste ritm (până ieri).`:`Ești cu ${money(-diff)} RON sub ritm (până ieri).`;
  const cats=Object.keys(CATALOG),sums=cats.map(c=>items.filter(x=>x.category===c).reduce((a,x)=>a+x.amountNoVat,0)),all=sums.reduce((a,b)=>a+b,0)||1;
  $("categoryList").innerHTML=cats.map((c,i)=>{const cnt=items.filter(x=>x.category===c).length;return`<div class="row"><span class="badge ${CAT_COLOR[c]}">${c[0]}</span><div class="grow"><b>${c}</b><small>${cnt} ${cnt===1?"lucrare":"lucrări"}</small><div class="share"><i class="${CAT_COLOR[c]==="purple"?"":""}" style="width:${sums[i]/all*100}%;background:var(--${CAT_COLOR[c]})"></i></div></div><b>${money(sums[i])}</b></div>`}).join("");
}

/* ---------- History ---------- */
function renderHistory(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth(),first=new Date(y,m,1),offset=(first.getDay()+6)%7,count=new Date(y,m+1,0).getDate(),t=totals(),today=key(new Date());
  if(!selectedDay)selectedDay=today;
  $("calendarTitle").textContent=first.toLocaleDateString("ro-RO",{month:"long",year:"numeric"});
  $("monthSum").textContent=money(monthItems(y,m).reduce((a,x)=>a+x.amountNoVat,0))+" RON";
  let h="";for(let i=0;i<offset;i++)h+="<span></span>";
  for(let d=1;d<=count;d++){const k=key(new Date(y,m,d)),v=t[k]||0,cl=v>=state.target?"good":v>=state.target*.5?"mid":v>0?"low":"";h+=`<button class="day ${cl} ${k===today?"today":""} ${k===selectedDay?"sel":""}" data-day="${k}"><span>${d}</span></button>`}
  $("calendarGrid").innerHTML=h;
  const items=state.executions.filter(x=>x.date===selectedDay).slice().reverse();
  $("selectedDate").textContent=dateOf(selectedDay).toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long"});
  $("selectedTotal").textContent=money(totalFor(selectedDay))+" RON";
  $("selectedList").innerHTML=items.length?items.map(jobHTML).join(""):'<div class="empty">Nicio activitate în această zi.</div>';
}

/* ---------- Appointments & clients ---------- */
const normalizePhone=v=>String(v||"").replace(/\s+/g,"").replace(/[^0-9+]/g,"");
const initials=n=>String(n||"?").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase()||"?";
const avColor=n=>AV_COLORS[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0)%AV_COLORS.length];
const stamp=a=>new Date(`${a.date}T${a.time||"00:00"}:00`).getTime();
const clientById=id=>state.clients.find(c=>c.id===id);
function upsertClient(data){
  const phone=normalizePhone(data.phone);
  let c=state.clients.find(x=>x.id===data.id)||(phone&&state.clients.find(x=>normalizePhone(x.phone)===phone));
  if(c){Object.assign(c,{name:data.name,location:data.location,phone:data.phone});return c}
  c={id:uid("c"),name:data.name,location:data.location,phone:data.phone,createdAt:Date.now()};state.clients.push(c);return c;
}
function dayLabel(k){
  const t=new Date();t.setHours(12,0,0,0);const d=dateOf(k),diff=Math.round((d-t)/864e5);
  const base=d.toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long"});
  return diff===0?"Astăzi · "+base:diff===1?"Mâine · "+base:diff===-1?"Ieri · "+base:base;
}
function renderAppointments(){
  const now=Date.now(),list=state.appointments.slice().sort((a,b)=>stamp(a)-stamp(b)).filter(a=>stamp(a)>=now-36e5);
  let h="",cur="";
  list.forEach(a=>{
    if(a.date!==cur){if(cur)h+="</div>";cur=a.date;h+=`<div class="appt-day">${dayLabel(a.date)}</div><div class="group list">`}
    const c=clientById(a.clientId)||a.clientSnapshot||{},tel=normalizePhone(c.phone);
    const inner=`<span class="appt-time">${esc(a.time)}</span><div class="grow"><strong>${esc(c.name||"Client")}</strong><small>${esc(c.location||"")}</small><span class="appt-tag">${esc(a.service)}</span></div>${tel?`<a class="round" href="tel:${esc(tel)}" aria-label="Sună">${ic("phone")}</a>`:""}${c.location?`<a class="round nav" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.location)}" aria-label="Navighează">${ic("nav")}</a>`:""}`;
    h+=swipeRow(inner,`data-del-appt="${a.id}"`,`data-edit-appt="${a.id}"`);
  });
  if(cur)h+="</div>";
  $("apptList").innerHTML=h||'<div class="group"><div class="empty">Nu ai programări viitoare.<br>Apasă + pentru a adăuga una.</div></div>';
  renderClients($("clientSearch").value);
}
function renderClients(f=""){
  const q=f.trim().toLowerCase(),list=state.clients.slice().sort((a,b)=>a.name.localeCompare(b.name,"ro")).filter(c=>!q||[c.name,c.location,c.phone].some(v=>String(v||"").toLowerCase().includes(q)));
  $("apptCount").textContent=state.clients.length;
  $("clientsList").innerHTML=list.length?list.map(c=>`<button class="client" data-client="${c.id}"><span class="avatar" style="background:${avColor(c.name)}">${esc(initials(c.name))}</span><div class="grow"><strong>${esc(c.name)}</strong><small>${esc(c.phone)} · ${esc(c.location)}</small></div>${ic("chev").replace('class="ic"','class="ic chev"')}</button>`).join(""):'<div class="empty">Niciun client salvat.</div>';
}
function openAppointment(client=null,appt=null){
  const c=client||clientById(appt?.clientId)||appt?.clientSnapshot||{},existing=!!client&&!appt;
  $("apptClientId").value=client?.id||appt?.clientId||"";
  $("apptName").value=c.name||"";$("apptLocation").value=c.location||"";$("apptPhone").value=c.phone||"";
  $("apptDate").value=appt?.date||key(new Date());$("apptTime").value=appt?.time||"09:00";
  setSeg("apptService",appt?.service||"Verificare");
  $("saveAppt").dataset.editId=appt?.id||"";$("apptError").textContent="";
  $("apptTitle").textContent=appt?"Editează programarea":existing?"Programare client existent":"Programare nouă";
  $("apptHint").textContent=existing?"Datele clientului sunt completate. Alege data și ora.":"Clientul este salvat automat.";
  ["apptName","apptLocation","apptPhone"].forEach(id=>$(id).readOnly=existing);
  openSheet("apptSheet");
}
const setSeg=(id,v)=>$(id).querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.v===v));
function saveAppointment(){
  const name=$("apptName").value.trim(),location=$("apptLocation").value.trim(),phone=$("apptPhone").value.trim(),date=$("apptDate").value,time=$("apptTime").value,service=$("apptService").querySelector(".active")?.dataset.v||"Verificare";
  if(!name||!location||!phone||!date||!time){$("apptError").textContent="Completează numele, telefonul, locația, data și ora.";return}
  const client=upsertClient({id:$("apptClientId").value,name,location,phone}),eid=$("saveAppt").dataset.editId,a=eid&&state.appointments.find(x=>x.id===eid),snap={name,location,phone};
  if(a)Object.assign(a,{clientId:client.id,date,time,service,clientSnapshot:snap});
  else state.appointments.push({id:uid("a"),clientId:client.id,date,time,service,clientSnapshot:snap,createdAt:Date.now()});
  save();closeSheets();render();
}
function deleteAppointment(id){
  const i=state.appointments.findIndex(a=>a.id===id);if(i<0)return;const[item]=state.appointments.splice(i,1);
  save();render();showUndo("Programare ștearsă",()=>{state.appointments.splice(i,0,item);save();render()});
}

/* ---------- Executions ---------- */
function addExecution(name,price,integral=false){
  const today=key(new Date()),date=addDate||today,before=totalFor(today),best=Math.max(0,...Object.values(totals()));
  state.executions.push({id:uid("e"),name,priceVat:price,amountNoVat:integral?price:price/VAT,date,timestamp:addDate?dateOf(date).getTime():Date.now(),pricingMode:integral?"integral":"fara_tva",category:categoryFor(name)});
  save();closeSheets();render();navigator.vibrate?.(18);
  const after=totalFor(today);
  if(date===today&&((before<state.target&&after>=state.target)||(best>0&&before<=best&&after>best)))celebrate();
}
function deleteExecution(id){
  const i=state.executions.findIndex(x=>x.id===id);if(i<0)return;const[item]=state.executions.splice(i,1);
  save();render();showUndo("Lucrare ștearsă",()=>{state.executions.splice(i,0,item);save();render()});
}
const celebrate=()=>$("hero").animate([{transform:"scale(1)"},{transform:"scale(1.03)"},{transform:"scale(1)"}],{duration:420,easing:"ease-out"});

/* ---------- toast / undo ---------- */
function showUndo(msg,fn){undoFn=fn;$("undoMsg").textContent=msg;$("undoBtn").classList.toggle("hidden",!fn);$("undoToast").classList.add("show");clearTimeout(undoTimer);undoTimer=setTimeout(()=>{undoFn=null;$("undoToast").classList.remove("show")},5000)}
const toast=msg=>showUndo(msg,null);

/* ---------- sheets ---------- */
function openSheet(id){$("backdrop").classList.add("show");$(id).classList.add("open");document.body.classList.add("lock")}
function closeSheets(){document.querySelectorAll(".sheet.open").forEach(s=>{s.classList.remove("open");s.style.transform="";s.style.transition=""});$("backdrop").classList.remove("show");document.body.classList.remove("lock");addDate=null}
function openAddSheet(date=null){
  addDate=date;$("addSub").textContent=date?"Pentru "+dateOf(date).toLocaleDateString("ro-RO",{weekday:"long",day:"numeric",month:"long"}):"";
  renderServices();openSheet("addSheet");
}
function renderServices(){
  $("serviceTabs").innerHTML=Object.keys(CATALOG).map(c=>`<button class="${c===activeService?"active":""}" data-service-tab="${c}">${c}</button>`).join("");
  $("serviceList").innerHTML=CATALOG[activeService].map((x,i)=>`<button class="svc" data-add-index="${i}"><span class="badge ${CAT_COLOR[activeService]}">${activeService[0]}</span><div class="grow"><strong>${x[0]}</strong><small>${x[2]?"Încasare integrală, fără TVA separat":"Valoare adăugată fără TVA"}</small></div><b>${x[1]} RON</b></button>`).join("");
}
function openTarget(){$("targetInput").value=state.target;openSheet("targetSheet");setTimeout(()=>$("targetInput").select(),350)}
/* drag down to dismiss */
let drag=null;
document.addEventListener("pointerdown",e=>{const top=e.target.closest(".sheet-top");if(top){const s=top.parentElement;drag={s,y:e.clientY,dy:0};s.style.transition="none"}});
document.addEventListener("pointermove",e=>{if(!drag)return;drag.dy=Math.max(0,e.clientY-drag.y);drag.s.style.transform=`translateY(${drag.dy}px)`});
const endDrag=()=>{if(!drag)return;const{s,dy}=drag;drag=null;s.style.transition="";if(dy>110)closeSheets();else s.style.transform=""};
document.addEventListener("pointerup",endDrag);document.addEventListener("pointercancel",endDrag);

/* ---------- swipe to delete ---------- */
let sw=null;
const closeSwipes=except=>document.querySelectorAll(".swipe-body.open").forEach(b=>{if(b!==except){b.classList.remove("open");b.style.transform=""}});
document.addEventListener("pointerdown",e=>{
  const b=e.target.closest(".swipe-body");closeSwipes(b);
  sw=b?{b,x:e.clientX,y:e.clientY,base:b.classList.contains("open")?-88:0,on:false,dx:0}:null;
});
document.addEventListener("pointermove",e=>{
  if(!sw)return;const dx=e.clientX-sw.x,dy=e.clientY-sw.y;
  if(!sw.on){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)){sw.on=true;sw.b.style.transition="none";sw.b.setPointerCapture?.(e.pointerId)}else return}
  sw.dx=Math.min(0,Math.max(-280,sw.base+dx));sw.b.style.transform=`translateX(${sw.dx}px)`;
});
function endSwipe(){
  if(!sw)return;const{b,on,dx}=sw;sw=null;if(!on)return;
  b.style.transition="";b.dataset.dragged="1";setTimeout(()=>delete b.dataset.dragged,80);
  if(dx<-200){b.previousElementSibling.click();return}
  const open=dx<-44;b.classList.toggle("open",open);b.style.transform=open?"translateX(-88px)":"";
}
document.addEventListener("pointerup",endSwipe);document.addEventListener("pointercancel",endSwipe);

/* ---------- navigation & render ---------- */
function render(){({home:renderHome,stats:renderStats,history:renderHistory,appointments:renderAppointments,settings:renderSettings})[view]()}
function renderSettings(){$("settingsTargetValue").textContent=moneyInt(state.target)+" RON";$("saturdayToggle").checked=!!state.includeSaturday;applyTheme()}
function switchView(v){
  view=v;document.body.dataset.view=v;
  document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===`view-${v}`));
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===v));
  $("navTitle").textContent=TITLES[v];$("navAction").classList.toggle("hidden",v!=="appointments");
  closeSwipes();scrollTo(0,0);render();
}

/* ---------- backup ---------- */
function exportBackup(){
  const blob=new Blob([JSON.stringify({app:"Revizio",version:VERSION,exportedAt:new Date().toISOString(),state},null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`revizio-backup-${key(new Date())}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function importBackup(file){
  const r=new FileReader();
  r.onload=()=>{
    try{
      const p=JSON.parse(r.result),inc=p.state||p;if(!Array.isArray(inc.executions))throw Error("format");
      if(!confirm(`Importul înlocuiește datele curente cu ${inc.executions.length} lucrări din backup. Continui?`))return;
      state={...state,...inc};normalize();save();applyTheme();render();toast("Backup importat");
    }catch{toast("Fișierul nu este un backup Revizio valid")}
  };
  r.readAsText(file);
}

/* ---------- events ---------- */
function events(){
  document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));
  addEventListener("scroll",()=>document.body.classList.toggle("scrolled",scrollY>44),{passive:true});
  $("addFab").onclick=()=>openAddSheet();$("backdrop").onclick=closeSheets;
  $("hero").onclick=openTarget;$("hero").onkeydown=e=>{if(e.key==="Enter"||e.key===" ")openTarget()};
  $("settingsTarget").onclick=openTarget;
  $("saveTarget").onclick=()=>{const v=Number($("targetInput").value);if(v>0){state.target=v;save();closeSheets();render()}};
  $("navAction").onclick=()=>openAppointment();
  $("serviceTabs").onclick=e=>{const b=e.target.closest("[data-service-tab]");if(b){activeService=b.dataset.serviceTab;renderServices()}};
  $("serviceList").onclick=e=>{const b=e.target.closest("[data-add-index]");if(b){const x=CATALOG[activeService][+b.dataset.addIndex];addExecution(x[0],x[1],!!x[2])}};
  $("apptService").onclick=e=>{const b=e.target.closest("button");if(b)setSeg("apptService",b.dataset.v)};
  $("saveAppt").onclick=saveAppointment;
  $("clientSearch").oninput=e=>renderClients(e.target.value);
  $("calPrev").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()-1,1);renderHistory()};
  $("calNext").onclick=()=>{calendarCursor.setMonth(calendarCursor.getMonth()+1,1);renderHistory()};
  $("addToDay").onclick=()=>openAddSheet(selectedDay);
  $("saturdayToggle").onchange=e=>{state.includeSaturday=e.target.checked;save()};
  document.querySelectorAll("[data-theme-choice]").forEach(b=>b.onclick=()=>{state.theme=b.dataset.themeChoice;save();applyTheme()});
  $("exportBtn").onclick=exportBackup;$("importBtn").onclick=()=>$("importInput").click();
  $("importInput").onchange=e=>{if(e.target.files[0])importBackup(e.target.files[0]);e.target.value=""};
  $("undoBtn").onclick=()=>{if(undoFn)undoFn();undoFn=null;$("undoToast").classList.remove("show")};
  document.body.addEventListener("click",e=>{
    const t=e.target;
    const dj=t.closest("[data-del-job]");if(dj)return deleteExecution(dj.dataset.delJob);
    const da=t.closest("[data-del-appt]");if(da)return deleteAppointment(da.dataset.delAppt);
    const day=t.closest("[data-day]");if(day){selectedDay=day.dataset.day;return renderHistory()}
    const body=t.closest("[data-edit-appt]");
    if(body&&!t.closest("a")&&!body.dataset.dragged){if(body.classList.contains("open"))return closeSwipes();const a=state.appointments.find(x=>x.id===body.dataset.editAppt);if(a)openAppointment(null,a);return}
    const cl=t.closest("[data-client]");if(cl){const c=clientById(cl.dataset.client);if(c)openAppointment(c)}
  });
  matchMedia("(prefers-color-scheme:dark)").addEventListener?.("change",()=>{if(state.theme==="auto")applyTheme()});
  addEventListener("online",updateOnline);addEventListener("offline",updateOnline);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render()});
}
const updateOnline=()=>$("offline").classList.toggle("hidden",navigator.onLine);

function registerSW(){
  if(!("serviceWorker"in navigator))return;let reloading=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(!reloading){reloading=true;location.reload()}});
  navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"}).then(reg=>{
    const show=w=>{waitingWorker=w;$("updateToast").classList.remove("hidden")};
    if(reg.waiting)show(reg.waiting);
    reg.addEventListener("updatefound",()=>{const w=reg.installing;if(w)w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller)show(w)})});
    reg.update();setInterval(()=>reg.update(),36e5);
  });
  $("updateBtn").onclick=()=>waitingWorker?.postMessage({type:"SKIP_WAITING"});
}

load();applyTheme();events();switchView("home");updateOnline();registerSW();
