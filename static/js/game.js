const BUILD_ID='1.2.0-settings-20261010';
const $=id=>document.getElementById(id);
const S=2,WH=2.4,R=.35,RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const COARSE=matchMedia('(pointer:coarse)').matches,MAXC=COARSE?30:40;
const BUFFS={ghost:['🌀',0xb48cff,'Spirit Walk'],breaker:['⚒️',0xff8a3d,'Obsidian Hammer'],bird:['🦅',0x5fe3ff,'Eagle Sight'],jump:['🐆',0xffc24a,'Jaguar Leap'],hint:['🪶',0x2fe0b0,'Quetzal Feather Trail'],trail:['✋',0xd9822b,'Glyph Trail (30s)'],chalk:['✋',0xe0a82e,'Ochre handprints +3']};
// Preferences stay separate from seeded gameplay and survive reloads.
const prefs={mapMemory:true,steadyLight:COARSE||RM,quality:'auto',cameraMotion:'smooth'};
try{const saved=JSON.parse(localStorage.getItem('md:settings')||'{}');for(const k of ['mapMemory','steadyLight'])if(typeof saved[k]==='boolean')prefs[k]=saved[k];if(['auto','battery','sharp'].includes(saved.quality))prefs.quality=saved.quality;if(['smooth','instant'].includes(saved.cameraMotion))prefs.cameraMotion=saved.cameraMotion}catch(e){}
// Camera motion is explicit: legacy Auto migrates to the Smooth default.
const smoothCamera=()=>prefs.cameraMotion==='smooth';
const pixelRatio=()=>Math.min(devicePixelRatio,prefs.quality==='battery'?1:prefs.quality==='sharp'?2:COARSE?1.25:2);
const G={mode:'classic',level:1,seed:'',auto:false,guard:true,w:15,h:15,grow:false};
let grid,GW,GH,cw,ch,ex,exitD,world,walls,idxMap,pickups,marks,markInstances,hintG,exitRing,inv=[],sel=0,state='menu',paused=false,T=0,blend=1,lastMark=null,ghostOn=false,lastInfo='';
const P={x:0,z:0,y:0,vy:0,yaw:0,pitch:0,ghost:0,birdT:0,birdLeft:3,hintT:0,trailT:0,chalk:6,intro:true,hold:0};
const keys={},joy={mx:0,mz:0},pad={mx:0,mz:0,lx:0,ly:0};
const inFirstPerson=()=>!P.intro&&P.birdT<=0&&blend===0;
function syncViewUI(){document.body.classList.toggle('cinematic-view',state==='play'&&!inFirstPerson())}
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
const renderer=new THREE.WebGLRenderer({canvas:$('c'),antialias:!COARSE,powerPreference:'default'});
renderer.setPixelRatio(pixelRatio());
const scene=new THREE.Scene();scene.background=new THREE.Color(0x090e1b);scene.fog=new THREE.Fog(0x090e1b,1,16);
const camera=new THREE.PerspectiveCamera(70,1,.1,2000);camera.rotation.order='YXZ';
scene.add(new THREE.HemisphereLight(0xffd9a0,0x2a1608,.5));
const plight=new THREE.PointLight(0xff9a3c,1.5,16,1);scene.add(plight);
const wallMat=new THREE.MeshLambertMaterial({map:stoneT}),floorMat=new THREE.MeshLambertMaterial({map:floorT});
const markMat=new THREE.MeshBasicMaterial({map:handT,transparent:true,depthWrite:false}),markGeo=new THREE.PlaneGeometry(.55,.55);
// Flat heading arrow for Eagle Sight only. Local forward is negative Z,
// matching movement; the handheld snapshot retains a position dot only.
const headingShape=new THREE.Shape();headingShape.moveTo(0,1);headingShape.lineTo(.6,-.65);headingShape.lineTo(0,-.32);headingShape.lineTo(-.6,-.65);headingShape.closePath();
const headingGeo=new THREE.ShapeGeometry(headingShape);headingGeo.rotateX(-Math.PI/2);
const marker=new THREE.Mesh(headingGeo,new THREE.MeshBasicMaterial({color:0xffd45c,side:THREE.DoubleSide,depthTest:false,depthWrite:false,fog:false}));marker.renderOrder=10;marker.visible=false;scene.add(marker);
let needsRender=true;
function resize(){needsRender=true;renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

// ---- seeded night sky: one persistent draw, no lights or downloaded textures
const STAR_COUNT=COARSE?480:800,starGeo=new THREE.BufferGeometry();
const starPositions=new Float32Array(STAR_COUNT*3),starColors=new Float32Array(STAR_COUNT*3),starSizes=new Float32Array(STAR_COUNT),starPhases=new Float32Array(STAR_COUNT);
const starRandom=mul(hash('templo-night-sky-v1'));
for(let i=0;i<STAR_COUNT;i++){
  const azimuth=starRandom()*Math.PI*2,y=.035+starRandom()*.965,ring=Math.sqrt(1-y*y),j=i*3;
  starPositions[j]=Math.cos(azimuth)*ring*900;starPositions[j+1]=y*900;starPositions[j+2]=Math.sin(azimuth)*ring*900;
  const warm=starRandom()<.2;starColors[j]=warm?1:.65;starColors[j+1]=warm?.86:.8;starColors[j+2]=warm?.66:1;
  starSizes[i]=1+starRandom()*1.6;starPhases[i]=starRandom()*Math.PI*2;
}
starGeo.setAttribute('position',new THREE.BufferAttribute(starPositions,3));starGeo.setAttribute('color',new THREE.BufferAttribute(starColors,3));starGeo.setAttribute('aSize',new THREE.BufferAttribute(starSizes,1));starGeo.setAttribute('aPhase',new THREE.BufferAttribute(starPhases,1));
const starUniforms={uTime:{value:0},uDpr:{value:renderer.getPixelRatio()},uMotion:{value:RM?0:1}};
const starMaterial=new THREE.ShaderMaterial({uniforms:starUniforms,transparent:true,depthWrite:false,vertexColors:true,
  vertexShader:`attribute float aSize; attribute float aPhase; uniform float uDpr; varying vec3 vTint; varying float vPhase;
    void main(){vTint=color;vPhase=aPhase;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=aSize*uDpr;}`,
  fragmentShader:`uniform float uTime; uniform float uMotion; varying vec3 vTint; varying float vPhase;
    void main(){float radius=length(gl_PointCoord-vec2(.5));float glow=1.0-smoothstep(.08,.5,radius);
      float shimmer=.78+uMotion*.10*sin(uTime*.65+vPhase);gl_FragColor=vec4(vTint,glow*shimmer);}`});
const stars=new THREE.Points(starGeo,starMaterial);stars.frustumCulled=false;scene.add(stars);
function updateSky(){stars.position.copy(camera.position);starUniforms.uDpr.value=renderer.getPixelRatio()}

// ---- particles (pooled, capped)
const PN=160,pg=new THREE.BufferGeometry(),pp=new Float32Array(PN*3).fill(-100),pc=new Float32Array(PN*3),pv=new Float32Array(PN*3),pl=new Float32Array(PN);let pi=0;
pg.setAttribute('position',new THREE.BufferAttribute(pp,3));pg.setAttribute('color',new THREE.BufferAttribute(pc,3));
const pts=new THREE.Points(pg,new THREE.PointsMaterial({size:.16,vertexColors:true,transparent:true,depthWrite:false}));pts.frustumCulled=false;scene.add(pts);
function burst(x,y,z,col,n){n=RM?n>>1:n;const c=new THREE.Color(col);for(let k=0;k<n;k++){const i=pi++%PN,j=i*3;pp[j]=x;pp[j+1]=y;pp[j+2]=z;pv[j]=(Math.random()-.5)*3;pv[j+1]=Math.random()*2.5;pv[j+2]=(Math.random()-.5)*3;pc[j]=c.r;pc[j+1]=c.g;pc[j+2]=c.b;pl[i]=.8}pg.attributes.color.needsUpdate=true}
function stepP(dt){let changed=false;for(let i=0;i<PN;i++)if(pl[i]>0){changed=true;const j=i*3;pl[i]-=dt;pv[j+1]-=6*dt;pp[j]+=pv[j]*dt;pp[j+1]+=pv[j+1]*dt;pp[j+2]+=pv[j+2]*dt;if(pl[i]<=0||pp[j+1]<0)pl[i]=0,pp[j+1]=-100}if(changed)pg.attributes.position.needsUpdate=true}

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
function setMute(v){muted=v;if(mg)mg.gain.value=v?0:.8;$('mute').setAttribute('aria-label',v?'Unmute sound':'Mute sound');$('mute').textContent=v?'🔇':'🔊';if(bgm)bgm.muted=v}
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

// Shared assets: one geometry/material per pickup type and hint trail.
const pickupGeo=new THREE.OctahedronGeometry(.4);
const pickupMats=Object.fromEntries(Object.entries(BUFFS).map(([key,value])=>[key,new THREE.MeshBasicMaterial({color:value[1]})]));
const hintGeo=new THREE.ConeGeometry(.14,.5,5),hintMat=new THREE.MeshBasicMaterial({color:0x2fe0b0});
const sharedGeometries=new Set([markGeo,pickupGeo,hintGeo]);
const sharedMaterials=new Set([wallMat,floorMat,markMat,hintMat,...Object.values(pickupMats)]);
function disposeWorld(group){const geometries=new Set(),materials=new Set();group.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!sharedGeometries.has(o.geometry))geometries.add(o.geometry);if(o.material&&!sharedMaterials.has(o.material))materials.add(o.material)});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose())}

// A static memory of the last Eagle Sight check, never a live radar.
let mapAge=Infinity,mapStowed=false,mapPending=false;
const MAP_LIFE=24,mapCanvas=$('mapCanvas'),mapContext=mapCanvas.getContext('2d');
function captureMap(){
  if(!prefs.mapMemory)return;
  const c=mapContext,w=mapCanvas.width,h=mapCanvas.height,scale=Math.min((w-12)/GW,(h-12)/GH),ox=(w-GW*scale)/2,oz=(h-GH*scale)/2;
  c.clearRect(0,0,w,h);
  c.fillStyle='#624425';for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(grid[z][x])c.fillRect(ox+x*scale,oz+z*scale,scale+.2,scale+.2);
  const dot=(x,z,color)=>{c.fillStyle=color;c.beginPath();c.arc(ox+(x+.5)*scale,oz+(z+.5)*scale,Math.max(2,scale*.7),0,Math.PI*2);c.fill()};
  dot(ex[0],ex[1],'#087b60');dot(P.x/S,P.z/S,'#bd650e');
  mapAge=0;mapStowed=false;updateMap(0);
}
function updateMap(dt){
  syncViewUI();
  const firstPerson=inFirstPerson();
  if(mapPending&&firstPerson&&state==='play'&&!paused){
    mapPending=false;captureMap();return;
  }
  if(firstPerson&&!paused)mapAge+=dt;
  const visible=firstPerson&&prefs.mapMemory&&!mapStowed&&mapAge<MAP_LIFE&&state==='play';
  $('mapMemory').hidden=!visible;
  if(visible)mapCanvas.style.opacity=String(Math.max(0,1-mapAge/MAP_LIFE));
}
function toggleMap(){
  if(mapPending){toast('Your held map appears after Eagle Sight');return}
  if(!prefs.mapMemory){toast('Enable the held map in settings first');return}
  if(mapAge>=MAP_LIFE){toast('Use Eagle Sight (B) to refresh your map');return}
  mapStowed=!mapStowed;updateMap(0);
}
function eagleSight(){resetInput();P.birdT=5;mapPending=true;updateMap(0)}
function syncSettings(){
  document.querySelectorAll('[data-pref]').forEach(el=>{const key=el.dataset.pref;if(el.type==='checkbox')el.checked=key==='cameraMotion'?smoothCamera():prefs[key];else el.value=prefs[key]});
  document.querySelectorAll('[data-motion-note]').forEach(el=>{el.textContent=smoothCamera()?'On · a smooth descent and return.':'Off · switch views instantly.'});
}
syncSettings();
document.querySelectorAll('[data-pref]').forEach(el=>el.addEventListener('change',()=>{
  prefs[el.dataset.pref]=el.dataset.pref==='cameraMotion'?(el.checked?'smooth':'instant'):el.type==='checkbox'?el.checked:el.value;
  try{localStorage.setItem('md:settings',JSON.stringify(prefs))}catch(e){}
  syncSettings();renderer.setPixelRatio(pixelRatio());resize();updateMap(0);
}));
$('settings').onclick=()=>{if(state==='play')setPause(true)};
$('openSettings').onclick=()=>{$('preSettings').showModal();$('preSettings').querySelector('input').focus()};
$('dismissSettings').onclick=()=>$('preSettings').close();
$('preSettings').addEventListener('close',()=>$('openSettings').focus());
$('preSettings').addEventListener('click',event=>{
  if(event.target!==$('preSettings'))return;
  const box=$('preSettings').getBoundingClientRect();
  if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)$('preSettings').close();
});


// ---- level build
function curSize(){const g=G.grow?G.level-1:0;return[Math.min(MAXC,G.w+g),Math.min(MAXC,G.h+g)]}
function topH(){const v=camera.fov*Math.PI/360,h=Math.atan(Math.tan(v)*camera.aspect);return Math.max(GH*S/2/Math.tan(v),GW*S/2/Math.tan(h))*1.08}
function build(){
  needsRender=true;[cw,ch]=curSize();
  const r=mul(hash(G.seed+':'+G.level+':'+cw+'x'+ch));
  grid=gen(cw,ch,r);GW=2*cw+1;GH=2*ch+1;
  const d=bfs(grid,1,1);let best=0;ex=[1,1];
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(d[z][x]>best){best=d[z][x];ex=[x,z]}
  exitD=bfs(grid,ex[0],ex[1]);
  if(world){scene.remove(world);disposeWorld(world)}
  world=new THREE.Group();scene.add(world);
  let cnt=0;for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(grid[z][x])cnt++;
  walls=new THREE.InstancedMesh(new THREE.BoxGeometry(S,WH,S),wallMat,cnt);idxMap=new Map();
  const m=new THREE.Matrix4();let i=0;
  for(let z=0;z<GH;z++)for(let x=0;x<GW;x++)if(grid[z][x]){m.setPosition(x*S,WH/2,z*S);walls.setMatrixAt(i,m);idxMap.set(z*GW+x,i++)}
  world.add(walls);
  const cx=(GW-1)*S/2,cz=(GH-1)*S/2;floorT.repeat.set(GW,GH);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(GW*S,GH*S),floorMat);fl.rotation.x=-Math.PI/2;fl.position.set(cx,0,cz);world.add(fl);
  // Open-air ruins: the sky is visible above the corridor walls.
  const pil=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,10,16),new THREE.MeshBasicMaterial({color:0x5fffc8,transparent:true,opacity:.5}));pil.position.set(ex[0]*S,5,ex[1]*S);world.add(pil);
  exitRing=new THREE.Mesh(new THREE.TorusGeometry(.9,.1,8,24),new THREE.MeshBasicMaterial({color:0xe0a82e}));exitRing.position.set(ex[0]*S,1.2,ex[1]*S);world.add(exitRing);
  pickups=[];
  if(G.mode==='classic'){
    const types=Object.keys(BUFFS),want=Math.round(cw*ch/9);
    for(let k=0;k<want*10&&pickups.length<want;k++){
      const x=1+2*Math.floor(r()*cw),z=1+2*Math.floor(r()*ch);
      if((x===1&&z===1)||(x===ex[0]&&z===ex[1])||pickups.some(p=>p.tx===x&&p.tz===z))continue;
      const t=types[Math.floor(r()*types.length)];
      const mesh=new THREE.Mesh(pickupGeo,pickupMats[t]);
      mesh.position.set(x*S,.9,z*S);world.add(mesh);pickups.push({mesh,t,tx:x,tz:z,got:false});
    }
  }
  marks=[];markInstances=new THREE.InstancedMesh(markGeo,markMat,700);markInstances.count=0;markInstances.frustumCulled=false;world.add(markInstances);lastMark=null;hintG=new THREE.Group();world.add(hintG);
}
function start(){
  build();
  P.x=S;P.z=S;P.y=0;P.vy=0;P.ghost=0;P.birdT=0;P.birdLeft=3;P.hintT=0;P.trailT=0;P.pitch=0;P.chalk=G.mode==='classic'?6:Infinity;
  P.yaw=grid[1][2]===0?-Math.PI/2:Math.PI;
  P.intro=true;P.hold=smoothCamera()?1.2:.6;blend=1;T=0;inv=[];sel=0;ghostOn=false;wallMat.opacity=1;wallMat.transparent=false;wallMat.needsUpdate=true;
  state='play';paused=false;cursorFree=false;syncCursorHint();needsRender=true;mapAge=Infinity;mapPending=false;updateMap(0);$('settings').hidden=false;pl.fill(0);pp.fill(-100);pg.attributes.position.needsUpdate=true;
  $('hud').style.display='flex';$('mute').style.display='block';$('inv').style.display=G.mode==='classic'?'flex':'none';
  initGuard();hud();toast('Level '+G.level+'  '+cw+' x '+ch+(G.mode==='purist'?' (Purist)':''));
  // Compile and upload the level before timing the cinematic, not mid-descent.
  renderer.compile(scene,camera);draw();clock.getDelta();
}

// ---- HUD
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),1600)}
function hud(){
  $('pips').textContent=(G.mode==='purist'?'🦅 '+'●'.repeat(P.birdLeft)+'○'.repeat(3-P.birdLeft)+'  ':'')+'✋ '+(P.chalk===Infinity?'∞':P.chalk);
  const e=$('inv');e.innerHTML='';
  inv.forEach((t,i)=>{const d=document.createElement('button');d.type='button';d.setAttribute('aria-label',BUFFS[t][2]);d.setAttribute('aria-pressed',String(i===sel));d.className='slot'+(i===sel?' sel':'');d.innerHTML='<i>'+(i+1)+'</i>'+BUFFS[t][0];d.title=BUFFS[t][2];
    d.onclick=ev=>{ev.stopPropagation();if(sel===i)act('use');else{sel=i;hud()}};e.appendChild(d)});
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
      if(tx>0&&tz>0&&tx<GW-1&&tz<GH-1){grid[tz][tx]=0;exitD=bfs(grid,ex[0],ex[1]);walls.setMatrixAt(idxMap.get(tz*GW+tx),new THREE.Matrix4().makeScale(0,0,0));walls.instanceMatrix.needsUpdate=true;
        burst(tx*S,1.1,tz*S,0xc9a46a,32);sfx('brk');toast('Stone shatters');rumble();return true}
      return false;
    }
  }
  return false;
}
function showHint(){
  while(hintG.children.length){const old=hintG.children[0];if(old.isInstancedMesh)old.dispose();hintG.remove(old)}
  let x=Math.round(P.x/S),z=Math.round(P.z/S);
  const geo=hintGeo,mat=hintMat;
  if(!exitD[z]||exitD[z][x]<0)return false;
  const path=[];
  while(exitD[z][x]>0){
    const dd=exitD[z][x];
    for(const[dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){if(exitD[z+dz]&&exitD[z+dz][x+dx]===dd-1){x+=dx;z+=dz;break}}
    path.push([x*S,z*S]);
  }
  if(path.length){const trail=new THREE.InstancedMesh(geo,mat,path.length),matrix=new THREE.Matrix4();path.forEach(([x,z],i)=>{matrix.makeTranslation(x,.5,z);trail.setMatrixAt(i,matrix)});trail.frustumCulled=false;hintG.add(trail)}
  P.hintT=6;hintG.visible=true;return true;
}
function apply(t){
  if(t==='ghost'){P.ghost=6;return true}
  if(t==='breaker'){if(breakWall())return true;toast('No wall in front of you');return false}
  if(t==='bird'){if(P.birdT>0)return false;eagleSight();return true}
  if(t==='jump'){if(P.y>.01)return false;P.vy=9;return true}
  if(t==='hint')return showHint();
  if(t==='trail'){P.trailT=30;return true}
  return false;
}
function useType(t){const i=inv.indexOf(t);if(i<0)return;if(apply(t)){inv.splice(i,1);sel=Math.max(0,Math.min(sel,inv.length-1));sfx(t==='jump'?'jump':t==='bird'?'bird':'use');hud()}}
function dropMark(free){
  if(marks.length>=700)return;
  if(!free){if(P.chalk<=0){toast('Out of handprints');return}P.chalk--;hud()}
  const m=new THREE.Object3D();m.rotation.set(-Math.PI/2,0,Math.random()*6.28);m.position.set(P.x,.03,P.z);m.updateMatrix();markInstances.setMatrixAt(marks.length,m.matrix);marks.push([P.x,P.z]);markInstances.count=marks.length;markInstances.instanceMatrix.needsUpdate=true;lastMark=[P.x,P.z];sfx('mark');
}
function act(a){
  if(state!=='play')return;
  if(a==='pause'){setPause(!paused);return}
  if(paused)return;
  if(a==='map'){toggleMap();return}
  if(a==='resetLook'){if(!inFirstPerson())return;P.pitch=0;toast('View centered');return}
  if(P.intro&&P.hold>0){P.hold=0;return}
  if(!inFirstPerson())return;
  if(a==='use'){const t=inv[sel];if(t){apply(t)&&(inv.splice(sel,1),sel=Math.max(0,Math.min(sel,inv.length-1)),sfx(t==='jump'?'jump':t==='bird'?'bird':'use'),hud())}}
  else if(a==='next'){if(inv.length){sel=(sel+1)%inv.length;hud()}}
  else if(a==='prev'){if(inv.length){sel=(sel+inv.length-1)%inv.length;hud()}}
  else if(a==='bird'){
    if(G.mode==='purist'){if(P.birdLeft>0&&P.birdT<=0){P.birdLeft--;eagleSight();sfx('bird');hud()}}
    else useType('bird');
  }
  else if(a==='jump')useType('jump');
  else if(a==='crumb')dropMark(false);
}
function resetInput(){for(const k in keys)keys[k]=0;joy.mx=joy.mz=0;jid=lid=null;$('joy').style.opacity=0;$('knob').style.transform=''}
function setPause(v){paused=v;syncCursorHint();needsRender=true;resetInput();if(bgm){if(v)bgm.pause();else bgm.play().catch(()=>{})}if(AC){if(v)AC.suspend();else AC.resume();}$('pause').classList.toggle('hide',!v);if(v&&document.pointerLockElement)document.exitPointerLock()}

// ---- input
const KM={KeyE:'use',KeyQ:'prev',KeyB:'bird',KeyM:'map',KeyR:'resetLook',KeyF:'crumb',Space:'jump',KeyP:'pause',Escape:'pause'};
let cursorFree=false,hadPointerLock=false;
function syncCursorHint(){$('cursorHint').hidden=!(cursorFree&&state==='play'&&!paused)}
function captureMouse(){
  if(!cv.requestPointerLock){toast('Mouse capture unavailable; use arrow keys to look');return}
  try{const pending=cv.requestPointerLock();if(pending&&pending.catch)pending.catch(()=>toast('Click the game to capture the mouse'))}catch(e){toast('Click the game to capture the mouse')}
}
function toggleCursor(){
  if(state!=='play'||paused)return;
  resetInput();
  if(document.pointerLockElement===cv){cursorFree=true;document.exitPointerLock();syncCursorHint()}
  else captureMouse();
}
let helpOpen=false,helpWasPaused=false,helpFocus=null;
function toggleHelp(){
  if(!helpOpen){
    helpWasPaused=paused;helpFocus=document.activeElement;helpOpen=true;
    if(state==='play'&&!paused)setPause(true);
    $('help').classList.remove('hide');$('closeHelp').textContent=state==='play'?(helpWasPaused?'Back to settings':'Back to game'):'Back to expedition';$('closeHelp').focus();
  }else{
    helpOpen=false;$('help').classList.add('hide');
    if(helpFocus&&helpFocus.isConnected)helpFocus.focus();
    if(state==='play'&&!helpWasPaused){setPause(false);if(!isTouch&&!cursorFree)captureMouse()}
  }
}
$('closeHelp').onclick=toggleHelp;
document.querySelectorAll('[data-open-help]').forEach(button=>button.onclick=toggleHelp);
addEventListener('keydown',e=>{
  if($('preSettings').open){if(e.code==='F1')e.preventDefault();return}
  if(e.code==='F1'){e.preventDefault();if(!e.repeat)toggleHelp();return}
  if(helpOpen){
    if(e.code==='Escape'){e.preventDefault();if(!e.repeat)toggleHelp()}
    else if(e.code==='Tab'){e.preventDefault();$('closeHelp').focus()}
    return;
  }
  if(e.code==='Tab'&&paused&&state==='play'){
    const items=Array.from($('pause').querySelectorAll('button,input,select')).filter(el=>!el.disabled&&el.getClientRects().length);
    const first=items[0],last=items[items.length-1];
    if(e.shiftKey&&(!items.includes(document.activeElement)||document.activeElement===first)){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&(!items.includes(document.activeElement)||document.activeElement===last)){e.preventDefault();first.focus()}
    return;
  }
  if(e.isComposing||e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(e.code==='AltLeft'&&!e.ctrlKey&&!e.metaKey){
    if(state==='play'&&!paused){e.preventDefault();if(!e.repeat)toggleCursor()}return;
  }
  // Keep browser shortcuts and focused-button keyboard activation intact.
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.target.closest('button')&&(e.code==='Space'||e.code==='Enter'))return;
  if(!e.repeat&&!keys[e.code]){
    if(KM[e.code])act(KM[e.code]);
    if(e.code==='KeyN')setMute(!muted);
    if(state==='play'&&!paused&&inFirstPerson()&&/^Digit[1-5]$/.test(e.code)&&inv[+e.code[5]-1]){sel=+e.code[5]-1;hud()}
  }
  if(state==='play'&&!paused)keys[e.code]=1;
  if(state==='play'&&(KM[e.code]||e.code.startsWith('Arrow')))e.preventDefault();
});
addEventListener('keyup',e=>{keys[e.code]=0;if(e.code==='AltLeft'&&state==='play')e.preventDefault()});
let isTouch=COARSE||navigator.maxTouchPoints>0;
function showTouch(){isTouch=true;$('touch').style.display='block'}
if(isTouch)showTouch();
const cv=$('c');let jid=null,jo=null,lid=null,lp=null;
function look(dx,dy){if(!inFirstPerson()||paused||state!=='play')return;P.yaw-=dx;P.pitch=Math.max(-1.4,Math.min(1.4,P.pitch-dy))}
cv.addEventListener('pointerdown',e=>{
  if(state!=='play'||paused)return;
  if(e.pointerType==='touch'){
    showTouch();
    if(P.intro){act('skip');return}
    if(!inFirstPerson())return;
    if(e.clientX<innerWidth/2&&jid===null){jid=e.pointerId;jo=[e.clientX,e.clientY];const j=$('joy');j.style.left=jo[0]+'px';j.style.top=jo[1]+'px';j.style.opacity=.8}
    else if(lid===null){lid=e.pointerId;lp=[e.clientX,e.clientY]}
    cv.setPointerCapture(e.pointerId);
  }else{if(P.intro)act('skip');if(!document.pointerLockElement)captureMouse()}
});
cv.addEventListener('pointermove',e=>{
  if(e.pointerType!=='touch'||paused||state!=='play'||!inFirstPerson())return;
  if(e.pointerId===jid){let dx=e.clientX-jo[0],dy=e.clientY-jo[1];const l=Math.hypot(dx,dy);if(l>50){dx*=50/l;dy*=50/l}
    joy.mx=dx/50;joy.mz=-dy/50;$('knob').style.transform='translate('+dx+'px,'+dy+'px)'}
  else if(e.pointerId===lid){look((e.clientX-lp[0])*.006,(e.clientY-lp[1])*.006);lp=[e.clientX,e.clientY]}
});
const endT=e=>{if(e.pointerId===jid){jid=null;joy.mx=joy.mz=0;$('joy').style.opacity=0;$('knob').style.transform=''}if(e.pointerId===lid)lid=null};
cv.addEventListener('lostpointercapture',endT);
cv.addEventListener('pointerup',endT);cv.addEventListener('pointercancel',endT);
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===cv)look(e.movementX*.0022,e.movementY*.0022)});
document.addEventListener('pointerlockchange',()=>{
  if(document.pointerLockElement===cv){hadPointerLock=true;cursorFree=false}
  else if(hadPointerLock){hadPointerLock=false;if(!cursorFree&&state==='play'&&!paused)setPause(true)}
  syncCursorHint();
});
addEventListener('blur',()=>{resetInput();if(state==='play'&&!paused)setPause(true)});
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
function setOn(sel,el){document.querySelectorAll(sel).forEach(x=>{x.classList.remove('on');x.setAttribute('aria-pressed','false')});el.classList.add('on');el.setAttribute('aria-pressed','true')}
$('modes').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{setOn('#modes .opt',b);G.mode=b.dataset.m;$('autoRow').style.display=G.mode==='purist'?'flex':'none'});
$('sizes').querySelectorAll('.opt').forEach(b=>b.onclick=()=>{setOn('#sizes .opt',b);$('cust').style.display=b.dataset.s==='0'?'flex':'none'});
function readSize(){const b=document.querySelector('#sizes .opt.on'),s=+b.dataset.s;if(s){G.w=G.h=s}else{G.w=clampC($('cw').value);G.h=clampC($('ch').value);$('cw').value=G.w;$('ch').value=G.h}G.w=Math.min(G.w,MAXC);G.h=Math.min(G.h,MAXC)}
function begin(){
  readSize();G.seed=$('seed').value.trim()||Math.random().toString(36).slice(2,8);G.level=1;G.auto=$('auto').checked;G.guard=$('guard').checked;G.grow=$('grow').checked;
  $('menu').classList.add('hide');startAudio();playBGM();start();
  if(!isTouch)captureMouse();
}
$('start').onclick=begin;
$('next').onclick=()=>{G.level++;$('win').classList.add('hide');swapBGM();start();if(!isTouch)captureMouse()};
$('toMenu').onclick=()=>{$('win').classList.add('hide');$('menu').classList.remove('hide');state='menu';cursorFree=false;syncCursorHint();needsRender=true;updateMap(0);$('settings').hidden=true;stopBGM();$('hud').style.display=$('inv').style.display=$('mute').style.display='none'};
$('resume').onclick=()=>{setPause(false);if(!isTouch)captureMouse()};
// URL params: ?seed=abc&size=12x8&mode=purist&guard=0
(function(){const q=new URLSearchParams(location.search);
  if(q.get('seed'))$('seed').value=q.get('seed').slice(0,20);
  const m=(q.get('size')||'').match(/^(\d+)x(\d+)$/i);if(m){$('cw').value=clampC(m[1]);$('ch').value=clampC(m[2]);const c=document.querySelector('#sizes [data-s="0"]');setOn('#sizes .opt',c);$('cust').style.display='flex'}
  if(q.get('mode')==='purist'){const b=document.querySelector('[data-m="purist"]');setOn('#modes .opt',b);G.mode='purist';$('autoRow').style.display='flex'}
  if(q.get('guard')==='0')$('guard').checked=false;
  if(q.get('grow')==='1')$('grow').checked=true;
})();

// Optional local camera diagnostics. No collection unless ?debugCamera=1;
// no network upload and no unrelated local-storage values are included.
const cameraDebug=new URLSearchParams(location.search).get('debugCamera')==='1';
const cameraFrames=[],cameraEvents=[];
function cameraEvent(type){if(cameraDebug&&cameraEvents.length<100)cameraEvents.push({type,at:performance.now(),paused,hidden:document.hidden,locked:document.pointerLockElement===cv})}
function recordCameraFrame(rawDt){
  if(!cameraDebug||cameraFrames.length>=2400)return;
  cameraFrames.push({at:performance.now(),rawDt,blend,intro:P.intro,hold:P.hold,bird:P.birdT,paused,smooth:smoothCamera(),position:camera.position.toArray(),rotation:[camera.rotation.x,camera.rotation.y,camera.rotation.z]});
}
if(cameraDebug){
  window.mazeCameraDiagnostics={snapshot:()=>({build:BUILD_ID,entry:location.pathname.split('/').pop()||'index.html',userAgent:navigator.userAgent,reducedMotion:RM,cameraPreference:prefs.cameraMotion,effectiveSmooth:smoothCamera(),pixelRatio:renderer.getPixelRatio(),frames:cameraFrames.slice(),events:cameraEvents.slice()})};
  document.addEventListener('visibilitychange',()=>cameraEvent('visibility'));
  document.addEventListener('pointerlockchange',()=>cameraEvent('pointerlock'));
  addEventListener('blur',()=>cameraEvent('blur'));
  addEventListener('focus',()=>cameraEvent('focus'));
}
$('buildInfo').textContent='Build '+BUILD_ID;

// ---- loop
// Quintic easing starts and ends with zero velocity and acceleration.
const ease=b=>b*b*b*(b*(b*6-15)+10);
const clock=new THREE.Clock();
function frame(){
  requestAnimationFrame(frame);
  const rawDt=clock.getDelta(),dt=Math.min(rawDt,.05);
  if(document.hidden)return;
  pollPad();
  const active=state==='play'&&!paused;
  if(active){update(dt);stepP(dt);updateMap(dt)}
  if(!active&&!needsRender)return;
  needsRender=false;
  if(state!=='menu'){draw();recordCameraFrame(rawDt)}
  else{camera.position.set((GW-1)*S/2,topH(),(GH-1)*S/2);camera.rotation.set(-Math.PI/2,0,0);updateSky();renderer.render(scene,camera)}
}
function update(dt){
  T+=dt;starUniforms.uTime.value+=dt;
  if(P.intro){if(P.hold>0)P.hold=Math.max(0,P.hold-dt);else if(blend===0)P.intro=false}
  if(inFirstPerson()){
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
  if(!RM){exitRing.rotation.y+=dt*1.5;exitRing.position.y=1.2+Math.sin(T*2)*.15;exitRing.scale.setScalar(1+Math.sin(T*2)*.045)}
  const target=(P.birdT>0||(P.intro&&P.hold>0))?1:0;
  // At the target, hold still. Treating equality as descent made the
  // overview alternate between 1 and slightly below 1 every other frame.
  blend=!smoothCamera()?target:target>blend?Math.min(1,blend+dt*.9):target<blend?Math.max(0,blend-dt*(P.intro?1/3.2:.45)):blend;
  for(const p of pickups){
    if(p.got)continue;const distanceSq=(P.x-p.tx*S)**2+(P.z-p.tz*S)**2;
    p.mesh.visible=blend>.01||distanceSq<18*18;
    if(p.mesh.visible&&!RM){p.mesh.rotation.y+=dt*2;p.mesh.position.y=.9+Math.sin(T*3+p.tx)*.12;p.mesh.rotation.z=Math.sin(T*1.5+p.tz)*.12}
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
  state='win';cursorFree=false;syncCursorHint();needsRender=true;updateMap(0);$('settings').hidden=true;resetInput();if(document.pointerLockElement)document.exitPointerLock();sfx('conch');
  const key='md:'+G.mode+':'+G.seed+':'+G.level+':'+cw+'x'+ch;let best=null;
  try{best=parseFloat(localStorage.getItem(key));if(isNaN(best)||T<best){best=T;localStorage.setItem(key,T.toFixed(2))}}catch(e){best=T}
  $('winTxt').textContent='Time '+T.toFixed(1)+'s. Best on this '+cw+'x'+ch+' temple: '+best.toFixed(1)+'s.'+(G.mode==='purist'?' Purist finish!':'');
  $('win').classList.remove('hide');
}
function draw(){
  syncViewUI();
  const k=ease(blend),cx=(GW-1)*S/2,cz=(GH-1)*S/2,H=topH(),ey=1+P.y;
  // Arrive over the start tile before descending between the walls.
  const travel=ease(Math.max(0,(blend-.18)/.82));
  camera.position.set(P.x+(cx-P.x)*travel,ey+(H-ey)*k,P.z+(cz-P.z)*travel);
  const ya=((P.yaw+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
  camera.rotation.set(P.pitch*(1-k)-Math.PI/2*k,ya*(1-k),0);
  plight.position.set(P.x,2,P.z);if(!RM)camera.position.x+=(Math.random()-.5)*scare*.25;
  // Slow, continuous torch warmth; guardian tension never strobes the light.
  plight.intensity=RM||prefs.steadyLight?1.5:1.5+Math.sin(T*2.3)*.055+Math.sin(T*4.1)*.025;
  $('vig').style.opacity=G.guard&&state==='play'?Math.max(stare*.55,RM?0:scare*.9):0;
  scene.fog.far=16+4000*k;
  marker.visible=state==='play'&&!P.intro&&blend>.15;marker.rotation.y=P.yaw;marker.position.set(P.x,WH+.4,P.z);marker.scale.setScalar(1+k*Math.max(GW,GH)*.08);
  updateSky();renderer.render(scene,camera);
}
// backdrop temple behind the menu
G.seed='menu';G.level=2;G.w=G.h=12;build();G.level=1;G.w=G.h=15;
frame();

// ---- Ember particles (menu/win ambiance) ----
(function(){
  if(RM)return;
  let eC=0;const MX=COARSE?10:24;
  function spawn(){
    if(eC>=MX||document.hidden||(state!=='menu'&&state!=='win'))return;
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
