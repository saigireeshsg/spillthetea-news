import soundfile as sf, numpy as np
from kokoro_onnx import Kokoro
k=Kokoro("kokoro-v1.0.int8.onnx","voices-v1.0.bin");V="af_heart"
lines=[(0.2,2.7,"Hyderabad, you've got about fifty days."),
 (2.9,5.9,"That's when Singur, the IT corridor's water source, could run dry."),
 (6.1,9.1,"The city needs seven thirty five million gallons a day. It gets five eighty five."),
 (9.3,12.1,"Gachibowli, HITEC City, Madhapur, Kondapur. First in line."),
 (12.3,15.9,"Is your area on the list? Check it on Spill. spill the tea dot news.")]
SR=24000;out=np.zeros(int(16.3*SR),dtype=np.float32)
for st,en,txt in lines:
    sp=1.1;a,sr=k.create(txt,voice=V,speed=sp,lang="en-us");d=len(a)/sr
    if d>(en-st):
        sp=round(min(1.4,1.1*(d/((en-st)*0.97))**0.85),3);a,sr=k.create(txt,voice=V,speed=sp,lang="en-us");d=len(a)/sr
    i=int(st*SR);out[i:i+len(a)]+=a[:len(out)-i];print(st,round(d,2),round(en-st,2),sp)
sf.write("vo50.wav",out,SR)
m,msr=sf.read("music.wav");n=int(16.3*msr);m=m[:n].copy()
f=int(1.2*msr);m[-f:]*=np.linspace(1,0,f)[:,None];sf.write("music50.wav",m,msr)
