/* =====================================================================
   澄澄的小镇 · 房间页共用底座 room.js
   ---------------------------------------------------------------
   同一套存档、同一套声音、同一套手绘图形，三间房都复用，
   保证从小镇走进去时，声音和画风是连续的。
   ===================================================================== */
(function (global) {
  "use strict";

  var KEY = "chengcheng-town-v2";

  /* ---------------- 存档：和小镇主页面共用一条 ---------------- */
  var S = { stars: 0, visited: {}, cleared: {}, diff: "mid", hero: { x: 985, y: 772 },
            flowers: {}, sound: true, voice: true, silent: {}, rooms: {},
            folk: {}, bag: {} };
  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY));
      if (v && typeof v === "object") S = Object.assign(S, v);
    } catch (e) {}
    S.rooms = S.rooms || {};
    S.folk = S.folk || {};
    S.bag = S.bag || {};
    if (typeof S.stars !== "number" || S.stars < 0) S.stars = 0;
    if (S.sound === undefined) S.sound = true;
    if (S.voice === undefined) S.voice = true;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  /* ---------------- 背景音乐：五声音阶随机漫步 ---------------- */
  var Sound = (function () {
    var ctx = null, master = null, musicGain = null, timer = null, playing = false, step = 0;
    var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];
    var ROOT = 261.63;

    function ensure() {
      if (ctx) return ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.5;
        master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0;
        musicGain.connect(master);
      } catch (e) { ctx = null; }
      return ctx;
    }
    function tone(f, when, dur, vol, type) {
      if (!ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + dur + 0.05);
    }
    function tick() {
      if (!ctx || !playing) return;
      var now = ctx.currentTime;
      step++;
      if (step % 2 === 1) {
        var semi = SCALE[Math.floor(Math.random() * SCALE.length)];
        tone(ROOT * Math.pow(2, semi / 12), now, 1.6, 0.075, "triangle");
      }
      if (step % 8 === 0) {
        tone(ROOT / 2 * Math.pow(2, SCALE[Math.floor(Math.random() * 5)] / 12), now, 2.4, 0.055, "sine");
      }
    }
    return {
      start: function () {
        if (!ensure()) return;
        if (ctx.state === "suspended") ctx.resume();
        if (playing) return;
        playing = true;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.6);
        timer = setInterval(tick, 620);
      },
      stop: function () {
        if (!playing) return;
        playing = false;
        if (ctx) musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
        clearInterval(timer);
      },
      duck: function (on) {
        if (!ctx || !musicGain) return;
        var t = ctx.currentTime;
        musicGain.gain.cancelScheduledValues(t);
        musicGain.gain.setValueAtTime(musicGain.gain.value, t);
        musicGain.gain.linearRampToValueAtTime(on ? 0.12 : 0.5, t + 0.25);
      },
      blip: function (kind) {
        if (!ensure() || !S.sound) return;
        if (ctx.state === "suspended") ctx.resume();
        var now = ctx.currentTime;
        var seq = { ok: [523, 659], good: [523, 659, 784, 1046], soft: [392, 349], tap: [660] }[kind || "tap"] || [660];
        seq.forEach(function (f, i) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0, now + i * 0.08);
          g.gain.linearRampToValueAtTime(0.16, now + i * 0.08 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.3);
          o.connect(g); g.connect(master);
          o.start(now + i * 0.08); o.stop(now + i * 0.08 + 0.35);
        });
      }
    };
  })();

  /* ---------------- 语音：中文 TTS，优先女声 ---------------- */
  var Voice = (function () {
    var zh = null, ready = false, lastText = "", lastAt = 0;
    function pick() {
      var vs = window.speechSynthesis.getVoices() || [];
      var want = ["Xiaoxiao", "Xiaoyi", "Huihui", "Yaoyao", "Tingting", "Meijia", "Google 普通话"];
      for (var i = 0; i < want.length; i++) {
        for (var j = 0; j < vs.length; j++) {
          if (vs[j].name.indexOf(want[i]) >= 0) return vs[j];
        }
      }
      for (var k = 0; k < vs.length; k++) if (vs[k].lang && vs[k].lang.toLowerCase().indexOf("zh") === 0) return vs[k];
      return null;
    }
    function refresh() { zh = pick(); ready = true; }
    return {
      has: function () { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); },
      say: function (text, opts) {
        if (!text || !S.voice) return;
        if (!this.has()) return;
        var now = Date.now();
        if (text === lastText && now - lastAt < 2500) return;
        lastText = text; lastAt = now;
        if (!ready) refresh();
        try {
          window.speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(text);
          u.lang = "zh-CN";
          if (zh) u.voice = zh;
          u.rate = (opts && opts.rate) || 0.92;
          u.pitch = (opts && opts.pitch) || 1.15;
          u.onstart = function () { Sound.duck(true); };
          u.onend = function () { Sound.duck(false); };
          window.speechSynthesis.speak(u);
        } catch (e) {}
      },
      stop: function () { try { window.speechSynthesis.cancel(); Sound.duck(false); } catch (e) {} }
    };
  })();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = function () { Voice.say && (null); };
  }

  /* ---------------- 图形：人物与道具（和主页面同一套画法） ---------------- */
  var ART = {
    /* ============ 人物：统一"身高约 40 单位"的娃娃画法 ============
       坐标系 y=-24（头顶）到 y=16（脚底），x 左右各 ±13
       头 / 五官 / 脖子 / 身体 / 手臂 / 腿 / 鞋，分层画，谁都能一眼看懂 */
    girl: ''
      /* 双马尾 */
      + '<circle cx="-9.5" cy="-12" r="4.2" fill="#6b4630"/><circle cx="9.5" cy="-12" r="4.2" fill="#6b4630"/>'
      /* 腿和鞋 */
      + '<rect x="-5" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.8" cy="14.6" rx="3.4" ry="2.2" fill="#e05a72"/><ellipse cx="2.8" cy="14.6" rx="3.4" ry="2.2" fill="#e05a72"/>'
      /* 裙子 */
      + '<path d="M-7,-1 C-7,-4 7,-4 7,-1 L10,9 C5,11.4 -5,11.4 -10,9 Z" fill="#f7a8bd"/>'
      + '<path d="M-5.4,3.4 L5.4,3.4" stroke="#fff" stroke-width="1.4" opacity=".7" stroke-linecap="round"/>'
      /* 手臂 */
      + '<rect x="-11" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/><rect x="7" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/>'
      /* 脖子 + 头 */
      + '<rect x="-2" y="-6.4" width="4" height="3" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-12.6" r="7.6" fill="#fbe0cf"/>'
      /* 刘海 + 鬓发 */
      + '<path d="M-7.6,-12.6 C-7.6,-21 7.6,-21 7.6,-12.6 C7.6,-17 4,-19 0,-19 C-4,-19 -7.6,-17 -7.6,-12.6 Z" fill="#6b4630"/>'
      + '<path d="M-7.4,-11 C-8.6,-8 -8.4,-4 -7,-2 L-5.8,-2.8 C-7,-5 -7.2,-8 -6.4,-10.6 Z" fill="#6b4630"/>'
      + '<path d="M7.4,-11 C8.6,-8 8.4,-4 7,-2 L5.8,-2.8 C7,-5 7.2,-8 6.4,-10.6 Z" fill="#6b4630"/>'
      /* 五官 */
      + '<circle cx="-2.7" cy="-12.4" r="1.15" fill="#4a3327"/><circle cx="2.7" cy="-12.4" r="1.15" fill="#4a3327"/>'
      + '<circle cx="-2.4" cy="-12.8" r="0.42" fill="#fff"/><circle cx="3" cy="-12.8" r="0.42" fill="#fff"/>'
      + '<ellipse cx="-5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".6"/>'
      + '<ellipse cx="5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".6"/>'
      + '<path d="M-1.7,-9.4 Q0,-8 1.7,-9.4" stroke="#c9705f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',

    mom: ''
      + '<rect x="-5" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.8" cy="14.6" rx="3.4" ry="2.2" fill="#b4664f"/><ellipse cx="2.8" cy="14.6" rx="3.4" ry="2.2" fill="#b4664f"/>'
      /* 及膝长裙 */
      + '<path d="M-7.6,-1 C-7.6,-4 7.6,-4 7.6,-1 L9.6,10.5 C5,12.6 -5,12.6 -9.6,10.5 Z" fill="#e9a0b4"/>'
      + '<path d="M-6.6,2 L6.6,2" stroke="#fff" stroke-width="1.3" opacity=".65" stroke-linecap="round"/>'
      + '<rect x="-11.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/><rect x="7.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/>'
      + '<rect x="-2" y="-6.4" width="4" height="3" fill="#f0cdb6"/>'
      /* 长发披到肩 */
      + '<path d="M-8.6,-11 C-11,-4 -10.6,2 -9,5 L-6.6,4 C-8,-1 -8,-6 -7.4,-10 Z" fill="#5a3a28"/>'
      + '<path d="M8.6,-11 C11,-4 10.6,2 9,5 L6.6,4 C8,-1 8,-6 7.4,-10 Z" fill="#5a3a28"/>'
      + '<circle cx="0" cy="-12.6" r="7.6" fill="#fbe0cf"/>'
      + '<path d="M-7.6,-12.6 C-7.6,-21.4 7.6,-21.4 7.6,-12.6 C7.6,-17.4 4,-19.4 0,-19.4 C-4,-19.4 -7.6,-17.4 -7.6,-12.6 Z" fill="#5a3a28"/>'
      + '<circle cx="-2.7" cy="-12.4" r="1.15" fill="#4a3327"/><circle cx="2.7" cy="-12.4" r="1.15" fill="#4a3327"/>'
      + '<circle cx="-2.4" cy="-12.8" r="0.42" fill="#fff"/><circle cx="3" cy="-12.8" r="0.42" fill="#fff"/>'
      + '<ellipse cx="-5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".55"/>'
      + '<ellipse cx="5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".55"/>'
      + '<path d="M-1.8,-9.4 Q0,-7.9 1.8,-9.4" stroke="#c9705f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',

    grandma: ''
      + '<rect x="-5" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.8" cy="14.6" rx="3.4" ry="2.2" fill="#8a7a68"/><ellipse cx="2.8" cy="14.6" rx="3.4" ry="2.2" fill="#8a7a68"/>'
      /* 灰蓝长衫 */
      + '<path d="M-7.6,-1 C-7.6,-4 7.6,-4 7.6,-1 L9.4,10 C5,12 -5,12 -9.4,10 Z" fill="#9fb0d0"/>'
      + '<path d="M-4.6,-3.4 L0,-0.6 L4.6,-3.4" stroke="#7d90b4" stroke-width="1.2" fill="none" stroke-linecap="round"/>'
      + '<rect x="-11.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/><rect x="7.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/>'
      + '<rect x="-2" y="-6.4" width="4" height="3" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-12.6" r="7.6" fill="#fbe0cf"/>'
      /* 银发 + 后髻 */
      + '<circle cx="0" cy="-19.6" r="3.8" fill="#cfcac0"/>'
      + '<path d="M-7.6,-12.6 C-7.6,-21 7.6,-21 7.6,-12.6 C7.6,-17 4,-19 0,-19 C-4,-19 -7.6,-17 -7.6,-12.6 Z" fill="#d8d4cc"/>'
      + '<circle cx="-2.7" cy="-12.4" r="1.15" fill="#4a3327"/><circle cx="2.7" cy="-12.4" r="1.15" fill="#4a3327"/>'
      /* 眼镜 */
      + '<circle cx="-2.9" cy="-12.4" r="2.5" fill="none" stroke="#a89f8f" stroke-width="0.85"/>'
      + '<circle cx="2.9" cy="-12.4" r="2.5" fill="none" stroke="#a89f8f" stroke-width="0.85"/>'
      + '<path d="M-0.4,-12.4 L0.4,-12.4" stroke="#a89f8f" stroke-width="0.85"/>'
      + '<ellipse cx="-5.4" cy="-9" rx="1.7" ry="1" fill="#f79aa5" opacity=".5"/>'
      + '<ellipse cx="5.4" cy="-9" rx="1.7" ry="1" fill="#f79aa5" opacity=".5"/>'
      + '<path d="M-1.8,-8.8 Q0,-7.4 1.8,-8.8" stroke="#c9705f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',

    teacher: ''
      + '<rect x="-5" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.4" height="8" rx="2.2" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.8" cy="14.6" rx="3.4" ry="2.2" fill="#6b5b4a"/><ellipse cx="2.8" cy="14.6" rx="3.4" ry="2.2" fill="#6b5b4a"/>'
      /* 黄衬衫 + 领子 */
      + '<path d="M-7,-1 C-7,-4 7,-4 7,-1 L8.6,7 C4,9 -4,9 -8.6,7 Z" fill="#f0b23f"/>'
      + '<path d="M-3.4,-3.2 L0,-0.4 L3.4,-3.2 L3.4,-1.6 L0,1 L-3.4,-1.6 Z" fill="#fff" opacity=".9"/>'
      /* 深色裤子 */
      + '<rect x="-6.6" y="7.6" width="13.2" height="4" rx="2" fill="#6b7a8f"/>'
      + '<rect x="-11.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/><rect x="7.4" y="-1.2" width="4" height="9.6" rx="2" fill="#fbe0cf"/>'
      + '<rect x="-2" y="-6.4" width="4" height="3" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-12.6" r="7.6" fill="#fbe0cf"/>'
      + '<path d="M-7.8,-12.6 C-7.8,-21.4 7.8,-21.4 7.8,-12.6 C7.8,-18 4.4,-19.6 0,-19.6 C-4.4,-19.6 -7.8,-18 -7.8,-12.6 Z" fill="#3f3a32"/>'
      + '<path d="M-7.6,-11 C-8.4,-8 -8.2,-5 -7.2,-3.4 L-6,-4.4 C-6.8,-6.4 -7,-8.6 -6.6,-10.6 Z" fill="#3f3a32"/>'
      + '<path d="M7.6,-11 C8.4,-8 8.2,-5 7.2,-3.4 L6,-4.4 C6.8,-6.4 7,-8.6 6.6,-10.6 Z" fill="#3f3a32"/>'
      + '<circle cx="-2.7" cy="-12.4" r="1.15" fill="#4a3327"/><circle cx="2.7" cy="-12.4" r="1.15" fill="#4a3327"/>'
      + '<circle cx="-2.4" cy="-12.8" r="0.42" fill="#fff"/><circle cx="3" cy="-12.8" r="0.42" fill="#fff"/>'
      + '<ellipse cx="-5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".55"/>'
      + '<ellipse cx="5.2" cy="-9.4" rx="1.8" ry="1.1" fill="#f79aa5" opacity=".55"/>'
      + '<path d="M-1.8,-9.4 Q0,-7.9 1.8,-9.4" stroke="#c9705f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',

    fireman: ''
      + '<rect x="-5" y="5" width="4.6" height="9" rx="2.3" fill="#5a4a3c"/><rect x="0.4" y="5" width="4.6" height="9" rx="2.3" fill="#5a4a3c"/>'
      + '<ellipse cx="-2.7" cy="14.4" rx="3.6" ry="2.4" fill="#3a3830"/><ellipse cx="2.7" cy="14.4" rx="3.6" ry="2.4" fill="#3a3830"/>'
      /* 红外套 + 反光条 */
      + '<path d="M-7.8,-1 C-7.8,-4.6 7.8,-4.6 7.8,-1 L9,8.4 C4.6,10.6 -4.6,10.6 -9,8.4 Z" fill="#d9534f"/>'
      + '<rect x="-9" y="4.4" width="18" height="2.6" fill="#ffe58a" opacity=".95"/>'
      + '<path d="M-2.6,-4 L0,-1 L2.6,-4" stroke="#f7c9c4" stroke-width="1.2" fill="none"/>'
      + '<rect x="-11.6" y="-1.2" width="4.2" height="10" rx="2.1" fill="#d9534f"/><rect x="7.4" y="-1.2" width="4.2" height="10" rx="2.1" fill="#d9534f"/>'
      + '<rect x="-2" y="-6.2" width="4" height="2.8" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-12" r="7.4" fill="#fbe0cf"/>'
      /* 消防盔：帽檐 + 帽顶 + 徽章 */
      + '<path d="M-8.4,-12.6 C-8.4,-20.6 8.4,-20.6 8.4,-12.6 Z" fill="#d9534f"/>'
      + '<rect x="-10.6" y="-13.6" width="21.2" height="3.6" rx="1.8" fill="#b9463f"/>'
      + '<rect x="-1.6" y="-19.4" width="3.2" height="3.6" rx="1.2" fill="#ffe58a"/>'
      + '<circle cx="-2.7" cy="-9.6" r="1.15" fill="#4a3327"/><circle cx="2.7" cy="-9.6" r="1.15" fill="#4a3327"/>'
      + '<path d="M-1.8,-6.8 Q0,-5.4 1.8,-6.8" stroke="#c9705f" stroke-width="1.1" fill="none" stroke-linecap="round"/>',

    boy: ''
      + '<rect x="-4.8" y="6" width="4.2" height="8" rx="2.1" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.2" height="8" rx="2.1" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.7" cy="14.4" rx="3.2" ry="2.1" fill="#4a6f96"/><ellipse cx="2.7" cy="14.4" rx="3.2" ry="2.1" fill="#4a6f96"/>'
      + '<path d="M-7,-1 C-7,-4 7,-4 7,-1 L8.2,7 C4,9 -4,9 -8.2,7 Z" fill="#7fb6e0"/>'
      + '<rect x="-10.6" y="-1.2" width="3.8" height="9.2" rx="1.9" fill="#fbe0cf"/><rect x="6.8" y="-1.2" width="3.8" height="9.2" rx="1.9" fill="#fbe0cf"/>'
      + '<rect x="-2" y="-6" width="4" height="2.8" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-11.8" r="7.2" fill="#fbe0cf"/>'
      + '<path d="M-7.2,-11.8 C-7.2,-19.6 7.2,-19.6 7.2,-11.8 C7.2,-16.4 4,-18 0,-18 C-4,-18 -7.2,-16.4 -7.2,-11.8 Z" fill="#3f3a32"/>'
      + '<path d="M-2.2,-20.4 C-2,-22.6 2,-22.6 2.2,-20.4 Z" fill="#3f3a32"/>'
      + '<circle cx="-2.5" cy="-11.6" r="1.1" fill="#4a3327"/><circle cx="2.5" cy="-11.6" r="1.1" fill="#4a3327"/>'
      + '<ellipse cx="-4.9" cy="-8.8" rx="1.7" ry="1" fill="#f79aa5" opacity=".55"/>'
      + '<ellipse cx="4.9" cy="-8.8" rx="1.7" ry="1" fill="#f79aa5" opacity=".55"/>'
      + '<path d="M-1.7,-8.8 Q0,-7.3 1.7,-8.8" stroke="#c9705f" stroke-width="1.05" fill="none" stroke-linecap="round"/>',

    girl2: ''
      + '<circle cx="-8.6" cy="-9.6" r="3.4" fill="#8a5a3a"/><circle cx="8.6" cy="-9.6" r="3.4" fill="#8a5a3a"/>'
      + '<rect x="-4.8" y="6" width="4.2" height="8" rx="2.1" fill="#f3d3bc"/><rect x="0.6" y="6" width="4.2" height="8" rx="2.1" fill="#f3d3bc"/>'
      + '<ellipse cx="-2.7" cy="14.4" rx="3.2" ry="2.1" fill="#c98d2e"/><ellipse cx="2.7" cy="14.4" rx="3.2" ry="2.1" fill="#c98d2e"/>'
      + '<path d="M-6.8,-1 C-6.8,-4 6.8,-4 6.8,-1 L9.4,7.6 C4.6,9.8 -4.6,9.8 -9.4,7.6 Z" fill="#f6b93b"/>'
      + '<rect x="-10.4" y="-1.2" width="3.8" height="9.2" rx="1.9" fill="#fbe0cf"/><rect x="6.6" y="-1.2" width="3.8" height="9.2" rx="1.9" fill="#fbe0cf"/>'
      + '<rect x="-2" y="-6" width="4" height="2.8" fill="#f0cdb6"/>'
      + '<circle cx="0" cy="-11.8" r="7.2" fill="#fbe0cf"/>'
      + '<path d="M-7.2,-11.8 C-7.2,-19.6 7.2,-19.6 7.2,-11.8 C7.2,-16.4 4,-18 0,-18 C-4,-18 -7.2,-16.4 -7.2,-11.8 Z" fill="#8a5a3a"/>'
      + '<circle cx="-2.5" cy="-11.6" r="1.1" fill="#4a3327"/><circle cx="2.5" cy="-11.6" r="1.1" fill="#4a3327"/>'
      + '<circle cx="-2.2" cy="-12" r="0.4" fill="#fff"/><circle cx="2.8" cy="-12" r="0.4" fill="#fff"/>'
      + '<ellipse cx="-4.9" cy="-8.8" rx="1.7" ry="1" fill="#f79aa5" opacity=".6"/>'
      + '<ellipse cx="4.9" cy="-8.8" rx="1.7" ry="1" fill="#f79aa5" opacity=".6"/>'
      + '<path d="M-1.7,-8.8 Q0,-7.3 1.7,-8.8" stroke="#c9705f" stroke-width="1.05" fill="none" stroke-linecap="round"/>',

    /* 小狗：坐着，耳朵垂下来，尾巴翘着 */
    dog: ''
      + '<path d="M9,-1 C15,-3 16,-9 14,-11 C13.4,-7.4 11.6,-5 9,-4.4 Z" fill="#c99a62"/>'
      + '<ellipse cx="0" cy="8" rx="9.4" ry="6.6" fill="#c99a62"/>'
      + '<ellipse cx="0" cy="9.4" rx="5.6" ry="4" fill="#f0dcc2"/>'
      + '<rect x="-6.4" y="11" width="4.2" height="5" rx="2.1" fill="#b98a55"/>'
      + '<rect x="2.2" y="11" width="4.2" height="5" rx="2.1" fill="#b98a55"/>'
      + '<circle cx="0" cy="-2" r="8.6" fill="#d9ad76"/>'
      + '<path d="M-7.4,-7 C-12.6,-9 -13.4,-1.6 -8.4,-1.2 C-9.4,-3.6 -9,-5.6 -7.4,-7 Z" fill="#a9784f"/>'
      + '<path d="M7.4,-7 C12.6,-9 13.4,-1.6 8.4,-1.2 C9.4,-3.6 9,-5.6 7.4,-7 Z" fill="#a9784f"/>'
      + '<ellipse cx="-3.1" cy="-3.4" rx="1.35" ry="1.5" fill="#3f3a32"/>'
      + '<ellipse cx="3.1" cy="-3.4" rx="1.35" ry="1.5" fill="#3f3a32"/>'
      + '<circle cx="-2.7" cy="-3.9" r="0.48" fill="#fff"/><circle cx="3.5" cy="-3.9" r="0.48" fill="#fff"/>'
      + '<ellipse cx="0" cy="0.8" rx="2.5" ry="1.9" fill="#4a4038"/>'
      + '<path d="M0,2.6 L0,4.4 M0,4.4 Q-1.8,5.6 -2.8,4 M0,4.4 Q1.8,5.6 2.8,4" stroke="#4a4038" stroke-width="0.95" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="-6.2" cy="-0.2" rx="1.9" ry="1.2" fill="#f79aa5" opacity=".45"/>'
      + '<ellipse cx="6.2" cy="-0.2" rx="1.9" ry="1.2" fill="#f79aa5" opacity=".45"/>',

    /* 道具 */
    pot: '<path d="M-9,-2 L9,-2 L7,12 L-7,12 Z" fill="#d08a6a"/><rect x="-10" y="-5" width="20" height="5" rx="2.5" fill="#c07a5a"/>',
    bloom: '<circle cx="-5" cy="-7" r="4.4" fill="#f7a5ad"/><circle cx="5" cy="-7" r="4.4" fill="#f7a5ad"/><circle cx="0" cy="-13" r="4.4" fill="#f7a5ad"/><circle cx="0" cy="-8" r="3" fill="#ffe58a"/><path d="M0,-4 L0,0" stroke="#6da45f" stroke-width="2.4"/>',
    book: '<rect x="-10" y="-8" width="9" height="16" rx="2" fill="#a8804f"/><rect x="-1" y="-9" width="9" height="18" rx="2" fill="#c99a62"/><rect x="8" y="-8" width="4" height="16" rx="2" fill="#8f9ec9"/>',
    ball: '<circle cx="0" cy="0" r="11" fill="#f7a5ad"/><path d="M-11,0 A11,11 0 0,1 11,0" fill="#f6d365"/><circle cx="-4" cy="-5" r="2.4" fill="#fff" opacity=".55"/>',
    toy: '<rect x="-9" y="2" width="18" height="9" rx="2" fill="#7fb6e0"/><rect x="-6" y="-6" width="9" height="9" rx="2" fill="#f6b93b"/><circle cx="-6" cy="12" r="3.4" fill="#4a4438"/><circle cx="6" cy="12" r="3.4" fill="#4a4438"/>',
    truck: '<rect x="-13" y="-4" width="17" height="10" rx="3" fill="#d9534f"/><path d="M4,0 L10,0 L14,6 L4,6 Z" fill="#e8887f"/><rect x="-10" y="-1" width="10" height="3" rx="1.5" fill="#fff" opacity=".7"/><circle cx="-8" cy="7" r="3.6" fill="#4a4438"/><circle cx="8" cy="7" r="3.6" fill="#4a4438"/>',
    helmet: '<path d="M-11,4 C-11,-8 11,-8 11,4 Z" fill="#d9534f"/><rect x="-12" y="3" width="24" height="4" rx="2" fill="#b9463f"/>',
    hose: '<path d="M-12,6 C-6,-6 6,10 12,-2" stroke="#e8887f" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="12" cy="-2" r="3.4" fill="#c9b79d"/>',
    ladder: '<rect x="-2" y="-14" width="3" height="28" rx="1.5" fill="#c9b79d"/><rect x="9" y="-14" width="3" height="28" rx="1.5" fill="#c9b79d"/><rect x="-2" y="-10" width="14" height="2.6" fill="#d9c8ad"/><rect x="-2" y="-3" width="14" height="2.6" fill="#d9c8ad"/><rect x="-2" y="4" width="14" height="2.6" fill="#d9c8ad"/>',
    crayon: '<rect x="-3.4" y="-10" width="6.8" height="20" rx="3" fill="#f0b23f"/><path d="M-3.4,-10 L0,-15 L3.4,-10 Z" fill="#e8a72a"/>',
    star: '<path d="M0,-11 L3, -3.6 L11,-3.2 L5,2 L7,10 L0,6 L-7,10 L-5,2 L-11,-3.2 L-3,-3.6 Z" fill="#f6b93b"/>',
    heart: '<path d="M0,9 C-11,2 -11,-6 -5.5,-6 C-2.4,-6 0,-3.4 0,-2 C0,-3.4 2.4,-6 5.5,-6 C11,-6 11,2 0,9 Z" fill="#f78fb3"/>',
    cone: '<path d="M-6,10 L0,-11 L6,10 Z" fill="#f08a3c"/><rect x="-3.6" y="-1" width="7.2" height="4" fill="#fffdf8"/><rect x="-8" y="9" width="16" height="4" rx="2" fill="#d9752c"/>',
    car: '<rect x="-14" y="-3" width="26" height="10" rx="3" fill="#d9534f"/><path d="M6,-3 L6,-10 L12,-10 L15,-3 Z" fill="#d9534f"/><rect x="-12" y="0" width="26" height="3" fill="#fffdf8" opacity=".9"/><circle cx="-8" cy="8" r="3.4" fill="#4a4438"/><circle cx="9" cy="8" r="3.4" fill="#4a4438"/>',
    /* —— 商店与礼物用的小东西 —— */
    apple: '<path d="M0,-6 C-7,-10 -12,-4 -11,2 C-10,8 -4,12 0,11 C4,12 10,8 11,2 C12,-4 7,-10 0,-6 Z" fill="#e4705f"/><path d="M0,-6 C-1,-9 0,-11 1,-12" stroke="#7a5a3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M1,-10 C4,-13 8,-12 8,-10 C6,-8 3,-8 1,-10 Z" fill="#8fc97e"/><ellipse cx="-4" cy="0" rx="2.6" ry="3.4" fill="#f0928a" opacity=".7"/>',
    balloon: '<ellipse cx="0" cy="-4" rx="8.5" ry="10" fill="#f78fb3"/><ellipse cx="-2.6" cy="-7" rx="2.4" ry="3.2" fill="#fff" opacity=".5"/><path d="M0,6 L0,9" stroke="#c98aa0" stroke-width="1.4"/><path d="M0,9 C-3,12 3,13 0,16" stroke="#c98aa0" stroke-width="1.3" fill="none"/>',
    bread: '<ellipse cx="0" cy="1" rx="12" ry="8" fill="#e8b96a"/><ellipse cx="0" cy="-1" rx="9" ry="5.4" fill="#f0cd94"/><path d="M-5,-3 L-3,-1 M0,-4 L2,-2 M4,-3 L6,-1" stroke="#c9954f" stroke-width="1.4" stroke-linecap="round"/>',
    milk: '<rect x="-6" y="-8" width="12" height="18" rx="3" fill="#fffdf8"/><rect x="-6" y="-8" width="12" height="4" rx="2" fill="#7fb6e0"/><rect x="-4" y="0" width="8" height="6" rx="1.6" fill="#cde8f5"/>',
    teddy: '<circle cx="-6" cy="-10" r="3.6" fill="#c99a62"/><circle cx="6" cy="-10" r="3.6" fill="#c99a62"/><circle cx="0" cy="-6" r="7" fill="#d9ad76"/><ellipse cx="0" cy="6" rx="8" ry="7.4" fill="#c99a62"/><ellipse cx="0" cy="7" rx="4.6" ry="4.4" fill="#f0dcc2"/><circle cx="-2.6" cy="-7" r="1.2" fill="#4a3327"/><circle cx="2.6" cy="-7" r="1.2" fill="#4a3327"/><ellipse cx="0" cy="-4" rx="1.6" ry="1.2" fill="#4a3327"/>',
    kite: '<path d="M0,-12 L10,-2 L0,10 L-10,-2 Z" fill="#f6b93b"/><path d="M0,-12 L0,10 M-10,-2 L10,-2" stroke="#fffdf8" stroke-width="1.2" opacity=".8"/><path d="M0,10 C2,14 -2,15 0,18" stroke="#c9954f" stroke-width="1.4" fill="none"/>',
    candy: '<circle cx="-3" cy="0" r="6" fill="#f78fb3"/><circle cx="3" cy="0" r="6" fill="#f6b93b"/><circle cx="0" cy="-4" r="6" fill="#8fc97e"/><circle cx="-1" cy="-6" r="1.6" fill="#fff" opacity=".7"/>',
    cake: '<path d="M-11,4 L11,4 L9,12 L-9,12 Z" fill="#f0cd94"/><rect x="-12" y="0" width="24" height="6" rx="3" fill="#fffaf5"/><rect x="-12" y="0" width="24" height="2.6" rx="1.3" fill="#f7a8bd"/><rect x="-1" y="-9" width="2.2" height="10" fill="#f6b93b"/><circle cx="0" cy="-11" r="2.4" fill="#f0a832"/>',
    duck: '<ellipse cx="0" cy="4" rx="10" ry="7" fill="#f6d365"/><circle cx="-5" cy="-5" r="5.4" fill="#ffe08a"/><path d="M-10,-5 L-14,-3 L-10,-2 Z" fill="#f08a3c"/><circle cx="-6.6" cy="-6" r="1.1" fill="#4a3327"/><path d="M6,-2 C10,-6 12,-8 13,-7" stroke="#e8b96a" stroke-width="2" fill="none" stroke-linecap="round"/>',
    cat: '<path d="M-7,-9 L-4,-14 L-1,-9 Z" fill="#c9b79d"/><path d="M7,-9 L4,-14 L1,-9 Z" fill="#c9b79d"/><circle cx="0" cy="-4" r="7" fill="#d9c8ad"/><ellipse cx="0" cy="6" rx="8" ry="6" fill="#c9b79d"/><circle cx="-2.6" cy="-5" r="1.2" fill="#4a4438"/><circle cx="2.6" cy="-5" r="1.2" fill="#4a4438"/><path d="M-2,0 L0,-1 L2,0" stroke="#4a4438" stroke-width="1" fill="none" stroke-linecap="round"/><path d="M-9,-2 L-13,-3 M-9,0 L-13,0 M9,-2 L13,-3 M9,0 L13,0" stroke="#b8a68c" stroke-width="1" stroke-linecap="round"/>',
    rabbit: '<ellipse cx="-3" cy="-13" rx="2.6" ry="7" fill="#f0e2d0"/><ellipse cx="3" cy="-13" rx="2.6" ry="7" fill="#f0e2d0"/><circle cx="0" cy="-4" r="7" fill="#faf4ea"/><ellipse cx="0" cy="5" rx="7.4" ry="5.6" fill="#f0e2d0"/><circle cx="-2.6" cy="-5" r="1.2" fill="#4a4438"/><circle cx="2.6" cy="-5" r="1.2" fill="#4a4438"/><ellipse cx="0" cy="-1.4" rx="1.5" ry="1.1" fill="#f78fb3"/><ellipse cx="-5.4" cy="-2" rx="1.8" ry="1.2" fill="#f9c7cf" opacity=".7"/><ellipse cx="5.4" cy="-2" rx="1.8" ry="1.2" fill="#f9c7cf" opacity=".7"/>'
  };
  /* 人物画在 -24~16 的坐标系里，道具在 ±18 里，分开两套 viewBox */
  var TALL = { girl:1, mom:1, grandma:1, teacher:1, fireman:1, boy:1, girl2:1, dog:1 };
  /* 每个图形自己的取景框，避免头顶被裁 */
  var VB = {
    girl: "-14 -24 28 42", mom: "-14 -24 28 42", grandma: "-14 -26 28 44",
    teacher: "-14 -24 28 42", fireman: "-14 -24 28 42", boy: "-14 -25 28 43",
    girl2: "-14 -24 28 42", dog: "-16 -18 32 30"
  };
  function art(kind, size) {
    var d = ART[kind] || ART.star;
    var s = size || 60;
    var vb = VB[kind] || "-18 -18 36 36";
    var p2 = vb.split(" ").map(Number);          /* x y w h */
    var hh = TALL[kind] ? Math.round(s * (p2[3] / p2[2])) : s;
    return '<svg viewBox="' + vb + '" width="' + s + '" height="' + hh +
           '" aria-hidden="true" style="display:block;overflow:visible">' + d + "</svg>";
  }

  /* ---------------- 说话气泡 ---------------- */
  var speechTimer = null;
  function say(text, opts) {
    var el = document.getElementById("speech");
    if (!el) {
      el = document.createElement("div");
      el.id = "speech";
      el.className = "speech";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(speechTimer);
    speechTimer = setTimeout(function () { el.classList.remove("show"); }, opts && opts.ms || 4200);
    Voice.say(text, opts);
  }

  /* ---------------- 房间陈设：纯装饰 SVG，按房间主题拼 ---------------- */
  /**
   * scene = { wall:"#f6e7d2", floor:"#e4d2b8", base:"#d9c3a4", items:[...] }
   * item = { t:"window"|"rug"|"sofa"|"table"|"frame"|"shelf"|"plant"|"lamp"|"bed"|"board"|"rack"|"desk"|"ball"|"blocks", x,y,w,h, ... }
   */
  /* 场景按「设计坐标 1000×700」写好，再整体装进实际视口。
     竖屏时视口变窄变高，就把中间的人和家具收拢、围一圈墙——
     这样任何屏幕都不裁人，也不会出现大片空白。 */
  function shrinkX(x) {
    /* 百分比横坐标：以 50 为中心压缩到 0.62 宽 */
    return 50 + (x - 50) * 0.62;
  }

  function buildScene(sc, o) {
    o = o || {};
    var cw = o.cw || 1000, ch = o.ch || 700;   /* 实际视口（设计坐标单位） */
    var cx = o.cx || 0, cy = o.cy || 0;        /* 视口左上角在设计坐标里的位置 */
    var sq = o.squeeze || 1;                   /* 内容横向压缩，1 表示原样 */
    var W = 1000, H = 700;                     /* 设计坐标系 */
    var floorY = H * 0.62;
    var g = [];

    /* —— 背景铺满整个视口 —— */
    g.push('<rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + ch + '" fill="' + (sc.wall || "#f6e7d2") + '"/>');
    g.push('<g opacity=".55">');
    for (var i = 0; i < 60; i++) {
      g.push('<rect x="' + (cx + i * 30 + 8) + '" y="' + cy + '" width="2" height="' + (floorY - cy) + '" fill="rgba(175,145,105,.12)"/>');
    }
    g.push('</g>');
    g.push('<rect x="' + cx + '" y="' + floorY + '" width="' + cw + '" height="' + (ch + cy - floorY) + '" fill="' + (sc.floor || "#e4d2b8") + '"/>');
    g.push('<g opacity=".5">');
    for (var j = 0; j < 12; j++) {
      var yy = floorY + 16 + j * 16;
      g.push('<path d="M' + cx + ',' + yy + ' L' + (cx + cw) + ',' + yy + '" stroke="rgba(150,118,78,.18)" stroke-width="1.6"/>');
    }
    g.push('</g>');
    g.push('<rect x="' + cx + '" y="' + (floorY - 10) + '" width="' + cw + '" height="10" fill="' + (sc.base || "#d9c3a4") + '"/>');
    g.push('<rect x="' + cx + '" y="' + (floorY - 3) + '" width="' + cw + '" height="4" fill="rgba(120,95,65,.16)"/>');

    function item(it) {
      var ix = sq === 1 ? it.x : shrinkX(it.x);
      var x = ix / 100 * W, y = it.y / 100 * H;
      var w = (it.w || 20) / 100 * W, h = (it.h || 20) / 100 * H;
      var s = '<g transform="translate(' + x + ',' + y + ')">';
      var c1 = it.c1 || "#d9b48f", c2 = it.c2 || "#c69a72", c3 = it.c3 || "#fff7e8";

      if (it.t === "window") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="6" fill="#cfe6f4"/>';
        s += '<rect x="' + (-w / 2 + 6) + '" y="' + (-h / 2 + 6) + '" width="' + (w - 12) + '" height="' + (h - 12) + '" fill="#dff0fa"/>';
        /* 窗外的天和树 */
        s += '<circle cx="' + (w * 0.28) + '" cy="' + (-h * 0.22) + '" r="' + (h * 0.14) + '" fill="#ffe08a"/>';
        s += '<ellipse cx="' + (-w * 0.2) + '" cy="' + (h * 0.3) + '" rx="' + (w * 0.3) + '" ry="' + (h * 0.2) + '" fill="#9fd08c"/>';
        /* 十字窗框 */
        s += '<rect x="-2.5" y="' + (-h / 2) + '" width="5" height="' + h + '" fill="#f2e3ca"/>';
        s += '<rect x="' + (-w / 2) + '" y="-2.5" width="' + w + '" height="5" fill="#f2e3ca"/>';
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="6" fill="none" stroke="#e3cfae" stroke-width="7"/>';
        /* 窗台 */
        s += '<rect x="' + (-w / 2 - 12) + '" y="' + (h / 2 - 2) + '" width="' + (w + 24) + '" height="12" rx="5" fill="#eadbc0"/>';
        /* 窗帘 */
        s += '<path d="M' + (-w / 2 - 26) + ',' + (-h / 2 - 14) + ' L' + (-w / 2 - 2) + ',' + (-h / 2 - 14) +
             ' L' + (-w / 2 - 8) + ',' + (h / 2 + 6) + ' L' + (-w / 2 - 30) + ',' + (h / 2 + 6) + ' Z" fill="' + c1 + '" opacity=".92"/>';
        s += '<path d="M' + (w / 2 + 2) + ',' + (-h / 2 - 14) + ' L' + (w / 2 + 26) + ',' + (-h / 2 - 14) +
             ' L' + (w / 2 + 30) + ',' + (h / 2 + 6) + ' L' + (w / 2 + 8) + ',' + (h / 2 + 6) + ' Z" fill="' + c1 + '" opacity=".92"/>';
      }

      if (it.t === "rug") {
        s += '<ellipse cx="0" cy="0" rx="' + (w / 2) + '" ry="' + (h / 2) + '" fill="' + c1 + '"/>';
        s += '<ellipse cx="0" cy="0" rx="' + (w / 2 - 14) + '" ry="' + (h / 2 - 10) + '" fill="' + c3 + '" opacity=".75"/>';
        s += '<ellipse cx="0" cy="0" rx="' + (w / 2 - 30) + '" ry="' + (h / 2 - 20) + '" fill="none" stroke="' + c2 + '" stroke-width="3" opacity=".55"/>';
      }

      if (it.t === "sofa") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.28) + '" width="' + w + '" height="' + (h * 0.9) + '" rx="14" fill="' + c1 + '"/>';
        s += '<rect x="' + (-w / 2 + 8) + '" y="' + (-h * 0.24) + '" width="' + (w - 16) + '" height="' + (h * 0.5) + '" rx="12" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w / 2 - 6) + '" y="' + (h * 0.24) + '" width="18" height="' + (h * 0.34) + '" rx="7" fill="' + c2 + '"/>';
        s += '<rect x="' + (w / 2 - 12) + '" y="' + (h * 0.24) + '" width="18" height="' + (h * 0.34) + '" rx="7" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w / 2 + 6) + '" y="' + (h * 0.44) + '" width="' + (w - 12) + '" height="' + (h * 0.16) + '" rx="8" fill="' + c1 + '"/>';
        /* 靠垫 */
        s += '<rect x="' + (-w * 0.3) + '" y="' + (-h * 0.12) + '" width="34" height="30" rx="9" fill="#f7a5ad" transform="rotate(-8 ' + (-w * 0.3) + ' ' + (-h * 0.12) + ')"/>';
      }

      if (it.t === "table") {
        s += '<ellipse cx="0" cy="' + (-h * 0.16) + '" rx="' + (w / 2) + '" ry="' + (h * 0.2) + '" fill="' + c1 + '"/>';
        s += '<rect x="' + (-w / 2 + 10) + '" y="' + (-h * 0.16) + '" width="' + (w - 20) + '" height="' + (h * 0.26) + '" fill="' + c2 + '" opacity=".9"/>';
        s += '<rect x="' + (-w * 0.24) + '" y="' + (h * 0.1) + '" width="12" height="' + (h * 0.42) + '" rx="5" fill="' + c2 + '"/>';
        s += '<rect x="' + (w * 0.18) + '" y="' + (h * 0.1) + '" width="12" height="' + (h * 0.42) + '" rx="5" fill="' + c2 + '"/>';
        s += '<ellipse cx="0" cy="' + (-h * 0.19) + '" rx="' + (w / 2 - 4) + '" ry="' + (h * 0.17) + '" fill="' + c3 + '" opacity=".85"/>';
      }

      if (it.t === "frame") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="6" fill="#fffdf8" stroke="' + c2 + '" stroke-width="7"/>';
        if (it.motif === "sun") {
          s += '<circle cx="0" cy="-4" r="' + (h * 0.2) + '" fill="#f6d365"/>';
          s += '<path d="M' + (-w * 0.3) + ',' + (h * 0.28) + ' Q0,' + (-h * 0.05) + ' ' + (w * 0.3) + ',' + (h * 0.28) + ' Z" fill="#9fd08c"/>';
        } else if (it.motif === "heart") {
          s += '<path d="M0,14 C-18,2 -18,-12 -9,-12 C-4,-12 0,-8 0,-5 C0,-8 4,-12 9,-12 C18,-12 18,2 0,14 Z" fill="#f78fb3" transform="scale(.9)"/>';
        } else {
          s += '<circle cx="-8" cy="-4" r="9" fill="' + c1 + '"/><circle cx="9" cy="4" r="7" fill="' + c2 + '"/>';
        }
      }

      if (it.t === "shelf") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.1) + '" width="' + w + '" height="' + (h * 0.1) + '" rx="4" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w / 2) + '" y="' + (h * 0.34) + '" width="' + w + '" height="' + (h * 0.1) + '" rx="4" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.1) + '" width="10" height="' + (h * 0.54) + '" fill="' + c1 + '"/>';
        s += '<rect x="' + (w / 2 - 10) + '" y="' + (-h * 0.1) + '" width="10" height="' + (h * 0.54) + '" fill="' + c1 + '"/>';
        /* 书 */
        var cols = ["#e4705f", "#7fb6e0", "#f6b93b", "#8f9ec9", "#8fc97e"];
        for (var k = 0; k < 5; k++) {
          s += '<rect x="' + (-w / 2 + 16 + k * 13) + '" y="' + (-h * 0.1 - 34) + '" width="10" height="34" rx="2" fill="' + cols[k % 5] + '"/>';
        }
      }

      /* 超市货架台：两层层板，商品可以摆在上面 */
      if (it.t === "counter") {
        var cw2 = w, chh = h;
        /* 台身 */
        s += '<rect x="' + (-cw2 / 2) + '" y="' + (chh * 0.06) + '" width="' + cw2 + '" height="' + (chh * 0.62) + '" rx="6" fill="' + c1 + '"/>';
        s += '<rect x="' + (-cw2 / 2) + '" y="' + (chh * 0.06) + '" width="' + cw2 + '" height="8" rx="4" fill="' + c2 + '"/>';
        /* 下层隔板 */
        s += '<rect x="' + (-cw2 / 2 + 5) + '" y="' + (chh * 0.34) + '" width="' + (cw2 - 10) + '" height="7" rx="3" fill="' + c2 + '" opacity=".85"/>';
        /* 脚 */
        s += '<rect x="' + (-cw2 / 2 + 8) + '" y="' + (chh * 0.66) + '" width="9" height="' + (chh * 0.12) + '" fill="' + c2 + '"/>';
        s += '<rect x="' + (cw2 / 2 - 17) + '" y="' + (chh * 0.66) + '" width="9" height="' + (chh * 0.12) + '" fill="' + c2 + '"/>';
      }

      if (it.t === "plant") {
        s += '<path d="M' + (-w * 0.22) + ',0 L' + (w * 0.22) + ',0 L' + (w * 0.16) + ',' + (h * 0.3) + ' L' + (-w * 0.16) + ',' + (h * 0.3) + ' Z" fill="' + c2 + '"/>';
        s += '<ellipse cx="0" cy="' + (h * 0.3) + '" rx="' + (w * 0.17) + '" ry="5" fill="' + c1 + '" opacity=".7"/>';
        for (var q = 0; q < 5; q++) {
          var ang = -60 + q * 30;
          s += '<ellipse cx="0" cy="' + (-h * 0.22) + '" rx="' + (w * 0.12) + '" ry="' + (h * 0.26) + '" fill="#7fbf6f" transform="rotate(' + ang + ' 0 ' + (h * 0.02) + ')" opacity="' + (0.75 + q * 0.05) + '"/>';
        }
      }

      if (it.t === "lamp") {
        /* 吊灯：线从天花板垂下来，灯罩朝下张开，光落在下半个圆里 */
        var top = -h * 0.62;
        s += '<path d="M0,' + top + ' L0,' + (-h * 0.08) + '" stroke="#c9b79d" stroke-width="4" stroke-linecap="round"/>';
        s += '<ellipse cx="0" cy="' + top + '" rx="' + (w * 0.3) + '" ry="5" fill="#d9c3a4"/>';
        s += '<path d="M' + (-w * 0.22) + ',' + (-h * 0.08) + ' L' + (w * 0.22) + ',' + (-h * 0.08) + ' L' + (w * 0.36) + ',' + (h * 0.18) + ' L' + (-w * 0.36) + ',' + (h * 0.18) + ' Z" fill="#fbe0a0"/>';
        s += '<ellipse cx="0" cy="' + (h * 0.18) + '" rx="' + (w * 0.36) + '" ry="7" fill="#fff3cf"/>';
        s += '<ellipse cx="0" cy="' + (h * 0.92) + '" rx="' + (w * 0.72) + '" ry="' + (h * 0.55) + '" fill="#ffe9b8" opacity=".26"/>';
      }

      if (it.t === "bed") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.3) + '" width="' + w + '" height="' + (h * 0.62) + '" rx="10" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w / 2 + 6) + '" y="' + (-h * 0.24) + '" width="' + (w - 12) + '" height="' + (h * 0.34) + '" rx="8" fill="' + c3 + '"/>';
        s += '<rect x="' + (-w / 2 + 6) + '" y="' + (h * 0.02) + '" width="' + (w - 12) + '" height="' + (h * 0.28) + '" rx="8" fill="' + c1 + '"/>';
        s += '<rect x="' + (-w / 2 + 16) + '" y="' + (-h * 0.26) + '" width="' + (w * 0.28) + '" height="' + (h * 0.14) + '" rx="8" fill="#fff" opacity=".95"/>';
      }

      if (it.t === "board") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="8" fill="#5f8a6f"/>';
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="8" fill="none" stroke="' + c2 + '" stroke-width="10"/>';
        s += '<path d="M' + (-w * 0.3) + ',' + (-h * 0.1) + ' L' + (w * 0.1) + ',' + (-h * 0.1) + '" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"/>';
        s += '<path d="M' + (-w * 0.3) + ',' + (h * 0.12) + ' L' + (w * 0.02) + ',' + (h * 0.12) + '" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".55"/>';
        s += '<circle cx="' + (w * 0.3) + '" cy="' + (h * 0.02) + '" r="12" fill="#f6d365"/>';
      }

      if (it.t === "rack") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="8" fill="' + c1 + '" opacity=".9"/>';
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.1) + '" width="' + w + '" height="8" fill="' + c2 + '"/>';
        /* 挂着的东西 */
        s += '<path d="M' + (-w * 0.3) + ',' + (-h * 0.1) + ' L' + (-w * 0.3) + ',' + (h * 0.1) + '" stroke="#d9534f" stroke-width="7" stroke-linecap="round"/>';
        s += '<circle cx="' + (-w * 0.3) + '" cy="' + (h * 0.16) + '" r="9" fill="#d9534f"/>';
        s += '<rect x="' + (w * 0.16) + '" y="' + (-h * 0.1) + '" width="7" height="' + (h * 0.36) + '" rx="3" fill="#c9b79d"/>';
      }

      if (it.t === "garage") {
        /* 卷帘门：横向一条条 */
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="4" fill="' + c1 + '"/>';
        var slats = Math.round(h / 14);
        for (var si = 0; si < slats; si++) {
          s += '<rect x="' + (-w / 2 + 5) + '" y="' + (-h / 2 + 6 + si * 14) + '" width="' + (w - 10) + '" height="11" rx="3" fill="' + c2 + '" opacity="' + (0.5 + (si % 2) * 0.18) + '"/>';
        }
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="4" fill="none" stroke="#b9b2a6" stroke-width="7"/>';
        /* 门口一条黄线 */
        s += '<rect x="' + (-w / 2 - 8) + '" y="' + (h / 2 - 2) + '" width="' + (w + 16) + '" height="7" fill="#f0c25a" opacity=".8"/>';
      }

      if (it.t === "locker") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h / 2) + '" width="' + w + '" height="' + h + '" rx="8" fill="' + c1 + '"/>';
        s += '<rect x="' + (-w / 2 + 6) + '" y="' + (-h / 2 + 6) + '" width="' + (w - 12) + '" height="' + (h - 12) + '" rx="6" fill="' + c2 + '" opacity=".85"/>';
        /* 三格 */
        var rows = 3;
        for (var ri = 0; ri < rows; ri++) {
          var ry = -h / 2 + 14 + ri * ((h - 24) / rows);
          s += '<rect x="' + (-w / 2 + 10) + '" y="' + ry + '" width="' + (w - 20) + '" height="' + ((h - 30) / rows) + '" rx="4" fill="#fffdf8" opacity=".55"/>';
          s += '<circle cx="' + (w / 2 - 16) + '" cy="' + (ry + (h - 30) / rows / 2) + '" r="2.6" fill="' + c1 + '"/>';
        }
      }

      if (it.t === "cone") {
        s += '<path d="M' + (-w * 0.34) + ',' + (h * 0.3) + ' L0,' + (-h * 0.4) + ' L' + (w * 0.34) + ',' + (h * 0.3) + ' Z" fill="#f08a3c"/>';
        s += '<rect x="' + (-w * 0.2) + '" y="' + (-h * 0.06) + '" width="' + (w * 0.4) + '" height="' + (h * 0.14) + '" fill="#fffdf8"/>';
        s += '<rect x="' + (-w * 0.44) + '" y="' + (h * 0.28) + '" width="' + (w * 0.88) + '" height="' + (h * 0.14) + '" rx="4" fill="#d9752c"/>';
      }

      if (it.t === "car") {
        /* 一辆停在车库里的消防车（侧面） */
        var bw = w, bh = h;
        s += '<rect x="' + (-bw / 2) + '" y="' + (-bh * 0.18) + '" width="' + bw + '" height="' + (bh * 0.62) + '" rx="10" fill="' + c1 + '"/>';
        /* 驾驶室 */
        s += '<path d="M' + (bw * 0.16) + ',' + (-bh * 0.18) + ' L' + (bw * 0.16) + ',' + (-bh * 0.5) +
             ' L' + (bw * 0.42) + ',' + (-bh * 0.5) + ' L' + (bw / 2 - 4) + ',' + (-bh * 0.1) + ' Z" fill="' + c1 + '"/>';
        /* 车窗 */
        s += '<path d="M' + (bw * 0.21) + ',' + (-bh * 0.2) + ' L' + (bw * 0.21) + ',' + (-bh * 0.44) +
             ' L' + (bw * 0.4) + ',' + (-bh * 0.44) + ' L' + (bw * 0.45) + ',' + (-bh * 0.2) + ' Z" fill="#cde8f5"/>';
        /* 白色腰线 */
        s += '<rect x="' + (-bw / 2) + '" y="' + (bh * 0.06) + '" width="' + bw + '" height="' + (bh * 0.1) + '" fill="#fffdf8" opacity=".9"/>';
        /* 警灯 */
        s += '<rect x="' + (-bw * 0.42) + '" y="' + (-bh * 0.3) + '" width="' + (bw * 0.2) + '" height="' + (bh * 0.13) + '" rx="5" fill="#f6b93b"/>';
        /* 梯子 */
        s += '<rect x="' + (-bw * 0.44) + '" y="' + (-bh * 0.42) + '" width="' + (bw * 0.56) + '" height="' + (bh * 0.07) + '" rx="3" fill="#c9b79d"/>';
        /* 轮子 */
        s += '<circle cx="' + (-bw * 0.28) + '" cy="' + (bh * 0.46) + '" r="' + (bh * 0.15) + '" fill="#4a4438"/>';
        s += '<circle cx="' + (bw * 0.28) + '" cy="' + (bh * 0.46) + '" r="' + (bh * 0.15) + '" fill="#4a4438"/>';
        s += '<circle cx="' + (-bw * 0.28) + '" cy="' + (bh * 0.46) + '" r="' + (bh * 0.07) + '" fill="#c9c2b6"/>';
        s += '<circle cx="' + (bw * 0.28) + '" cy="' + (bh * 0.46) + '" r="' + (bh * 0.07) + '" fill="#c9c2b6"/>';
      }

      if (it.t === "desk") {
        s += '<rect x="' + (-w / 2) + '" y="' + (-h * 0.1) + '" width="' + w + '" height="' + (h * 0.16) + '" rx="6" fill="' + c1 + '"/>';
        s += '<rect x="' + (-w / 2 + 10) + '" y="' + (h * 0.06) + '" width="12" height="' + (h * 0.5) + '" fill="' + c2 + '"/>';
        s += '<rect x="' + (w / 2 - 22) + '" y="' + (h * 0.06) + '" width="12" height="' + (h * 0.5) + '" fill="' + c2 + '"/>';
        s += '<rect x="' + (-w * 0.3) + '" y="' + (-h * 0.28) + '" width="' + (w * 0.3) + '" height="' + (h * 0.18) + '" rx="3" fill="#fffdf8"/>';
        s += '<rect x="' + (w * 0.06) + '" y="' + (-h * 0.34) + '" width="10" height="' + (h * 0.24) + '" rx="2" fill="#f6b93b"/>';
        s += '<rect x="' + (w * 0.2) + '" y="' + (-h * 0.3) + '" width="9" height="' + (h * 0.2) + '" rx="2" fill="#7fb6e0"/>';
      }

      s += '</g>';
      return s;
    }

    (sc.items || []).forEach(function (it) { g.push(item(it)); });

    return '<svg class="scene" viewBox="' + cx + ' ' + cy + ' ' + cw + ' ' + ch +
           '" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
           g.join("") + '</svg>';
  }

  /* ---------------- 房间初始化 ---------------- */
  /**
   * @param {Object} cfg
   *  cfg.id          房间 id，用于存档
   *  cfg.name        房间名
   *  cfg.people      [{id,name,art,x,y,talk:[...]}]  x/y 为房间内百分比
   *  cfg.things      [{id,name,art,x,y,act:fn,once:bool}] 可点的物件
   *  cfg.intro       进门时说的话
   *  cfg.done        完成条件说明
   */
  function initRoom(cfg) {
    load();
    document.title = cfg.name + " · 澄澄的小镇";

    var state = { talked: {}, acted: {}, busy: false };
    var saved = S.rooms[cfg.id] || {};
    state.talked = saved.talked || {};
    state.acted = saved.acted || {};

    var stage = document.getElementById("room");

    /* —— 先算视口：横屏就是 1000×700；竖屏换成更窄更高的取景框 —— */
    var view = { cw: 1000, ch: 700, cx: 0, cy: 0, squeeze: 1 };
    try {
      var sw = stage.clientWidth || 1000, sh = stage.clientHeight || 700;
      var ar = sw / Math.max(1, sh);
      if (ar < 1) {
        /* 竖屏：内容横向压缩到 0.5（人贴得更紧），
           再按舞台宽高比给出视口高度，地板线放在 62% —— 上下都刚好 */
        var ch3 = 1000 / ar;
        var cy3 = 434 - ch3 * 0.62;
        cy3 = Math.max(-300, Math.min(700 - ch3, cy3));
        view = { cw: 1000, ch: ch3, cx: 0, cy: cy3, squeeze: 0.62 };
      }
    } catch (e2) {}

    function vx(x) {
      if (view.squeeze === 1) return x;
      return 50 + (x - 50) * 0.62;
    }
    /* 竖屏：视线中心放在地板线上方，人物脚底落在画面 FLOOR_AT 处，
       上面留出墙面、下面留出地板与对话框的空间 */
    var FLOOR_AT = 0.60;              /* 希望"人站的位置"落在画面 60% */
    var PERSON_BASE_Y = 84;           /* 人的脚底在场景里的百分比 */
    function projY(y) {
      /* 场景 y% → 视口 y%（不做额外搬运，家具和物件都按这个走） */
      if (view.squeeze === 1) return y;
      return (y / 100 * 700 - view.cy) / view.ch * 100;
    }
    function vy(y) {
      if (view.squeeze === 1) return y;
      /* 人整体平移，让脚底正好落在 FLOOR_AT 处 */
      return projY(y) + (FLOOR_AT * 100 - projY(PERSON_BASE_Y));
    }

    /* 先把房间的陈设画上去（纯装饰，不可点） */
    if (cfg.scene) stage.innerHTML = buildScene(cfg.scene, view) + '<div class="props" id="props"></div>';
    var propLayer = document.getElementById("props") || stage;

    /* 建人物 */
    cfg.people.forEach(function (p) {
      var b = document.createElement("button");
      b.className = "peep";
      b.type = "button";
      b.style.left = vx(p.x) + "%";
      b.style.top = vy(p.y) + "%";
      b.innerHTML = '<span class="bubble" hidden></span>' + art(p.art, p.size || 120);
      b.addEventListener("click", function () { clickPerson(p, b); });
      propLayer.appendChild(b);
      p._el = b;
      if (!state.talked[p.id]) b.classList.add("fresh");
    });

    /* 建物件 */
    (cfg.things || []).forEach(function (t) {
      var b = document.createElement("button");
      b.className = "thing";
      b.type = "button";
      /* 物件跟家具一样，位置锚在场景上，不做额外位移 */
      b.style.left = vx(t.x) + "%";
      b.style.top = projY(t.y) + "%";
      b.innerHTML = t.html || art(t.art, t.size || 92);
      b.addEventListener("click", function () { clickThing(t, b); });
      propLayer.appendChild(b);
      t._el = b;
    });

    function clickPerson(p, el) {
      if (state.busy) return;
      Sound.blip("tap");
      var i = state.talked[p.id] || 0;
      var line = p.talk[i % p.talk.length];
      state.talked[p.id] = i + 1;
      S.rooms[cfg.id] = { talked: state.talked, acted: state.acted };
      save();
      el.classList.remove("fresh");
      bounce(el);
      say(p.name + "：" + line);
      /* 说完轮一句，下次点会换一句 */
      if (i + 1 >= p.talk.length && !p._wrapped) {
        p._wrapped = true;
        el.querySelector(".bubble").hidden = false;
        el.querySelector(".bubble").textContent = "✓";
      }
      checkAll();
    }

    function clickThing(t, el) {
      if (state.busy) return;
      if (t.once && state.acted[t.id]) {
        say(t.doneLine || "这个已经好啦。");
        return;
      }
      Sound.blip("ok");
      bounce(el);
      state.acted[t.id] = true;
      S.rooms[cfg.id] = { talked: state.talked, acted: state.acted };
      save();
      if (t.act) t.act(el, say);
      else say(t.name + "：" + (t.line || "真有意思。"));
      checkAll();
    }

    function bounce(el) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    }

    function checkAll() {
      var talkDone = cfg.people.every(function (p) { return (state.talked[p.id] || 0) > 0; });
      var thingDone = (cfg.things || []).every(function (t) { return state.acted[t.id]; });
      if (talkDone && thingDone && !S.rooms[cfg.id].done) {
        S.rooms[cfg.id].done = true;
        save();
        Sound.blip("good");
        setTimeout(function () {
          var panel = document.getElementById("roomDone");
          if (panel) panel.classList.add("show");
          say("这间屋子你转完啦。回去的路上小心一点。");
        }, 600);
      }
    }

    /* 开始 */
    function begin(quiet) {
      S.sound = S.sound !== false;
      if (S.sound) Sound.start();
      if (!quiet) Sound.blip("ok");
      var cover = document.getElementById("cover");
      if (cover) {
        cover.classList.add("hide");
        cover.style.pointerEvents = "none";
        cover.setAttribute("aria-hidden", "true");
        setTimeout(function () {
          cover.style.display = "none";
          cover.classList.add("gone");
          if (cover.parentNode) cover.parentNode.removeChild(cover);
        }, 460);
      }
      setTimeout(function () { say(cfg.intro); }, quiet ? 520 : 260);
    }

    var goBtn = document.getElementById("goBtn");
    if (goBtn) goBtn.addEventListener("click", begin);

    /* 从小镇「进屋」进来的，门已经开了，不用再点一次「进屋」 */
    try {
      var fromDoor = new URLSearchParams(location.search).get("from") === "door";
      if (fromDoor) {
        var cv = document.getElementById("cover");
        if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
        begin(true);
      }
    } catch (e) {}

    /* 已完成的房间，直接标出勾 */
    cfg.people.forEach(function (p) {
      if (state.talked[p.id] >= p.talk.length) {
        var bb = p._el.querySelector(".bubble");
        bb.hidden = false; bb.textContent = "✓";
      }
    });

    return {
      S: S, say: say, Sound: Sound, Voice: Voice, art: art,
      Say: say, Save: save,           /* 页面里买完东西要立刻存盘 */
      CloseSheet: function(){ var m = document.getElementById("mask"); if (m) m.classList.remove("show"); }
    };
  }

  art.d = ART;   /* 暴露图形路径字典，便于页面里自己拼组合图 */
  global.Room = { init: initRoom, art: art, Sound: Sound, Voice: Voice, load: load, save: save, KEY: KEY };
})(window);
