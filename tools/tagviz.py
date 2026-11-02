import json,glob
B,G,N="bad","good","neutral"
M={
"hyd-green-tanker":{0:(G,"More green tankers on the road"),2:(B,"Drinking-grade water going to non-drinking use")},
"asian-para-games-record":{0:(G,"India beat its own medal record")},
"bay-cyclone":{0:(B,"More trains cancelled as the storm grew"),1:(N,"Two coasts, two evacuations"),2:(B,"Faster storm means less time to prepare"),7:(B,"Strong winds at landfall")},
"driving-licence-rules":{0:(N,"Harder to pass: fewer will clear it first time"),1:(B,"Longer wait to finish the process")},
"hyd-el-nino-water":{1:(B,"Reservoirs far lower than last year"),5:(B,"Supply falls short of need"),7:(B,"State reservoirs under 40% full"),9:(B,"Almost no rainy-season inflow")},
"hyd-qutb-shahi-tombs":{0:(N,"Money released vs spent so far")},
"hyd-sweet-shop-raids":{1:(N,"Drive widened across the state")},
"inter-exam-fee":{1:(N,"Science students pay more")},
"jio-ipo-record":{0:(N,"New record for IPO applications")},
"oil-prices-inflation":{0:(B,"Oil far above the RBI's plan: pressure on prices")},
"el-nino-record-pacific":{1:(N,"Easing slightly from the peak but still extreme")},
"eu-fta-car-duty":{1:(N,"Cheaper luxury imports; domestic makers face more competition")},
"hyd-rents-it-corridor":{0:(B,"Tenants pay far more than in 2021"),1:(B,"Tenants pay far more than in 2021")},
"hyd-sunnam-borewells":{0:(N,"Demolition drive under way")},
"hyd-traffic-123-hours":{1:(B,"Evening drive is slower"),2:(B,"Roads near their limit at evening rush")},
"nmc-msmer-scrapped":{0:(N,"Penalty rules now scrapped")},
"tg-graduate-voter-list":{0:(B,"Far fewer applications than last time"),2:(N,"Regions differ in turnout of applications")},
"tilak-nz-blitz":{0:(G,"India came back from 70/5"),2:(G,"Scoring rate picked up at the death")},
"bie-fake-fire-nocs":{0:(N,"Fewer colleges permitted this year")},
"hyd-844-drunk-drivers":{0:(B,"Hundreds caught in days")},
"hyd-rice-90-a-kg":{0:(G,"New MRP is lower than shop prices"),1:(B,"Buyers pay double what they paid before"),2:(N,"Farmers gain, buyers pay more")},
"pm-rahat-accident-cover":{0:(N,"Fewer hospitals than Aarogyasri")},
"rail-counter-insurance":{0:(G,"Tiny premium for large cover")},
"aibe-22-last-day":{0:(N,"Fee differs by category")},
"anthropic-ipo-filing":{0:(N,"Revenue grew sharply")},
"britannia-whole-wheat-fine":{0:(B,"Pack had less wheat than the ad claimed")},
"defence-212-lakh-crore":{0:(G,"Most of the spend goes to Indian industry")},
"hyd-water-emergency-rules":{0:(B,"Tanker bookings more than tripled"),1:(B,"Taps run less often"),2:(B,"Reservoir very low")},
"jio-lists-wednesday":{0:(N,"Big funds bid far more than retail")},
"lula-fourth-term":{0:(N,"Round 1 was close; run-off decides")},
"tata-comms-ai-network":{0:(G,"Network capacity set to grow several times")},
"tesla-india-247-crore":{0:(N,"Sales jumped from a small base"),1:(N,"More cars registered")},
"tg-graduate-voters-5pc":{0:(B,"Very few applications approved so far"),1:(B,"Far fewer than the 2021 roll")},
"tg-tummidihatti-152m":{0:(N,"Height being reconsidered")},
"ugc-net-dec-oct31":{0:(N,"Fee varies by category")},
"ai-cyclone-tracking-ecmwf":{1:(N,"Only one model in three shows landfall here: watch")},
"alphabet-ai-capex-cash":{0:(N,"Cloud growing faster than the rest")},
"diesel-export-levy-rs11-5":{0:(N,"Export tax raised to keep fuel at home"),1:(N,"Petrol export levy removed"),2:(N,"Jet fuel levy edged up")},
"hyd-rain-keesara-112mm":{2:(N,"Rain was uneven across the city")},
"hyd-rice-hoarding-six-traders":{0:(B,"More hoarding cases found")},
"jee-advanced-third-attempt":{0:(N,"Students want one more try")},
"reliance-q2-jio":{2:(B,"Retail profit fell from last quarter")},
"tg-yasangi-veggies-over-paddy":{1:(B,"Heat could cut produce")},
"wb-poverty-india":{1:(G,"Extreme poverty fell sharply"),2:(G,"Fewer people below the line")},
"b28-bullet-train-557-seats":{1:(N,"Test speed higher than operating speed")},
"cyclone-murasu-nov3-landfall":{6:(B,"More districts on orange alert")},
"gst-october-231-lakh-crore":{1:(G,"Collections grew, imports fastest")},
"ind-nz-t20-series-3-2":{1:(N,"Close finish")},
"lpg-underrecovery-309-november":{0:(B,"Oil firms losing more on every cylinder")},
"mahalakshmi-free-bus-68pc-study":{0:(G,"Women pay far less per trip"),1:(G,"More women rely on buses"),2:(N,"Trips barely changed")},
"north-bullet-train-delhi-agra-59mi":{1:(N,"Journey times to each city")},
"tg-employees-five-day-week":{1:(N,"Longer days for a five-day week")},
"tg-hc-stays-bar-privilege-fee":{0:(B,"Owners say the cess rose, but court has stayed it")},
"tomcom-germany-12-of-79":{1:(B,"No trainee has reached Germany yet")},
"bits-full-scholarship-top-1000":{1:(G,"More top rankers get free seats")},
"cyberabad-205-drunk-driving":{2:(N,"Few ended in jail")},
"ed-isro-two-launches":{1:(N,"Ask is higher than this year's budget")},
"ram-g-grievance-rules-15-days":{1:(N,"Time limits set for complaints")},
"tg-groundwater-nitrate-fluoride":{1:(B,"One in four samples over the nitrate limit"),2:(N,"Limits set for safe drinking water")},
"tg-gst-vat-october-4593-crore":{1:(G,"State's GST collection grew"),2:(G,"More VAT coming in")},
"tg-october-rain-86pc-deficit":{1:(B,"Rain far below normal"),2:(B,"Monsoon total behind target"),3:(B,"Rain collapsed from last year")},
"tg-paddy-farmers-murasu-rain":{1:(N,"Farmers gain, buyers pay more")},
}
n=0
for f in glob.glob('content/drops/*.json')+glob.glob('content/live/*.json'):
    base=f.split('/')[-1]
    k=next((k for k in M if k in base),None)
    if not k: continue
    d=json.load(open(f));ch=False
    for i,(t,v) in M[k].items():
        vz=d.get('viz') or []
        if i<len(vz) and vz[i].get('t') in('compare','trend','meter'):
            vz[i]['tone']=t;vz[i]['verdict']=v;vz[i].pop('goodIfUp',None);ch=True;n+=1
    if ch: json.dump(d,open(f,'w'),ensure_ascii=False,indent=1)
print(n)
