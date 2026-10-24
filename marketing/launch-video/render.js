const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:540,height:960},deviceScaleFactor:2});
await p.goto('http://localhost:8790/launch.html');await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
const FPS=30,DUR=30;require('fs').mkdirSync('frames',{recursive:true});
for(let i=0;i<FPS*DUR;i++){const t=i/FPS;await p.evaluate(t=>window.seek(t),t);await p.screenshot({path:`frames/f${String(i).padStart(4,'0')}.jpg`,type:'jpeg',quality:92});}
await b.close();console.log('frames done')})();
