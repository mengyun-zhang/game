/* ============================================================
   澄澄小镇 · 外壳
   地图渲染、进入/退出场景、任务卡片、家长面板
   ============================================================ */

(function () {
  'use strict';

  const app = document.getElementById('app');
  const layer = document.getElementById('layer');
  const mapEl = document.getElementById('map');
  const sceneEl = document.getElementById('scene');
  const cardHost = document.getElementById('cardHost');
  const panel = document.getElementById('panel');

  let sessionStart = 0;
  let inScene = false;
  let currentScene = null;
  let modalOpen = false;

  /* ================= 地图 ================= */
  function renderMap() {
    mapEl.innerHTML = '';

    // 天空 + 远景
    const sky = U.el('div', 'map-sky');
    sky.innerHTML =
      '<div class="m-cloud c1"></div>' +
      '<div class="m-cloud c2"></div>' +
      '<div class="m-cloud c3"></div>' +
      '<div class="m-sun">☀️</div>' +
      '<div class="m-hill h1"></div>' +
      '<div class="m-hill h2"></div>';
    mapEl.appendChild(sky);

    // 纵向街道（可左右滑动）
    const street = U.el('div', 'street');
    street.id = 'street';
    mapEl.appendChild(street);

    // 路面
    const road = U.el('div', 'road');
    road.innerHTML = '<div class="road-line"></div>';
    street.appendChild(road);

    // 房子
    TOWN.forEach(function (t, i) {
      const item = U.el('div', 'house-item');
      item.dataset.id = t.id;
      item.style.left = (i * 250 + 60) + 'px';

      const stars = Store.starsOf(t.id, t.tasks);
      const complete = stars >= t.tasks.length;

      // 房子
      const house = U.el('div', 'house' + (complete ? ' complete' : ''));
      house.innerHTML =
        '<div class="roof" style="background:' + t.roof + '"></div>' +
        '<div class="body" style="background:' + t.color + '">' +
          '<div class="door"></div>' +
          '<div class="win w1"></div>' +
          '<div class="win w2"></div>' +
          '<div class="house-emoji">' + t.emoji + '</div>' +
        '</div>';
      item.appendChild(house);

      // 星星
      const starRow = U.el('div', 'star-row');
      for (let s = 0; s < t.tasks.length; s++) {
        const st = U.el('span', 'star' + (s < stars ? ' on' : ''), '★');
        starRow.appendChild(st);
      }
      item.appendChild(starRow);

      // 名牌
      const plate = U.el('div', 'plate', t.label);
      item.appendChild(plate);

      street.appendChild(item);

      item.addEventListener('click', function () {
        enterScene(t.id);
      });
      item.addEventListener('touchstart', function (e) {
        e.preventDefault();
        item.click();
      }, { passive: false });
    });

    // 路上的车
    spawnVehicles(street);

    // 宽度自适应
    street.style.width = (TOWN.length * 250 + 160) + 'px';

    // 滚动到第一个未完成的房子
    setTimeout(function () {
      let target = 0;
      for (let i = 0; i < TOWN.length; i++) {
        const t = TOWN[i];
        const stars = Store.starsOf(t.id, t.tasks);
        if (stars < t.tasks.length) { target = i; break; }
      }
      street.parentElement.scrollLeft = Math.max(0, target * 250 - 40);
    }, 60);
  }

  /* ================= 车辆动画 ================= */
  function spawnVehicles(street) {
    const types = ['🚗', '🚕', '🚙', '🛵', '🚲', '🚌', '🚑'];
    for (let i = 0; i < 4; i++) {
      const v = U.el('div', 'vehicle', U.pick(types));
      v.style.top = (58 + i * 9) + '%';
      v.style.animationDuration = (14 + Math.random() * 12) + 's';
      v.style.animationDelay = (-Math.random() * 20) + 's';
      v.style.fontSize = (26 + Math.random() * 12) + 'px';
      if (i % 2 === 1) {
        v.style.animationDirection = 'reverse';
        v.style.transform = 'scaleX(-1)';
      }
      street.appendChild(v);
    }
  }

  /* ================= 进入场景 ================= */
  function enterScene(id) {
    if (inScene) return;
    const cfg = Scenes[id];
    if (!cfg) return;

    inScene = true;
    currentScene = id;
    Sfx.init();
    Sfx.door();

    // 转场遮罩
    const fade = U.el('div', 'fade');
    fade.textContent = cfg.intro || '';
    app.appendChild(fade);
    requestAnimationFrame(function () { fade.classList.add('in'); });

    setTimeout(function () {
      // 清空场景层
      clearSceneLayer();
      app.classList.add('in-scene');
      sceneEl.innerHTML = '';
      sceneEl.style.background = cfg.bg || 'linear-gradient(180deg,#e3f2fd,#90caf9)';

      // 顶部返回按钮 + 标题
      const bar = U.el('div', 'scene-bar');
      const back = U.el('button', 'back-btn', '←');
      back.onclick = exitScene;
      back.addEventListener('touchstart', function (e) { e.preventDefault(); exitScene(); }, { passive: false });
      const title = U.el('div', 'scene-title', cfg.name);
      bar.appendChild(back);
      bar.appendChild(title);
      sceneEl.appendChild(bar);

      // 场景根容器
      const root = U.el('div', 'scene-root');
      sceneEl.appendChild(root);

      // ★ 主角澄澄：每个场景都在场，由她发起任务
      const kid = Kid.spawn(root, {
        scene: id,
        layer: layer,
        x: '18%',
        bottom: '16%'
      });
      setTimeout(function () { kid.say(Kid.say(id)); }, 900);

      fade.classList.remove('in');
      setTimeout(function () { fade.remove(); }, 420);

      // 构建场景
      cfg.build(root, sceneApi(id, root, kid));
    }, 380);
  }

  function clearSceneLayer() {
    // 移除所有运行中的任务卡和特效
    cardHost.innerHTML = '';
    modalOpen = false;
    layer.innerHTML = '';
  }

  function exitScene() {
    if (!inScene) return;
    clearTimeout(window.__taskTimer);
    clearSceneLayer();

    const fade = U.el('div', 'fade');
    app.appendChild(fade);
    requestAnimationFrame(function () { fade.classList.add('in'); });

    setTimeout(function () {
      app.classList.remove('in-scene');
      sceneEl.innerHTML = '';
      inScene = false;
      currentScene = null;
      renderMap();

      fade.classList.remove('in');
      setTimeout(function () { fade.remove(); }, 420);
    }, 320);
  }

  /* ================= 场景 API ================= */
  function sceneApi(id, root, kid) {
    return {
      layer: layer,
      root: root,
      kid: kid,

      // 给元素绑定点击
      on: function (el, fn) {
        let locked = false;
        el.addEventListener('click', function (e) {
          if (locked || modalOpen) return;
          locked = true;
          setTimeout(function () { locked = false; }, 180);
          fn(e);
        });
        el.addEventListener('touchstart', function (e) {
          e.preventDefault();
          if (locked || modalOpen) return;
          locked = true;
          setTimeout(function () { locked = false; }, 180);
          fn(e);
        }, { passive: false });
        el.style.cursor = 'pointer';
      },

      // 弹出任务卡
      card: function (opt) {
        cardHost.innerHTML = '';
        modalOpen = true;

        const wrap = U.el('div', 'task-wrap');
        const card = U.el('div', 'task-card');

        // 顶部
        const head = U.el('div', 'task-head');
        const ttl = U.el('div', 'task-title', opt.title);
        head.appendChild(ttl);
        if (opt.hint) {
          const hint = U.el('div', 'task-hint', opt.hint);
          head.appendChild(hint);
        }
        card.appendChild(head);

        // 内容区
        const box = U.el('div', 'task-box');
        card.appendChild(box);

        // 卡内提示条
        const toast = U.el('div', 'task-toast');
        toast.style.opacity = '0';
        card.appendChild(toast);

        wrap.appendChild(card);
        cardHost.appendChild(wrap);

        requestAnimationFrame(function () { wrap.classList.add('show'); });

        // 提供提示能力
        const ctx = {
          box: box,
          toast: function (msg, color) {
            toast.textContent = msg;
            toast.style.color = color || '#ffd54a';
            toast.style.opacity = '1';
            clearTimeout(toast.__t);
            toast.__t = setTimeout(function () { toast.style.opacity = '0'; }, 1400);
          }
        };

        setTimeout(function () { opt.onStart(box, ctx); }, 260);
      },

      // 任务完成 → 关卡片 → 回调
      complete: function (sid, tid, done) {
        Store.markTask(sid, tid);
        Sfx.taskDone();

        // 星星飞出
        const card = cardHost.querySelector('.task-card');
        if (card) {
          for (let i = 0; i < 3; i++) {
            const s = U.el('div', 'fly-star', '⭐');
            const r = card.getBoundingClientRect();
            s.style.left = (r.left + r.width / 2 - 20) + 'px';
            s.style.top = (r.top + r.height / 2 - 20) + 'px';
            layer.appendChild(s);
            s.animate([
              { transform: 'translate(0,0) scale(.4)', opacity: 0 },
              { transform: 'translate(' + (Math.random() * 120 - 60) + 'px,' + (-80 - Math.random() * 60) + 'px) scale(1.4)', opacity: 1 },
              { transform: 'translate(' + (Math.random() * 200 - 100) + 'px,-200px) scale(.6)', opacity: 0 }
            ], { duration: 900 + i * 120, easing: 'cubic-bezier(.2,.8,.3,1)' });
            setTimeout(function () { s.remove(); }, 1400);
          }
        }

        // 完成横幅（主角说话 + 名字）
        const banner = U.el('div', 'done-banner');
        banner.innerHTML = '⭐ ' + Store.name() + ' 做到啦！';
        cardHost.appendChild(banner);
        requestAnimationFrame(function () { banner.classList.add('show'); });

        // 主角庆祝
        if (kid) {
          setTimeout(function () {
            kid.say(U.pick(['真棒', '好厉害', '做到啦']));
          }, 300);
        }

        setTimeout(function () {
          banner.classList.remove('show');
          setTimeout(function () { banner.remove(); }, 380);
          cardHost.innerHTML = '';
          modalOpen = false;
          if (done) done();
        }, 1500);
      },

      // 直接进入自由互动
      freePlay: function (fn) { fn(); }
    };
  }

  /* ================= 家长面板 ================= */
  const gate = document.getElementById('gate');
  let holdTimer = null;

  function startHold(e) {
    e.preventDefault(); e.stopPropagation();
    gate.classList.add('holding');
    holdTimer = setTimeout(function () {
      gate.classList.remove('holding');
      openPanel();
    }, 3000);
  }
  function endHold(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    gate.classList.remove('holding');
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
  }
  gate.addEventListener('touchstart', startHold, { passive: false });
  gate.addEventListener('touchend', endHold, { passive: false });
  gate.addEventListener('touchcancel', endHold, { passive: false });
  gate.addEventListener('mousedown', startHold);
  gate.addEventListener('mouseup', endHold);
  gate.addEventListener('mouseleave', endHold);

  function openPanel() {
    renderPanel();
    panel.classList.add('on');
  }
  function closePanel() {
    panel.classList.remove('on');
    if (sessionStart) { /* 继续计时 */ }
    else sessionStart = Date.now();
  }

  function renderPanel() {
    const d = Store.data;

    // 总览
    let totalStars = 0, totalTasks = 0;
    TOWN.forEach(function (t) {
      totalStars += Store.starsOf(t.id, t.tasks);
      totalTasks += t.tasks.length;
    });

    const box = document.getElementById('pStat');
    box.innerHTML =
      '<div class="prow"><span>已获得星星</span><b>' + totalStars + ' / ' + totalTasks + '</b></div>' +
      '<div class="prow"><span>今日游戏时长</span><b>' + (d.stats.minutes || 0) + ' 分钟</b></div>' +
      '<div class="prow"><span>累计完成任务</span><b>' + (d.stats.tasksDone || 0) + ' 个</b></div>';

    // 音效
    const sb = document.getElementById('pSound');
    sb.innerHTML = '';
    ['开', '关'].forEach(function (label, i) {
      const v = i === 0;
      const b = U.el('button', (d.settings.sound !== false) === v ? 'act' : '', label);
      b.onclick = function () {
        d.settings.sound = v;
        Store.save();
        renderPanel();
        if (v) Sfx.tap();
      };
      sb.appendChild(b);
    });

    // 进度详情
    const dd = document.getElementById('pDetail');
    dd.innerHTML = '';
    TOWN.forEach(function (t) {
      const stars = Store.starsOf(t.id, t.tasks);
      const row = U.el('div', 'drow');
      row.innerHTML =
        '<span class="dname">' + t.emoji + ' ' + t.label + '</span>' +
        '<span class="dstars">' + '★'.repeat(stars) + '☆'.repeat(t.tasks.length - stars) + '</span>';
      dd.appendChild(row);
    });
  }

  document.getElementById('pClose').onclick = closePanel;

  document.getElementById('pReset').onclick = function () {
    if (confirm('确定要清空所有进度吗？（名字会保留）')) {
      Store.reset();
      renderPanel();
      renderMap();
      Sfx.tap();
    }
  };

  /* ================= 名字 ================= */
  function renderName() {
    const inp = document.getElementById('pName');
    if (inp) inp.value = Store.name() === '宝贝' ? '' : Store.name();
  }

  function bindNameSave() {
    const inp = document.getElementById('pName');
    const btn = document.getElementById('pNameSave');
    if (!inp || !btn) return;
    btn.onclick = function () {
      const v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      Store.setName(v);
      renderPanel();
      renderMap();
      Sfx.right();
      btn.textContent = '已保存 ✓';
      setTimeout(function () { btn.textContent = '保存'; }, 1200);
    };
  }

  /* ================= 启动 ================= */
  function boot() {
    Store.load();

    // 启动画面：首次进 → 问名字；有名字 → 直接欢迎
    const splash = U.el('div', 'splash');
    const hasName = !!Store.data.kidName;

    if (hasName) {
      splash.innerHTML =
        '<div class="splash-cast">👧</div>' +
        '<div class="splash-title">' + Store.name() + ' 的小镇</div>' +
        '<div class="splash-sub">今天想去哪里玩？</div>' +
        '<button class="splash-btn">🏘️</button>';
      splash.querySelector('.splash-btn').style.marginTop = '10px';
    } else {
      splash.innerHTML =
        '<div class="splash-cast">👧</div>' +
        '<div class="splash-title">你叫什么名字呀</div>' +
        '<div class="splash-sub">写下来，我们一起玩</div>' +
        '<div class="name-row">' +
          '<input class="name-input" id="first-name" type="text" ' +
            'maxlength="12" autocomplete="off" autocorrect="off" ' +
            'autocapitalize="off" spellcheck="false" placeholder="我的名字">' +
        '</div>' +
        '<button class="name-go" id="first-go">出发 →</button>' +
        '<button class="name-skip" id="first-skip">先不写，直接玩</button>';
    }

    document.body.appendChild(splash);

    function launch(name) {
      if (name) Store.setName(name);
      Store.save();
      Sfx.init();
      Sfx.tap();
      splash.classList.add('hide');
      setTimeout(function () { splash.remove(); }, 470);
      renderMap();
      renderName();
      bindNameSave();
      renderPanel();
      sessionStart = Date.now();
    }

    if (hasName) {
      const btn = splash.querySelector('.splash-btn');
      const go = function (e) { e.preventDefault(); launch(null); };
      btn.addEventListener('click', go);
      btn.addEventListener('touchstart', go, { passive: false });
    } else {
      const inp = document.getElementById('first-name');
      const goBtn = document.getElementById('first-go');
      const skipBtn = document.getElementById('first-skip');

      const submit = function (e) {
        if (e) e.preventDefault();
        const v = (inp.value || '').trim();
        if (!v) {
          inp.focus();
          inp.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(-8px)' },
            { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }
          ], { duration: 300 });
          return;
        }
        launch(v);
      };
      goBtn.addEventListener('click', submit);
      goBtn.addEventListener('touchstart', submit, { passive: false });
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') submit(e);
      });

      const skip = function (e) { e.preventDefault(); launch(null); };
      skipBtn.addEventListener('click', skip);
      skipBtn.addEventListener('touchstart', skip, { passive: false });

      // 自动聚焦（iPad 上可能不弹键盘，所以提供明显的按钮）
      setTimeout(function () { try { inp.focus(); } catch (err) {} }, 500);
    }
  }

  /* 计时 */
  setInterval(function () {
    if (!sessionStart) return;
    if (document.hidden) return;
    const now = Date.now();
    if (now - sessionStart >= 60000) {
      const m = Math.floor((now - sessionStart) / 60000);
      sessionStart += m * 60000;
      const d = Store.data;
      if (d) Store.addMinutes(m);
    }
  }, 15000);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !sessionStart) sessionStart = Date.now();
  });

  // 屏蔽缩放与长按菜单
  document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  document.addEventListener('dblclick', function (e) { e.preventDefault(); });

  boot();
})();
