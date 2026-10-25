const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for(const [h,n] of [[1350,'spill-water-card-feed.png'],[1920,'spill-water-card-story.png']]){const p=await b.newPage({viewport:{width:1080,height:h}});
await p.goto('http://localhost:8791/card.html?h='+h);await p.waitForTimeout(500);await p.screenshot({path:n});await p.close();}
await b.close()})();
