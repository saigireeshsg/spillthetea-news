const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();
for(const [h,n] of [[1350,'spill-tgpsc-fix-feed.png'],[1920,'spill-tgpsc-fix-story.png']]){const p=await b.newPage({viewport:{width:1080,height:h}});
await p.goto('file://'+__dirname+'/card.html?h='+h);await p.waitForTimeout(400);await p.screenshot({path:n});await p.close();}
await b.close()})();
