/**
 * Script que roda DENTRO da página do modelo no modo edição (iframe do editor visual).
 * Acha os textos e imagens marcados, deixa clicáveis e conversa com o painel por postMessage.
 */
export const EDITOR_JS = `(() => {
  const ZW = ['\\u200b', '\\u200c', '\\u200d', '\\u2060'];
  const RE = /\\u2063([\\u200b\\u200c\\u200d\\u2060]+)\\u2064/g;
  const dec = (s) => { let n = 0; for (const ch of s) n = n * 4 + ZW.indexOf(ch); return n; };
  const send = (m) => parent.postMessage(Object.assign({ __rp: 1 }, m), '*');
  const css = document.createElement('style');
  css.textContent = '[data-rp]{cursor:pointer!important;outline:1px dashed transparent;outline-offset:2px;transition:outline-color .15s}' +
    '[data-rp]:hover{outline-color:#f97316!important}' +
    '[data-rp-img]{cursor:pointer!important}[data-rp-img]:hover{outline:3px solid #f97316!important;outline-offset:-3px}' +
    '[data-rp-sel]{outline:2px solid #2563eb!important;outline-offset:2px}' +
    '*{animation-play-state:paused!important}';
  document.head.appendChild(css);
  function scan() {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) if (w.currentNode.nodeValue && w.currentNode.nodeValue.indexOf('\\u2063') >= 0) nodes.push(w.currentNode);
    for (const t of nodes) {
      let first = null;
      t.nodeValue = t.nodeValue.replace(RE, (_m, code) => { if (first === null) first = dec(code); return ''; });
      const el = t.parentElement;
      if (el && first !== null && !el.hasAttribute('data-rp')) el.setAttribute('data-rp', String(first));
    }
    document.querySelectorAll('img').forEach((img) => {
      const m = (img.getAttribute('src') || '').match(/#rp=(\\d+)/);
      if (m) img.setAttribute('data-rp-img', m[1]);
    });
    document.querySelectorAll('[style*="#rp="]').forEach((el) => {
      const m = (el.getAttribute('style') || '').match(/#rp=(\\d+)/);
      if (m) el.setAttribute('data-rp-img', m[1]);
    });
    // título da aba e textos em atributos (alt, aria-label) sem as marcas
    document.title = document.title.replace(RE, '');
    document.querySelectorAll('[alt],[aria-label],[title],[placeholder]').forEach((el) => {
      for (const a of ['alt', 'aria-label', 'title', 'placeholder']) { const v = el.getAttribute(a); if (v && v.indexOf('\\u2063') >= 0) el.setAttribute(a, v.replace(RE, '')); }
    });
  }
  function pick(e) {
    const img = e.target.closest('[data-rp-img]');
    const txt = e.target.closest('[data-rp]');
    const hit = txt || img;
    if (!hit) {
      // link para fora (WhatsApp, Instagram…) não abre no modo edição; âncoras da própria página continuam
      const a = e.target.closest('a');
      if (a && !(a.getAttribute('href') || '').startsWith('#')) e.preventDefault();
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    document.querySelectorAll('[data-rp-sel]').forEach((x) => x.removeAttribute('data-rp-sel'));
    hit.setAttribute('data-rp-sel', '');
    if (txt) send({ type: 'pick', i: Number(txt.getAttribute('data-rp')) });
    else send({ type: 'pick', i: Number(img.getAttribute('data-rp-img')) });
  }
  // no modo edição os links e botões não navegam: o clique escolhe o campo
  document.addEventListener('click', (e) => { if (e.target.closest('a,button,[data-rp],[data-rp-img]')) pick(e); }, true);
  window.addEventListener('message', (e) => {
    const m = e.data || {};
    if (!m.__rp) return;
    if (m.type === 'text') document.querySelectorAll('[data-rp="' + m.i + '"]').forEach((el) => { el.textContent = String(m.value).replace(/\\*/g, ''); });
    if (m.type === 'image') {
      document.querySelectorAll('img[data-rp-img="' + m.i + '"]').forEach((img) => { img.removeAttribute('srcset'); img.src = m.value + '#rp=' + m.i; });
      document.querySelectorAll('[data-rp-img="' + m.i + '"]:not(img)').forEach((el) => { el.style.backgroundImage = 'url("' + m.value + '#rp=' + m.i + '")'; });
    }
    if (m.type === 'focus') {
      const el = document.querySelector('[data-rp="' + m.i + '"],[data-rp-img="' + m.i + '"]');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); document.querySelectorAll('[data-rp-sel]').forEach((x) => x.removeAttribute('data-rp-sel')); el.setAttribute('data-rp-sel', ''); }
      else send({ type: 'notfound', i: m.i });
    }
  });
  scan();
  new MutationObserver(() => { clearTimeout(window.__rpT); window.__rpT = setTimeout(scan, 120); }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'style'] });
  send({ type: 'ready' });
})();`;
