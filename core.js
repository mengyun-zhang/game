/* ============================================================
   澄澄小镇 · 基础框架
   负责：存储、音频、工具函数、场景注册、路由
   ============================================================ */

/* ---------------- 存储 ---------------- */
const Store = (function () {
  const KEY = 'chengcheng-town-v1';
  const DEFAULT = {
    version: 2,
    kidName: '',
    scenes: {},
    stats: { date: '', minutes: 0, tasksDone: 0 },
    settings: { sound: true }
  };

  let data = null;

  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      data = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT));
    } catch (e) {
      data = JSON.parse(JSON.stringify(DEFAULT));
    }
    // 补齐缺失字段
    if (!data.scenes) data.scenes = {};
    if (!data.settings) data.settings = { sound: true };
    if (!data.stats) data.stats = { date: '', minutes: 0, tasksDone: 0 };
    if (typeof data.kidName !== 'string') data.kidName = '';
    // 跨天重置今日时长
    const t = todayStr();
    if (data.stats.date !== t) {
      data.stats.date = t;
      data.stats.minutes = 0;
    }
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  function scene(id) {
    if (!data.scenes[id]) data.scenes[id] = { tasks: {} };
    if (!data.scenes[id].tasks) data.scenes[id].tasks = {};
    return data.scenes[id];
  }

  function taskDone(sceneId, taskId) {
    return !!scene(sceneId).tasks[taskId];
  }

  function markTask(sceneId, taskId) {
    scene(sceneId).tasks[taskId] = true;
    data.stats.tasksDone = (data.stats.tasksDone || 0) + 1;
    save();
  }

  function starsOf(sceneId, taskIds) {
    let n = 0;
    taskIds.forEach(function (t) { if (taskDone(sceneId, t)) n++; });
    return n;
  }

  // 全开：所有地点都可进入
  function isUnlocked() { return true; }

  function setName(n) {
    data.kidName = (n || '').trim().slice(0, 12);
    save();
  }

  function name() {
    return (data && data.kidName) ? data.kidName : '宝贝';
  }

  function addMinutes(m) {
    data.stats.minutes = (data.stats.minutes || 0) + m;
    save();
  }

  function reset() {
    const keepName = data ? data.kidName : '';
    data = JSON.parse(JSON.stringify(DEFAULT));
    data.kidName = keepName;          // 清进度但保留名字
    data.stats.date = todayStr();
    save();
  }

  return {
    load: load, save: save, get data() { return data; },
    scene: scene, taskDone: taskDone, markTask: markTask,
    starsOf: starsOf, isUnlocked: isUnlocked,
    addMinutes: addMinutes, reset: reset, todayStr: todayStr,
    setName: setName, name: name
  };
})();

/* ---------------- 音频 ---------------- */
const Sfx = (function () {
  let ctx = null;

  function on() { return Store.data && Store.data.settings.sound !== false; }

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
  }

  // freq 基频，dur 时长秒，type 波形，peak 音量，slide 滑到目标频率
  function tone(freq, dur, type, peak, slide) {
    if (!ctx || !on()) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.04);
  }

  const api = {
    init: init,
    // 主角登场的小音效
    hello: function () {
      tone(587.33, 0.12, 'triangle', 0.14);
      setTimeout(function () { tone(880, 0.2, 'triangle', 0.13); }, 110);
    },
    tap: function () { tone(520, 0.07, 'sine', 0.08, 420); },
    pick: function () { tone(660, 0.09, 'sine', 0.1); },
    right: function () {
      tone(659.25, 0.13, 'triangle', 0.16);
      setTimeout(function () { tone(987.77, 0.2, 'triangle', 0.14); }, 105);
    },
    soft: function () { tone(392, 0.16, 'sine', 0.06, 340); },
    pop: function (n) {
      tone(n || 523, 0.2, 'sine', 0.2, (n || 523) * 0.7);
      tone((n || 523) * 2, 0.12, 'triangle', 0.07);
    },
    door: function () {
      tone(220, 0.16, 'sawtooth', 0.05, 180);
      setTimeout(function () { tone(392, 0.18, 'sine', 0.1); }, 130);
    },
    cheer: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.34, 'triangle', 0.15); }, i * 110);
      });
    },
    taskDone: function () {
      [587.33, 783.99, 880, 1174.66].forEach(function (f, i) {
        setTimeout(function () { tone(f, 0.26, 'triangle', 0.15); }, i * 95);
      });
    },
    animal: function (kind) {
      // 不同动物的叫声用不同波形组合近似
      if (kind === 'cat') { tone(700, 0.28, 'sine', 0.16, 420); }
      else if (kind === 'dog') { tone(300, 0.16, 'square', 0.09, 200); }
      else if (kind === 'bird') { tone(1400, 0.1, 'sine', 0.12, 2000); tone(1800, 0.08, 'sine', 0.09); }
      else { tone(500, 0.2, 'triangle', 0.14); }
    },
    siren: function () {
      tone(700, 0.3, 'square', 0.07, 900);
      setTimeout(function () { tone(900, 0.3, 'square', 0.07, 700); }, 300);
    }
  };
  return api;
})();

/* ---------------- 工具 ---------------- */
const U = {
  rnd: function (n) { return Math.floor(Math.random() * n); },
  pick: function (a) { return a[Math.floor(Math.random() * a.length)]; },
  shuffle: function (a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  },
  el: function (tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  },
  // 粒子爆炸
  burst: function (layer, x, y, color, count) {
    count = count || 10;
    for (let i = 0; i < count; i++) {
      const b = document.createElement('div');
      b.className = 'particle';
      const s = 8 + Math.random() * 12;
      b.style.width = b.style.height = s + 'px';
      b.style.background = i % 3 === 0 ? '#fff' : color;
      b.style.left = (x - s / 2) + 'px';
      b.style.top = (y - s / 2) + 'px';
      layer.appendChild(b);
      const ang = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const dist = 55 + Math.random() * 85;
      b.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: 'translate(' + Math.cos(ang) * dist + 'px,' + Math.sin(ang) * dist + 'px) scale(0)', opacity: 0 }
      ], { duration: 460 + Math.random() * 220, easing: 'cubic-bezier(.2,.8,.3,1)' });
      setTimeout(function () { b.remove(); }, 740);
    }
  },
  // 飘字
  floatText: function (layer, x, y, text, color, size) {
    const w = document.createElement('div');
    w.className = 'float-text';
    w.textContent = text;
    w.style.left = x + 'px';
    w.style.top = (y - 24) + 'px';
    w.style.color = color || '#fff';
    w.style.fontSize = (size || 36) + 'px';
    layer.appendChild(w);
    setTimeout(function () { w.remove(); }, 1000);
  },
  // 元素的视口中心坐标
  center: function (el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
};

/* ---------------- 场景注册表 ---------------- */
const Scenes = {};
function defineScene(cfg) {
  Scenes[cfg.id] = cfg;
}

/* ---------------- 地图数据 ---------------- */
// 全开：所有地点直接可进
const TOWN = [
  { id: 'home',     name: '家',       label: '我们家',   emoji: '🏠', color: '#ffb74d', roof: '#e08e2a', tasks: ['t1', 't2', 't3'] },
  { id: 'wai',      name: '外公外婆家', label: '外公外婆家', emoji: '🏡', color: '#a5d6a7', roof: '#5c9a5f', tasks: ['t1', 't2'] },
  { id: 'nai',      name: '爷爷奶奶家', label: '爷爷奶奶家', emoji: '🏘️', color: '#ce93d8', roof: '#8e5fa0', tasks: ['t1', 't2'] },
  { id: 'shop',     name: '超市',     label: '超市',     emoji: '🏪', color: '#81d4fa', roof: '#2b8fbd', tasks: ['t1', 't2', 't3'] },
  { id: 'hospital', name: '医院',     label: '医院',     emoji: '🏥', color: '#ef9a9a', roof: '#c05252', tasks: ['t1', 't2'] },
  { id: 'fire',     name: '消防站',   label: '消防站',   emoji: '🚒', color: '#ff8a65', roof: '#d1542e', tasks: ['t1', 't2'] }
];
