const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.mp3':'audio/mpeg'};
const server=http.createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    if(!['index.html','Maze Dive_Templo.html'].includes(relative)&&!relative.startsWith('static/')&&!relative.startsWith('public/')){res.writeHead(404).end();return}
    const file=path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(await fs.readFile(file));
  }catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const launch=process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:process.env.BROWSER_CHANNEL||'msedge'};
 const browser=await chromium.launch({headless:true,...launch});
 const report={browser:browser.version(),cases:[]};
 try{
  for(const scenario of [{name:'desktop',width:1280,height:800,reducedMotion:'no-preference'},{name:'desktop-reduced-motion-override',width:1280,height:800,reducedMotion:'reduce'},{name:'touch-emulation',width:390,height:844,reducedMotion:'no-preference',mobile:true}]){
    const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},reducedMotion:scenario.reducedMotion,isMobile:!!scenario.mobile,hasTouch:!!scenario.mobile});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|webgl/i.test(m.text()))errors.push(m.text())});
    await page.goto(base+'/Maze%20Dive_Templo.html?seed=desktop-test&guard=0&mode=purist&debugCamera=1#legacy');
    await page.waitForURL('**/index.html?**#legacy');
    assert.equal(new URL(page.url()).searchParams.get('seed'),'desktop-test');
    await page.click('#openSettings');
    await page.locator('#menu [data-pref="cameraMotion"]').check();
    await page.click('#closeSettings');
    await page.click('#start');
    assert.equal(await page.locator('#hud').isVisible(),false);
    await page.waitForFunction(()=>inFirstPerson(),null,{timeout:20000});
    assert.equal(await page.locator('#hud').isVisible(),true);
    const intro=await page.evaluate(()=>window.mazeCameraDiagnostics.snapshot());
    assert.ok(intro.frames.filter(f=>f.intro&&f.hold>0).every(f=>f.blend===1),'Intro overview must stay still throughout its hold');
    const introFrames=intro.frames.filter(f=>f.intro&&f.blend>0&&f.blend<1);
    assert.ok(introFrames.length>20,'Must present many intermediate intro frames');
    assert.ok(introFrames.at(-1).at-introFrames[0].at>2500,'Intro must animate over real time');
    await page.keyboard.press('b');
    assert.equal(await page.locator('#mapMemory').isVisible(),false);
    assert.equal(await page.locator('#hud').isVisible(),false);
    await page.waitForFunction(()=>inFirstPerson()&&!document.getElementById('mapMemory').hidden,null,{timeout:20000});
    const trace=await page.evaluate(()=>window.mazeCameraDiagnostics.snapshot());
    const peak=trace.frames.findIndex(f=>!f.intro&&f.bird>0&&f.blend===1);
    assert.ok(peak>=0,'Eagle Sight must reach full overhead');
    assert.ok(trace.frames.slice(peak).filter(f=>f.bird>0).every(f=>f.blend===1),'Eagle Sight must not oscillate at full overhead');
    const returns=trace.frames.filter(f=>!f.intro&&f.bird<=0&&f.blend>0&&f.blend<1);
    assert.ok(returns.length>20,'Must present many intermediate return frames');
    assert.ok(returns.at(-1).at-returns[0].at>1600,'Return must animate over real time');
    assert.equal(trace.cameraPreference,'smooth');assert.equal(trace.effectiveSmooth,true);assert.deepEqual(errors,[]);
    const result={name:scenario.name,build:trace.build,reducedMotion:trace.reducedMotion,introFrames:introFrames.length,introMs:Math.round(introFrames.at(-1).at-introFrames[0].at),returnFrames:returns.length,returnMs:Math.round(returns.at(-1).at-returns[0].at),maxFrameMs:Math.round(Math.max(...trace.frames.map(f=>f.rawDt))*1000),events:trace.events};
    report.cases.push(result);console.log(JSON.stringify(result));
    if(process.env.CAMERA_REPORT_DIR){await fs.mkdir(process.env.CAMERA_REPORT_DIR,{recursive:true});await fs.writeFile(path.join(process.env.CAMERA_REPORT_DIR,scenario.name+'.json'),JSON.stringify(trace,null,2));}
    await context.close();
  }
  console.log('PASS: legacy redirect, real-time HTTP camera frames, reduced-motion override, HUD and held-map sequencing.');
  if(process.env.CAMERA_REPORT_DIR)await fs.writeFile(path.join(process.env.CAMERA_REPORT_DIR,'summary.json'),JSON.stringify(report,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
