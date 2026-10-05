const $=id=>document.getElementById(id);
const S=2,WH=2.4,R=.35,RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const COARSE=matchMedia('(pointer:coarse)').matches,MAXC=COARSE?30:40;
const BUFFS={ghost:['🌀',0xb48cff,'Spirit Walk'],breaker:['⚒️',0xff8a3d,'Obsidian Hammer'],bird:['🦅',0x5fe3ff,'Eagle Sight'],jump:['🐆',0xffc24a,'Jaguar Leap'],hint:['🪶',0x2fe0b0,'Quetzal Feather Trail'],trail:['✋',0xd9822b,'Glyph Trail (30s)'],chalk:['✋',0xe0a82e,'Ochre handprints +3']};
const G={mode:'classic',level:1,seed:'',auto:false,guard:true,w:15,h:15,grow:false};
let grid,GW,GH,cw,ch,ex,exitD,world,walls,idxMap,pickups,marks,hintG,exitRing,inv=[],sel=0,state='menu',paused=false,T=0,blend=1,lastMark=null,ghostOn=false,lastInfo='';
const P={x:0,z:0,y:0,vy:0,yaw:0,pitch:0,ghost:0,birdT:0,birdLeft:3,hintT:0,trailT:0,chalk:6,intro:true,hold:0};
const keys={},joy={mx:0,mz:0},pad={mx:0,mz:0,lx:0,ly:0};
const clampC=v=>Math.max(5,Math.min(MAXC,Math.round(+v)||5));

function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function gen(cw,ch,r){
  const w=2*cw+1,h=2*ch+1,g=Array.from({length:h},()=>Array(w).fill(1));
  const st=[[0,0]],seen=new Set(['0,0']);g[1][1]=0;
  while(st.length){
    const[cx,cy]=st[st.length-1];
    const nb=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>[cx+dx,cy+dy,dx,dy]).filter(([x,y])=>x>=0&&y>=0&&x<cw&&y<ch&&!seen.has(x+','+y));
    if(!nb.length){st.pop();continue}
    const[x,y,dx,dy]=nb[Math.floor(r()*nb.length)];
    g[2*cy+1+dy][2*cx+1+dx]=0;g[2*y+1][2*x+1]=0;seen.add(x+','+y);st.push([x,y]);
  }
  let k=Math.floor(cw*ch*.08);
  for(let i=0;i<k*30&&k>0;i++){
    const x=1+Math.floor(r()*(w-2)),z=1+Math.floor(r()*(h-2));
    if(g[z][x]===1&&((g[z][x-1]===0&&g[z][x+1]===0&&g[z-1][x]===1&&g[z+1][x]===1)||(g[z-1][x]===0&&g[z+1][x]===0&&g[z][x-1]===1&&g[z][x+1]===1))){g[z][x]=0;k--}
  }
  return g;
}
function bfs(g,sx,sz){
  const d=g.map(r=>r.map(()=>-1));d[sz][sx]=0;const q=[[sx,sz]];
  for(let i=0;i<q.length;i++){const[x,z]=q[i];for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz;if(g[b]&&g[b][a]===0&&d[b][a]<0){d[b][a]=d[z][x]+1;q.push([a,b])}}}
  return d;
}

// ---- textures (procedural, no imports)
function tex(draw,sz=128){const c=document.createElement('canvas');c.width=c.height=sz;const g=c.getContext('2d');draw(g,sz);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t}
const speck=(g,s,n,a)=>{for(let i=0;i<n;i++){g.fillStyle='rgba('+(Math.random()<.5?'40,22,10':'240,200,140')+','+Math.random()*a+')';g.fillRect(Math.random()*s,Math.random()*s,2,2)}};
const stoneT=tex((g,s)=>{g.fillStyle='#b98f58';g.fillRect(0,0,s,s);speck(g,s,900,.14);g.strokeStyle='#5b3a1c';g.lineWidth=3;g.strokeRect(1,1,s-2,s-2);
  g.strokeStyle='#2a8f7b';g.lineWidth=4;g.beginPath();let x=8;const y=100;g.moveTo(x,y);for(let k=0;k<7;k++){g.lineTo(x,y-12);g.lineTo(x+8,y-12);g.lineTo(x+8,y);g.lineTo(x+16,y);x+=16}g.stroke();
  g.strokeStyle='#e0a82e';g.strokeRect(44,24,40,40);g.strokeRect(55,35,18,18)});
const floorT=tex((g,s)=>{g.fillStyle='#1b1614';g.fillRect(0,0,s,s);speck(g,s,500,.1);g.strokeStyle='#7a5a22';g.lineWidth=3;g.strokeRect(2,2,s-4,s-4);
  g.fillStyle='#2a8f7b';g.beginPath();g.moveTo(64,40);g.lineTo(88,64);g.lineTo(64,88);g.lineTo(40,64);g.fill()});
const handT=tex((g,s)=>{g.clearRect(0,0,s,s);g.fillStyle='#d9822b';g.beginPath();g.ellipse(64,80,26,24,0,0,7);g.fill();for(const[a,l]of[[-.8,40],[-.3,50],[.1,54],[.5,48],[1.2,32]]){g.save();g.translate(64,72);g.rotate(a*.8);g.beginPath();g.ellipse(0,-l/1.2,8,l/2,0,0,7);g.fill();g.restore()}},128);
handT.wrapS=handT.wrapT=THREE.ClampToEdgeWrapping;

// ---- three setup
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
const scene=new THREE.Scene();scene.background=new THREE.Color(0x140d08);scene.fog=new THREE.Fog(0x140d08,1,16);
const camera=new THREE.PerspectiveCamera(70,1,.1,2000);camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight(0xffd9a0,0x2a1608,.5));
const plight=new THREE.PointLight(0xff9a3c,1.5,16,1);scene.add(plight);
const wallMat=new THREE.MeshLambertMaterial({map:stoneT}),floorMat=new THREE.MeshLambertMaterial({map:floorT}),ceilMat=new THREE.MeshLambertMaterial({color:0x4a3220});
const markMat=new THREE.MeshBasicMaterial({map:handT,transparent:true,depthWrite:false}),markGeo=new THREE.PlaneGeometry(.55,.55);
const marker=new THREE.Mesh(new THREE.SphereGeometry(.5,16,12),new THREE.MeshBasicMaterial({color:0xe0a82e}));scene.add(marker);
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// ---- particles (pooled, capped)
const PN=160,pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3).fill(-100),pc=new Float32Array(PN*3),pv=new Float32Array(PN*3),pl=new Float32Array(PN);let pi=0;
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.16,vertexColors:true,transparent:true,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);
function burst(x,y,z,col,n){n=RM?n>>1:n;const c=new THREE.Color(col);for(let k=0;k<n;k++){const i=pi++%PN,j=i*3;pp[j]=x;pp[j+1]=y;pp[j+2]=z;pv[j]=(Math.random()-.5)*3;pv[j+1]=Math.random()*2.5;pv[j+2]=(Math.random()-.5)*3;pc[j]=c.r;pc[j+1]=c.g;pc[j+2]=c.b;pl[i]=.8}pg.attributes.color.needsUpdate=true}
function stepP(dt){for(let i=0;i<PN;i++)if(pl[i]>0){const j=i*3;pl[i]-=dt;pv[j+1]-=6*dt;pp[j]+=pv[j]*dt;pp[j+1]+=pv[j+1]*dt;pp[j+2]+=pv[j+2]*dt;if(pl[i]<=0||pp[j+1]<0)pl[i]=0,pp[j+1]=-100}pg.attributes.position.needsUpdate=true}

// ---- sound (WebAudio, procedural)
let AC,mg,nb,voices=0,muted=false;
function startAudio(){try{if(!AC){AC=new(window.AudioContext||window.webkitAudioContext)();mg=AC.createGain();mg.gain.value=.8;mg.connect(AC.destination);
  nb=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
  for(const[f,v,t]of[[55,.035,'triangle'],[82,.02,'sine']]){const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=v;o.connect(g);g.connect(mg);o.start()}
  setInterval(()=>{if(state==='play'&&!paused&&Math.random()<.6)noise(.06,.05,4000)},230)}AC.resume()}catch(e){}}
function tone(f,d,type,v,f2){if(!AC||muted||voices>7)return;voices++;const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(mg);o.start(t);o.stop(t+d);o.onended=()=>voices--}
function noise(d,v,fc){if(!AC||muted||voices>7)return;voices++;const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain(),t=AC.currentTime;s.buffer=nb;f.type='lowpass';f.frequency.value=fc;g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(f);f.connect(g);g.connect(mg);s.start(t,Math.random()*.5,d);s.onended=()=>voices--}
const SFX={pick:()=>{tone(660,.25,'sine',.15,990);tone(990,.3,'sine',.08)},drum:()=>tone(90,.5,'sine',.45,40),hit:()=>{tone(60,.9,'sine',.6,30);noise(.4,.3,300)},brk:()=>noise(.5,.5,900),jump:()=>tone(200,.25,'triangle',.2,500),use:()=>tone(440,.3,'triangle',.15,880),conch:()=>tone(220,1.4,'sawtooth',.1,330),mark:()=>noise(.12,.15,2500),bird:()=>noise(.8,.15,1500)};
const sfx=n=>{try{SFX[n]()}catch(e){}};
function setMute(v){muted=v;$('mute').textContent=v?'🔇':'🔊';if(bgm)bgm.muted=v}
$('mute').onclick=()=>setMute(!muted);

// ---- BGM (temple music from public/)
const bgmFiles=['public/Aztec%20Music%20-%20Sacred%20Jungle%20%5Biq5LY8qzwLk%5D.mp3','public/Human%20Sacrifice%20(Ancient%20Aztec%20Traditional)%20%5BRzlfiZmq33c%5D.mp3'];
let bgm=null,bgmIdx=Math.random()<.5?0:1;
function playBGM(){
  if(!bgm){bgm=new Audio();bgm.loop=true;bgm.volume=0;bgm.muted=muted}
  bgm.src=bgmFiles[bgmIdx];bgm.play().catch(()=>{});
  let v=0;const fi=setInterval(()=>{v=Math.min(v+.008,.3);bgm.volume=v;if(v>=.3)clearInterval(fi)},50);
}
function swapBGM(){bgmIdx=1-bgmIdx;if(bgm){bgm.volume=0;bgm.src=bgmFiles[bgmIdx];bgm.play().catch(()=>{});let v=0;const fi=setInterval(()=>{v=Math.min(v+.008,.3);bgm.volume=v;if(v>=.3)clearInterval(fi)},50)}}
function stopBGM(){if(bgm){bgm.pause();bgm.currentTime=0}}

// ---- level build
function curSize(){const g=G.grow?G.level-1:0;return[Math.min(MAXC,G.w+g),Math.min(MAXC,G.h+g)]}
function topH(){const v=camera.fov*Math.PI/360,h=Math.atan(Math.tan(v)*camera.aspect);return Math.max(GH*S/2/Math.tan(v),GW*S/2/Math.tan(h))*1.08}
function build(){
  [cw,ch]=curSize();
  const r=mul(hash(G.seed+':'+G.level+':'+cw+'x'+ch));
  grid=gen(cw,ch,r);GW=2*cw+1;GH=2*ch+1;
  const d=bfs(grid,1,1);let best=0;ex=[1,1];
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(d[z][x]>best){best=d[z][x];ex=[x,z]}
  exitD=bfs(grid,ex[0],ex[1]);
  if(world){scene.remove(world);world.traverse(o=>{if(o.geometry&&o.geometry!==markGeo)o.geometry.dispose()})}
  world=new THREE.Group();scene.add(world);
  let cnt=0;for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(grid[z][x])cnt++;
  walls=new THREE.InstancedMesh(new THREE.BoxGeometry(S,WH,S),wallMat,cnt);idxMap=new Map();
  const m=new THREE.Matrix4();let i=0;
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(grid[z][x]){m.setPosition(x*S,WH/2,z*S);walls.setMatrixAt(i,m);idxMap.set(z*GW+x,i++)}
  world.add(walls);
  const cx=(GW-1)*S/2,cz=(GH-1)*S/2;floorT.repeat.set(GW,GH);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(GW*S,GH*S),floorMat);fl.rotation.x=-Math.PI/2;fl.position.set(cx,0,cz);world.add(fl);
  const ce=new THREE.Mesh(new THREE.PlaneGeometry(GW*S,GH*S),ceilMat);ce.rotation.x=Math.PI/2;ce.position.set(cx,WH,cz);world.add(ce);
  const pil=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,10,16),new THREE.MeshBasicMaterial({color:0x5fffc8,transparent:true,opacity:.5}));pil.position.set(ex[0]*S,5,ex[1]*S);world.add(pil);
  exitRing=new THREE.Mesh(new THREE.TorusGeometry(.9,.1,8,24),new THREE.MeshBasicMaterial({color:0xe0a82e}));exitRing.position.set(ex[0]*S,1.2,ex[1]*S);world.add(exitRing);
  pickups=[];
  if(G.mode==='classic'){
    const types=Object.keys(BUFFS),want=Math.round(cw*ch/9);
    for(let k=0;k<want*10&&pickups.length<want;k++){
      const x=1+2*Math.floor(r()*cw),z=1+2*Math.floor(r()*ch);
      if((x===1&&z===1)||(x===ex[0]&&z===ex[1])||pickups.some(p=>p.tx===x&&p.tz===z))continue;
      const t=types[Math.floor(r()*types.length)];
      const mesh=new THREE.Mesh(new THREE.OctahedronGeometry(.4),new THREE.MeshBasicMaterial({color:BUFFS[t][1]}));
      mesh.position.set(x*S,.9,z*S);world.add(mesh);pickups.push({mesh,t,tx:x,tz:z,got:false});
    }
  }
  marks=[];lastMark=null;hintG=new THREE.Group();world.add(hintG);
}
function start(){
  build();
  P.x=S;P.z=S;P.y=0;P.vy=0;P.ghost=0;P.birdT=0;P.birdLeft=3;P.hintT=0;P.trailT=0;P.pitch=0;P.chalk=G.mode==='classic'?6:Infinity;
  P.yaw=grid[1][2]===0?-Math.PI/2:Math.PI;
  P.intro=true;P.hold=1.4;blend=1;T=0;inv=[];sel=0;ghostOn=false;wallMat.opacity=1;wallMat.transparent=false;wallMat.needsUpdate=true;
  state='play';paused=false;
  $('hud').style.display='flex';$('mute').style.display='block';$('inv').style.display=G.mode==='classic'?'flex':'none';
  initGuard();hud();toast('Level '+G.level+'  '+cw+' x '+ch+(G.mode==='purist'?' (Purist)':''));
}

// ---- HUD
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),1600)}
function hud(){
  $('pips').textContent=(G.mode==='purist'?'🦅 '+'●'.repeat(P.birdLeft)+'○'.repeat(3-P.birdLeft)+'  ':'')+'✋ '+(P.chalk===Infinity?'∞':P.chalk);
  const e=$('inv');e.innerHTML='';
  inv.forEach((t,i)=>{const d=document.createElement('div');d.className='slot'+(i===sel?' sel':'');d.innerHTML='<i>'+(i+1)+'</i>'+BUFFS[t][0];d.title=BUFFS[t][2];
    d.onpointerdown=ev=>{ev.stopPropagation();if(sel===i)act('use');else{sel=i;hud()}};e.appendChild(d)});
}
function rumble(){try{const g=padObj();g&&g.vibrationActuator&&g.vibrationActuator.playEffect('dual-rumble',{duration:150,strongMagnitude:.6,weakMagnitude:.3})}catch(e){}}

// ---- actions
function solid(tx,tz){if(tx<=0||tz<=0||tx>=GW-1||tz>=GH-1)return true;if(P.ghost>0)return false;return grid[tz][tx]===1}
function blocked(x,z){for(const[ox,oz]of[[-R,-R],[R,-R],[-R,R],[R,R]])if(solid(Math.round((x+ox)/S),Math.round((z+oz)/S)))return true;return false}
function breakWall(){
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(let d=.5;d<=S*1.4;d+=.25){
    const tx=Math.round((P.x+fx*d)/S),tz=Math.round((P.z+fz*d)/S);
    if(grid[tz]&&grid[tz][tx]===1){
      if(tx>0&&tz>0&&tx<GW-1&&tz<GH-1){grid[tz][tx]=0;walls.setMatrixAt(idxMap.get(tz*GW+tx),new THREE.Matrix4().makeScale(0,0,0));walls.instanceMatrix.needsUpdate=true;
        burst(tx*S,1.1,tz*S,0xc9a46a,32);sfx('brk');toast('Stone shatters');rumble();return true}
      return false;
    }
  }
  return false;
}
function showHint(){
  while(hintG.children.length)hintG.remove(hintG.children[0]);
  let x=Math.round(P.x/S),z=Math.round(P.z/S);
  const geo=new THREE.ConeGeometry(.14,.5,5),mat=new THREE.MeshBasicMaterial({color:0x2fe0b0});
  if(!exitD[z]||exitD[z][x]<0)return false;
  while(exitD[z][x]>0){
    const dd=exitD[z][x];
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(exitD[z+dz]&&exitD[z+dz][x+dx]===dd-1){x+=dx;z+=dz;break}}
    const s=new THREE.Mesh(geo,mat);s.position.set(x*S,.5,z*S);hintG.add(s);
  }
  P.hintT=6;hintG.visible=true;return true;
}
function apply(t){
  if(t==='ghost'){P.ghost=6;return true}
  if(t==='breaker'){if(breakWall())return true;toast('No wall in front of you');return false}
  if(t==='bird'){P.birdT=5;return true}
  if(t==='jump'){if(P.y>.01)return false;P.vy=9;return true}
  if(t==='hint')return showHint();
  if(t==='trail'){P.trailT=30;return true}
  return false;
}
function useType(t){const i=inv.indexOf(t);if(i<0)return;if(apply(t)){inv.splice(i,1);sel=Math.max(0,Math.min(sel,inv.length-1));sfx(t==='jump'?'jump':t==='bird'?'bird':'use');hud()}}
function dropMark(free){
  if(marks.length>700)return;
  if(!free){if(P.chalk<=0){toast('Out of handprints');return}P.chalk--;hud()}
  const m=new THREE.Mesh(markGeo,markMat);m.rotation.set(-Math.PI/2,0,Math.random()*6.28);m.position.set(P.x,.03,P.z);world.add(m);marks.push(m);lastMark=[P.x,P.z];sfx('mark');
}
function act(a){
  if(state!=='play')return;
  if(a==='pause'){setPause(!paused);return}
  if(paused)return;
  if(P.intro&&P.hold>0){P.hold=0;blend=Math.min(blend,.34);return}
  if(P.intro)return;
  if(a==='use'){const t=inv[sel];if(t){apply(t)&&(inv.splice(sel,1),sel=Math.max(0,Math.min(sel,inv.length-1)),sfx(t==='jump'?'jump':t==='bird'?'bird':'use'),hud())}}
  else if(a==='next'){if(inv.length){sel=(sel+1)%inv.length;hud()}}
  else if(a==='prev'){if(inv.length){sel=(sel+inv.length-1)%inv.length;hud()}}
  else if(a==='bird'){
    if(G.mode==='purist'){if(P.birdLeft>0&&P.birdT<=0){P.birdLeft--;P.birdT=5;sfx('bird');hud()}}
    else useType('bird');
  }
  else if(a==='jump')useType('jump');
  else if(a==='crumb')dropMark(false);
}
function setPause(v){paused=v;$('pause').classList.toggle('hide',!v);if(v&&document.pointerLockElement)document.exitPointerLock()}

// ---- input
const KM={KeyE:'use',KeyQ:'prev',KeyB:'bird',KeyF:'crumb',Space:'jump',KeyP:'pause',Escape:'pause'};
addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT')return;
  if(!keys[e.code]){
    if(KM[e.code])act(KM[e.code]);
    if(e.code==='KeyM')setMute(!muted);
    if(/^Digit[1-5]$/.test(e.code)&&inv[+e.code[5]-1]){sel=+e.code[5]-1;hud()}
  }
  keys[e.code]=1;if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=0});
let isTouch=COARSE||navigator.maxTouchPoints>0;
function showTouch(){isTouch=true;$('touch').style.display='block'}
if(isTouch)showTouch();
const cv=$('c');let jid=null,jo=null,lid=null,lp=null;
function look(dx,dy){if(P.intro)return;P.yaw-=dx;P.pitch=Math.max(-1.4,Math.min(1.4,P.pitch-dy))}
cv.addEventListener('pointerdown',e=>{
  if(state!=='play'||paused)return;
  if(e.pointerType==='touch'){
    showTouch();
    if(P.intro){act('skip');return}
    if(e.clientX<innerWidth/2&&jid===null){jid=e.pointerId;jo=[e.clientX,e.clientY];const j=$('joy');j.style.left=jo[0]+'px';j.style.top=jo[1]+'px';j.style.opacity=.8}
    else if(lid===null){lid=e.pointerId;lp=[e.clientX,e.clientY]}
    cv.setPointerCapture(e.pointerId);
  }else{if(P.intro)act('skip');if(!document.pointerLockElement)cv.requestPointerLock&&cv.requestPointerLock()}
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch')return;
  if(e.pointerId===jid){let dx=e.clientX-jo[0],dy=e.clientY-jo[1];const l=Math.hypot(dx,dy);if(l>50){dx*=50/l;dy*=50/l}
    joy.mx=dx/50;joy.mz=-dy/50;$('knob').style.transform='translate('+dx+'px,'+dy+'px)'}
  else if(e.pointerId===lid){look((e.clientX-lp[0])*.006,(e.clientY-lp[1])*.006);lp=[e.clientX,e.clientY]}
});
const endT=e=>{if(e.pointerId===jid){jid=null;joy.mx=joy.mz=0;$('joy').style.opacity=0;$('knob').style.transform=''}if(e.pointerId===lid)lid=null};
cv.addEventListener('pointerup',endT);cv.addEventListener('pointercancel',endT);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===cv)look(e.movementX*.0022,e.movementY*.0022)});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement&&state==='play'&&!isTouch&&!paused)setPause(true)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='play'&&!paused)setPause(true)});
for(const[id,a]of[['bUse','use'],['bBird','bird'],['bJump','jump'],['bCrumb','crumb']])$(id).addEventListener('pointerdown',e=>{e.preventDefault();act(a)});

let padPrev={};
function padObj(){const l=navigator.getGamepads?navigator.getGamepads():[];for(const g of l)if(g)return g;return null}
const dz=v=>{const a=Math.abs(v);return a<.15?0:Math.sign(v)*(a-.15)/.85};
function pollPad(){
  const g=padObj();
  if(!g){pad.mx=pad.mz=pad.lx=pad.ly=0;return}
  pad.mx=dz(g.axes[0]||0);pad.mz=-dz(g.axes[1]||0);pad.lx=dz(g.axes[2]||0);pad.ly=dz(g.axes[3]||0);
  const BM={0:'jump',1:'use',2:'crumb',3:'bird',4:'prev',5:'next',9:'pause'};
  for(const b in BM){const p=g.buttons[b]&&g.buttons[b].pressed;if(p&&!padPrev[b])act(BM[b]);padPrev[b]=p}
}
addEventListener('gamepadconnected',()=>toast('Controller connected'));

// ---- guardian: obsidian jaguar warrior, still while watched
let guard,lT=6,scare=0,stare=0,hb=0;
function makeGuard(){
  const g=new THREE.Group(),ob=new THREE.MeshBasicMaterial({color:0x07050a}),jd=new THREE.MeshBasicMaterial({color:0x2fbf9a}),gd=new THREE.MeshBasicMaterial({color:0xe0a82e}),tq=new THREE.MeshBasicMaterial({color:0x3ec1c9});
  const add=(geo,m,x,y,z,rx)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.z=rx;g.add(o);return o};
  add(new THREE.BoxGeometry(.55,1.8,.32),ob,0,.9,0);add(new THREE.BoxGeometry(.4,.4,.36),jd,0,2.0,0);
  add(new THREE.BoxGeometry(.08,.1,.05),ob,-.09,2.04,.19);add(new THREE.BoxGeometry(.08,.1,.05),ob,.09,2.04,.19);
  add(new THREE.BoxGeometry(.5,.12,.34),gd,0,1.5,0);
  for(const[x,rz,m]of[[-.3,.5,tq],[0,0,gd],[.3,-.5,tq]])add(new THREE.BoxGeometry(.1,.7,.06),m,x,2.55,0,rz);
  add(new THREE.BoxGeometry(.07,1.7,.07),ob,.42,.95,0);add(new THREE.ConeGeometry(.1,.3,4),gd,.42,1.95,0);
  return g;
}
function placeGuard(){
  for(let i=0;i<120;i++){const x=1+Math.floor(Math.random()*(GW-2)),z=1+Math.floor(Math.random()*(GH-2));if(grid[z][x])continue;
    const d=Math.hypot(x*S-P.x,z*S-P.z),a=i<60;if(d>(a?10:4)&&d<(a?22:99)){guard.position.set(x*S,0,z*S);P.sawL=0;return}}
}
function initGuard(){if(!guard){guard=makeGuard();scene.add(guard)}guard.visible=!!G.guard;stare=scare=0;lT=6;if(G.guard)placeGuard()}

// ---- menu wiring
function setOn(sel,el){document.querySelectorAll(sel).forEach(x=>x.classList.remove('on'));el.classList.add('on')}
$('modes').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{setOn('#modes .opt',b);G.mode=b.dataset.m;$('autoRow').style.display=G.mode==='purist'?'flex':'none'});
$('sizes').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{setOn('#sizes .opt',b);$('cust').style.display=b.dataset.s==='0'?'flex':'none'});
function readSize(){const b=document.querySelector('#sizes .opt.on'),s=+b.dataset.s;if(s){G.w=G.h=s}else{G.w=clampC($('cw').value);G.h=clampC($('ch').value);$('cw').value=G.w;$('ch').value=G.h}G.w=Math.min(G.w,MAXC);G.h=Math.min(G.h,MAXC)}
function begin(){
  readSize();G.seed=$('seed').value.trim()||Math.random().toString(36).slice(2,8);G.level=1;G.auto=$('auto').checked;G.guard=$('guard').checked;G.grow=$('grow').checked;
  $('menu').classList.add('hide');startAudio();playBGM();start();
  if(!isTouch&&cv.requestPointerLock)cv.requestPointerLock();
}
$('start').onclick=begin;
$('next').onclick=()=>{G.level++;$('win').classList.add('hide');swapBGM();start();if(!isTouch&&cv.requestPointerLock)cv.requestPointerLock()};
$('toMenu').onclick=()=>{$('win').classList.add('hide');$('menu').classList.remove('hide');state='menu';stopBGM();$('hud').style.display=$('inv').style.display=$('mute').style.display='none'};
$('resume').onclick=()=>{setPause(false);if(!isTouch&&cv.requestPointerLock)cv.requestPointerLock()};
// URL params: ?seed=abc&size=12x8&mode=purist&guard=0
(function(){const q=new URLSearchParams(location.search);
  if(q.get('seed'))$('seed').value=q.get('seed').slice(0,20);
  const m=(q.get('size')||'').match(/^(\d+)x(\d+)$/i);if(m){$('cw').value=clampC(m[1]);$('ch').value=clampC(m[2]);const c=document.querySelector('#sizes [data-s="0"]');setOn('#sizes .opt',c);$('cust').style.display='flex'}
  if(q.get('mode')==='purist'){const b=document.querySelector('[data-m="purist"]');setOn('#modes .opt',b);G.mode='purist';$('autoRow').style.display='flex'}
  if(q.get('guard')==='0')$('guard').checked=false;
  if(q.get('grow')==='1')$('grow').checked=true;
})();

// ---- loop
const ease=b=>b*b*(3-2*b);
const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.05);
  pollPad();
  if(state==='play'&&!paused)update(dt);
  stepP(dt);
  if(state!=='menu')draw();
  else{camera.position.set((GW-1)*S/2,topH(),(GH-1)*S/2);camera.rotation.set(-Math.PI/2,0,0);renderer.render(scene,camera)}
}
function update(dt){
  T+=dt;
  if(P.intro){if(P.hold>0)P.hold-=dt;else if(blend<.35)P.intro=false}
  if(!P.intro){
    const alx=pad.lx+((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0));
    const aly=pad.ly+((keys.ArrowDown?1:0)-(keys.ArrowUp?1:0));
    P.yaw-=alx*2.4*dt;P.pitch=Math.max(-1.4,Math.min(1.4,P.pitch-aly*2*dt));
    let mx=(keys.KeyD?1:0)-(keys.KeyA?1:0)+joy.mx+pad.mx;
    let mz=(keys.KeyW?1:0)-(keys.KeyS?1:0)+joy.mz+pad.mz;
    const l=Math.hypot(mx,mz);if(l>1){mx/=l;mz/=l}
    const s=Math.sin(P.yaw),c=Math.cos(P.yaw);
    const vx=-s*mz+c*mx,vz=-c*mz-s*mx,sp=4.6;
    let nx=P.x+vx*sp*dt;if(!blocked(nx,P.z))P.x=nx;
    let nz=P.z+vz*sp*dt;if(!blocked(P.x,nz))P.z=nz;
    if(P.trailT>0)P.trailT-=dt;
    if(((G.mode==='purist'&&G.auto)||P.trailT>0)&&(!lastMark||Math.hypot(P.x-lastMark[0],P.z-lastMark[1])>2.2))dropMark(P.trailT>0);
  }
  P.vy-=14*dt;P.y+=P.vy*dt;if(P.y<0){P.y=0;P.vy=0}
  if(P.ghost>0){P.ghost-=dt;if(P.ghost<=0){P.ghost=0;if(blocked(P.x,P.z))P.ghost=.1}}
  if(ghostOn!==(P.ghost>0)){ghostOn=P.ghost>0;wallMat.opacity=ghostOn?.35:1;wallMat.transparent=ghostOn;wallMat.needsUpdate=true}
  if(P.birdT>0)P.birdT-=dt;
  if(P.hintT>0){P.hintT-=dt;if(P.hintT<=0)hintG.visible=false}
  exitRing.rotation.y+=dt*1.5;exitRing.position.y=1.2+Math.sin(T*2)*.15;
  const target=(P.birdT>0||(P.intro&&P.hold>0))?1:0;
  blend=target>blend?Math.min(1,blend+dt*.9):Math.max(0,blend-dt*.45);
  for(const p of pickups){
    if(p.got)continue;p.mesh.rotation.y+=dt*2;p.mesh.position.y=.9+Math.sin(T*3+p.tx)*.12;
    if(!P.intro&&Math.hypot(P.x-p.tx*S,P.z-p.tz*S)<.9&&(p.t==='chalk'||inv.length<5)){p.got=true;p.mesh.visible=false;if(p.t==='chalk')P.chalk+=3;else inv.push(p.t);burst(p.tx*S,.9,p.tz*S,BUFFS[p.t][1],18);sfx('pick');hud();toast(BUFFS[p.t][2]);rumble()}
  }
  if(!P.intro&&Math.hypot(P.x-ex[0]*S,P.z-ex[1]*S)<1)win();
  if(G.guard&&guard){
    const dx=guard.position.x-P.x,dz=guard.position.z-P.z,d=Math.hypot(dx,dz)||1;
    guard.rotation.y=Math.atan2(-dx,-dz);
    const fp=blend<.1&&!P.intro;guard.visible=blend<.1;
    const seen=fp&&d<16&&(-Math.sin(P.yaw)*dx-Math.cos(P.yaw)*dz)/d>.6;
    if(seen&&!P.sawL){P.sawL=1;toast('A guardian stands in the haze...')}
    const creep=1.1+Math.min(cw*ch,600)/600;
    if(!seen&&fp){guard.position.x-=dx/d*creep*dt;guard.position.z-=dz/d*creep*dt}
    lT-=dt;if(lT<=0&&!seen){placeGuard();lT=12+Math.random()*10}
    stare+=((seen?1:0)-stare)*Math.min(1,dt*3);
    hb-=dt;if(stare>.15&&hb<=0){sfx('drum');hb=1.1-stare*.4}
    if(fp&&d<3&&scare<=0){scare=1;T+=5;toast('The guardian caught you. +5s');burst(P.x,1.4,P.z,0xe0a82e,24);rumble();sfx('hit');placeGuard();lT=14}
    scare=Math.max(0,scare-dt*1.5);
  }
  const info='Level '+G.level+'  '+cw+'x'+ch+'  '+T.toFixed(0)+'s  seed '+G.seed;
  if(info!==lastInfo){$('info').textContent=info;lastInfo=info}
}
function win(){
  state='win';if(document.pointerLockElement)document.exitPointerLock();sfx('conch');
  const key='md:'+G.mode+':'+G.seed+':'+G.level+':'+cw+'x'+ch;let best=null;
  try{best=parseFloat(localStorage.getItem(key));if(isNaN(best)||T<best){best=T;localStorage.setItem(key,T.toFixed(2))}}catch(e){best=T}
  $('winTxt').textContent='Time '+T.toFixed(1)+'s. Best on this '+cw+'x'+ch+' temple: '+best.toFixed(1)+'s.'+(G.mode==='purist'?' Purist finish!':'');
  $('win').classList.remove('hide');
}
function draw(){
  const k=ease(blend),cx=(GW-1)*S/2,cz=(GH-1)*S/2,H=topH(),ey=1+P.y;
  camera.position.set(P.x+(cx-P.x)*k,ey+(H-ey)*k,P.z+(cz-P.z)*k);
  const ya=((P.yaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  camera.rotation.set(P.pitch*(1-k)-Math.PI/2*k,ya*(1-k),0);
  plight.position.set(P.x,2,P.z);if(!RM)camera.position.x+=(Math.random()-.5)*scare*.25;
  plight.intensity=1.5*(RM?1:(stare>.15?(Math.random()<.5?.3:1):.88+Math.random()*.2));
  $('vig').style.opacity=G.guard&&state==='play'?Math.max(stare*.55,RM?0:scare*.9):0;
  scene.fog.far=16+4000*k;
  marker.visible=blend>.15;marker.position.set(P.x,WH+.4,P.z);marker.scale.setScalar(1+k*Math.max(GW,GH)*.12);
  renderer.render(scene,camera);
}
// backdrop temple behind the menu
G.seed='menu';G.level=2;G.w=G.h=12;build();G.level=1;G.w=G.h=15;
frame();

// ---- Ember particles (menu/win ambiance) ----
(function(){
  let eC=0;const MX=35;
  function spawn(){
    if(eC>=MX)return;
    const e=document.createElement('div');e.className='ember';
    const sz=2+Math.random()*4,x=Math.random()*100,dur=5+Math.random()*7;
    const dx=(Math.random()-.5)*120;
    const col=Math.random()<.7?'224,168,46':'47,191,154';
    e.style.cssText='left:'+x+'%;bottom:-10px;width:'+sz+'px;height:'+sz+'px;background:rgba('+col+',.8);box-shadow:0 0 '+sz*2+'px '+sz+'px rgba('+col+',.4);--dx:'+dx+'px;animation:rise '+dur+'s linear forwards';
    document.body.appendChild(e);eC++;
    setTimeout(function(){e.remove();eC--},dur*1000);
  }
  setInterval(function(){if(state==='menu'||state==='win')spawn()},250);
  for(let i=0;i<12;i++)setTimeout(spawn,i*80);
})();
