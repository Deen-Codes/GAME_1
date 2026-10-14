// Builds the customisation panels from a schema.
export function buildPanel({ tabsEl, contentEl, schema, getCfg, onChange, startTab = 0 }) {
  let active = startTab;
  const renderTabs = () => {
    tabsEl.innerHTML = '';
    schema.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'tab' + (i === active ? ' on' : '');
      b.textContent = t.tab;
      b.onclick = () => { active = i; renderTabs(); renderContent(); };
      tabsEl.appendChild(b);
    });
  };
  const renderContent = () => {
    const cfg = getCfg();
    contentEl.innerHTML = '';
    for (const it of schema[active].items) {
      const row = document.createElement('div'); row.className = 'row';
      const lab = document.createElement('div'); lab.className = 'lab'; lab.textContent = it.label; row.appendChild(lab);
      if (it.type === 'choice') {
        const wrap = document.createElement('div'); wrap.className = 'chips';
        for (const [val, text] of it.options) {
          const b = document.createElement('button'), dec = it.decorate?.(val);
          b.className = 'chip' + (cfg[it.key] === val ? ' on' : '') + (dec ? ' rich' : '') + (dec?.lock ? ' locked' : '');
          if (dec) { // attachment chip: name, what it does (green good / red bad), price or lock
            b.innerHTML = `<span class="cn">${text}</span>${dec.fx?.length ? `<span class="cfx">${dec.fx.map(([l, v, good]) => `<i class="${good ? 'up' : 'dn'}">${v} ${l}</i>`).join('')}</span>` : dec.note ? `<span class="cfx"><i>${dec.note}</i></span>` : ''}${dec.lock ? `<span class="clk">Gun level ${dec.lock}</span>` : dec.price ? `<span class="cpr">${dec.price}</span>` : ''}`;
          } else b.textContent = text;
          b.onclick = () => { if (dec?.lock) { it.onLocked?.(val, dec.lock); return; } onChange(it.key, val); [...wrap.children].forEach(c => c.classList.remove('on')); b.classList.add('on'); };
          wrap.appendChild(b);
        }
        row.appendChild(wrap);
      } else if (it.type === 'color') {
        const wrap = document.createElement('div'); wrap.className = 'swatches';
        const mark = () => [...wrap.querySelectorAll('.sw')].forEach(s => s.classList.toggle('on', s.dataset.c === (getCfg()[it.key] || '').toLowerCase()));
        for (const col of it.palette) {
          const s = document.createElement('button'); s.className = 'sw'; s.style.background = col; s.dataset.c = col.toLowerCase();
          s.onclick = () => { onChange(it.key, col); picker.value = col; mark(); };
          wrap.appendChild(s);
        }
        const pl = document.createElement('label'); pl.className = 'sw custom'; pl.title = 'Custom colour';
        const picker = document.createElement('input'); picker.type = 'color'; picker.value = cfg[it.key] || '#ffffff';
        picker.oninput = () => { onChange(it.key, picker.value); mark(); };
        pl.appendChild(picker); wrap.appendChild(pl);
        row.appendChild(wrap); mark();
      } else if (it.type === 'range') {
        const r = document.createElement('input'); r.type = 'range'; r.min = it.min; r.max = it.max; r.step = it.step; r.value = cfg[it.key];
        r.oninput = () => onChange(it.key, parseFloat(r.value));
        row.appendChild(r);
      } else if (it.type === 'text') {
        const t = document.createElement('input'); t.type = 'text'; t.maxLength = 24; t.value = cfg[it.key] || '';
        t.oninput = () => onChange(it.key, t.value);
        row.appendChild(t);
      }
      contentEl.appendChild(row);
    }
  };
  renderTabs(); renderContent();
  return { refresh: renderContent };
}

export function renderStats(el, bars, extra, base) {
  el.innerHTML = bars.map(([name, v, txt], i) => { // with base: the change shows as a green (better) or red (worse) segment
    const b = base?.[i]?.[1], d = b == null ? 0 : v - b, lo = Math.min(v, b ?? v), hi = Math.max(v, b ?? v);
    const seg = Math.abs(d) > 0.004 ? `<em class="${d > 0 ? 'up' : 'dn'}" style="left:${(lo * 100).toFixed(1)}%;width:${((hi - lo) * 100).toFixed(1)}%"></em>` : '';
    return `<div class="stat${Math.abs(d) > 0.004 ? (d > 0 ? ' better' : ' worse') : ''}"><span>${name}</span><div class="bar"><i style="width:${(lo * 100).toFixed(0)}%"></i>${seg}</div><b>${txt}</b></div>`; }).join('') +
    (extra ? `<div class="statx">${extra}</div>` : '');
}
