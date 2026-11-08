/* =====================================================================
   澄澄的小镇 · 公共底座 ui.js
   ---------------------------------------------------------------------
   这一层只放「每个页面都要用、而且必须一模一样」的四样东西：

     1. 存档   —— 同一个 key、同一套默认字段、同一份归一化规则
     2. 商店   —— 同一张商品表、同一套算价规则
                  （这张表曾经在三个页面里各抄一份，抄出过分类错误）
     3. 声音   —— 同一首背景音乐、同一套音效、同一套角色嗓音
     4. 说话   —— 谁在说什么，靠音高和语速区分

   页面自己的东西（画面、布局、玩法、顶栏）都不放在这里。
   加载顺序：ui.js → room.js → 具体的页面。
   零依赖、纯原生，file:// 双击就能用。
   ===================================================================== */
(function (global) {
  "use strict";

  /* ===================================================================
     1. 存档
     =================================================================== */
  var KEY = "chengcheng-town-v2";

  /* 存档的「完整样子」。老存档缺哪个字段就补哪个，不会因为少一个字段整页白掉 */
  function blank() {
    return {
      kidName: "",     /* 小朋友的名字，决定小镇和家的名字 */
      stars: 0,
      visited: {}, cleared: {}, diff: "mid",
      hero: { x: 985, y: 772 },
      flowers: {},     /* 每个地点的花是否开过 */
      sound: true, voice: true, music: true, sfx: true,
      silent: {},      /* 已听过的引导，避免每次重复念 */
      folk: {},        /* 镇上居民的当前位置与心情 */
      myfolk: [],      /* 自己做的小朋友 */
      bag: {},         /* 背包：{ 物品id: 数量 } */
      pets: [],        /* 跟在身后的小伙伴 */
      farm: null,      /* 农场里的田与窝，farm.html 写，别处只负责保留 */
      rooms: {},       /* 各房间自己的小进度 */
      mathDone: {},    /* 数学天地做过的题 */
      games: null,     /* 游戏馆：哪些关卡过了、各玩过几次 */
      books: null,     /* 故事屋：哪几个故事读完了、读过几次 */
      stats: null,     /* 哪天玩了多久，家长面板里给自己看 */
      gift: false,     /* 进镇的欢迎层给过没有（给过就不再弹） */
      entered: false
    };
  }

  /* 把读出来的存档收拾干净：类型不对的字段一律拉回默认值。
     这一步很关键——存档是上一版留下的，字段可能缺、可能是 null。 */
  function normalize(S) {
    var d = blank();
    ["visited", "cleared", "flowers", "silent", "folk", "bag", "rooms", "mathDone"].forEach(function (k) {
      if (!S[k] || typeof S[k] !== "object") S[k] = d[k];
    });
    if (!(S.myfolk instanceof Array)) S.myfolk = [];
    if (!(S.pets instanceof Array)) S.pets = [];
    if (S.games !== null && typeof S.games !== "object") S.games = null;
    if (S.books !== null && typeof S.books !== "object") S.books = null;
    if (typeof S.stars !== "number" || !isFinite(S.stars) || S.stars < 0) S.stars = 0;
    if (typeof S.kidName !== "string") S.kidName = "";
    if (!S.hero || typeof S.hero !== "object") S.hero = d.hero;
    if (typeof S.diff !== "string") S.diff = "mid";
    if (typeof S.sound !== "boolean") S.sound = true;
    if (typeof S.voice !== "boolean") S.voice = true;
    /* 老存档只有总开关 sound，分项跟着它走 */
    if (typeof S.music !== "boolean") S.music = S.sound;
    if (typeof S.sfx !== "boolean") S.sfx = true;
    if (typeof S.gift !== "boolean") S.gift = false;   /* 上一版没有这个字段，按「没送过」处理 */
    S.stats = S.stats && typeof S.stats === "object" ? S.stats : { first: Date.now(), days: {} };
    if (!S.stats.first) S.stats.first = Date.now();
    if (!S.stats.days || typeof S.stats.days !== "object") S.stats.days = {};
    S.stats.last = Date.now();
    return S;
  }

  var _S = null;                              /* 当前页面的存档对象，全站只有这一份 */
  var _saved = function () {};                /* 页面提供的额外保存动作（可选） */

  /* 页面拿到存档后调一次，把「这是哪一份」告诉底座 */
  function setSave(S, alsoDo) {
    _S = S;
    if (typeof alsoDo === "function") _saved = alsoDo;
    return S;
  }
  function getS() {
    if (!_S) _S = normalize(blank());
    return _S;
  }

  function load() {
    var S = blank(), first = true;
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var v = JSON.parse(raw);
        if (v && typeof v === "object") { S = Object.assign(blank(), v); first = false; }
      }
    } catch (e) {}
    normalize(S);
    _S = S;
    if (first) save();          /* 先把 8 颗星落盘，刷新才不会重来 */
    startClock();
    return S;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(getS())); } catch (e) {}
    _saved();
  }

  /* 清空重来：删掉存档，回到第一次进镇的样子（星星也从 0 开始） */
  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    _S = normalize(blank());
    save();
    return _S;
  }

  /* 玩一分钟记一分钟。切到后台就停，不会在家长不知情时一直累加。 */
  var clockOn = false;
  function startClock() {
    if (clockOn) return;
    clockOn = true;
    setInterval(function () {
      if (document.hidden) return;
      var S = getS(), d = new Date();
      var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      if (!S.stats) S.stats = { first: Date.now(), days: {} };
      if (!S.stats.days) S.stats.days = {};
      S.stats.days[k] = (S.stats.days[k] || 0) + 1;
      S.stats.last = Date.now();
      save();
    }, 60000);
  }

  /* ===================================================================
     2. 商店：一张表，四个页面共用
     -------------------------------------------------------------------
     分类只有四种，颜色、图标、提示语都跟着分类走。
     加新商品只改这里一处，农场、超市、背包会自动认出来。
     =================================================================== */
  var CATS = [
    { id: "food", name: "吃的",   ico: "apple",    hint: "买来可以送人" },
    { id: "toy",  name: "玩的",   ico: "balloon",  hint: "拿在手里，点一下就玩" },
    { id: "seed", name: "农作物", ico: "seedbag",  hint: "种到农场，三步长成，卖掉能得一点五倍星星" },
    { id: "pet",  name: "幼崽",   ico: "chick",    hint: "养大能当宠物，也可以送给小镇上的人" }
  ];

  /* short：农场里地方小，用它代替全名 */
  var ITEMS = [
    /* —— 吃的：买来可以送给小镇上的人 —— */
    { id: "apple",   name: "苹果", cost: 2, cat: "food", short: "苹果", line: "红红的苹果，脆脆的。" },
    { id: "bread",   name: "面包", cost: 2, cat: "food", short: "面包", line: "刚烤好的面包，香香的。" },
    { id: "candy",   name: "糖果", cost: 3, cat: "food", short: "糖果", line: "甜甜的糖，一天只能吃一颗。" },
    /* —— 玩的：带回小镇点一下就能玩 —— */
    { id: "balloon", name: "气球", cost: 3, per: 3, cat: "toy", short: "气球", line: "一次给 3 只，带回小镇点一下就能放飞。" },
    { id: "bubble",  name: "泡泡", cost: 2, per: 1, cat: "toy", short: "泡泡", line: "带回小镇点一下，满屏都会飘起泡泡。" },
    { id: "teddy",   name: "小熊", cost: 5, cat: "toy", short: "小熊", line: "软软的小熊，可以抱着睡。" },
    { id: "kite",    name: "风筝", cost: 6, cat: "toy", short: "风筝", line: "有风的时候，风筝会飞很高。" },
    { id: "firework",name: "烟花", cost: 4, per: 1, cat: "toy", short: "烟花", line: "带回小镇点一下，天上开出一朵大花。" },
    /* —— 农作物种子：种到农场，浇水两步就成熟，卖价是买价的一点五倍 —— */
    { id: "seed_rose",   name: "玫瑰花种子", cost: 3, cat: "seed", grow: "rose",   short: "玫瑰", line: "种在农场里，能开出一朵玫瑰花。" },
    { id: "seed_potato", name: "土豆种子",   cost: 2, cat: "seed", grow: "potato", short: "土豆", line: "土豆最好养，浇浇水就长。" },
    { id: "seed_carrot", name: "萝卜种子",   cost: 2, cat: "seed", grow: "carrot", short: "萝卜", line: "外公最爱种萝卜，长得最快。" },
    { id: "seed_tomato", name: "番茄种子",   cost: 3, cat: "seed", grow: "tomato", short: "番茄", line: "熟了红红的，酸酸甜甜。" },
    { id: "seed_corn",   name: "玉米种子",   cost: 4, cat: "seed", grow: "corn",   short: "玉米", line: "玉米长得高，得多浇一次水。" },
    /* —— 幼崽：养大能当宠物带出农场，也能送给小镇上的人 —— */
    { id: "pet_chick", name: "小鸡", cost: 4, cat: "pet", grow: "chick", short: "小鸡", line: "毛茸茸的小鸡，会跟着你走。" },
    { id: "pet_pig",   name: "小猪", cost: 5, cat: "pet", grow: "pig",   short: "小猪", line: "圆圆的小猪，爱吃也爱睡。" },
    { id: "pet_duck",  name: "小鸭", cost: 4, cat: "pet", grow: "duck",  short: "小鸭", line: "小鸭走路一摇一摆的。" }
  ];

  function itemById(id) {
    for (var i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
    return null;
  }
  function itemsOf(cat) {
    return ITEMS.filter(function (x) { return x.cat === cat; });
  }
  function catById(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return null;
  }
  /* 农作物的卖价：买价的一点五倍。
     只赚一半，一包种子来回一次是「小赚」，不是「提款机」，
     想多攒星星还是得回去玩关卡。 */
  function sellPrice(it) { return Math.round(((it && it.cost) || 1) * 1.5); }
  /* 幼崽送人给的回礼：也是买入价的一点五倍，和卖作物一样。
     分享不再比卖作物更划算，孩子按「想不想送」来选，而不是按赚多少选。 */
  function giftPrice(it) { return Math.round(((it && it.cost) || 1) * 1.5); }
  /* 种子／幼崽画「长成以后的样子」，孩子一眼就认得出 */
  function itemGrow(it) { return (it && (it.grow || it.id)) || "star"; }

  /* ===================================================================
     3. 声音：背景音乐 + 音效（全部用 Web Audio 实时合成，不加载文件）
     =================================================================== */
  function on(kind) {
    var S = getS();
    if (kind === "music") return S.music !== false;
    if (kind === "voice") return S.voice !== false;
    if (kind === "sfx")   return S.sfx !== false;
    return true;
  }

  var Sound = (function () {
    var ctx = null, master = null, musicGain = null, lp = null, timer = null, playing = false, step = 0;

    /* —— 曲子：《小镇的午后》，G 大调五声音阶的 4/4 慢曲 ——
       底下是一层分解和弦，像有人轻轻扫弦；上面一条八音盒旋律一句一句往下走，
       四小节换一次气。全部用振荡器实时合成，不加载任何音频文件。 */
    var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21];   /* 相对 G 的五声音阶 */
    var ROOT = 196.00;                                  /* G3，听着暖 */
    var BEAT = 520;                                     /* 一拍多少毫秒，4/4 拍 */
    var MEL = [4,2,4,5,  7,-1,5,4,  2,4,5,7,  9,-1,-1,-1,
               4,2,4,5,  7,9,7,5,   4,2,0,2,  0,-1,-1,-1];
    var BASS = [0, 7, 5, 0, 0, 7, 5, 0];                /* 每小节的和弦根音 */
    var ARP = [0, 7, 12, 16];                           /* 根音、五度、八度、十度 */
    function freq(semi) { return ROOT * Math.pow(2, semi / 12); }

    function ensure() {
      if (ctx) return ctx;
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
        musicGain = ctx.createGain(); musicGain.gain.value = 0.0;
        /* 一层低通，把高处的毛刺削掉，听感更软 */
        lp = ctx.createBiquadFilter();
        lp.type = "lowpass"; lp.frequency.value = 2200; lp.Q.value = 0.6;
        musicGain.connect(lp); lp.connect(master);
        /* 一点点空间感：短延迟 + 反馈 */
        var dly = ctx.createDelay(0.6), fb = ctx.createGain(), wet = ctx.createGain();
        dly.delayTime.value = 0.30; fb.gain.value = 0.26; wet.gain.value = 0.22;
        lp.connect(dly); dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(master);
      } catch (e) { ctx = null; }
      return ctx;
    }

    /* 一个柔和的音：三角波 + 缓慢包络 */
    function tone(f, when, dur, vol, type) {
      if (!ctx) return;
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0, when);
      g.gain.linearRampToValueAtTime(vol, when + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
      o.connect(g); g.connect(musicGain);
      o.start(when); o.stop(when + dur + 0.05);
    }

    /* 每一拍排一次音：低音、分解和弦、旋律，各走各的音量 */
    function tick() {
      if (!ctx || !playing) return;
      var t = ctx.currentTime + 0.03;
      var b = step, bar = Math.floor(b / 4), inBar = b % 4;
      var m = MEL[b % MEL.length];
      var root = BASS[bar % BASS.length];

      /* 旋律：八音盒一样的三角波，长一点、留一条尾巴 */
      if (m >= 0) tone(freq(SCALE[m % SCALE.length]), t, 2.1, 0.062, "triangle");
      /* 分解和弦：一拍两下（正拍 + 后半拍），很轻，铺在下面 */
      tone(freq(root + ARP[inBar]), t, 1.5, 0.024, "sine");
      tone(freq(root + ARP[(inBar + 2) % 4] + 12), t + BEAT / 2000, 1.2, 0.013, "sine");
      /* 每小节第一拍垫一个低音，像脚步落在草地上 */
      if (inBar === 0) tone(freq(root - 12), t, 2.8, 0.05, "sine");
      /* 每两小节飘一颗高音小星星 */
      if (b % 8 === 6) tone(freq(SCALE[7] + 24), t + 0.02, 1.6, 0.019, "sine");
      step++;
    }

    return {
      /* 用户第一次点击后调用：解锁音频并淡入 */
      start: function () {
        if (!on("music")) return;
        ensure(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        if (playing) return;
        playing = true;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
        clearInterval(timer);
        timer = setInterval(tick, BEAT);
        tick();
      },
      stop: function () {
        playing = false;
        if (!ctx) return;
        clearInterval(timer);
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      },
      /* 语音播放时把音乐压低，说完再抬起来 */
      duck: function (on2) {
        if (!ctx || !musicGain) return;
        var g = on2 ? 0.12 : 0.5;
        musicGain.gain.cancelScheduledValues(ctx.currentTime);
        musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
        musicGain.gain.linearRampToValueAtTime(g, ctx.currentTime + 0.4);
      },
      /* 小狗的「汪汪」：短促、下滑、带低通，才不会像电子音 */
      bark: function (times) {
        if (!on("sfx")) return;
        ensure(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        var n = times || 2, t0 = ctx.currentTime;
        for (var i = 0; i < n; i++) {
          var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
          var at = t0 + i * 0.17;
          o.type = "sawtooth";
          o.frequency.setValueAtTime(380 - i * 20, at);
          o.frequency.exponentialRampToValueAtTime(150, at + 0.13);
          f.type = "lowpass"; f.frequency.value = 1400;
          g.gain.setValueAtTime(0, at);
          g.gain.linearRampToValueAtTime(0.13, at + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0008, at + 0.15);
          o.connect(f); f.connect(g); g.connect(master);
          o.start(at); o.stop(at + 0.18);
        }
      },
      /* 烟花炸开：一团噪声 + 一声闷响，都不加载文件 */
      boom: function () {
        if (!on("sfx")) return;
        ensure(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        var t0 = ctx.currentTime;
        var len = Math.floor(ctx.sampleRate * 0.6);
        var buf = ctx.createBuffer(1, len, ctx.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) { var k = 1 - i / len; d[i] = (Math.random() * 2 - 1) * k * k; }
        var src = ctx.createBufferSource(); src.buffer = buf;
        var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1100;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.42, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t0);
        var o = ctx.createOscillator(), og = ctx.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(170, t0);
        o.frequency.exponentialRampToValueAtTime(58, t0 + 0.3);
        og.gain.setValueAtTime(0.26, t0); og.gain.exponentialRampToValueAtTime(0.001, t0 + 0.36);
        o.connect(og); og.connect(master);
        o.start(t0); o.stop(t0 + 0.4);
        setTimeout(function () { try { g.disconnect(); og.disconnect(); } catch (e) {} }, 900);
      },
      /* 轻快的小提示音 */
      blip: function (kind) {
        if (!on("sfx")) return;
        ensure(); if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume();
        var t = ctx.currentTime;
        var map = { ok: [784, 1047], good: [659, 880, 1175], soft: [523], pop: [880], tap: [660] };
        var arr = map[kind] || map.soft;
        var tmp = ctx.createGain(); tmp.gain.value = 1; tmp.connect(master);
        arr.forEach(function (f, i) {
          var o = ctx.createOscillator(), g = ctx.createGain();
          o.type = "sine"; o.frequency.value = f;
          g.gain.setValueAtTime(0, t + i * 0.09);
          g.gain.linearRampToValueAtTime(0.16, t + i * 0.09 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.09 + 0.42);
          o.connect(g); g.connect(tmp);
          o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.46);
        });
        setTimeout(function () { try { tmp.disconnect(); } catch (e) {} }, 900);
      }
    };
  })();

  /* ===================================================================
     4. 说话：系统的中文嗓子只有一两个，「谁在说话」靠音高和语速区分
     =================================================================== */
  var VOICE_CHAR = {
    girl:    { pitch: 1.50, rate: 1.00 },   /* 澄澄、小女孩 */
    kid:     { pitch: 1.55, rate: 1.02 },   /* 小朋友 */
    boy:     { pitch: 1.45, rate: 1.00 },
    mom:     { pitch: 1.16, rate: 0.94 },
    dad:     { pitch: 0.90, rate: 0.90 },
    grandma: { pitch: 0.82, rate: 0.80 },
    grandpa: { pitch: 0.72, rate: 0.78 },
    teacher: { pitch: 1.20, rate: 0.88 },
    uncle:   { pitch: 0.94, rate: 0.94 },
    nurse:   { pitch: 1.24, rate: 0.92 },
    clerk:   { pitch: 1.10, rate: 0.94 },
    fireman: { pitch: 0.84, rate: 0.88 },
    farmer:  { pitch: 1.05, rate: 0.90 },
    dog:     { bark: true }
  };

  var Voice = (function () {
    var zh = null, ready = false, lastText = "", lastAt = 0;

    function has() { return ("speechSynthesis" in window) && typeof SpeechSynthesisUtterance !== "undefined"; }

    function pick() {
      if (!has()) return null;
      var vs = window.speechSynthesis.getVoices() || [];
      /* 优先中文女声 */
      var pref = ["Xiaoxiao", "Xiaoyi", "Tingting", "Yaoyao", "Huihui", "Meijia", "Google 普通话", "Chinese", "中文", "普通话"];
      for (var i = 0; i < pref.length; i++) {
        for (var j = 0; j < vs.length; j++) {
          var nm = vs[j].name || "";
          var lg = vs[j].lang || "";
          if (nm.indexOf(pref[i]) >= 0 && (/zh|Chinese/i.test(lg) || !lg)) return vs[j];
        }
      }
      for (var k = 0; k < vs.length; k++) { if (/^zh/i.test(vs[k].lang || "")) return vs[k]; }
      return null;
    }
    function refresh() { zh = pick(); ready = true; }

    if (has()) {
      refresh();
      window.speechSynthesis.onvoiceschanged = refresh;
      /* 有的浏览器清单是异步来的，隔一会儿再抓两次 */
      setTimeout(refresh, 300); setTimeout(refresh, 1200);
    }

    return {
      has: has,
      say: function (text, opts) {
        if (!on("voice") || !text) return;
        var prof = (opts && opts.who && VOICE_CHAR[opts.who]) || null;
        /* 小狗：不念字，换成两短声「汪汪」，气泡里照常显示文字 */
        if (prof && prof.bark) { Sound.bark(2); return; }
        if (!has()) return;
        if (!ready) refresh();
        var now = Date.now();
        /* 同一句不连续重复，免得连点两下念两遍；
           孩子主动点「再听一遍」时传 force，必须真的再念一次 */
        if (!(opts && opts.force) && text === lastText && now - lastAt < 2500) return;
        lastText = text; lastAt = now;
        try {
          window.speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(text);
          u.lang = "zh-CN";
          if (zh) u.voice = zh;
          u.rate = (opts && opts.rate) || (prof && prof.rate) || 0.92;      /* 略慢，适合 3 岁 */
          u.pitch = (opts && opts.pitch) || (prof && prof.pitch) || 1.15;   /* 略高，更柔和 */
          u.volume = 0.95;
          u.onstart = function () { Sound.duck(true); };
          u.onend = function () { Sound.duck(false); };
          u.onerror = function () { Sound.duck(false); };
          window.speechSynthesis.speak(u);
        } catch (e) {}
      },
      stop: function () { try { window.speechSynthesis.cancel(); } catch (e) {} Sound.duck(false); }
    };
  })();

  /* ===================================================================
     5. 小零件：全站长得一样的那几个图标
     =================================================================== */
  /* 五角星：游戏馆、故事屋的通关奖励都用这一颗，不各画一份 */
  function starSVG(sz, color) {
    return '<svg width="' + sz + '" height="' + sz + '" viewBox="-12 -12 24 24" aria-hidden="true">' +
      '<path d="M0,-10.4 L3,-3.3 L10.4,-2.8 L4.8,2.2 L6.6,9.6 L0,5.6 L-6.6,9.6 L-4.8,2.2 L-10.4,-2.8 L-3,-3.3 Z" fill="' + (color || "#f0a832") + '"/>' +
      '<path d="M0,-10.4 L3,-3.3 L10.4,-2.8 L4.8,2.2 L6.6,9.6 L0,5.6 Z" fill="rgba(255,255,255,.28)"/>' +
      '</svg>';
  }

  /* ===================================================================
     6. 跨页跳转：去商店
     -------------------------------------------------------------------
     农场点「去商店」，得直接落在商店的货架前，不能回封面重新问名字。
     以前只靠 URL 里的 ?shop=，可本地打开（file://）或在微信里点开时，
     这一截参数有可能被吞掉——结果就是又回到「你叫什么名字」。
     现在写两处：URL 一份，sessionStorage 一份，哪个活着都能接住。
     =================================================================== */
  var SHOP_CATS = ["food", "toy", "seed", "pet"];

  function askShop() {
    var want = null;
    try {
      var m = /[?&]shop=([a-z]+)/.exec(location.search || "");
      if (m) want = m[1];
      if (!want) {
        m = /shop=([a-z]+)/.exec(location.hash || "");
        if (m) want = m[1];
      }
    } catch (e) {}
    /* URL 里没有，就问上次那个页面留下的记号 */
    try {
      var kept = sessionStorage.getItem("cc-ask-shop");
      if (kept) sessionStorage.removeItem("cc-ask-shop");
      if (!want && kept) want = kept;
    } catch (e) {}
    return SHOP_CATS.indexOf(want) >= 0 ? want : null;
  }

  /* 从哪儿来的。农场来的话，商店里就多一个「回农场」——
     孩子买完种子应该能直接回去种，不用先绕回小镇再点一次房子。 */
  function goShop(cat, from) {
    cat = SHOP_CATS.indexOf(cat) >= 0 ? cat : "toy";
    try {
      sessionStorage.setItem("cc-ask-shop", cat);
      sessionStorage.setItem("cc-shop-from", from || "");
    } catch (e) {}
    /* 拼成绝对地址再跳：有的内置浏览器对「index.html?shop=…」这种
       相对地址会只取文件名，把问号后面整段丢掉，那就又回封面了。 */
    var base = "";
    try { base = location.href.replace(/[?#].*$/, "").replace(/[^/]*$/, ""); } catch (e) {}
    location.href = base + "index.html?shop=" + cat + (from ? "&from=" + from : "");
  }

  /* 读一次就把记号擦掉：切个分类重绘时用的是页面里存的值，不会串到下一次 */
  function shopFrom() {
    var from = "";
    try {
      var m = /[?&]from=([a-z]+)/.exec(location.search || "");
      if (m) from = m[1];
    } catch (e) {}
    try {
      var kept = sessionStorage.getItem("cc-shop-from");
      sessionStorage.removeItem("cc-shop-from");
      if (!from && kept) from = kept;
    } catch (e) {}
    return from || "";
  }

  /* ===================================================================
     出口
     =================================================================== */
  global.CC = {
    KEY: KEY,

    /* 存档 */
    blank: blank, normalize: normalize,
    load: load, save: save, reset: reset,
    setSave: setSave,
    get S() { return getS(); },

    /* 商店 */
    CATS: CATS, ITEMS: ITEMS,
    itemById: itemById, itemsOf: itemsOf, catById: catById,
    sellPrice: sellPrice, giftPrice: giftPrice, itemGrow: itemGrow,

    /* 声音 */
    Sound: Sound, Voice: Voice, VOICE_CHAR: VOICE_CHAR, on: on,

    /* 小零件 */
    starSVG: starSVG,

    /* 跨页跳转 */
    askShop: askShop, goShop: goShop, shopFrom: shopFrom, SHOP_CATS: SHOP_CATS
  };
})(window);
