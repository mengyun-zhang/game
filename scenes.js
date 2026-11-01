/* ============================================================
   澄澄小镇 · 场景内容
   每个场景 = 若干任务 + 一个自由互动
   任务设计原则：一次只做一件事，目标明确，错误零惩罚
   ============================================================ */

/* ============================================================
   场景 1：澄澄家 🏠
   任务：① 收拾玩具（颜色分类）② 穿衣服（顺序）③ 吃饭（选择）
   自由互动：开灯/关灯 + 和小猫咪咪玩
   ============================================================ */
defineScene({
  id: 'home',
  name: '家',
  intro: '🏠',
  bg: 'linear-gradient(180deg, #fff4e0 0%, #ffe0b2 100%)',

  build: function (root, api) {
    // ---------- 房间背景 ----------
    const room = U.el('div', 'room room-home');
    room.innerHTML =
      '<div class="wall"></div>' +
      '<div class="floor"></div>' +
      '<div class="window"><div class="sky"></div><div class="sun"></div></div>' +
      '<div class="rug"></div>';
    root.appendChild(room);

    // 小猫（自由互动对象）
    const cat = U.el('div', 'actor cat', '🐱');
    cat.style.left = '72%';
    cat.style.bottom = '22%';
    root.appendChild(cat);
    let catHappy = 0;
    api.on(cat, function () {
      Sfx.animal('cat');
      catHappy++;
      cat.classList.add('jump');
      setTimeout(function () { cat.classList.remove('jump'); }, 500);
      if (catHappy === 3) {
        U.floatText(api.layer, U.center(cat).x, U.center(cat).y, '❤️', '#ff6b8a', 44);
      }
    });

    // 灯
    const lamp = U.el('div', 'lamp', '💡');
    lamp.style.left = '12%';
    lamp.style.top = '12%';
    root.appendChild(lamp);
    const glow = U.el('div', 'glow');
    room.appendChild(glow);
    let lightOn = true;
    api.on(lamp, function () {
      lightOn = !lightOn;
      glow.style.opacity = lightOn ? '1' : '0';
      room.style.filter = lightOn ? 'none' : 'brightness(.62)';
      Sfx.tap();
    });

    // ---------- 任务流程 ----------
    let step = 0;

    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else if (step === 2) task3();
      else freePlay();
    }

    /* 任务 1：把玩具按颜色放进对应的筐 */
    function task1() {
      if (Store.taskDone('home', 't1')) { step = 1; return nextTask(); }
      api.card({
        title: '把玩具放进一样颜色的筐',
        hint: '🔴 红筐  🔵 蓝筐',
        onStart: run
      });

      function run(box) {
        const COLORS = [
          { key: 'red', c: '#e63946', light: '#ff7b7b' },
          { key: 'blue', c: '#2b7fd4', light: '#7cc6ff' }
        ];
        const baskets = {};
        const toys = [];

        // 两个筐
        COLORS.forEach(function (col, i) {
          const b = U.el('div', 'basket');
          b.style.background = 'linear-gradient(170deg,' + col.light + ',' + col.c + ')';
          b.style.left = (i === 0 ? '8%' : '56%');
          b.style.bottom = '6%';
          b.style.width = '36%';
          b.style.height = '20%';
          b.dataset.color = col.key;
          box.appendChild(b);
          baskets[col.key] = b;

          const label = U.el('div', 'basket-label', col.key === 'red' ? '🔴' : '🔵');
          b.appendChild(label);
        });

        // 6 个玩具球：先点玩具选中，再点对应颜色的筐
        const TOY_EMOJI = ['🧸', '⚽', '🎈', '🪀', '🎁', '🧩'];
        const list = [];
        for (let i = 0; i < 6; i++) list.push(COLORS[i % 2].key);

        let selected = null;

        U.shuffle(list).forEach(function (ck, i) {
          const t = U.el('div', 'toy', TOY_EMOJI[i % TOY_EMOJI.length]);
          const col = COLORS.filter(function (c) { return c.key === ck; })[0];
          t.style.background = col.light;
          t.style.left = (6 + (i % 3) * 31 + Math.random() * 6) + '%';
          t.style.top = (16 + Math.floor(i / 3) * 22) + '%';
          t.dataset.color = ck;
          box.appendChild(t);
          toys.push(t);

          api.on(t, function () {
            if (t.dataset.done) return;
            // 选中（高亮），等孩子点筐
            if (selected) selected.classList.remove('picked');
            selected = t;
            t.classList.add('picked');
            Sfx.pick();
          });
        });

        // 点筐 → 把选中的玩具放进去
        COLORS.forEach(function (col) {
          const basket = baskets[col.key];
          const zone = U.el('div', 'basket-zone');
          basket.appendChild(zone);
          api.on(zone, function () {
            if (!selected) {
              Sfx.soft();
              return;
            }
            const t = selected;
            const br = box.getBoundingClientRect();
            const tr = basket.getBoundingClientRect();

            if (t.dataset.color !== col.key) {
              // 颜色不匹配：温柔摇晃 + 提示，玩具留在原处
              Sfx.soft();
              basket.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-8px)' },
                { transform: 'translateX(8px)' },
                { transform: 'translateX(0)' }
              ], { duration: 320 });
              const c = U.center(basket);
              U.floatText(api.layer, c.x, c.y, col.key === 'red' ? '🔴' : '🔵', '#fff', 40);
              return;
            }

            // 匹配成功
            t.dataset.done = '1';
            t.classList.remove('picked');
            selected = null;
            Sfx.right();

            t.style.transition = 'all .45s cubic-bezier(.4,.1,.5,1)';
            t.style.left = (tr.left - br.left + tr.width / 2 - 31) + 'px';
            t.style.top = (tr.top - br.top + 6) + 'px';
            t.style.transform = 'scale(.6)';
            t.style.opacity = '0';

            const c = U.center(basket);
            U.burst(api.layer, c.x, c.y, col.c, 9);

            const remain = toys.filter(function (x) { return !x.dataset.done; });
            if (remain.length === 0) {
              setTimeout(function () {
                api.complete('home', 't1', function () { step = 1; nextTask(); });
              }, 520);
            }
          });
        });
      }
    }

    /* 任务 2：穿衣服（顺序：上衣 → 裤子 → 鞋） */
    function task2() {
      if (Store.taskDone('home', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '穿上衣服',
        hint: '先穿上衣，再穿裤子，最后穿鞋',
        onStart: run
      });

      function run(box) {
        const ORDER = [
          { id: 'top', emoji: '👕', tip: '上衣' },
          { id: 'pants', emoji: '👖', tip: '裤子' },
          { id: 'shoes', emoji: '👟', tip: '鞋子' }
        ];

        // 身体
        const kid = U.el('div', 'kid');
        kid.innerHTML = '<div class="kid-head">🙂</div>' +
                        '<div class="kid-body"></div>' +
                        '<div class="kid-legs"></div>' +
                        '<div class="kid-feet"></div>';
        box.appendChild(kid);

        // 衣服选项（乱序摆放）
        const tray = U.el('div', 'tray');
        box.appendChild(tray);
        let idx = 0;

        const shuffled = U.shuffle(ORDER);
        shuffled.forEach(function (o) {
          const it = U.el('div', 'cloth-item', o.emoji);
          tray.appendChild(it);
          api.on(it, function () {
            if (idx >= ORDER.length) return;
            if (o.id === ORDER[idx].id) {
              idx++;
              Sfx.right();
              it.classList.add('used');
              const c = U.center(it);
              U.burst(api.layer, c.x, c.y, '#ffd54a', 8);
              // 显示在身上
              const slot = kid.querySelector(
                o.id === 'top' ? '.kid-body' : o.id === 'pants' ? '.kid-legs' : '.kid-feet'
              );
              slot.textContent = o.emoji;
              slot.classList.add('pop-in');
              if (idx >= ORDER.length) {
                kid.classList.add('dressed');
                setTimeout(function () {
                  api.complete('home', 't2', function () { step = 2; nextTask(); });
                }, 520);
              }
            } else {
              Sfx.soft();
              it.animate([
                { transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' },
                { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }
              ], { duration: 300 });
              // 提示下一个该穿什么
              U.floatText(api.layer, U.center(it).x, U.center(it).y, ORDER[idx].emoji, '#fff', 40);
            }
          });
        });
      }
    }

    /* 任务 3：吃饭——挑出能吃的食物 */
    function task3() {
      if (Store.taskDone('home', 't3')) { step = 3; return nextTask(); }
      api.card({
        title: '把能吃的放进碗里',
        hint: '🍚 碗在这里',
        onStart: run
      });

      function run(box) {
        const GOOD = ['🍚', '🥕', '🍎', '🥦', '🍞'];
        const BAD = ['🧦', '🪨', '🔑', '🧸'];
        const items = [];
        const gCount = 4, bCount = 2;
        for (let i = 0; i < gCount; i++) items.push({ e: U.pick(GOOD), ok: true });
        for (let i = 0; i < bCount; i++) items.push({ e: U.pick(BAD), ok: false });

        const bowl = U.el('div', 'bowl', '🥣');
        box.appendChild(bowl);
        let got = 0;

        U.shuffle(items).forEach(function (it, i) {
          const el = U.el('div', 'food-item', it.e);
          el.style.left = (5 + (i % 3) * 32) + '%';
          el.style.top = (10 + Math.floor(i / 3) * 26) + '%';
          box.appendChild(el);
          api.on(el, function () {
            if (el.dataset.done) return;
            if (it.ok) {
              el.dataset.done = '1';
              got++;
              Sfx.right();
              const bc = U.center(bowl);
              const er = el.getBoundingClientRect();
              el.style.transition = 'all .4s cubic-bezier(.4,.1,.5,1)';
              el.style.left = (bc.x - er.width / 2 - box.getBoundingClientRect().left) + 'px';
              el.style.top = (bc.y - er.height - box.getBoundingClientRect().top) + 'px';
              el.style.transform = 'scale(.5)';
              setTimeout(function () { el.style.opacity = '0'; }, 300);
              U.burst(api.layer, bc.x, bc.y, '#8ee08c', 7);
              if (got >= gCount) {
                setTimeout(function () {
                  api.complete('home', 't3', function () { step = 3; nextTask(); });
                }, 480);
              }
            } else {
              Sfx.soft();
              el.animate([
                { transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' },
                { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }
              ], { duration: 320 });
            }
          });
        });
      }
    }

    /* 自由互动：所有任务完成后 */
    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🎉 家全部完成！<br><span>可以随便玩啦</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 3600);
      Sfx.cheer();
      // 撒彩纸
      const cols = ['#ff7b7b', '#ffc46b', '#8ee08c', '#7cc6ff', '#c99cff'];
      for (let i = 0; i < 36; i++) {
        const p = U.el('div', 'particle');
        const s = 10 + Math.random() * 14;
        p.style.width = p.style.height = s + 'px';
        p.style.background = U.pick(cols);
        p.style.left = (Math.random() * window.innerWidth) + 'px';
        p.style.top = '-30px';
        api.layer.appendChild(p);
        p.animate([
          { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          { transform: 'translateY(' + (window.innerHeight + 80) + 'px) rotate(' + (Math.random() * 720 - 360) + 'deg)', opacity: 0.85 }
        ], { duration: 1400 + Math.random() * 1200, easing: 'cubic-bezier(.3,.1,.5,1)' });
        setTimeout(function () { p.remove(); }, 2800);
      }
    }

    step = 0;
    nextTask();
  }
});

/* ============================================================
   场景 2：外公外婆家 🏡
   任务：① 浇花（照顾）② 认水果（命名）
   自由互动：给外公捶背 + 听鸟叫
   ============================================================ */
defineScene({
  id: 'wai',
  name: '外公外婆家',
  intro: '🏡',
  bg: 'linear-gradient(180deg, #e8f5e9 0%, #c8e6c9 100%)',

  build: function (root, api) {
    const room = U.el('div', 'room room-garden');
    room.innerHTML =
      '<div class="sky2"><div class="cloud c1"></div><div class="cloud c2"></div></div>' +
      '<div class="ground"></div>' +
      '<div class="fence"></div>';
    root.appendChild(room);

    // 外公
    const grandpa = U.el('div', 'actor grandpa', '👴');
    grandpa.style.left = '68%';
    grandpa.style.bottom = '26%';
    root.appendChild(grandpa);

    let patCount = 0;
    api.on(grandpa, function () {
      Sfx.tap();
      grandpa.classList.add('jump');
      setTimeout(function () { grandpa.classList.remove('jump'); }, 480);
      patCount++;
      const c = U.center(grandpa);
      if (patCount % 2 === 1) U.floatText(api.layer, c.x, c.y, '❤️', '#ff6b8a', 42);
      else U.floatText(api.layer, c.x, c.y, '😄', '#ffd54a', 42);
    });

    // 鸟
    const bird = U.el('div', 'actor bird', '🐦');
    bird.style.left = '10%';
    bird.style.top = '10%';
    root.appendChild(bird);
    api.on(bird, function () {
      Sfx.animal('bird');
      bird.classList.add('fly');
      setTimeout(function () { bird.classList.remove('fly'); }, 1400);
    });

    let step = 0;
    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else freePlay();
    }

    /* 任务 1：浇花 */
    function task1() {
      if (Store.taskDone('wai', 't1')) { step = 1; return nextTask(); }
      api.card({
        title: '给花浇水',
        hint: '点到每一朵花上',
        onStart: run
      });

      function run(box) {
        const N = 5;
        let watered = 0;
        for (let i = 0; i < N; i++) {
          const pot = U.el('div', 'flower-pot');
          pot.style.left = (7 + i * 18) + '%';
          pot.style.bottom = '14%';
          const bloom = U.el('div', 'bloom');
          bloom.textContent = U.pick(['🌱', '🌿', '🌷', '🌻']);
          pot.appendChild(bloom);
          const stem = U.el('div', 'stem');
          pot.appendChild(stem);
          box.appendChild(pot);

          api.on(pot, function () {
            if (pot.dataset.done) return;
            pot.dataset.done = '1';
            watered++;
            bloom.textContent = '🌻';
            bloom.style.fontSize = '64px';
            Sfx.right();
            const c = U.center(pot);
            U.burst(api.layer, c.x, c.y, '#8ee08c', 8);
            // 水滴
            for (let k = 0; k < 3; k++) {
              const d = U.el('div', 'drop');
              d.textContent = '💧';
              d.style.left = c.x + 'px';
              d.style.top = (c.y - 70) + 'px';
              api.layer.appendChild(d);
              d.animate([
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(60px)', opacity: 0 }
              ], { duration: 520, delay: k * 90, easing: 'ease-in' });
              setTimeout(function () { d.remove(); }, 800);
            }
            if (watered >= N) {
              setTimeout(function () {
                api.complete('wai', 't1', function () { step = 1; nextTask(); });
              }, 620);
            }
          });
        }
      }
    }

    /* 任务 2：水果配对 —— 点一样的两个 */
    function task2() {
      if (Store.taskDone('wai', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '找出一样的水果',
        hint: '点两个一样的就好',
        onStart: run
      });

      function run(box) {
        const FRUITS = ['🍎', '🍌', '🍇', '🍊'];
        const pairs = U.shuffle(FRUITS).slice(0, 3);
        const cards = [];
        pairs.forEach(function (f) { cards.push(f); cards.push(f); });
        const board = U.el('div', 'memory-board');
        box.appendChild(board);

        let first = null, matched = 0, lock = false;

        U.shuffle(cards).forEach(function (f) {
          const c = U.el('div', 'mem-card', '❓');
          c.dataset.fruit = f;
          board.appendChild(c);
          api.on(c, function () {
            if (lock || c.classList.contains('open') || c.classList.contains('matched')) return;
            c.textContent = f;
            c.classList.add('open');
            Sfx.pick();

            if (!first) { first = c; return; }

            if (first.dataset.fruit === f) {
              matched++;
              Sfx.right();
              first.classList.add('matched');
              c.classList.add('matched');
              const cc = U.center(c);
              U.burst(api.layer, cc.x, cc.y, '#ffd54a', 10);
              first = null;
              if (matched >= 3) {
                setTimeout(function () {
                  api.complete('wai', 't2', function () { step = 2; nextTask(); });
                }, 560);
              }
            } else {
              lock = true;
              Sfx.soft();
              const f1 = first;
              setTimeout(function () {
                f1.textContent = '❓';
                f1.classList.remove('open');
                c.textContent = '❓';
                c.classList.remove('open');
                first = null;
                lock = false;
              }, 780);
            }
          });
        });
      }
    }

    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🌻 外公外婆家全部完成！<br><span>外公想让你给他捶背</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 4000);
      Sfx.cheer();
    }

    step = 0;
    nextTask();
  }
});

/* ============================================================
   场景 3：超市 🏪
   任务：① 找清单（按图采购 3 样）② 数数（拿对数量）③ 付钱
   自由互动：推购物车
   ============================================================ */
defineScene({
  id: 'shop',
  name: '超市',
  intro: '🏪',
  bg: 'linear-gradient(180deg, #e1f5fe 0%, #b3e5fc 100%)',

  build: function (root, api) {
    const room = U.el('div', 'room room-shop');
    room.innerHTML = '<div class="shelf s1"></div><div class="shelf s2"></div><div class="shop-floor"></div>';
    root.appendChild(room);

    // 收银员
    const clerk = U.el('div', 'actor clerk', '🧑‍🍳');
    clerk.style.left = '80%';
    clerk.style.bottom = '14%';
    root.appendChild(clerk);
    api.on(clerk, function () {
      Sfx.tap();
      clerk.classList.add('jump');
      setTimeout(function () { clerk.classList.remove('jump'); }, 480);
      U.floatText(api.layer, U.center(clerk).x, U.center(clerk).y, '👋', '#ffd54a', 40);
    });

    let step = 0;
    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else if (step === 2) task3();
      else freePlay();
    }

    /* 任务 1：按清单找 3 样东西 */
    function task1() {
      if (Store.taskDone('shop', 't1')) { step = 1; return nextTask(); }

      const LIST = ['🥛', '🍞', '🍎'];
      api.card({
        title: '买清单上的东西',
        hint: LIST.join(' '),
        onStart: run
      });

      function run(box) {
        const ALL = ['🥛', '🍞', '🍎', '🍌', '🧴', '🍪', '🥕', '🧃', '🍇'];
        const goods = U.shuffle(ALL).slice(0, 9);
        LIST.forEach(function (l) {
          if (goods.indexOf(l) === -1) goods[U.rnd(goods.length)] = l;
        });

        const cart = U.el('div', 'cart-count', '🛒');
        box.appendChild(cart);
        let got = [];

        goods.forEach(function (g, i) {
          const el = U.el('div', 'good', g);
          el.style.left = (5 + (i % 5) * 19) + '%';
          el.style.top = (8 + Math.floor(i / 5) * 30) + '%';
          box.appendChild(el);
          api.on(el, function () {
            if (el.dataset.done) return;
            if (LIST.indexOf(g) !== -1 && got.indexOf(g) === -1) {
              el.dataset.done = '1';
              got.push(g);
              Sfx.right();
              el.classList.add('in-cart');
              cart.textContent = '🛒 ' + got.join(' ');
              const c = U.center(el);
              U.burst(api.layer, c.x, c.y, '#4fc3f7', 8);
              if (got.length >= LIST.length) {
                setTimeout(function () {
                  api.complete('shop', 't1', function () { step = 1; nextTask(); });
                }, 520);
              }
            } else {
              Sfx.soft();
              el.animate([
                { transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }
              ], { duration: 280 });
            }
          });
        });
      }
    }

    /* 任务 2：拿对数量（3 个苹果） */
    function task2() {
      if (Store.taskDone('shop', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '拿 3 个苹果',
        hint: '🍎🍎🍎',
        onStart: run
      });

      function run(box) {
        const TARGET = 3;
        let count = 0;
        const counter = U.el('div', 'counter', '0 / ' + TARGET);
        box.appendChild(counter);

        for (let i = 0; i < 6; i++) {
          const el = U.el('div', 'good', '🍎');
          el.style.left = (6 + (i % 3) * 31) + '%';
          el.style.top = (14 + Math.floor(i / 3) * 30) + '%';
          box.appendChild(el);
          api.on(el, function () {
            if (el.dataset.done || count >= TARGET) return;
            el.dataset.done = '1';
            count++;
            counter.textContent = count + ' / ' + TARGET;
            Sfx.pick();
            el.style.transition = 'all .35s';
            el.style.transform = 'scale(.5) translateY(-30px)';
            el.style.opacity = '0';
            const c = U.center(counter);
            U.floatText(api.layer, c.x, c.y, '+' + count, '#ffd54a', 34);
            if (count >= TARGET) {
              setTimeout(function () {
                api.complete('shop', 't2', function () { step = 2; nextTask(); });
              }, 480);
            }
          });
        }
      }
    }

    /* 任务 3：付钱——凑出正确金额 */
    function task3() {
      if (Store.taskDone('shop', 't3')) { step = 3; return nextTask(); }
      const PRICE = 3;
      api.card({
        title: '一共 3 块钱',
        hint: '💴 点硬币凑够 3',
        onStart: run
      });

      function run(box) {
        let paid = 0;
        const meter = U.el('div', 'pay-meter');
        meter.innerHTML = '<span>0</span> / 3 元';
        box.appendChild(meter);

        const coins = [1, 1, 1, 2, 2];
        U.shuffle(coins).forEach(function (v, i) {
          const c = U.el('div', 'coin', v + '元');
          c.style.left = (8 + i * 17) + '%';
          c.style.bottom = '10%';
          box.appendChild(c);
          api.on(c, function () {
            if (c.dataset.done || paid >= PRICE) return;
            if (paid + v > PRICE) {
              Sfx.soft();
              c.animate([
                { transform: 'rotate(0)' }, { transform: 'rotate(-8deg)' },
                { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }
              ], { duration: 300 });
              U.floatText(api.layer, U.center(c).x, U.center(c).y, '太多啦', '#ffb74d', 28);
              return;
            }
            c.dataset.done = '1';
            paid += v;
            meter.innerHTML = '<span>' + paid + '</span> / 3 元';
            Sfx.pick();
            c.style.transition = 'all .3s';
            c.style.transform = 'scale(.6)';
            c.style.opacity = '0';
            if (paid === PRICE) {
              Sfx.right();
              setTimeout(function () {
                api.complete('shop', 't3', function () { step = 3; nextTask(); });
              }, 500);
            }
          });
        });
      }
    }

    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🛒 超市全部完成！<br><span>去和其他人打个招呼吧</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 3800);
      Sfx.cheer();
    }

    step = 0;
    nextTask();
  }
});

/* ============================================================
   场景 4：医院 🏥
   任务：① 认出不舒服的小孩（共情识别）② 贴创可贴（精细动作）
   自由互动：听诊
   ============================================================ */
defineScene({
  id: 'hospital',
  name: '医院',
  intro: '🏥',
  bg: 'linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%)',

  build: function (root, api) {
    const room = U.el('div', 'room room-hospital');
    room.innerHTML = '<div class="cross">✚</div><div class="bed"></div>';
    root.appendChild(room);

    const doctor = U.el('div', 'actor doctor', '🧑‍⚕️');
    doctor.style.left = '74%';
    doctor.style.bottom = '20%';
    root.appendChild(doctor);
    api.on(doctor, function () {
      Sfx.tap();
      doctor.classList.add('jump');
      setTimeout(function () { doctor.classList.remove('jump'); }, 480);
      U.floatText(api.layer, U.center(doctor).x, U.center(doctor).y, '🩺', '#4fc3f7', 42);
    });

    let step = 0;
    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else freePlay();
    }

    /* 任务 1：谁不舒服？ */
    function task1() {
      if (Store.taskDone('hospital', 't1')) { step = 1; return nextTask(); }
      api.card({
        title: '谁不舒服呀？',
        hint: '点一下那个小朋友',
        onStart: run
      });

      function run(box) {
        const kids = [
          { e: '🤒', sad: true },
          { e: '😄', sad: false },
          { e: '😎', sad: false },
          { e: '😊', sad: false }
        ];
        const row = U.el('div', 'kid-row');
        box.appendChild(row);

        U.shuffle(kids).forEach(function (k) {
          const el = U.el('div', 'patient', k.e);
          row.appendChild(el);
          api.on(el, function () {
            if (k.sad) {
              Sfx.right();
              const c = U.center(el);
              U.burst(api.layer, c.x, c.y, '#ff8a80', 11);
              el.classList.add('found');
              setTimeout(function () {
                api.complete('hospital', 't1', function () { step = 1; nextTask(); });
              }, 560);
            } else {
              Sfx.soft();
              el.animate([
                { transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' },
                { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }
              ], { duration: 300 });
            }
          });
        });
      }
    }

    /* 任务 2：贴创可贴 */
    function task2() {
      if (Store.taskDone('hospital', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '给宝宝贴上创可贴',
        hint: '点红色的地方',
        onStart: run
      });

      function run(box) {
        const patient = U.el('div', 'big-patient');
        patient.innerHTML = '<div class="bp-face">🧒</div>' +
                            '<div class="bp-arm"></div>';
        box.appendChild(patient);
        const wound = U.el('div', 'wound');
        const arm = patient.querySelector('.bp-arm');
        arm.appendChild(wound);

        api.on(wound, function () {
          if (wound.dataset.done) return;
          wound.dataset.done = '1';
          Sfx.right();
          womband();
        });

        function womband() {
          const band = U.el('div', 'bandage', '🩹');
          arm.appendChild(band);
          wound.style.display = 'none';
          const c = U.center(wound);
          U.burst(api.layer, c.x, c.y, '#ffd54a', 12);
          patient.querySelector('.bp-face').textContent = '😊';
          setTimeout(function () {
            api.complete('hospital', 't2', function () { step = 2; nextTask(); });
          }, 640);
        }
      }
    }

    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🏥 医院全部完成！<br><span>医生说你是小帮手</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 3800);
      Sfx.cheer();
    }

    step = 0;
    nextTask();
  }
});

/* ============================================================
   场景 5：消防站 🚒
   任务：① 灭火（点燃烧的地方）② 备装备（顺序）
   自由互动：按警铃
   ============================================================ */
defineScene({
  id: 'fire',
  name: '消防站',
  intro: '🚒',
  bg: 'linear-gradient(180deg, #ffebee 0%, #ffcdd2 100%)',

  build: function (root, api) {
    const room = U.el('div', 'room room-fire');
    room.innerHTML = '<div class="fire-floor"></div><div class="fire-truck">🚒</div>';
    root.appendChild(room);

    const ff = U.el('div', 'actor firefighter', '🧑‍🚒');
    ff.style.left = '78%';
    ff.style.bottom = '22%';
    root.appendChild(ff);
    api.on(ff, function () {
      Sfx.siren();
      ff.classList.add('jump');
      setTimeout(function () { ff.classList.remove('jump'); }, 600);
      const c = U.center(ff);
      U.floatText(api.layer, c.x, c.y, '💪', '#ff8a65', 42);
    });

    let step = 0;
    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else freePlay();
    }

    /* 任务 1：灭火 */
    function task1() {
      if (Store.taskDone('fire', 't1')) { step = 1; return nextTask(); }
      api.card({
        title: '把火扑灭',
        hint: '点每一个🔥',
        onStart: run
      });

      function run(box) {
        const N = 4;
        let out = 0;
        for (let i = 0; i < N; i++) {
          const f = U.el('div', 'flame', '🔥');
          f.style.left = (8 + i * 22) + '%';
          f.style.bottom = (12 + (i % 2) * 10) + '%';
          box.appendChild(f);
          api.on(f, function () {
            if (f.dataset.done) return;
            f.dataset.done = '1';
            out++;
            Sfx.pop(660);
            f.textContent = '💨';
            f.classList.add('smoke');
            const c = U.center(f);
            U.burst(api.layer, c.x, c.y, '#81d4fa', 10);
            for (let k = 0; k < 4; k++) {
              const d = U.el('div', 'drop');
              d.textContent = '💧';
              d.style.left = (c.x + (Math.random() * 40 - 20)) + 'px';
              d.style.top = (c.y - 80) + 'px';
              api.layer.appendChild(d);
              d.animate([
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(80px)', opacity: 0 }
              ], { duration: 460, delay: k * 80, easing: 'ease-in' });
              setTimeout(function () { d.remove(); }, 760);
            }
            if (out >= N) {
              setTimeout(function () {
                api.complete('fire', 't1', function () { step = 1; nextTask(); });
              }, 520);
            }
          });
        }
      }
    }

    /* 任务 2：穿装备（顺序：头盔 → 衣服 → 手套） */
    function task2() {
      if (Store.taskDone('fire', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '帮消防员穿装备',
        hint: '头盔 → 衣服 → 手套',
        onStart: run
      });

      function run(box) {
        const ORDER = [
          { id: 'helm', e: '⛑️' },
          { id: 'suit', e: '🦺' },
          { id: 'glove', e: '🧤' }
        ];
        const hero = U.el('div', 'hero-body');
        hero.innerHTML = '<div class="hero-slot helm"></div>' +
                         '<div class="hero-face">😐</div>' +
                         '<div class="hero-slot suit"></div>' +
                         '<div class="hero-slot glove"></div>';
        box.appendChild(hero);

        const tray = U.el('div', 'tray');
        box.appendChild(tray);
        let idx = 0;

        U.shuffle(ORDER).forEach(function (o) {
          const it = U.el('div', 'cloth-item', o.e);
          tray.appendChild(it);
          api.on(it, function () {
            if (idx >= ORDER.length) return;
            if (o.id === ORDER[idx].id) {
              idx++;
              Sfx.right();
              it.classList.add('used');
              const slot = hero.querySelector('.hero-slot.' + o.id);
              slot.textContent = o.e;
              slot.classList.add('pop-in');
              const c = U.center(it);
              U.burst(api.layer, c.x, c.y, '#ffb74d', 8);
              if (idx >= ORDER.length) {
                hero.querySelector('.hero-face').textContent = '😎';
                setTimeout(function () {
                  api.complete('fire', 't2', function () { step = 2; nextTask(); });
                }, 560);
              }
            } else {
              Sfx.soft();
              it.animate([
                { transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' },
                { transform: 'rotate(6deg)' }, { transform: 'rotate(0)' }
              ], { duration: 300 });
              U.floatText(api.layer, U.center(it).x, U.center(it).y, ORDER[idx].e, '#fff', 38);
            }
          });
        });
      }
    }

    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🚒 消防站全部完成！<br><span>可以按警铃玩</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 3800);
      Sfx.cheer();
    }

    step = 0;
    nextTask();
  }
});

/* ============================================================
   场景 6：爷爷奶奶家 🏘️
   任务：① 下棋摆子（数数）② 包饺子（配对）
   自由互动：和爷爷下棋
   ============================================================ */
defineScene({
  id: 'nai',
  name: '爷爷奶奶家',
  intro: '🏘️',
  bg: 'linear-gradient(180deg, #f3e5f5 0%, #e1bee7 100%)',

  build: function (root, api) {
    const room = U.el('div', 'room room-nai');
    room.innerHTML = '<div class="wall"></div><div class="floor"></div><div class="tea-table">🍵</div>';
    root.appendChild(room);

    const grandma = U.el('div', 'actor grandma', '👵');
    grandma.style.left = '70%';
    grandma.style.bottom = '24%';
    root.appendChild(grandma);
    api.on(grandma, function () {
      Sfx.tap();
      grandma.classList.add('jump');
      setTimeout(function () { grandma.classList.remove('jump'); }, 460);
      U.floatText(api.layer, U.center(grandma).x, U.center(grandma).y, '🥟', '#ba68c8', 42);
    });

    let step = 0;
    function nextTask() {
      if (step === 0) task1();
      else if (step === 1) task2();
      else freePlay();
    }

    /* 任务 1：摆棋子（数数 1-5） */
    function task1() {
      if (Store.taskDone('nai', 't1')) { step = 1; return nextTask(); }
      api.card({
        title: '摆 5 颗棋子',
        hint: '⚫ 一颗一颗放',
        onStart: run
      });

      function run(box) {
        const TARGET = 5;
        let n = 0;
        const board = U.el('div', 'go-board');
        box.appendChild(board);
        const counter = U.el('div', 'counter', '0 / ' + TARGET);
        box.appendChild(counter);

        for (let i = 0; i < 9; i++) {
          const slot = U.el('div', 'go-slot');
          board.appendChild(slot);
          api.on(slot, function () {
            if (slot.dataset.done || n >= TARGET) return;
            slot.dataset.done = '1';
            n++;
            slot.textContent = '⚫';
            slot.classList.add('filled');
            counter.textContent = n + ' / ' + TARGET;
            Sfx.pick();
            if (n >= TARGET) {
              setTimeout(function () {
                api.complete('nai', 't1', function () { step = 1; nextTask(); });
              }, 480);
            }
          });
        }
      }
    }

    /* 任务 2：包饺子——配对（馅 → 皮） */
    function task2() {
      if (Store.taskDone('nai', 't2')) { step = 2; return nextTask(); }
      api.card({
        title: '包饺子',
        hint: '点皮，再点馅',
        onStart: run
      });

      function run(box) {
        const N = 3;
        let made = 0;
        const area = U.el('div', 'dumpling-area');
        box.appendChild(area);

        const wraps = [], fills = [];
        for (let i = 0; i < N; i++) {
          const w = U.el('div', 'wrap-item', '⚪');
          const f = U.el('div', 'fill-item', '🥩');
          area.appendChild(w);
          area.appendChild(f);
          wraps.push(w);
          fills.push(f);
          api.on(w, function () { selectW(w); });
          api.on(f, function () { selectF(f); });
        }

        let selW = null, selF = null;

        function selectW(w) {
          if (w.dataset.done) return;
          if (selW) selW.classList.remove('sel');
          selW = w;
          w.classList.add('sel');
          Sfx.pick();
          tryMake();
        }
        function selectF(f) {
          if (f.dataset.done) return;
          if (selF) selF.classList.remove('sel');
          selF = f;
          f.classList.add('sel');
          Sfx.pick();
          tryMake();
        }
        function tryMake() {
          if (!selW || !selF) return;
          const w = selW, f = selF;
          selW = selF = null;
          w.dataset.done = '1';
          f.dataset.done = '1';
          Sfx.right();
          w.classList.remove('sel');
          f.classList.remove('sel');
          w.textContent = '🥟';
          w.classList.add('made');
          f.style.opacity = '0';
          const c = U.center(w);
          U.burst(api.layer, c.x, c.y, '#ffd54a', 9);
          made++;
          if (made >= N) {
            setTimeout(function () {
              api.complete('nai', 't2', function () { step = 2; nextTask(); });
            }, 560);
          }
        }
      }
    }

    function freePlay() {
      const banner = U.el('div', 'free-banner');
      banner.innerHTML = '🥟 爷爷奶奶家全部完成！<br><span>奶奶说饺子真香</span>';
      root.appendChild(banner);
      setTimeout(function () { banner.remove(); }, 3800);
      Sfx.cheer();
    }

    step = 0;
    nextTask();
  }
});
