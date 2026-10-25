const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:540,height:960}});
await p.goto('http://localhost:8791/video.html');await p.waitForTimeout(800);
const ts=[1.5,5.2,8.2,11.3,14.6];for(const [i,t] of ts.entries()){await p.evaluate(t=>window.seek(t),t);await p.screenshot({path:`peek${i}.png`});}
await b.close()})();
