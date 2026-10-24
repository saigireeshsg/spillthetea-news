import soundfile as sf, numpy as np, json
from kokoro_onnx import Kokoro
k=Kokoro("kokoro-v1.0.int8.onnx","voices-v1.0.bin")
V="af_heart"
lines=[
 (0.25,3.0,"The news is a lot. Too long. Too boring. Too much."),
 (3.35,5.8,"Meet Spill. The news, minus the boring."),
 (6.25,11.3,"Every Hyderabad story in sixty seconds. What happened, why, and what it means for you."),
 (11.6,15.3,"With numbers you can actually see."),
 (15.6,19.8,"Live updates, all day. And India cricket, ball by ball."),
 (20.1,23.3,"Vote, and see where Hyderabad stands."),
 (23.6,26.3,"Don't just read. Speak up."),
 (26.45,30.2,"Spill. Hyderabad's news, in sixty seconds. spill the tea dot news."),
]
SR=24000;out=np.zeros(int(30.5*SR),dtype=np.float32);rep=[]
for st,en,txt in lines:
    a,sr=k.create(txt,voice=V,speed=1.1,lang="en-us");d=len(a)/sr;sp=1.1
    if d>(en-st):
        sp=round(min(1.35,1.1*(d/((en-st)*0.97))**0.7),3);a,sr=k.create(txt,voice=V,speed=sp,lang="en-us");d=len(a)/sr
    i=int(st*SR);out[i:i+len(a)]+=a[:len(out)-i]
    rep.append((st,round(d,2),en-st,sp,txt[:40]))
sf.write("vo.wav",out,SR)
for r in rep:print(r)
