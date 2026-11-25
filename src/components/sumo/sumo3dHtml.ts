import { THREE_OFFLINE_JS } from './threeOfflineSource';

/**
 * Generates a 100% self-contained, zero-CDN HTML document for Android/iOS WebView
 * rendering the procedural Mini-Sumo 500g 3D model (ESP32 + GY-521 + 5-cutout blade +
 * yellow silicone wheels + live 4 IR sensor cones + Dohyo ring + XYZ pivot axes)
 * over a live transparent X/Y/Z oscilloscope background graph.
 *
 * Coordinate contract:
 *  - Robot front blade points toward -Z (facing camera / user screen by default).
 *  - +Y is UP, +X is robot RIGHT.
 *  - Firmware Pitch > 0 (blade UP) -> Three.js +X rotation.
 *  - Firmware Yaw > 0 (CCW/left) -> Three.js +Y rotation.
 *  - Firmware Roll > 0 (right side down) -> Three.js -Z rotation.
 */
export function buildSumo3DHtml(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  html, body {
    width: 100%; height: 100%; overflow: hidden;
    background: #0b0b0e; color: #f4f4f5;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    user-select: none; -webkit-user-select: none;
  }
  #stage { position: relative; width: 100%; height: 100%; overflow: hidden; }
  #bg-graph {
    position: absolute; inset: 0; width: 100%; height: 100%;
    z-index: 0; pointer-events: none;
  }
  #gl-host {
    position: absolute; inset: 0; width: 100%; height: 100%;
    z-index: 1; transition: opacity 0.25s ease;
  }
  #gl-host.offline { opacity: 0.72; }
  #gl-host canvas { display: block; width: 100% !important; height: 100% !important; outline: none; }
  #hud-top {
    position: absolute; top: 8px; left: 8px; right: 8px; z-index: 3;
    display: flex; align-items: center; justify-content: space-between;
    pointer-events: none; gap: 6px;
  }
  .pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 7px; border-radius: 5px;
    background: rgba(14,14,18,0.82); border: 1px solid rgba(255,255,255,0.1);
    font-size: 9px; font-weight: 700; letter-spacing: 0.5px; color: #d4d4d8;
  }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: #71717a; }
  .dot.live { background: #22c55e; }
  .dot.warn { background: #f59e0b; }
  #hud-bottom {
    position: absolute; bottom: 7px; left: 8px; right: 8px; z-index: 3;
    display: flex; align-items: center; justify-content: space-between;
    pointer-events: none; font-size: 9px; color: #9a9aa6;
  }
  .legend { display: flex; align-items: center; gap: 8px; background: rgba(10,10,14,0.72); padding: 2px 7px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.07); }
  .lg-item { display: inline-flex; align-items: center; gap: 4px; }
  .sw { width: 8px; height: 2px; border-radius: 1px; }
</style>
</head>
<body>
<div id="stage">
  <canvas id="bg-graph"></canvas>
  <div id="gl-host"></div>
  <div id="hud-top">
    <div class="pill"><span id="st-dot" class="dot"></span><span id="st-txt">OFFLINE · POSE NEUTRA</span></div>
    <div id="angle-pill" class="pill">P 0.0° · R 0.0° · Y 0.0°</div>
  </div>
  <div id="hud-bottom">
    <div class="legend" id="graph-legend">
      <span class="lg-item"><span class="sw" style="background:#ff4d00"></span><span id="lg-x">PITCH</span></span>
      <span class="lg-item"><span class="sw" style="background:#22c55e"></span><span id="lg-y">ROLL</span></span>
      <span class="lg-item"><span class="sw" style="background:#38bdf8"></span><span id="lg-z">YAW</span></span>
    </div>
    <div class="pill" style="font-weight:500;color:#8e8e98">Arraste p/ orbitar</div>
  </div>
</div>

<script>${THREE_OFFLINE_JS}</script>
<script>
(function() {
  var T = window.__SUMO_THREE__;
  if (!T) return;

  var state = {
    connected: false,
    pitchDeg: 0,
    rollDeg: 0,
    yawDeg: 0,
    yawOffsetRad: 0,
    ax: 0, ay: 0, az: 9.81,
    se: 0, sce: 0, scd: 0, sd: 0,
    leEdge: false, ldEdge: false,
    styleMode: 'tech',
    graphMode: 'deg', // 'deg' | 'accel'
    cameraLerp: null,
  };

  var MAX_HIST = 84;
  var histX = new Array(MAX_HIST).fill(0);
  var histY = new Array(MAX_HIST).fill(0);
  var histZ = new Array(MAX_HIST).fill(0);

  var Y_AXIS = new T.Vector3(0, 1, 0);
  var qImu = new T.Quaternion();
  var qYawOffInv = new T.Quaternion();
  var qTarget = new T.Quaternion();
  var qCurrent = new T.Quaternion();

  var scene, camera, renderer, controls;
  var imuGroup, robotRoot, sensorConesGroup, dohyoRingMat;
  var pbrMap = new Map(), celMap = new Map(), edgePairs = [], sensorCones = {};
  var hudCoreMat = null, toonGrad = null;

  // --- Procedural Canvas Textures ---
  function makeToonGrad() {
    var c = new Uint8Array([95,95,95,255, 180,180,180,255, 255,255,255,255]);
    var tex = new T.DataTexture(c, 3, 1, T.RGBAFormat);
    tex.minFilter = T.NearestFilter; tex.magFilter = T.NearestFilter;
    tex.generateMipmaps = false; tex.needsUpdate = true;
    return tex;
  }

  function makeMainPcbTex() {
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 384;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = '#121418'; ctx.fillRect(0,0,512,384);
    ctx.strokeStyle = '#1e222b'; ctx.lineWidth = 3;
    for (var i = 0; i < 18; i++) {
      var y = 28 + i * 19;
      ctx.beginPath(); ctx.moveTo(18, y); ctx.lineTo(135 + (i % 5) * 32, y);
      ctx.lineTo(175 + (i % 5) * 32, y + 20); ctx.lineTo(488, y + 20); ctx.stroke();
    }
    ctx.strokeStyle = '#9ca3af'; ctx.lineWidth = 2; ctx.strokeRect(8,8,496,368);
    var pads = function(x0,y0,cols,rows,p) {
      ctx.strokeStyle = '#d4d4d8'; ctx.lineWidth = 1.5;
      ctx.strokeRect(x0-6,y0-6,cols*p+8,rows*p+8);
      for (var r=0;r<rows;r++) for (var c=0;c<cols;c++) {
        var px = x0+c*p+4, py = y0+r*p+4;
        ctx.fillStyle='#cbd5e1'; ctx.beginPath(); ctx.arc(px,py,4.5,0,6.283); ctx.fill();
        ctx.fillStyle='#09090b'; ctx.beginPath(); ctx.arc(px,py,2.0,0,6.283); ctx.fill();
      }
    };
    pads(40,30,8,3,16); pads(88,128,3,5,16); pads(220,298,2,1,24); pads(290,298,2,1,24);
    ctx.fillStyle='#d4d4d8'; ctx.font='600 11px monospace';
    ctx.fillText('D39 D34 D35 D32 D33 D25 D26', 30, 92);
    ctx.fillText('GND +5V', 82, 118); ctx.fillText('I2C IMU', 392, 265);
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function makeEspPcbTex() {
    var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
    var ctx = cv.getContext('2d');
    ctx.fillStyle='#14161b'; ctx.fillRect(0,0,512,256);
    ctx.strokeStyle='#3f3f46'; ctx.lineWidth=3; ctx.strokeRect(4,4,504,248);
    for (var i=0;i<15;i++) {
      var px = 38+i*26;
      [22,234].forEach(function(py) {
        ctx.fillStyle='#d4d4d8'; ctx.beginPath(); ctx.arc(px,py,6,0,6.283); ctx.fill();
        ctx.fillStyle='#09090b'; ctx.beginPath(); ctx.arc(px,py,2.5,0,6.283); ctx.fill();
      });
    }
    ctx.strokeStyle='#d4a72c'; ctx.lineWidth=5;
    ctx.beginPath(); ctx.moveTo(450,175); ctx.lineTo(450,75); ctx.lineTo(470,75);
    ctx.lineTo(470,155); ctx.lineTo(490,155); ctx.lineTo(490,82); ctx.stroke();
    ctx.fillStyle='#27272a'; ctx.fillRect(114,118,44,44);
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function makeEspShieldTex() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    var ctx = cv.getContext('2d');
    ctx.fillStyle='#cfd5dc'; ctx.fillRect(0,0,256,256);
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=1;
    for (var y=0;y<256;y+=3){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke(); }
    ctx.strokeStyle='#94a3b8'; ctx.lineWidth=6; ctx.strokeRect(8,8,240,240);
    ctx.fillStyle='#475569'; ctx.font='700 20px monospace'; ctx.textAlign='center';
    ctx.fillText('ESP-WROOM-32', 128, 114);
    ctx.font='500 13px monospace'; ctx.fillText('Wi-Fi + BLE', 128, 144);
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function makeGy521Tex() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 192;
    var ctx = cv.getContext('2d');
    ctx.fillStyle='#1b58c8'; ctx.fillRect(0,0,256,192);
    ctx.strokeStyle='#93c5fd'; ctx.lineWidth=3; ctx.strokeRect(6,6,244,180);
    var labels = ['INT','ADO','XCL','XDA','SDA','SCL','GND','VCC'];
    for (var i=0;i<8;i++){
      var px=26+i*29;
      ctx.fillStyle='#e2e8f0'; ctx.beginPath(); ctx.arc(px,24,7,0,6.283); ctx.fill();
      ctx.fillStyle='#0f172a'; ctx.beginPath(); ctx.arc(px,24,3,0,6.283); ctx.fill();
      ctx.fillStyle='#f8fafc'; ctx.font='700 11px monospace'; ctx.textAlign='center';
      ctx.fillText(labels[i], px, 48);
    }
    ctx.strokeStyle='#fff'; ctx.fillStyle='#fff'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(32,135); ctx.lineTo(74,135); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(74,135); ctx.lineTo(65,129); ctx.lineTo(65,141); ctx.fill();
    ctx.beginPath(); ctx.moveTo(32,135); ctx.lineTo(32,92); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(32,92); ctx.lineTo(26,101); ctx.lineTo(38,101); ctx.fill();
    ctx.font='700 14px monospace'; ctx.textAlign='left'; ctx.fillText('X',80,140); ctx.fillText('Y',26,84);
    ctx.textAlign='center'; ctx.font='700 20px monospace'; ctx.fillText('GY-521', 152, 174);
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function makeHubTex() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    var ctx = cv.getContext('2d');
    var g = ctx.createRadialGradient(128,128,8,128,128,128);
    g.addColorStop(0,'#d8dfe6'); g.addColorStop(0.55,'#bac2cb'); g.addColorStop(1,'#9ca4ae');
    ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=1.5;
    for (var r=18;r<124;r+=6){ ctx.beginPath(); ctx.arc(128,128,r,0,6.283); ctx.stroke(); }
    [[128,128,13],[128,86,8],[128,170,8]].forEach(function(b){
      ctx.fillStyle='#3f3f46'; ctx.beginPath(); ctx.arc(b[0],b[1],b[2],0,6.283); ctx.fill();
      ctx.strokeStyle='#e4e4e7'; ctx.lineWidth=2; ctx.stroke();
    });
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function makeSteelTex() {
    var cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    var ctx = cv.getContext('2d');
    ctx.fillStyle='#8b929c'; ctx.fillRect(0,0,256,128);
    for (var i=0;i<95;i++){
      var y=(i*1.35)%128;
      ctx.strokeStyle = i%2===0 ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.12)';
      ctx.lineWidth=1+(i%3)*0.4; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(256,y); ctx.stroke();
    }
    var tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; return tex;
  }

  function buildRobot() {
    robotRoot = new T.Group();
    robotRoot.name = 'MiniSumo_500g';

    var matChassis = new T.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.82, metalness: 0.06 });
    var matDark = new T.MeshStandardMaterial({ color: 0x101215, roughness: 0.88, metalness: 0.04 });
    var matLens = new T.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.14, metalness: 0.45 });
    var matBlade = new T.MeshStandardMaterial({ map: makeSteelTex(), color: 0xa6aeb8, metalness: 0.78, roughness: 0.34 });
    var matSilicone = new T.MeshStandardMaterial({ color: 0xecd02f, roughness: 0.46, metalness: 0.02, transparent: true, opacity: 0.94 });
    var matAlu = new T.MeshStandardMaterial({ map: makeHubTex(), color: 0xd4dae2, metalness: 0.86, roughness: 0.24 });
    var matSilver = new T.MeshStandardMaterial({ color: 0xd0d6de, metalness: 0.84, roughness: 0.26 });
    var matPcbSide = new T.MeshStandardMaterial({ color: 0x14161a, roughness: 0.7, metalness: 0.1 });
    var matPcbTop = new T.MeshStandardMaterial({ map: makeMainPcbTex(), roughness: 0.54, metalness: 0.14 });
    var matEspTop = new T.MeshStandardMaterial({ map: makeEspPcbTex(), roughness: 0.54, metalness: 0.14 });
    var matEspShield = new T.MeshStandardMaterial({ map: makeEspShieldTex(), color: 0xd8dee6, metalness: 0.86, roughness: 0.22 });
    var matGySide = new T.MeshStandardMaterial({ color: 0x1d5fd1, roughness: 0.52, metalness: 0.14 });
    var matGyTop = new T.MeshStandardMaterial({ map: makeGy521Tex(), roughness: 0.44, metalness: 0.14 });
    var matCap = new T.MeshStandardMaterial({ color: 0x181c22, roughness: 0.34, metalness: 0.24 });
    var matLed = new T.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.85, roughness: 0.3 });

    // 1. Chassis
    var chassis = new T.Group();
    var rs = new T.Shape();
    rs.moveTo(-0.31,-0.195); rs.lineTo(0.08,-0.195); rs.lineTo(0.08,0.125);
    rs.lineTo(-0.155,0.125); rs.lineTo(-0.155,0.198); rs.lineTo(-0.184,0.198);
    rs.lineTo(-0.184,0.118); rs.closePath();
    var rg = new T.ExtrudeGeometry(rs, { depth: 0.86, bevelEnabled: false });
    rg.translate(0,0,-0.43); rg.rotateY(-Math.PI/2);
    chassis.add(new T.Mesh(rg, matChassis));

    var deckRear = new T.Mesh(new T.BoxGeometry(0.88,0.042,0.37), matChassis);
    deckRear.position.set(0,0.104,0.265); chassis.add(deckRear);
    var rearBlock = new T.Mesh(new T.BoxGeometry(0.56,0.17,0.36), matChassis);
    rearBlock.position.set(0,-0.11,0.25); chassis.add(rearBlock);
    var rearSkid = new T.Mesh(new T.BoxGeometry(0.47,0.022,0.32), matDark);
    rearSkid.position.set(0,-0.206,0.25); chassis.add(rearSkid);
    var bay = new T.Mesh(new T.BoxGeometry(0.50,0.105,0.28), matDark);
    bay.position.set(0,0.028,0.24); chassis.add(bay);

    var makePod = function() {
      var p = new T.Group();
      p.add(new T.Mesh(new T.BoxGeometry(0.155,0.105,0.024), matDark));
      var b = new T.Mesh(new T.BoxGeometry(0.125,0.075,0.026), matChassis);
      b.position.z = 0.004; p.add(b);
      var lg = new T.CylinderGeometry(0.021,0.021,0.014,12); lg.rotateX(Math.PI/2);
      var l1 = new T.Mesh(lg, matLens); l1.position.set(-0.029,0.002,0.014); p.add(l1);
      var l2 = new T.Mesh(lg, matLens); l2.position.set(0.029,0.002,0.014); p.add(l2);
      return p;
    };
    var slope = Math.atan2(0.126, 0.313);
    [-0.215, 0.215].forEach(function(xp) {
      var fp = makePod(); fp.position.set(xp,-0.055,-0.252);
      fp.rotation.y = Math.PI; fp.rotation.x = -slope; chassis.add(fp);
    });
    var lp = makePod(); lp.position.set(-0.424,-0.095,-0.085); lp.rotation.y = -Math.PI/2; chassis.add(lp);
    var rp = makePod(); rp.position.set(0.424,-0.095,-0.085); rp.rotation.y = Math.PI/2; chassis.add(rp);
    robotRoot.add(chassis);

    // 2. Blade with 5 real cutouts
    var blade = new T.Group();
    var bw = 0.96, bd = 0.205;
    var bs = new T.Shape();
    bs.moveTo(-bw/2,0); bs.lineTo(bw/2,0); bs.lineTo(bw/2,bd); bs.lineTo(-bw/2,bd); bs.closePath();
    [-0.405, 0.405].forEach(function(cx){
      var h = new T.Path(); h.absarc(cx, bd*0.5, 0.022, 0, Math.PI*2, false); bs.holes.push(h);
    });
    var addT = function(cx, cy, dir) {
      var p = new T.Path();
      p.moveTo(cx-0.022*dir,cy-0.044); p.lineTo(cx+0.018*dir,cy-0.044);
      p.lineTo(cx+0.018*dir,cy-0.018); p.lineTo(cx+0.056*dir,cy-0.018);
      p.lineTo(cx+0.056*dir,cy+0.018); p.lineTo(cx+0.018*dir,cy+0.018);
      p.lineTo(cx+0.018*dir,cy+0.044); p.lineTo(cx-0.022*dir,cy+0.044); p.closePath();
      bs.holes.push(p);
    };
    addT(-0.235, bd*0.52, 1); addT(0.235, bd*0.52, -1);
    var cs = new T.Path();
    cs.moveTo(-0.04,bd*0.52-0.018); cs.lineTo(0.04,bd*0.52-0.018);
    cs.lineTo(0.04,bd*0.52+0.018); cs.lineTo(-0.04,bd*0.52+0.018); cs.closePath();
    bs.holes.push(cs);
    var bg = new T.ExtrudeGeometry(bs, { depth: 0.011, bevelEnabled: false, curveSegments: 8 });
    var bm = new T.Mesh(bg, matBlade); bm.name = 'blade_steel';
    bm.rotation.x = Math.PI/2 - 0.31; bm.position.set(0,-0.222,-0.495); blade.add(bm);
    [-0.36,0.36].forEach(function(bx){
      var br = new T.Mesh(new T.BoxGeometry(0.07,0.026,0.095), matDark);
      br.position.set(bx,-0.212,-0.355); blade.add(br);
    });
    robotRoot.add(blade);

    // 3 & 4. Wheels
    [false, true].forEach(function(isR) {
      var wg = new T.Group(); var s = isR ? 1 : -1;
      wg.position.set(s*0.39, -0.055, 0.265);
      var tg = new T.CylinderGeometry(0.175,0.175,0.165,24); tg.rotateZ(Math.PI/2);
      var tm = new T.Mesh(tg, matSilicone); tm.name = 'wheel_tire'; wg.add(tm);
      var hg = new T.CylinderGeometry(0.122,0.122,0.016,20); hg.rotateZ(Math.PI/2);
      var hm = new T.Mesh(hg, matAlu); hm.name = 'wheel_hub'; hm.position.x = s*0.079; wg.add(hm);
      var ag = new T.CylinderGeometry(0.022,0.022,0.022,10); ag.rotateZ(Math.PI/2);
      var am = new T.Mesh(ag, matSilver); am.position.x = s*0.082; wg.add(am);
      robotRoot.add(wg);
    });

    // 5. Main PCB
    var pcb = new T.Group();
    var board = new T.Mesh(new T.BoxGeometry(0.86,0.018,0.59), [matPcbSide,matPcbSide,matPcbTop,matPcbSide,matPcbSide,matPcbSide]);
    board.position.set(0,0.134,0.145); pcb.add(board);
    [[-0.375,0.245,0.026,0.068],[-0.320,0.258,0.026,0.068],[0.065,0.340,0.035,0.088]].forEach(function(c){
      var cg = new T.Group(); cg.position.set(c[0], 0.143+c[3]/2, c[1]);
      cg.add(new T.Mesh(new T.CylinderGeometry(c[2],c[2],c[3],12), matCap));
      var top = new T.Mesh(new T.CylinderGeometry(c[2]*0.9,c[2]*0.9,0.005,12), matSilver);
      top.position.y = c[3]/2 + 0.001; cg.add(top); pcb.add(cg);
    });
    var sw = new T.Mesh(new T.BoxGeometry(0.048,0.036,0.082), matSilver); sw.position.set(-0.382,0.161,0.355); pcb.add(sw);
    var tb = new T.Mesh(new T.BoxGeometry(0.056,0.024,0.056), matSilver); tb.position.set(-0.245,0.155,0.378); pcb.add(tb);
    var ir = new T.Mesh(new T.BoxGeometry(0.064,0.072,0.052), matDark); ir.position.set(-0.145,0.179,0.365); pcb.add(ir);
    robotRoot.add(pcb);

    // 6. ESP32-WROOM-32
    var esp = new T.Group(); esp.position.set(0.13, 0.202, 0.035);
    [-0.115, 0.115].forEach(function(zo){
      var ri = new T.Mesh(new T.BoxGeometry(0.46,0.052,0.024), matDark); ri.position.set(-0.02,-0.033,zo); esp.add(ri);
      var ps = new T.Mesh(new T.BoxGeometry(0.42,0.012,0.012), matSilver); ps.position.set(-0.03,0.012,zo); esp.add(ps);
    });
    var eb = new T.Mesh(new T.BoxGeometry(0.54,0.016,0.28), [matPcbSide,matPcbSide,matEspTop,matPcbSide,matPcbSide,matPcbSide]);
    eb.name = 'esp32'; esp.add(eb);
    var sh = new T.Mesh(new T.BoxGeometry(0.185,0.026,0.19), [matSilver,matSilver,matEspShield,matSilver,matSilver,matSilver]);
    sh.name = 'esp32_rf_shield'; sh.position.set(0.115,0.021,0); esp.add(sh);
    var usb = new T.Mesh(new T.BoxGeometry(0.052,0.024,0.075), matSilver); usb.position.set(-0.252,0.019,0); esp.add(usb);
    robotRoot.add(esp);

    // 7. GY-521 MPU-6050
    var imu = new T.Group(); imu.position.set(0.285, 0.150, 0.345);
    var gb = new T.Mesh(new T.BoxGeometry(0.225,0.014,0.155), [matGySide,matGySide,matGyTop,matGySide,matGySide,matGySide]);
    gb.name = 'gy521'; imu.add(gb);
    var ic = new T.Mesh(new T.BoxGeometry(0.042,0.009,0.042), matDark); ic.position.set(0.01,0.011,0.008); imu.add(ic);
    var led = new T.Mesh(new T.BoxGeometry(0.016,0.008,0.012), matLed); led.position.set(0.075,0.011,0.035); imu.add(led);
    robotRoot.add(imu);

    toonGrad = makeToonGrad();
    hudCoreMat = new T.MeshBasicMaterial({ color: 0x09101a, transparent: true, opacity: 0.48, depthWrite: true });

    var toCel = function(orig) {
      var fn = function(m) {
        return new T.MeshToonMaterial({
          color: m.color ? m.color.clone() : new T.Color(0xffffff),
          map: m.map || null,
          emissive: m.emissive ? m.emissive.clone() : new T.Color(0x000000),
          emissiveIntensity: m.emissiveIntensity || 0,
          transparent: !!m.transparent,
          opacity: m.opacity !== undefined ? m.opacity : 1,
          gradientMap: toonGrad,
        });
      };
      return Array.isArray(orig) ? orig.map(fn) : fn(orig);
    };

    robotRoot.traverse(function(obj) {
      if (obj.isMesh) {
        pbrMap.set(obj, obj.material);
        celMap.set(obj, toCel(obj.material));
        var eg = new T.EdgesGeometry(obj.geometry, 24);
        var em = new T.LineBasicMaterial({ color: 0x050507, transparent: true, opacity: 0.78 });
        var ln = new T.LineSegments(eg, em);
        ln.visible = false;
        obj.add(ln);
        edgePairs.push({ mesh: obj, line: ln });
      }
    });
    return robotRoot;
  }

  function buildCones() {
    sensorConesGroup = new T.Group();
    var mk = function(key, len, rad) {
      var g = new T.ConeGeometry(rad, len, 14, 1, true);
      g.translate(0, -len/2, 0); g.rotateX(-Math.PI/2);
      var m = new T.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.10, side: T.DoubleSide, depthWrite: false });
      var mesh = new T.Mesh(g, m);
      sensorCones[key] = mesh;
      return mesh;
    };
    var fl = mk('sce', 0.62, 0.13); fl.position.set(-0.215,-0.055,-0.265); fl.rotation.y = 0.08; sensorConesGroup.add(fl);
    var fr = mk('scd', 0.62, 0.13); fr.position.set(0.215,-0.055,-0.265); fr.rotation.y = -0.08; sensorConesGroup.add(fr);
    var sl = mk('se', 0.46, 0.11); sl.position.set(-0.435,-0.095,-0.085); sl.rotation.y = Math.PI/2; sensorConesGroup.add(sl);
    var sr = mk('sd', 0.46, 0.11); sr.position.set(0.435,-0.095,-0.085); sr.rotation.y = -Math.PI/2; sensorConesGroup.add(sr);
    return sensorConesGroup;
  }

  function buildDohyoAndAxes() {
    var g = new T.Group();
    g.position.y = -0.232;
    var disk = new T.Mesh(
      new T.CircleGeometry(1.55, 48),
      new T.MeshStandardMaterial({ color: 0x0d0d11, roughness: 0.94, metalness: 0.02, transparent: true, opacity: 0.36 })
    );
    disk.rotation.x = -Math.PI/2; g.add(disk);
    dohyoRingMat = new T.MeshBasicMaterial({ color: 0x71717a, side: T.DoubleSide, transparent: true, opacity: 0.75 });
    var ring = new T.Mesh(new T.RingGeometry(1.48, 1.55, 48), dohyoRingMat);
    ring.rotation.x = -Math.PI/2; ring.position.y = 0.002; g.add(ring);
    var grid = new T.PolarGridHelper(1.46, 8, 3, 36, 0x27272a, 0x1b1b20);
    grid.position.y = 0.001; g.add(grid);
    scene.add(g);

    var axes = new T.Group();
    var mkAx = function(v, len, col) {
      var geo = new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,0), v.multiplyScalar(len)]);
      var line = new T.Line(geo, new T.LineBasicMaterial({ color: col, depthTest: false, transparent: true, opacity: 0.75 }));
      line.renderOrder = 99; return line;
    };
    axes.add(mkAx(new T.Vector3(1,0,0), 0.72, 0xef4444));
    axes.add(mkAx(new T.Vector3(0,1,0), 0.55, 0x22c55e));
    axes.add(mkAx(new T.Vector3(0,0,-1), 0.85, 0x38bdf8));
    scene.add(axes);
  }

  var camPresets = {
    iso:   { pos: new T.Vector3(1.18, 0.92, -1.82), tgt: new T.Vector3(0, -0.02, 0) },
    front: { pos: new T.Vector3(0, 0.32, -2.05),    tgt: new T.Vector3(0, -0.02, 0) },
    side:  { pos: new T.Vector3(2.05, 0.28, 0),     tgt: new T.Vector3(0, -0.02, 0) },
    top:   { pos: new T.Vector3(0, 2.25, -0.06),    tgt: new T.Vector3(0, 0, 0) },
  };

  function applyStyle(mode) {
    state.styleMode = mode;
    pbrMap.forEach(function(pbr, mesh) {
      mesh.material = mode === 'tech' ? pbr : mode === 'cel' ? celMap.get(mesh) : hudCoreMat;
    });
    edgePairs.forEach(function(pair) {
      if (mode === 'cel') {
        pair.line.visible = true;
        var light = pair.mesh.name.indexOf('tire') >= 0 || pair.mesh.name.indexOf('hub') >= 0 || pair.mesh.name.indexOf('blade') >= 0;
        pair.line.material.color.setHex(light ? 0x09090b : 0x63666f);
        pair.line.material.opacity = light ? 0.88 : 0.58;
      } else if (mode === 'hud') {
        pair.line.visible = true;
        var isCore = pair.mesh.name.indexOf('gy521') >= 0 || pair.mesh.name.indexOf('esp32') >= 0;
        var isAcc = pair.mesh.name.indexOf('blade') >= 0 || pair.mesh.name.indexOf('wheel') >= 0;
        pair.line.material.color.setHex(isCore ? 0x34d399 : isAcc ? 0xff4d00 : 0x52525b);
        pair.line.material.opacity = isCore || isAcc ? 0.95 : 0.65;
      } else {
        pair.line.visible = false;
      }
    });
  }

  function updateTargetQuat() {
    if (!state.connected) {
      qTarget.identity();
      return;
    }
    var pRad = T.MathUtils.degToRad(state.pitchDeg);
    var yRad = T.MathUtils.degToRad(state.yawDeg);
    var rRad = T.MathUtils.degToRad(-state.rollDeg);
    qImu.setFromEuler(new T.Euler(pRad, yRad, rRad, 'YXZ'));
    qYawOffInv.setFromAxisAngle(Y_AXIS, -state.yawOffsetRad);
    qTarget.copy(qYawOffInv).multiply(qImu).normalize();
  }

  function updateConesAndHud() {
    var host = document.getElementById('gl-host');
    var dot = document.getElementById('st-dot');
    var txt = document.getElementById('st-txt');
    var ang = document.getElementById('angle-pill');

    if (!state.connected) {
      host.classList.add('offline');
      dot.className = 'dot';
      txt.textContent = 'OFFLINE · POSE NEUTRA';
      ang.textContent = 'P 0.0° · R 0.0° · Y 0.0°';
    } else {
      host.classList.remove('offline');
      var tilted = Math.abs(state.pitchDeg) > 15 || Math.abs(state.rollDeg) > 15;
      dot.className = tilted ? 'dot warn' : 'dot live';
      txt.textContent = tilted ? '3D LIVE · INCLINADO' : '3D LIVE · IMU ATIVA';
      var dispYaw = ((state.yawDeg - T.MathUtils.radToDeg(state.yawOffsetRad) + 540) % 360) - 180;
      ang.textContent = 'P ' + (state.pitchDeg >= 0 ? '+' : '') + state.pitchDeg.toFixed(1) + '° · R ' + (state.rollDeg >= 0 ? '+' : '') + state.rollDeg.toFixed(1) + '° · Y ' + dispYaw.toFixed(1) + '°';
    }

    var map = { se: state.se, sce: state.sce, scd: state.scd, sd: state.sd };
    Object.keys(map).forEach(function(k) {
      var cone = sensorCones[k];
      if (!cone) return;
      if (!state.connected) {
        cone.material.color.setHex(0x38bdf8);
        cone.material.opacity = 0.04;
      } else if (map[k] === 1) {
        cone.material.color.setHex(0xff4d00);
        cone.material.opacity = 0.56;
      } else {
        cone.material.color.setHex(0x38bdf8);
        cone.material.opacity = 0.11;
      }
    });

    if (dohyoRingMat) {
      var edge = state.connected && (state.leEdge || state.ldEdge);
      dohyoRingMat.color.setHex(edge ? 0xef4444 : 0x71717a);
      dohyoRingMat.opacity = edge ? 0.95 : 0.65;
    }
  }

  // --- Live X/Y/Z Background Oscilloscope Canvas ---
  var bgCanvas = document.getElementById('bg-graph');
  var bgCtx = bgCanvas.getContext('2d');

  function drawBgGraph() {
    var w = bgCanvas.width, h = bgCanvas.height;
    if (!w || !h) return;
    bgCtx.clearRect(0, 0, w, h);

    // Subtle oscilloscope grid
    bgCtx.strokeStyle = 'rgba(255,255,255,0.045)';
    bgCtx.lineWidth = 1;
    var rows = 4, cols = 6;
    for (var r = 1; r < rows; r++) {
      var gy = Math.round((h / rows) * r) + 0.5;
      bgCtx.beginPath(); bgCtx.moveTo(0, gy); bgCtx.lineTo(w, gy); bgCtx.stroke();
    }
    for (var c = 1; c < cols; c++) {
      var gx = Math.round((w / cols) * c) + 0.5;
      bgCtx.beginPath(); bgCtx.moveTo(gx, 0); bgCtx.lineTo(gx, h); bgCtx.stroke();
    }
    // Center zero line
    bgCtx.strokeStyle = 'rgba(255,255,255,0.09)';
    bgCtx.beginPath(); bgCtx.moveTo(0, h * 0.5); bgCtx.lineTo(w, h * 0.5); bgCtx.stroke();

    var scale = state.graphMode === 'deg' ? 95 : 12;
    var plot = function(arr, color) {
      bgCtx.strokeStyle = color;
      bgCtx.lineWidth = 1.6;
      bgCtx.beginPath();
      for (var i = 0; i < arr.length; i++) {
        var x = (i / (arr.length - 1)) * w;
        var norm = Math.max(-1, Math.min(1, arr[i] / scale));
        var y = h * 0.5 - norm * (h * 0.38);
        if (i === 0) bgCtx.moveTo(x, y);
        else bgCtx.lineTo(x, y);
      }
      bgCtx.stroke();
    };

    plot(histX, 'rgba(255,77,0,0.62)');
    plot(histY, 'rgba(34,197,94,0.58)');
    plot(histZ, 'rgba(56,189,248,0.58)');
  }

  function pushSample() {
    if (!state.connected) return;
    var vx, vy, vz;
    if (state.graphMode === 'deg') {
      vx = state.pitchDeg;
      vy = state.rollDeg;
      vz = (((state.yawDeg - T.MathUtils.radToDeg(state.yawOffsetRad) + 540) % 360) - 180) * 0.5;
    } else {
      vx = state.ax;
      vy = state.ay;
      vz = state.az - 9.81;
    }
    histX.push(vx); if (histX.length > MAX_HIST) histX.shift();
    histY.push(vy); if (histY.length > MAX_HIST) histY.shift();
    histZ.push(vz); if (histZ.length > MAX_HIST) histZ.shift();
    drawBgGraph();
  }

  // --- Public Bridge Called from React Native ---
  window.__SUMO_UPDATE__ = function(payload) {
    if (!payload) return;
    state.connected = !!payload.connected;
    if (typeof payload.pitchDeg === 'number') state.pitchDeg = payload.pitchDeg;
    if (typeof payload.rollDeg === 'number') state.rollDeg = payload.rollDeg;
    if (typeof payload.yawDeg === 'number') state.yawDeg = payload.yawDeg;
    if (typeof payload.ax === 'number') state.ax = payload.ax;
    if (typeof payload.ay === 'number') state.ay = payload.ay;
    if (typeof payload.az === 'number') state.az = payload.az;
    state.se = payload.se ? 1 : 0;
    state.sce = payload.sce ? 1 : 0;
    state.scd = payload.scd ? 1 : 0;
    state.sd = payload.sd ? 1 : 0;
    state.leEdge = !!payload.leEdge;
    state.ldEdge = !!payload.ldEdge;
    if (payload.clearLocalTare) state.yawOffsetRad = 0;

    updateTargetQuat();
    updateConesAndHud();
    pushSample();
  };

  window.__SUMO_CMD__ = function(cmd, arg) {
    if (cmd === 'cam' && camPresets[arg] && camera && controls) {
      state.cameraLerp = {
        sp: camera.position.clone(), ep: camPresets[arg].pos.clone(),
        st: controls.target.clone(), et: camPresets[arg].tgt.clone(), t: 0,
      };
    } else if (cmd === 'style') {
      applyStyle(arg || 'tech');
    } else if (cmd === 'graph') {
      state.graphMode = arg === 'accel' ? 'accel' : 'deg';
      document.getElementById('lg-x').textContent = state.graphMode === 'deg' ? 'PITCH' : 'aX';
      document.getElementById('lg-y').textContent = state.graphMode === 'deg' ? 'ROLL' : 'aY';
      document.getElementById('lg-z').textContent = state.graphMode === 'deg' ? 'YAW' : 'aZ-g';
      histX.fill(0); histY.fill(0); histZ.fill(0);
      drawBgGraph();
    } else if (cmd === 'tare') {
      var e = new T.Euler().setFromQuaternion(qImu, 'YXZ');
      state.yawOffsetRad = e.y;
      updateTargetQuat();
      updateConesAndHud();
    } else if (cmd === 'clearTare') {
      state.yawOffsetRad = 0;
      updateTargetQuat();
      updateConesAndHud();
    }
  };

  function resize() {
    var host = document.getElementById('gl-host');
    var w = Math.max(1, host.clientWidth || window.innerWidth);
    var h = Math.max(1, host.clientHeight || window.innerHeight);
    bgCanvas.width = w; bgCanvas.height = h;
    drawBgGraph();
    if (camera && renderer) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h, false);
    }
  }

  function init() {
    var host = document.getElementById('gl-host');
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(36, Math.max(1, host.clientWidth) / Math.max(1, host.clientHeight), 0.05, 30);
    camera.position.copy(camPresets.iso.pos);

    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    host.appendChild(renderer.domElement);

    scene.add(new T.HemisphereLight(0xf8fafc, 0x18181b, 1.2));
    var key = new T.DirectionalLight(0xffffff, 2.1); key.position.set(2.2, 3.4, -2.4); scene.add(key);
    var fill = new T.DirectionalLight(0x93c5fd, 0.85); fill.position.set(-2.5, 1.8, 2.0); scene.add(fill);
    var rim = new T.DirectionalLight(0xfef08a, 0.55); rim.position.set(0.6, 1.3, 2.8); scene.add(rim);

    controls = new T.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.9;
    controls.maxDistance = 4.6;
    controls.target.copy(camPresets.iso.tgt);
    controls.addEventListener('start', function() { state.cameraLerp = null; });

    imuGroup = new T.Group();
    scene.add(imuGroup);
    imuGroup.add(buildRobot());
    imuGroup.add(buildCones());
    buildDohyoAndAxes();

    applyStyle('tech');
    updateConesAndHud();
    resize();
    window.addEventListener('resize', resize);

    var clock = new T.Clock();
    function tick() {
      requestAnimationFrame(tick);
      var dt = Math.min(clock.getDelta(), 0.05);
      qCurrent.slerp(qTarget, Math.min(1, dt * 13));
      imuGroup.quaternion.copy(qCurrent);

      if (state.cameraLerp) {
        state.cameraLerp.t = Math.min(1, state.cameraLerp.t + dt * 4.0);
        var ease = 1 - Math.pow(1 - state.cameraLerp.t, 3);
        camera.position.lerpVectors(state.cameraLerp.sp, state.cameraLerp.ep, ease);
        controls.target.lerpVectors(state.cameraLerp.st, state.cameraLerp.et, ease);
        if (state.cameraLerp.t >= 1) state.cameraLerp = null;
      }

      controls.update();
      renderer.render(scene, camera);
    }
    tick();
  }

  init();
})();
</script>
</body>
</html>`;
}
