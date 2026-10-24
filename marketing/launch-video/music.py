import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
SR=44100; DUR=30.8; N=int(SR*DUR); rng=np.random.default_rng(7)
BPM=120; B=60/BPM; BAR=4*B
def ks(f, dur, amp=1.0, bright=0.5, decay=0.996):
    p=max(2,int(SR/f)); n=int(dur*SR)
    buf=rng.uniform(-1,1,p)
    # soften the excitation for a warmer acoustic tone
    k=max(1,int(p*(1-bright)*0.5)); buf=np.convolve(buf,np.ones(k)/k,'same')
    out=np.empty(n); prev=buf.copy(); last=0.0; i=0
    while i<n:
        m=min(p,n-i); out[i:i+m]=prev[:m]
        shifted=np.concatenate(([last],prev[:-1])); last=prev[-1]
        prev=decay*0.5*(prev+shifted); i+=m
    env=np.ones(n); a=int(0.002*SR); env[:a]=np.linspace(0,1,a)
    return out*env*amp
mix_g=np.zeros(N); mix_p=np.zeros(N)
def put(buf,sig,t):
    i=int(t*SR); j=min(N,i+len(sig))
    if i<N: buf[i:j]+=sig[:j-i]
CH={"G":[98.00,123.47,146.83,196.00,246.94,392.00],"D":[146.83,220.00,293.66,369.99],"Em":[82.41,123.47,164.81,196.00,246.94,329.63],"C":[130.81,164.81,196.00,261.63,329.63]}
PROG=["G","D","Em","C"]
def strum(ch,t,down=True,amp=0.6,ring=1.6,top=None):
    fs=CH[ch] if top is None else CH[ch][-top:]
    order=fs if down else fs[::-1]
    for k,f in enumerate(order):
        put(mix_g, ks(f,ring,amp*(0.85 if k else 1)*rng.uniform(.85,1.05),bright=0.62,decay=0.9965), t+k*(0.011 if down else 0.008))
# --- intro 0–3s: palm-muted 8ths building, + riser
for i in range(12):
    t=0.0+i*(B/2)
    put(mix_g, ks(82.41,0.18,0.25+0.03*i,bright=0.3,decay=0.97), t)
    if i%2==0: put(mix_g, ks(123.47,0.16,0.18+0.02*i,bright=0.3,decay=0.97), t+0.01)
# --- main groove from the drop at 3.0s: "D . D U . U D U" per bar
pattern=[(0,True,0.75,None),(1,True,0.55,None),(1.5,False,0.42,4),(2.5,False,0.42,4),(3,True,0.6,None),(3.5,False,0.45,4)]
t0=3.0; bar=0
while t0+bar*BAR < 29.0:
    ch=PROG[bar%4]; tb=t0+bar*BAR
    for beat,dn,amp,top in pattern:
        t=tb+beat*B
        if t<29.0: strum(ch,t,dn,amp,ring=1.2 if beat<3.5 else 0.9,top=top)
    bar+=1
# final ringing G strum on the end card
strum("G",29.0,True,1.0,ring=2.4); strum("G",29.0+0.006,True,0.5,ring=2.4,top=3)
# --- fingerpicked melody (G major pentatonic) for energy 15.5–26.4s
mel=[392.00,440.00,493.88,587.33,493.88,440.00,392.00,329.63, 440.00,493.88,587.33,659.25,587.33,493.88,440.00,392.00]
t=15.5;i=0
while t<26.3:
    put(mix_p, ks(mel[i%len(mel)]*1.0,0.8,0.32,bright=0.75,decay=0.995), t); t+=B/2; i+=1
# --- percussion
def kick(a=1.0):
    n=int(0.35*SR); tt=np.arange(n)/SR; f=45+80*np.exp(-tt*28)
    ph=2*np.pi*np.cumsum(f)/SR; return np.sin(ph)*np.exp(-tt*9)*a
def noise(n): return rng.uniform(-1,1,n)
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],'band',fs=SR,output='sos'),x)
def hp(x,lo): return sosfilt(butter(2,lo,'high',fs=SR,output='sos'),x)
def clap(a=0.6):
    n=int(0.22*SR); x=np.zeros(n)
    for d in (0,0.011,0.022):
        i=int(d*SR); m=int(0.012*SR); x[i:i+m]+=noise(m)
    tail=noise(n)*np.exp(-np.arange(n)/SR*18); x+=tail*0.5
    return bp(x,900,3500)*a
def shaker(a=0.18):
    n=int(0.06*SR); return hp(noise(n),6000)*np.exp(-np.arange(n)/SR*60)*a
drums=np.zeros(N)
def pd(sig,t): put(drums,sig,t)
t=3.0
while t<29.0:
    b=round((t-3.0)/B)%4
    if b in (0,2): pd(kick(1.0),t)
    if b in (1,3): pd(clap(0.55),t)
    pd(shaker(0.09),t); pd(shaker(0.055),t+B/2)
    t+=B
# little fill before scene changes
for tf in (11.25,15.25,19.75,23.25,26.25):
    pd(kick(0.7),tf); pd(clap(0.35),tf+B/4)
pd(kick(1.2),29.0)
# crash on the drop and on the end card
def crash(a=0.5,d=1.8):
    n=int(d*SR); return hp(noise(n),5000)*np.exp(-np.arange(n)/SR*2.6)*a
pd(crash(0.45),3.0); pd(crash(0.5,2.2),29.0)
# riser into the drop
n=int(2.6*SR); r=hp(noise(n),2500)*np.linspace(0,1,n)**2.2*0.35; put(drums,r,0.4)
# --- bus processing
ir_n=int(1.1*SR); ir=noise(ir_n)*np.exp(-np.arange(ir_n)/SR*5.5); ir=hp(ir,300); ir/=np.abs(ir).sum()**0.5*8
g=mix_g+mix_p*0.9
g=g+fftconvolve(g,ir)[:N]*0.35
g=sosfilt(butter(1,70,'high',fs=SR,output='sos'),g)
music=g*0.55+drums*0.75
# tail fade
f=int(0.4*SR); music[-f:]*=np.linspace(1,0,f)
music/=np.max(np.abs(music))*1.12
sf.write("music.wav",np.stack([music,music*0.98],1).astype(np.float32),SR)
print("music ok", len(music)/SR)
