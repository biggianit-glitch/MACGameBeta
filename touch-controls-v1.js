// Touchscreen controls for MyAmnealCareer Quest
// Adds mobile/tablet overlay controls without changing core gameplay code.

(function () {
  const KEY_MAP = {
    left:  { key: 'ArrowLeft',  code: 'ArrowLeft',  keyCode: 37, which: 37 },
    right: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39, which: 39 },
    up:    { key: 'ArrowUp',    code: 'ArrowUp',    keyCode: 38, which: 38 },
    down:  { key: 'ArrowDown',  code: 'ArrowDown',  keyCode: 40, which: 40 },
    a:     { key: ' ',          code: 'Space',      keyCode: 32, which: 32 },
    enter: { key: 'Enter',      code: 'Enter',      keyCode: 13, which: 13 },
    b:     { key: 'Escape',     code: 'Escape',     keyCode: 27, which: 27 },
    run:   { key: 'Shift',      code: 'ShiftLeft',  keyCode: 16, which: 16 },
    pause: { key: 'p',          code: 'KeyP',       keyCode: 80, which: 80 }
  };

  function fireKey(action, type) {
    const k = KEY_MAP[action];
    if (!k) return;

    const event = new KeyboardEvent(type, {
      key: k.key,
      code: k.code,
      keyCode: k.keyCode,
      which: k.which,
      bubbles: true,
      cancelable: true
    });

    // Some browsers expose keyCode as read-only, so define fallback getters.
    try {
      Object.defineProperty(event, 'keyCode', { get: () => k.keyCode });
      Object.defineProperty(event, 'which', { get: () => k.which });
    } catch (e) {}

    window.dispatchEvent(event);
    document.dispatchEvent(event);
  }

  function press(action) { fireKey(action, 'keydown'); }
  function release(action) { fireKey(action, 'keyup'); }
  function tap(action, delay = 90) {
    press(action);
    setTimeout(() => release(action), delay);
  }

  function makeButton(label, action, options = {}) {
    const btn = document.createElement('button');
    btn.className = 'touch-btn ' + (options.className || '');
    btn.innerHTML = label;
    btn.setAttribute('aria-label', options.aria || label);
    btn.dataset.action = action;

    const mode = options.mode || 'hold';

    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      btn.setPointerCapture?.(e.pointerId);
      btn.classList.add('active');
      if (mode === 'tap') tap(action);
      else press(action);
    });

    const end = (e) => {
      e.preventDefault();
      btn.classList.remove('active');
      if (mode !== 'tap') release(action);
    };

    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
    btn.addEventListener('pointerleave', (e) => {
      if (btn.classList.contains('active')) end(e);
    });

    return btn;
  }

  function buildTouchControls() {
    if (document.getElementById('touchControls')) return;

    const style = document.createElement('style');
    style.textContent = `
      html, body {
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
        overscroll-behavior: none;
      }

      #touchControls {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        height: 178px;
        pointer-events: none;
        z-index: 9998;
        font-family: Arial, sans-serif;
      }

      .touch-cluster {
        position: absolute;
        pointer-events: auto;
      }

      .touch-btn {
        width: 58px;
        height: 58px;
        border-radius: 14px;
        border: 3px solid rgba(255,255,255,0.9);
        background: rgba(5, 20, 38, 0.72);
        color: #fff;
        font-size: 20px;
        font-weight: 800;
        text-shadow: 0 2px 0 #000;
        box-shadow: 0 5px 0 rgba(0,0,0,0.45), inset 0 3px 0 rgba(255,255,255,0.18);
        pointer-events: auto;
        touch-action: none;
        -webkit-tap-highlight-color: transparent;
      }

      .touch-btn.active {
        transform: translateY(4px);
        box-shadow: 0 1px 0 rgba(0,0,0,0.45), inset 0 3px 0 rgba(255,255,255,0.18);
        background: rgba(230,154,23,0.9);
      }

      .touch-dpad {
        left: 18px;
        bottom: 18px;
        width: 188px;
        height: 148px;
      }

      .touch-dpad .up    { position:absolute; left:65px; top:0; }
      .touch-dpad .left  { position:absolute; left:0; top:62px; }
      .touch-dpad .down  { position:absolute; left:65px; top:62px; }
      .touch-dpad .right { position:absolute; left:130px; top:62px; }

      .touch-actions {
        right: 18px;
        bottom: 18px;
        width: 244px;
        height: 150px;
      }

      .touch-actions .jump  { position:absolute; right:72px; top:0; width:72px; height:72px; border-radius:36px; background:rgba(230,154,23,0.78); }
      .touch-actions .run   { position:absolute; right:0; top:48px; width:66px; height:66px; border-radius:33px; background:rgba(32,126,186,0.72); font-size:16px; }
      .touch-actions .use   { position:absolute; right:150px; top:48px; width:66px; height:66px; border-radius:33px; background:rgba(35,145,70,0.72); font-size:16px; }
      .touch-actions .back  { position:absolute; right:74px; top:88px; width:58px; height:48px; border-radius:14px; font-size:14px; background:rgba(140,44,44,0.72); }

      .touch-menu {
        top: 10px;
        right: 10px;
        pointer-events: auto;
        display: flex;
        gap: 8px;
      }

      .touch-menu .small {
        width: 76px;
        height: 40px;
        border-radius: 12px;
        font-size: 13px;
        background: rgba(5,20,38,0.7);
      }

      .touch-hide-toggle {
        position: fixed;
        left: 10px;
        top: 10px;
        z-index: 9999;
        pointer-events: auto;
        width: 86px;
        height: 36px;
        border-radius: 12px;
        border: 2px solid rgba(255,255,255,0.85);
        background: rgba(5,20,38,0.70);
        color: white;
        font-size: 12px;
        font-weight: 800;
      }

      body.touch-controls-hidden #touchControls {
        display: none;
      }

      @media (min-width: 980px) and (pointer: fine) {
        #touchControls, .touch-hide-toggle {
          opacity: 0.35;
        }
      }
    `;
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'touchControls';

    const dpad = document.createElement('div');
    dpad.className = 'touch-cluster touch-dpad';
    dpad.appendChild(makeButton('▲', 'up', { className: 'up' }));
    dpad.appendChild(makeButton('◀', 'left', { className: 'left' }));
    dpad.appendChild(makeButton('▼', 'down', { className: 'down' }));
    dpad.appendChild(makeButton('▶', 'right', { className: 'right' }));

    const actions = document.createElement('div');
    actions.className = 'touch-cluster touch-actions';
    actions.appendChild(makeButton('A', 'a', { className: 'jump', aria: 'Jump or select' }));
    actions.appendChild(makeButton('RUN', 'run', { className: 'run' }));
    actions.appendChild(makeButton('UP', 'up', { className: 'use', aria: 'Use elevator or interact' }));
    actions.appendChild(makeButton('B', 'b', { className: 'back', aria: 'Back' }));

    const menu = document.createElement('div');
    menu.className = 'touch-cluster touch-menu';
    menu.appendChild(makeButton('START', 'enter', { className: 'small', mode: 'tap', aria: 'Start or confirm' }));
    menu.appendChild(makeButton('PAUSE', 'pause', { className: 'small', mode: 'tap', aria: 'Pause' }));

    const toggle = document.createElement('button');
    toggle.className = 'touch-hide-toggle';
    toggle.textContent = 'HIDE PAD';
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('touch-controls-hidden');
      toggle.textContent = document.body.classList.contains('touch-controls-hidden') ? 'SHOW PAD' : 'HIDE PAD';
    });

    root.appendChild(dpad);
    root.appendChild(actions);
    root.appendChild(menu);
    document.body.appendChild(root);
    document.body.appendChild(toggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildTouchControls);
  } else {
    buildTouchControls();
  }
})();
