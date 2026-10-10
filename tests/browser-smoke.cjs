// Run with a locally installed Playwright (or NODE_PATH pointing to its package folder).
// BROWSER_CHANNEL=msedge uses installed Edge; otherwise Playwright Chromium is used.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
async function openSettings(page){
  if(!await page.locator('#preSettings').evaluate(dialog=>dialog.open))await page.click('#openSettings');
}
async function startGame(page){
  if(await page.locator('#preSettings').evaluate(dialog=>dialog.open))await page.click('#closeSettings');
  await page.click('#start');
}
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error'&&/shader|webgl/i.test(m.text()))errors.push(m.text())});
    const url=pathToFileURL(path.resolve(__dirname,'../index.html')).href;
    await page.goto(url+'?seed=mobile-test&size=15x15&guard=0');
    await openSettings(page);
    assert.equal(await page.locator('#preSettings').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.pref),'cameraMotion');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#preSettings').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'openSettings');
    await openSettings(page);
    await page.keyboard.press('F1');
    assert.equal(await page.locator('#help').isVisible(),false);
    await startGame(page);
    const intro=await page.evaluate(()=>{
      draw();const before=camera.position.clone();act('skip');draw();
      const skipJump=camera.position.distanceTo(before);let descending=true,locked=true,safeLanding=true,previousY=camera.position.y,frames=0;
      while(P.intro&&frames++<300){
        const wasLanding=blend===0;keys.KeyW=1;const x=P.x,z=P.z;update(1/60);draw();
        if(!wasLanding)locked=locked&&P.x===x&&P.z===z;
        descending=descending&&camera.position.y<=previousY+.000001;previousY=camera.position.y;
        if(P.intro&&camera.position.y<WH) safeLanding=safeLanding&&Math.hypot(camera.position.x-P.x,camera.position.z-P.z)<.5;
      }
      resetInput();const result={skipJump,descending,locked,safeLanding,finished:!P.intro,stars:starGeo.attributes.position.count};start();return result;
    });
    assert.equal(intro.skipJump,0);assert.equal(intro.descending,true);assert.equal(intro.locked,true);assert.equal(intro.safeLanding,true);assert.equal(intro.finished,true);assert.equal(intro.stars,480);
    console.log('PASS: smooth intro, no skip teleport, controls locked until landing, safe corridor entry, bounded mobile stars.');
    const metrics=await page.evaluate(async()=>{
      P.intro=false;blend=0;P.hold=0;
      const frames=[],lights=[];let prev=performance.now();
      for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-prev);prev=now;lights.push(plight.intensity)}
      frames.sort((a,b)=>a-b);
      return {dpr:renderer.getPixelRatio(),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,median:frames[60],p95:frames[114],lightMin:Math.min(...lights),lightMax:Math.max(...lights),geometries:renderer.info.memory.geometries};
    });
    assert.equal(metrics.dpr,1.25);assert.equal(metrics.lightMin,1.5);assert.equal(metrics.lightMax,1.5);
    console.log('Mobile emulation, classic, seed mobile-test:',metrics);
    assert.deepEqual(await page.evaluate(()=>{inv=['bird','bird'];act('bird');act('bird');return [inv.length,P.birdT>0,$('mapMemory').hidden,mapPending]}),[1,true,true,true]);
    assert.equal(await page.evaluate(()=>{let hidden=true;for(let i=0;i<160&&(P.birdT>0||blend>0||mapPending);i++){update(.05);updateMap(.05);if(P.birdT>0||blend>0)hidden=hidden&&$('mapMemory').hidden}return hidden&&!$('mapMemory').hidden&&mapAge===0}),true);
    assert.equal(await page.evaluate(()=>{const snapshot=mapCanvas.toDataURL();blend=1;P.yaw=Math.PI/2;draw();const overhead=marker.visible&&marker.rotation.y===P.yaw;blend=0;draw();return overhead&&!marker.visible&&snapshot===mapCanvas.toDataURL()}),true);
    assert.equal(await page.evaluate(()=>{const before=mapCanvas.toDataURL();P.x+=2;updateMap(12);return before===mapCanvas.toDataURL()&&+mapCanvas.style.opacity<.51}),true);
    await page.click('#settings');
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(()=>paused),true);
    const frozen=await page.evaluate(()=>[T,mapAge,renderer.info.render.frame]);
    await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(()=>[T,mapAge,renderer.info.render.frame]),frozen);
    await page.locator('#pause [data-pref="mapMemory"]').uncheck();
    assert.equal(await page.locator('#mapMemory').isVisible(),false);
    await page.locator('#pause [data-pref="quality"]').selectOption('battery');
    assert.equal(await page.evaluate(()=>renderer.getPixelRatio()),1);
    await page.reload();
    assert.equal(await page.locator('#menu [data-pref="mapMemory"]').isChecked(),false);
    assert.equal(await page.locator('#menu [data-pref="quality"]').inputValue(),'battery');
    await openSettings(page);
    await page.locator('#menu [data-pref="mapMemory"]').check();
    await openSettings(page);
    await page.locator('#menu [data-pref="quality"]').selectOption('auto');
    await page.goto(url+'?seed=mobile-test&size=15x15&guard=0&mode=purist');
    await startGame(page);
    assert.deepEqual(await page.evaluate(()=>{P.intro=false;blend=0;P.hold=0;act('bird');act('bird');return [P.birdLeft,$('mapMemory').hidden,mapPending]}),[2,true,true]);
    assert.equal(await page.evaluate(()=>{P.birdT=0;blend=.5;updateMap(10);const hidden=$('mapMemory').hidden;blend=0;updateMap(0);return hidden&&!$('mapMemory').hidden&&mapAge===0}),true);
    assert.equal(await page.evaluate(()=>{updateMap(25);return $('mapMemory').hidden}),true);
    assert.deepEqual(await page.evaluate(()=>{P.birdT=0;act('bird');return [P.birdLeft,mapPending,$('mapMemory').hidden]}),[1,true,true]);
    await page.evaluate(()=>{P.birdT=0;blend=0;updateMap(0)});
    assert.equal(await page.evaluate(()=>{P.birdT=0;P.birdLeft=0;mapAge=25;updateMap(0);act('bird');return $('mapMemory').hidden}),true);
    const resources=await page.evaluate(()=>{
      G.mode='classic';G.w=G.h=15;
      const counts=[];
      for(let i=0;i<8;i++){start();P.intro=false;blend=0;showHint();for(let j=0;j<30;j++)dropMark(true);draw();counts.push(renderer.info.memory.geometries)}
      return {counts,markCount:markInstances.count,hintMeshes:hintG.children.length,instancedDispose:typeof walls.dispose};
    });
    assert.equal(resources.markCount,30);assert.equal(resources.hintMeshes,1);
    assert.equal(new Set(resources.counts.slice(1)).size,1);
    console.log('Repeated-level resources:',resources);
    assert.equal(await page.evaluate(()=>{keys.KeyW=1;joy.mx=1;setPause(true);return keys.KeyW===0&&joy.mx===0}),true);
    await page.locator('#pause [data-pref="steadyLight"]').uncheck();
    assert.equal(await page.evaluate(()=>{stare=1;scare=0;let prev=null,maxStep=0;for(let i=0;i<120;i++){T=i/60;draw();if(prev!==null)maxStep=Math.max(maxStep,Math.abs(plight.intensity-prev));prev=plight.intensity}return maxStep<.005}),true);
    await page.locator('#pause [data-pref="steadyLight"]').check();
    // Narrow/landscape layouts stay inside the viewport, with a reachable resume control.
    for(const viewport of [{width:390,height:844},{width:844,height:390}]){
      await page.setViewportSize(viewport);
      await page.locator('#resume').scrollIntoViewIfNeeded();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.equal(await page.locator('#resume').isVisible(),true);
    }
    await context.close();
    // Desktop transition regression: moving the mouse across +/-PI used to
    // swing the interpolated camera almost 180 degrees in one frame.
    const pc=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'no-preference'});
    const cp=await pc.newPage();cp.on('pageerror',e=>errors.push(e.message));
    cp.on('console',m=>{if(m.type()==='error'&&/shader|webgl/i.test(m.text()))errors.push(m.text())});
    await cp.goto(url+'?seed=pc-transition&guard=0');await startGame(cp);
    assert.equal(await cp.locator('#hud').isVisible(),false);
    assert.equal(await cp.locator('#settings').isVisible(),true);
    const transition=await cp.evaluate(()=>{
      P.intro=false;P.hold=0;P.birdT=0;blend=.5;P.yaw=Math.PI-.001;draw();
      const before=camera.quaternion.clone(),x=P.x,z=P.z,yaw=P.yaw;
      look(-.004,.1);keys.KeyW=1;keys.ArrowLeft=1;draw();
      const jump=before.angleTo(camera.quaternion);update(1/60);draw();
      const inputFrozen=P.x===x&&P.z===z&&P.yaw===yaw;
      resetInput();blend=0;inv=['bird'];hud();draw();act('bird');
      const hidden=getComputedStyle($('hud')).visibility==='hidden'&&getComputedStyle($('inv')).visibility==='hidden'&&getComputedStyle($('touch')).visibility==='hidden';
      let maxStep=0,prev=camera.quaternion.clone();
      for(let i=0;i<450&&(P.birdT>0||blend>0);i++){
        look(-.004,.1);update(1/60);updateMap(1/60);draw();maxStep=Math.max(maxStep,prev.angleTo(camera.quaternion));prev.copy(camera.quaternion);
      }
      return {jump,inputFrozen,hidden,maxStep,restored:getComputedStyle($('hud')).visibility==='visible'&&getComputedStyle($('inv')).visibility==='visible'&&inFirstPerson()};
    });
    assert.ok(transition.jump<1e-6);assert.equal(transition.inputFrozen,true);assert.equal(transition.hidden,true);assert.equal(transition.restored,true);assert.ok(transition.maxStep<.2);
    console.log('PASS: desktop yaw-wrap regression, cinematic input lock, HUD restoration:',transition);
    await pc.close();
    const desktop=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});
    const dp=await desktop.newPage();dp.on('pageerror',e=>errors.push(e.message));
    await dp.goto(url+'?size=8x30&seed=tall&guard=0');await startGame(dp);
    assert.equal(await dp.evaluate(()=>{draw();return RM&&starUniforms.uMotion.value===0&&plight.intensity===1.5&&Number.isFinite(topH())}),true);
    assert.equal(await dp.evaluate(()=>{P.intro=false;P.hold=0;blend=0;eagleSight();update(.05);updateMap(.05);const hidden=$('mapMemory').hidden&&blend>0&&blend<1;P.birdT=0;blend=0;updateMap(0);return hidden&&blend===0&&!$('mapMemory').hidden&&mapAge===0}),true);
    // Keyboard shortcuts operate through real browser key events.
    await dp.evaluate(()=>{P.intro=false;P.hold=0;blend=0;captureMap()});
    const beforeMute=await dp.evaluate(()=>muted);
    await dp.keyboard.press('m');
    assert.equal(await dp.locator('#mapMemory').isVisible(),false);
    assert.equal(await dp.evaluate(()=>muted),beforeMute);
    await dp.keyboard.press('m');
    assert.equal(await dp.locator('#mapMemory').isVisible(),true);
    await dp.keyboard.press('n');assert.equal(await dp.evaluate(()=>muted),!beforeMute);
    await dp.evaluate(()=>P.pitch=.7);await dp.keyboard.press('r');assert.equal(await dp.evaluate(()=>P.pitch),0);
    await dp.waitForFunction(()=>document.pointerLockElement===document.getElementById('c'));
    await dp.keyboard.press('AltLeft');
    await dp.waitForFunction(()=>document.pointerLockElement===null);
    assert.equal(await dp.evaluate(()=>paused),false);
    assert.equal(await dp.locator('#cursorHint').isVisible(),true);
    await dp.keyboard.press('AltLeft');
    await dp.waitForFunction(()=>document.pointerLockElement===document.getElementById('c'));
    await dp.keyboard.press('F1');
    assert.equal(await dp.locator('#help').isVisible(),true);
    assert.equal(await dp.evaluate(()=>paused),true);
    const helpTime=await dp.evaluate(()=>T);await dp.waitForTimeout(80);assert.equal(await dp.evaluate(()=>T),helpTime);
    await dp.keyboard.press('Escape');
    assert.equal(await dp.locator('#help').isVisible(),false);
    assert.equal(await dp.evaluate(()=>paused),false);
    await dp.keyboard.press('p');await dp.keyboard.press('F1');await dp.keyboard.press('F1');
    assert.equal(await dp.evaluate(()=>paused),true);
    await dp.locator('#pause [data-pref="quality"]').focus();
    const savedMute=await dp.evaluate(()=>muted);await dp.keyboard.press('n');assert.equal(await dp.evaluate(()=>muted),savedMute);
    await dp.keyboard.press('F1');assert.equal(await dp.locator('#help').isVisible(),true);
    await dp.keyboard.press('Tab');assert.equal(await dp.evaluate(()=>document.activeElement.id),'closeHelp');
    await dp.keyboard.press('F1');
    // Desktop OS reduced motion can skip the entire intro. Smooth is an
    // explicit camera-only override, with other accessibility effects intact.
    await dp.locator('#pause [data-pref="cameraMotion"]').check();
    assert.equal(await dp.evaluate(()=>{start();P.hold=0;update(.05);return RM&&smoothCamera()&&blend>0&&blend<1&&starUniforms.uMotion.value===0}),true);
    await dp.reload();
    assert.equal(await dp.locator('#menu [data-pref="cameraMotion"]').isChecked(),true);
    await openSettings(dp);
    await dp.locator('#menu [data-pref="cameraMotion"]').uncheck();
    await startGame(dp);
    assert.equal(await dp.evaluate(()=>{P.hold=0;update(.05);return blend===0}),true);
    // Legacy Auto migrates to Smooth, while explicit Instant is preserved.
    await dp.evaluate(()=>localStorage.setItem('md:settings',JSON.stringify({cameraMotion:'auto',steadyLight:true,quality:'battery'})));
    await dp.reload();
    assert.equal(await dp.locator('#menu [data-pref="cameraMotion"]').isChecked(),true);
    assert.equal(await dp.evaluate(()=>smoothCamera()),true);
    assert.equal(await dp.locator('#menu [data-pref="quality"]').inputValue(),'battery');
    await openSettings(dp);
    await dp.locator('#menu [data-pref="cameraMotion"]').uncheck();
    assert.equal(await dp.locator('#pause [data-pref="cameraMotion"]').isChecked(),false);
    await dp.reload();assert.equal(await dp.locator('#menu [data-pref="cameraMotion"]').isChecked(),false);
    await openSettings(dp);
    await dp.locator('#menu [data-pref="cameraMotion"]').focus();await dp.keyboard.press('Space');
    assert.equal(await dp.locator('#menu [data-pref="cameraMotion"]').isChecked(),true);
    await dp.click('#closeSettings');
    await dp.locator('#menu [data-open-help]').click();assert.equal(await dp.locator('#help').isVisible(),true);
    await dp.locator('#closeHelp').click();assert.equal(await dp.locator('#menu').isVisible(),true);
    console.log('PASS: Smooth default, legacy Auto migration, saved Off, synchronized toggles, keyboard switch and menu help.');
    console.log('PASS: camera Smooth overrides device reduced motion, persists, and Instant still skips travel.');
    console.log('PASS: M map, N mute, R view, Alt pointer lock, F1 help, paused-state restoration and form focus.');
    await desktop.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: settings persistence, map charges/fade/snapshot, pause, lighting, cleanup, layouts, reduced motion; no page errors.');
  } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
