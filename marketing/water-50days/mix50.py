import numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt, sosfiltfilt
m,SR=sf.read("music50.wav"); v,vsr=sf.read("vo50.wav")
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
sf.write("mix50.wav",out.astype(np.float32),SR)
