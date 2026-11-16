/* ============================================================
   SHADERS
   ============================================================ */
const GL_NOISE = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

/* ---------- particles: every dimension is a function of the same grid ---------- */
const GL_PART_V = `
uniform float uTime,uT,uIntro,uProj,uTravel,uFocus,uAperture,uSize,uMaxPx,uTurb,uScan,uRayR,uRayF,uGain,uDens;
uniform vec4 uSub;            // x line spread, y wall dim, z xr wrap, w xr room
uniform vec3 uWall,uRayO,uRayD,uXRC;
uniform vec2 uGrid;
uniform sampler2D uScreen;
attribute vec2 aUV; attribute vec4 aRnd;
varying vec3 vCol; varying float vAlpha; varying float vBokeh;
const float PI=3.14159265; const float TAU=6.2831853;
${GL_NOISE}
float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}
float h21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 rotY(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
vec3 rotX(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);}
vec3 rotZ(vec3 p,float a){float c=cos(a),s=sin(a);return vec3(c*p.x-s*p.y,s*p.x+c*p.y,p.z);}

/* 0D  the point: a living core with orbits */
void sPoint(out vec3 P,out vec3 C,out float Sz){
  float k=aRnd.x; float spin=uTime*0.06;
  vec3 L=normalize(vec3(-0.55,0.6,0.6));
  if(k<0.66){
    float th=aUV.x*TAU; float cz=1.0-2.0*aUV.y; float sz=sqrt(max(0.0,1.0-cz*cz));
    vec3 n=vec3(sz*cos(th),cz,sz*sin(th));
    float t=uTime*0.07;
    float d1=snoise(n*1.25+vec3(0.0,t,t*0.7));
    float d2=snoise(n*3.3-vec3(t*1.4,0.0,t));
    float r=1.16+d1*0.17+d2*0.05;
    float lift=smoothstep(0.72,1.0,aRnd.y)*(0.2+0.8*aRnd.z)*max(d1,0.0);
    vec3 nr=rotY(n,spin);
    P=nr*(r+lift*0.9);
    float lit=pow(max(dot(nr,L),0.0),1.3);
    float rim=pow(1.0-abs(nr.z),2.5);
    vec3 base=mix(vec3(0.05,0.045,0.09),vec3(1.0,0.9,0.74),lit);
    base+=vec3(0.30,0.42,1.0)*rim*0.55;
    base+=vec3(1.0,0.45,0.2)*lift*1.2;
    C=base*(0.45+0.75*smoothstep(-0.4,0.9,d1));
    Sz=1.0;
  }else if(k<0.9){
    float ri=floor(aRnd.y*3.0);
    float dir=mod(ri,2.0)<0.5?1.0:-1.0;
    float ang=aUV.x*TAU+uTime*(0.05+0.02*ri)*dir;
    float rad=1.95+ri*0.46+(aRnd.w-0.5)*0.035*(1.0+ri*2.0);
    vec3 q=vec3(cos(ang)*rad,(aRnd.z-0.5)*0.02,sin(ang)*rad);
    q=rotX(q,1.12+ri*0.3); q=rotZ(q,0.42-ri*0.52);
    P=q;
    float dash=step(0.4,fract(aUV.x*(18.0+ri*14.0)+uTime*0.02*dir));
    C=mix(vec3(0.95,0.9,0.82),vec3(1.0,0.5,0.25),ri*0.5)*(0.07+0.36*dash);
    Sz=0.75;
  }else{
    vec3 d=normalize(aRnd.yzw-0.5+1e-4);
    float r=2.8+pow(aRnd.y,2.0)*7.5;
    P=rotY(d*r,spin*0.3);
    C=vec3(0.6,0.62,0.8)*0.28;
    Sz=0.9;
  }
  C*=uDens;
}

/* 1D  the line: one line, then lines of code */
void sLine(out vec3 P,out vec3 C,out float Sz){
  float sp=uSub.x; const float ROWS=24.0;
  float sub=fract(aUV.y*ROWS);
  float vv=aUV.y+uTime*0.008*sp;
  float rowF=fract(vv)*ROWS; float row=floor(rowF)+floor(vv)*ROWS;
  float x=aUV.x+(aRnd.y-0.5)/uGrid.x*sp;
  float nTok=7.0+floor(h11(row*1.7+0.3)*9.0);
  float tokId=floor(x*nTok); float fx=fract(x*nTok);
  float tokH=h21(vec2(row,tokId));
  float inTok=step(0.10,fx)*step(fx,0.90);
  float indent=floor(h11(floor(row/3.0)*5.3+2.0)*4.0)*0.045;
  float len=0.30+0.62*h11(row*3.3+9.0);
  float blank=step(0.88,h11(row*7.7+1.0));
  float on=inTok*step(0.26,tokH)*step(indent,x)*step(x,indent+len)*(1.0-blank);
  on=mix(1.0,on,smoothstep(0.05,0.55,sp));
  float y=(0.5-(floor(rowF)+0.5)/ROWS)*7.4*sp+(sub-0.5)*mix(0.014,0.045,sp);
  float z=(h11(row*2.1+4.0)-0.5)*3.2*sp;
  float wave=(sin(x*20.0-uTime*1.8)*0.05+snoise(vec3(x*3.0,uTime*0.25,1.0))*0.07)*(1.0-sp);
  P=vec3((x-0.5)*13.5,y+wave,z);
  float pk=h21(vec2(tokId+3.0,row+1.0));
  vec3 col=pk<0.52?vec3(0.50,0.47,0.44):pk<0.78?vec3(1.0,0.30,0.10):pk<0.92?vec3(1.0,0.70,0.30):vec3(0.95,0.95,1.0);
  float caret=fract(uTime*0.12+h11(row)*3.0);
  col+=vec3(1.0,0.6,0.3)*smoothstep(0.02,0.0,abs(x-indent-caret*len))*sp*2.0;
  col=mix(vec3(1.0,0.42,0.18)*0.11*uDens,col*0.9*mix(1.0,uDens,0.4),smoothstep(0.0,0.5,sp));
  C=col*on; Sz=mix(1.0,0.85,sp);
  if(on<0.5){
    P=vec3((aRnd.y-0.5)*17.0,(aRnd.z-0.5)*9.5,-1.5-aRnd.w*7.0);
    C=vec3(0.55,0.28,0.2)*0.06*sp; Sz=1.0;
  }
}

/* 2D  the surface: every particle is one pixel of a live interface */
void sWall(out vec3 P,out vec3 C,out float Sz){
  vec3 tex=texture2D(uScreen,aUV).rgb; tex=pow(tex,vec3(2.2));
  float lum=dot(tex,vec3(0.299,0.587,0.114));
  vec3 p=vec3((aUV.x-0.5)*6.6,(aUV.y-0.5)*4.4,lum*0.12);
  p=rotX(rotY(p,uWall.x),uWall.y); p.z-=uWall.z;
  P=p;
  float tw=0.92+0.08*sin(uTime*3.0+aRnd.x*TAU);
  C=(tex*2.0+vec3(0.010,0.012,0.018))*tw*(1.0-0.8*uSub.y);
  Sz=0.8+lum*0.45;
}

/* 3D  the world: the surface extrudes into terrain */
float terr(vec2 q){
  float valley=smoothstep(2.4,7.5,abs(q.x));
  float n=snoise(vec3(q*0.15,0.0))*0.5+0.5;
  float r=1.0-abs(snoise(vec3(q*0.31+7.0,1.0)));
  return (n*0.55+r*r*0.8)*3.6*valley+snoise(vec3(q*0.8,2.0))*0.06;
}
void sTerrain(out vec3 P,out vec3 C,out float Sz){
  float x=(aUV.x-0.5)*28.0;
  float zn=fract(aUV.y-uTravel/48.0);
  float z=5.0-zn*48.0;
  float h=terr(vec2(x,z-uTravel));
  P=vec3(x,-1.75+h,z);
  float far=smoothstep(-43.0,-10.0,z);
  float edge=smoothstep(0.0,0.05,zn)*(1.0-smoothstep(0.9,1.0,zn));
  float hh=clamp(h/3.2,0.0,1.0);
  vec3 col=mix(vec3(0.015,0.16,0.30),vec3(0.16,0.85,1.0),hh);
  col=mix(col,vec3(1.0,0.75,0.95),smoothstep(0.7,1.0,hh));
  float lane=1.0-smoothstep(2.2,2.7,abs(x));
  col+=vec3(0.03,0.22,0.34)*lane*(0.4+0.9*step(0.9,fract((z-uTravel)*0.25)));
  C=col*mix(0.045,0.8,smoothstep(-42.0,-4.0,z))*edge; Sz=1.0+0.5*(1.0-far);
}

/* XR  beyond the screen: a scanned floor (AR) that wraps into a sphere (VR) and squares off into a room (MR) */
void sXR(out vec3 P,out vec3 C,out float Sz){
  float w=uSub.z; float room=uSub.w; const float R=9.0;
  float cls=aRnd.x;
  float v=aUV.y; float u=aUV.x;
  if(cls<0.45) v=mix(v,(floor(v*14.0)+0.5)/14.0,w);
  else if(cls<0.8) u=mix(u,(floor(u*28.0)+0.5)/28.0,w);
  float th=u*TAU;
  float s=v*PI*R;
  float rho=R/max(w,0.02);
  float ang=s/rho;
  float rr=rho*sin(ang); float yy=rho*(1.0-cos(ang));
  float drop=mix(1.5,R,w*w*(3.0-2.0*w));
  vec3 p=vec3(rr*cos(th),yy-drop,rr*sin(th));
  float flt=1.0-w;
  p.xz+=(aRnd.yz-0.5)*0.22*flt; p.y+=(aRnd.w-0.5)*0.03*flt;
  if(room>0.001){
    vec3 d=normalize(p);
    vec3 hx=vec3(4.6,d.y<0.0?1.55:1.95,5.6);
    float m=max(abs(d.x)/hx.x,max(abs(d.y)/hx.y,abs(d.z)/hx.z));
    p=mix(p,d/m,room);
  }
  if(cls>=0.8){                               // loose points drift inside the volume
    vec3 dd=normalize(aRnd.yzw-0.5+1e-4);
    p=mix(p,dd*(2.5+aRnd.y*5.5)+vec3(0.0,sin(uTime*0.2+aRnd.z*TAU)*0.2,0.0),w*(1.0-room));
  }
  P=uXRC+p;
  float gln=cls<0.8?1.0:0.0;
  vec3 ir=0.5+0.5*cos(TAU*(vec3(0.62,0.45,0.25)+v*0.9+u+uTime*0.015));
  float flow=0.55+0.45*sin((cls<0.45?u:v)*TAU*6.0-uTime*0.8+aRnd.z);
  vec3 vr=mix(vec3(0.34,0.18,1.0),vec3(0.08,0.9,0.85),ir.x)*(0.05+0.42*gln*flow)+ir*0.05+vec3(0.9,0.85,1.0)*(1.0-gln)*0.18;
  float tw=step(0.55,fract(aRnd.x*7.0+uTime*0.15));
  float scan=exp(-pow((s-uScan*24.0)*0.9,2.0));
  vec3 ar=vec3(0.62,0.55,1.0)*(0.05+0.22*tw)*smoothstep(0.0,0.06,v)*(1.0-smoothstep(10.0,22.0,s))
         +vec3(0.7,0.9,1.0)*scan*0.9*(1.0-smoothstep(4.0,20.0,s));
  C=mix(ar,vr,w);
  C=mix(C,vec3(0.5,0.55,0.95)*(0.03+0.22*gln*flow)+ir*0.02,room*0.8);
  C*=mix(1.0,uDens,0.55*w);
  Sz=mix(1.25,1.0,w);
}

void sDust(out vec3 P,out vec3 C,out float Sz){
  vec3 p=(aRnd.yzw-0.5)*vec3(28.0,17.0,14.0);
  p.y=mod(p.y+uTime*0.06*(0.4+aRnd.x)+8.5,17.0)-8.5; p.z-=2.0;
  P=p;
  C=mix(vec3(0.5,0.55,0.8),vec3(1.0,0.9,0.8),aRnd.y)*(aRnd.x>0.99?1.3:(aRnd.x<0.22?0.075:0.0));
  Sz=1.0;
}

void shape(float id,out vec3 P,out vec3 C,out float Sz){
  if(id<0.5||id>5.5) sPoint(P,C,Sz);
  else if(id<1.5) sLine(P,C,Sz);
  else if(id<2.5) sWall(P,C,Sz);
  else if(id<3.5) sTerrain(P,C,Sz);
  else if(id<4.5) sXR(P,C,Sz);
  else sDust(P,C,Sz);
}

void main(){
  float T=clamp(uT,0.0,5.9999);
  float i0=floor(T); float f=T-i0;
  vec3 PA; vec3 CA; float SA; vec3 PB; vec3 CB; float SB;
  shape(i0,PA,CA,SA);
  vec3 P=PA; vec3 C=CA; float Sz=SA;
  if(f>0.0005){
    shape(i0+1.0,PB,CB,SB);
    float m=clamp((f-aRnd.x*0.42)/0.58,0.0,1.0); m=m*m*(3.0-2.0*m);
    P=mix(PA,PB,m); C=mix(CA,CB,m); Sz=mix(SA,SB,m);
    float mid=sin(m*PI);
    vec3 q=P*0.2+aRnd.yzw*0.35;
    P+=vec3(snoise(q+vec3(0.0,uTime*0.12,3.1)),snoise(q+vec3(31.4,1.7,uTime*0.12)),snoise(q+vec3(-uTime*0.12,57.1,9.2)))*mid*uTurb;
    C*=1.0+mid*0.6;
  }
  float it=clamp(uIntro*1.5-aRnd.w*0.5,0.0,1.0); it=1.0-pow(1.0-it,3.0);
  P=mix((aRnd.yzw-0.5)*0.03,P,it);
  C*=mix(0.03,1.0,it);

  vec3 tp=P-uRayO; vec3 cl=uRayO+uRayD*dot(tp,uRayD); vec3 aw=P-cl;
  float fo=exp(-dot(aw,aw)/(uRayR*uRayR))*uRayF;
  P+=normalize(aw+vec3(1e-4))*fo; C*=1.0+fo*1.5;

  vec4 mv=modelViewMatrix*vec4(P,1.0);
  float depth=max(-mv.z,0.05);
  float d0=uSize*Sz*uProj/depth;
  float coc=abs(1.0/uFocus-1.0/depth)*uAperture*uProj;
  float dpx=d0+coc;
  float lim=min(dpx,uMaxPx);
  gl_PointSize=max(lim,1.0);
  float a=pow(d0/dpx,1.55)*min(1.0,lim*lim)*smoothstep(0.1,0.7,depth);
  vAlpha=a*uGain; vBokeh=clamp(coc/(d0+1.5)*0.6,0.0,1.0); vCol=C;
  gl_Position=projectionMatrix*mv;
}`;

const GL_PART_F = `
varying vec3 vCol; varying float vAlpha; varying float vBokeh;
void main(){
  float r=length(gl_PointCoord-0.5)*2.0;
  float soft=mix(0.85,0.2,vBokeh);
  float a=smoothstep(1.0,1.0-soft,r);
  a*=mix(1.0,0.7+0.5*smoothstep(0.5,0.95,r),vBokeh);
  gl_FragColor=vec4(vCol*a*vAlpha,1.0);
}`;

/* ---------- full-screen passes ---------- */
const GL_FS_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

const GL_BG_F = `
uniform float uTime,uHorizon,uAspect; uniform vec3 uTint,uTint2; uniform vec2 uGlow; varying vec2 vUv;
${GL_NOISE}
void main(){
  vec2 p=vUv-0.5; p.x*=uAspect;
  vec3 c=vec3(0.0032,0.0032,0.0042);
  vec2 g=p-uGlow; float gw=exp(-dot(g,g)*2.4);
  float n=snoise(vec3(p*1.3,uTime*0.03))*0.5+0.5;
  c+=uTint*gw*(0.014+0.018*n);
  c+=uTint2*0.006*smoothstep(0.25,0.95,snoise(vec3(p*0.8+3.0,uTime*0.02))*0.5+0.5);
  float hy=p.y-0.035;
  c+=uHorizon*uTint*(exp(-hy*hy*420.0)*0.5+exp(-abs(hy)*7.0)*0.035*(0.6+0.4*n));
  gl_FragColor=vec4(c,1.0);
}`;

const GL_PRE_F = `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uThr,uKnee; varying vec2 vUv;
void main(){
  vec3 c=texture2D(tMap,vUv).rgb*4.0;
  c+=texture2D(tMap,vUv-uTexel).rgb+texture2D(tMap,vUv+uTexel).rgb;
  c+=texture2D(tMap,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture2D(tMap,vUv-vec2(uTexel.x,-uTexel.y)).rgb;
  c*=0.125;
  float br=max(c.r,max(c.g,c.b));
  float so=clamp(br-uThr+uKnee,0.0,2.0*uKnee); so=so*so/(4.0*uKnee+1e-4);
  c*=max(so,br-uThr)/max(br,1e-4);
  gl_FragColor=vec4(min(c,vec3(12.0)),1.0);
}`;
const GL_DOWN_F = `
uniform sampler2D tMap; uniform vec2 uTexel; varying vec2 vUv;
void main(){
  vec3 c=texture2D(tMap,vUv).rgb*4.0;
  c+=texture2D(tMap,vUv-uTexel).rgb+texture2D(tMap,vUv+uTexel).rgb;
  c+=texture2D(tMap,vUv+vec2(uTexel.x,-uTexel.y)).rgb+texture2D(tMap,vUv-vec2(uTexel.x,-uTexel.y)).rgb;
  gl_FragColor=vec4(c*0.125,1.0);
}`;
const GL_UP_F = `
uniform sampler2D tMap; uniform vec2 uTexel; uniform float uW; varying vec2 vUv;
void main(){
  vec2 h=uTexel;
  vec3 c=texture2D(tMap,vUv+vec2(-h.x*2.0,0.0)).rgb+texture2D(tMap,vUv+vec2(0.0,h.y*2.0)).rgb+texture2D(tMap,vUv+vec2(h.x*2.0,0.0)).rgb+texture2D(tMap,vUv+vec2(0.0,-h.y*2.0)).rgb;
  c+=(texture2D(tMap,vUv+vec2(-h.x,h.y)).rgb+texture2D(tMap,vUv+vec2(h.x,h.y)).rgb+texture2D(tMap,vUv+vec2(h.x,-h.y)).rgb+texture2D(tMap,vUv+vec2(-h.x,-h.y)).rgb)*2.0;
  gl_FragColor=vec4(c/12.0*uW,1.0);
}`;
const GL_COMP_F = `
uniform sampler2D tScene,tBloom; uniform vec2 uRes;
uniform float uTime,uBloom,uCA,uVig,uGrain,uPulse,uLens,uFade,uExp,uFlash,uSV; uniform vec3 uFlashCol;
varying vec2 vUv;
float hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);}
vec3 samp(vec2 uv){return texture2D(tScene,uv).rgb+texture2D(tBloom,uv).rgb*uBloom;}
void main(){
  vec2 uv=vUv; float mask=1.0; float asp=uRes.x/uRes.y; vec2 cc=(uv-0.5)*vec2(min(asp,1.7),1.0);
  float row=floor(uv.y*46.0); float tk=floor(uTime*24.0);
  uv.x+=(hash(vec2(row+3.0,tk))-0.5)*0.05*uPulse*step(0.84,hash(vec2(row,tk)));
  if(uLens>0.001){
    vec2 n=uSV>0.5?vec2(1.0,2.0):vec2(2.0,1.0);      // eyes side by side, or stacked on a portrait screen
    vec2 cell=floor(uv*n); vec2 e=fract(uv*n)-0.5;
    vec2 ea=vec2(asp*n.y/n.x,1.0);
    vec2 q=e*ea; float r2=dot(q,q);
    vec2 e2=q*(1.0+uLens*(0.26*r2+0.2*r2*r2))/ea;
    float edge=mix(1.7,0.47,uLens);
    mask=1.0-smoothstep(edge-0.014,edge,length(q));
    mask*=step(abs(e2.x),0.5)*step(abs(e2.y),0.5);
    uv=(clamp(e2,vec2(-0.5),vec2(0.5))+0.5+cell)/n;
    cc=q;
  }
  vec2 dir=cc*(uCA+uPulse*0.010)*(0.35+dot(cc,cc)*2.2)/vec2(asp,1.0);
  vec3 col=vec3(samp(uv+dir).r,samp(uv).g,samp(uv-dir).b);
  col*=1.0-uVig*smoothstep(0.3,1.15,length(cc)*1.15);
  col+=uFlashCol*uFlash;
  col=aces(col*uExp);
  col=pow(col,vec3(1.0/2.2));
  col+=(hash(vUv*uRes+fract(uTime)*91.7)-0.5)*uGrain;
  gl_FragColor=vec4(col*mask*uFade,1.0);
}`;

/* ---------- meshes ---------- */
const GL_PYLON_V = `
varying vec3 vP; varying float vFade;
void main(){
  vP=position;
  vec4 wp=vec4(position,1.0);
  #ifdef USE_INSTANCING
  wp=instanceMatrix*wp;
  #endif
  wp=modelMatrix*wp;
  vFade=smoothstep(-46.0,-30.0,wp.z);
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;
const GL_PYLON_F = `
uniform vec3 uCol; varying vec3 vP; varying float vFade;
void main(){
  vec3 e=0.5-abs(vP);
  float m1=min(e.x,min(e.y,e.z)); float m3=max(e.x,max(e.y,e.z)); float m2=e.x+e.y+e.z-m1-m3;
  float edge=1.0-smoothstep(0.0,0.05,m2);
  vec3 c=uCol*(0.012+0.07*smoothstep(-0.5,0.5,vP.y))+uCol*edge*2.4;
  gl_FragColor=vec4(c*vFade,1.0);
}`;
const GL_HOLO_V = `
varying vec3 vN; varying vec3 vW;
void main(){
  vN=normalize(normalMatrix*normal);
  vec4 wp=modelMatrix*vec4(position,1.0); vW=wp.xyz;
  gl_Position=projectionMatrix*viewMatrix*wp;
}`;
const GL_HOLO_F = `
uniform vec3 uCol; uniform float uTime; varying vec3 vN; varying vec3 vW;
void main(){
  float fr=pow(1.0-abs(normalize(vN).z),2.2);
  float sc=0.5+0.5*sin(vW.y*70.0-uTime*3.0);
  vec3 c=uCol*(0.035+fr*0.9+sc*0.03);
  gl_FragColor=vec4(c,1.0);
}`;
const GL_DISC_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;
const GL_DISC_F = `
uniform vec3 uCol; uniform float uA,uRing; varying vec2 vUv;
void main(){
  float r=length(vUv-0.5)*2.0;
  float soft=(1.0-smoothstep(0.0,1.0,r))*0.35;
  float ring=smoothstep(0.06,0.0,abs(r-uRing))*step(r,1.0);
  gl_FragColor=vec4(uCol*(soft+ring*1.6)*uA,1.0);
}`;
const GL_PANEL_F = `
uniform sampler2D tMap; uniform float uReveal,uTime,uAsp; varying vec2 vUv;
void main(){
  vec3 c=pow(texture2D(tMap,vUv).rgb,vec3(2.2))*1.5+vec3(0.012,0.014,0.02);
  vec2 q=abs((vUv-0.5)*vec2(uAsp,1.0))-vec2(uAsp,1.0)*0.5+0.035;
  float d=length(max(q,0.0))-0.035;
  if(d>0.0) discard;
  float border=smoothstep(-0.012,-0.004,d);
  c+=vec3(0.6,0.55,1.0)*border*0.9;
  c*=0.93+0.07*sin(vUv.y*260.0+uTime*3.0);
  float rev=smoothstep(0.0,0.12,uReveal*1.12-(1.0-vUv.y));
  float lead=smoothstep(0.05,0.0,abs(uReveal*1.12-(1.0-vUv.y)-0.03))*step(uReveal,0.98);
  if(rev<0.01) discard;
  gl_FragColor=vec4(c*rev+vec3(0.7,0.8,1.0)*lead*2.0,1.0);
}`;
const GL_GLOW_F = `
uniform vec3 uCol; uniform float uA; varying vec2 vUv;
void main(){
  float x=abs(vUv.x-0.5)*2.0; float y=vUv.y;
  float a=(1.0-smoothstep(0.0,1.0,x))*pow(1.0-y,1.6);
  gl_FragColor=vec4(uCol*a*uA,1.0);
}`;

/* ---------- project covers: LED posters ---------- */
const GL_COVER_V = `
uniform float uVel; varying vec2 vUv;
void main(){
  vUv=uv; vec3 p=position;
  p.y+=sin(uv.x*3.14159)*uVel*0.05;
  p.x+=(uv.y-0.5)*uVel*0.04;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);
}`;
const GL_COVER_F = `
uniform sampler2D tMap; uniform vec2 uCells,uM; uniform float uHover,uTime,uVel,uRad,uAsp,uA; varying vec2 vUv;
void main(){
  vec2 uv=vUv;
  vec2 dm=uv-uM; dm.x*=uAsp; float dl=length(dm);
  uv+=normalize(dm+vec2(1e-4))*sin(dl*26.0-uTime*5.0)*0.006*uHover*exp(-dl*3.0);
  uv=(uv-0.5)*(1.0-0.05*uHover)+0.5;
  vec2 g=uv*uCells; vec2 id=floor(g)+0.5; vec2 f=fract(g)-0.5;
  float sh=uVel*0.5;
  vec3 c=vec3(texture2D(tMap,(id+vec2(sh,0.0))/uCells).r,texture2D(tMap,id/uCells).g,texture2D(tMap,(id-vec2(sh,0.0))/uCells).b);
  c=pow(c,vec3(2.2));
  float lum=dot(c,vec3(0.3,0.59,0.11));
  float r=mix(0.36,0.78,uHover)*(0.78+0.3*lum);
  float dotm=1.0-smoothstep(r-0.14,r,length(f));
  vec3 col=c*dotm*mix(1.45,1.1,uHover)+c*0.09+vec3(0.011,0.012,0.017);
  vec2 hs=vec2(uAsp,1.0)*0.5;
  vec2 q=abs((vUv-0.5)*vec2(uAsp,1.0))-hs+uRad;
  float d=length(max(q,0.0))-uRad;
  float m=1.0-smoothstep(-0.004,0.0,d);
  gl_FragColor=vec4(col,m*uA);
}`;
