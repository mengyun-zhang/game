/* ============================================================
   澄澄小镇 · 主角「澄澄」
   统一角色：在每一个场景里都有她，由她发起任务、给予回应
   ============================================================ */

const Kid = (function () {
  let outfit = '👧';        // 主角形象，可用于换装
  let greetCounts = {};     // 每个场景被点了几次，用于递进反应

  const LINES = {
    home:     ['我们来收玩具吧', '今天想穿哪件？', '吃饭啦'],
    wai:      ['去看外公外婆', '帮外公浇浇花', '外公在等你'],
    nai:      ['奶奶想你了', '一起包饺子', '爷爷在下棋'],
    shop:     ['要买点什么呢', '帮我拿一下', '记得付钱哦'],
    hospital: ['有人不舒服了', '我们当小医生', '轻轻贴一下'],
    fire:     ['消防员好厉害', '我们一起灭火', '先戴头盔'],
    default:  ['我来啦', '一起玩吧', '你好呀']
  };

  const CHEERS = ['真棒', '好厉害', '再来一次', '你可以的', '做到啦'];

  // 在场景中创建主角
  // 参数：root 场景容器, opts { scene, x, bottom, onClick }
  function spawn(root, opts) {
    opts = opts || {};
    const el = document.createElement('div');
    el.className = 'kid-hero actor';
    el.textContent = outfit;

    // 中文气泡
    const bubble = document.createElement('div');
    bubble.className = 'kid-bubble';
    bubble.style.opacity = '0';
    el.appendChild(bubble);

    el.style.left = opts.x || '50%';
    el.style.bottom = opts.bottom || '12%';
    root.appendChild(el);

    el.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      react();
    });
    el.addEventListener('touchstart', function (e) {
      e.preventDefault();
      e.stopPropagation();
      react();
    }, { passive: false });

    function react() {
      const sc = opts.scene || 'default';
      const key = sc;
      greetCounts[key] = (greetCounts[key] || 0) + 1;
      const n = greetCounts[key];

      // 每 3 次说一句鼓励
      let text;
      if (n % 3 === 0) text = CHEERS[U.rnd(CHEERS.length)];
      else {
        const arr = LINES[sc] || LINES.default;
        text = arr[(n - 1) % arr.length];
      }

      say(text);
      Sfx.hello();
      el.classList.add('jump');
      setTimeout(function () { el.classList.remove('jump'); }, 500);

      // 爱心
      const c = U.center(el);
      U.floatText(opts.layer || document.getElementById('layer'), c.x, c.y - 40, '💖', '#ff8fa8', 36);
    }

    function say(text) {
      bubble.textContent = text;
      bubble.style.opacity = '1';
      bubble.classList.add('show');
      clearTimeout(bubble.__t);
      bubble.__t = setTimeout(function () {
        bubble.classList.remove('show');
        bubble.style.opacity = '0';
      }, 1800);
    }

    return { el, say, react, bubble };
  }

  return {
    spawn: spawn,
    say: function (scene) {
      const arr = LINES[scene] || LINES.default;
      return arr[0];
    },
    outfit: function (v) { if (v) outfit = v; return outfit; }
  };
})();
