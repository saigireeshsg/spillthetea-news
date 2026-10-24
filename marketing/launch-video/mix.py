import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, sosfiltfilt
m,SR=sf.read("music.wav"); v,vsr=sf.read("vo.wav")
v=resample_poly(v,147,80)  # 24k -> 44.1k
N=len(m); v=np.pad(v,(0,max(0,N-len(v))))[:N]
# gentle VO polish: high-pass + light compression-ish saturation
v=sosfilt(butter(2,90,'high',fs=SR,output='sos'),v)
v=np.tanh(v*1.6)/np.tanh(1.6)
# duck the music under the voice
env=sosfiltfilt(butter(2,6,'low',fs=SR,output='sos'),np.abs(v))
duck=1-0.62*np.clip(env/0.04,0,1)
mm=m*duck[:,None]
out=mm*0.62+v[:,None]*0.95
out/=np.max(np.abs(out))*1.06
sf.write("mix.wav",out.astype(np.float32),SR)
for a,b in [(0,3),(3,6),(6,11.5),(11.5,15.5),(15.5,20),(20,26.4),(26.4,30.8)]:
    s=slice(int(a*SR),int(b*SR));print(f"{a:>5}-{b:<5} music_rms={np.sqrt((m[s]**2).mean()):.3f} vo_rms={np.sqrt((v[s]**2).mean()):.3f} mix_peak={np.abs(out[s]).max():.2f}")
