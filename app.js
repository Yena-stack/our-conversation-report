'use strict';

let reportData = null;
let activeReport = null;
let accessKey = null;
let toastTimer;
const main = document.getElementById('main');
const headerActions = document.getElementById('header-actions');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const format = text => esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
const multiline = text => esc(text).replace(/\n/g,'<br>');
const flatTitle = report => report.title.replace(/\n/g,' ');
const b64 = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));

function toast(message) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.textContent = message;
  el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), 3400);
}

document.getElementById('show-password').addEventListener('click', event => {
  const input = document.getElementById('password');
  const visible = input.type === 'password';
  input.type = visible ? 'text' : 'password';
  event.currentTarget.textContent = visible ? '숨김' : '표시';
  event.currentTarget.setAttribute('aria-pressed', String(visible));
  event.currentTarget.setAttribute('aria-label', visible ? '비밀번호 숨기기' : '비밀번호 표시');
});

async function unlockReport(providedPassword) {
  const field = document.getElementById('password');
  const button = document.getElementById('unlock-button');
  const error = document.getElementById('unlock-error');
  const password = String(providedPassword ?? field.value).trim();
  if (!password) { error.textContent = '비밀번호를 입력해주세요.'; return; }
  error.textContent = '';
  field.setAttribute('aria-invalid','false');
  button.disabled = true;
  button.textContent = '리포트를 열고 있어요…';
  button.setAttribute('aria-busy','true');
  let payload;
  try {
    const response = await fetch('./report.enc.json', {cache:'no-store'});
    if (!response.ok) throw new Error('fetch');
    payload = await response.json();
  } catch {
    document.body.classList.remove('auto-opening');
    error.textContent = '리포트를 불러오지 못했어요. 연결을 확인한 뒤 다시 시도해주세요.';
    button.disabled = false;
    button.textContent = '리포트 열기 ↗';
    button.removeAttribute('aria-busy');
    return;
  }
  try {
    if (!window.crypto?.subtle) throw new Error('secure-context');
    const material = await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:b64(payload.salt),iterations:payload.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
    const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:b64(payload.iv)},key,b64(payload.ciphertext));
    const parsed = JSON.parse(new TextDecoder().decode(clear));
    if (!Array.isArray(parsed.reports) || parsed.reports.length < 1) throw new Error('data');
    reportData = parsed;
    accessKey = password;
    document.body.classList.remove('auto-opening');
    field.value = '';
    headerActions.innerHTML = `<span class="header-label">${esc(reportData.title)} · COMPLETE EDITION</span><a class="header-button" href="#/">전체 리포트</a><button class="header-button" type="button" data-action="lock" aria-label="리포트 다시 잠그기">잠그기</button>`;
    document.getElementById('print-content').innerHTML = parsed.reports.map(report => `<article class="print-report"><p class="eyebrow">REPORT ${report.id} · ${esc(report.eyebrow)}</p><h1>${multiline(report.title)}</h1><p class="print-deck">${esc(report.deck)}</p><p class="print-source">${esc(reportData.title)} · ${esc(parsed.period)} · 카톡 기록과 AI의 해석</p><p class="prose">${format(report.intro)}</p>${sectionsHtml(report,'print')}</article>`).join('');
    document.querySelectorAll('#print-content .count-method').forEach(details => { details.open = true; });
    route();
  } catch (failure) {
    document.body.classList.remove('auto-opening');
    error.textContent = failure.message === 'secure-context' ? '보안 연결에서 열어주세요. 주소가 https://로 시작하는지 확인해주세요.' : '비밀번호가 맞지 않아요. 전달받은 비밀번호를 확인해주세요.';
    field.setAttribute('aria-invalid','true');
    field.focus();
    button.disabled = false;
    button.textContent = '리포트 열기 ↗';
    button.removeAttribute('aria-busy');
  }
}

document.getElementById('unlock-form').addEventListener('submit', event => {
  event.preventDefault();
  void unlockReport();
});

function accessHash(routePath = '#/') {
  return accessKey ? `${routePath.split('?')[0]}?key=${encodeURIComponent(accessKey)}` : routePath;
}

function syncAccessLinks() {
  document.querySelectorAll('a[href^="#/"]').forEach(link => link.setAttribute('href', accessHash(link.getAttribute('href'))));
  const routePath = location.hash.split('?')[0] || '#/';
  if (accessKey && location.hash !== accessHash(routePath)) history.replaceState(null, '', accessHash(routePath));
}

function renderBlock(block) {
  switch (block.type) {
    case 'p': return `<p class="prose">${format(block.text)}</p>`;
    case 'quote': return `<blockquote class="chat-quote ${block.speaker === reportData.people[0] ? 'yena':'junhyuk'}"><div class="quote-meta"><span class="quote-dot" aria-hidden="true"></span><strong>${esc(block.speaker)}</strong><time datetime="${block.date}T${block.time}:00+09:00">${esc(block.date.replaceAll('-','.'))} · ${esc(block.time)}</time></div><div class="chat-bubble"><p>${esc(block.text)}</p><span class="read-check" aria-hidden="true">✓✓</span></div></blockquote>`;
    case 'note': return `<aside class="callout"><span>${esc(block.label)}</span><p>${format(block.text)}</p></aside>`;
    case 'example': return `<div class="example"><span>대화 예시 · ${esc(block.speaker)} · 실제 카톡 인용 아님</span><p>“${esc(block.text)}”</p></div>`;
    case 'list': return `<ul class="report-list">${block.items.map(item=>`<li>${format(item)}</li>`).join('')}</ul>`;
    case 'table': return `<div class="table-scroll" role="region" aria-label="비교표, 작은 화면에서는 옆으로 스크롤할 수 있어요" tabindex="0"><table class="data-table${block.rows.every(row=>row.every(cell=>String(cell).length<18)) ? ' compact-table' : ' mobile-stack'}">${block.caption?`<caption>${esc(block.caption)}</caption>`:''}<thead><tr>${block.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${block.rows.map(row=>`<tr>${row.map((cell,index)=>`<td data-label="${esc(block.headers[index])}">${format(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case 'wordcounts': return `<div class="word-counts">${Object.entries(block.counts).map(([term,people])=>`<div class="word-card"><h3>“${esc(term)}”</h3><p class="word-unit">이 글자가 들어간 메시지</p><div class="word-people">${Object.entries(people).map(([name,value])=>`<div><span>${esc(name)}</span><strong>${value.messages.toLocaleString()}<small>건</small></strong></div>`).join('')}</div></div>`).join('')}</div>`;
    case 'method': return `<details class="count-method"><summary>${esc(block.title)}</summary><div>${block.blocks.map(renderBlock).join('')}</div></details>`;
    case 'timeline': return `<div class="timeline">${block.items.map(([date,title,text])=>`<div class="timeline-item"><time>${esc(date)}</time><h3>${esc(title)}</h3><p>${esc(text)}</p></div>`).join('')}</div>`;
    case 'stats': return `<div class="stat-panel"><div class="stat-total">${reportData.messages.toLocaleString()}<small>메시지 · ${reportData.days}일</small></div><div class="split-bar" role="img" aria-label="메시지 비중 ${esc(reportData.people[0])} 51.1%, ${esc(reportData.people[1])} 48.9%"><span class="y"></span><span class="j"></span></div><div class="stat-labels"><span>${esc(reportData.people[0])} <strong>${reportData.counts[reportData.people[0]].toLocaleString()}</strong> · 51.1%</span><span>${esc(reportData.people[1])} <strong>${reportData.counts[reportData.people[1]].toLocaleString()}</strong> · 48.9%</span></div></div>`;
    default: return '';
  }
}

function sectionsHtml(report,prefix='section') {
  return report.sections.map((section,index)=>`<section class="report-section" id="${prefix}-${report.id}-${index+1}"><h2><span class="section-index">PART ${String(index+1).padStart(2,'0')}</span>${esc(section.title)}</h2>${section.blocks.map(renderBlock).join('')}</section>`).join('');
}

function homeHtml() {
  const latest = reportData.reports.find(report => report.isNew);
  return `<div class="home"><div class="issue-line"><strong>${esc(reportData.title)}</strong><span>${esc(reportData.period)} · COMPLETE EDITION</span></div><section class="hero" aria-labelledby="home-title"><div class="hero-main"><p class="eyebrow">두 사람의 대화로 쓴, 솔직한 관계 리포트</p><h1 id="home-title" tabindex="-1">서로에게 푹.<br>가끔은 서로에게<br><em>벅차게.</em></h1><p class="hero-description">서로의 응원단이었다가, 다투면 채점표를 꺼내는 두 사람.<br>다정했던 날도, 불편했던 말도 함께 놓고 읽었습니다.<br>듣기 좋은 이야기만으로는 우리를 다 설명할 수 없으니까.</p><a class="button button-dark" href="#/report/01">첫 리포트 읽기 <span class="arrow" aria-hidden="true">↗</span></a></div><div class="hero-seal" aria-hidden="true"><div class="seal-circles"><div class="seal-circle">Y</div><div class="seal-circle second">J</div><span class="seal-heart">♥</span><span class="seal-spark">✳</span></div><p class="seal-label">TWO PEOPLE.<br>ONE ONGOING CONVERSATION.</p></div></section><div class="data-strip"><div class="data-item"><span>함께 남긴 기록</span><strong>${reportData.messages.toLocaleString()}<small>개</small></strong></div><div class="data-item"><span>대화가 이어진 시간</span><strong>${reportData.days}<small>일</small></strong></div><div class="data-item"><span>다른 각도로 읽는 우리</span><strong>${String(reportData.reports.length).padStart(2,'0')}<small>편</small></strong></div></div><div class="editor-note"><p class="eyebrow">A NOTE BEFORE YOU READ</p><p>사랑의 크기만으로 해결되지 않던 순간들을 들여다봅니다. 카톡 인용에는 날짜를, 해석에는 근거를 붙였습니다. 마음에 관한 설명은 대화에 근거한 해석이며, 결혼 생활에서 함께 살펴볼 부분도 담았습니다. 천천히 읽고, 서로의 생각도 함께 들어주세요.</p></div>${latest ? `<a class="new-report-feature" href="#/report/${latest.id}"><span class="eyebrow">NEW · REPORT ${latest.id}</span><h2>${esc(flatTitle(latest))}</h2><p>${esc(latest.deck)}</p><span class="feature-link">새로 추가한 이야기 읽기 ↗</span></a>` : ''}<div class="contents-header"><h2>우리의 ${reportData.reports.length}가지 이야기</h2><span>모든 리포트, 처음부터 끝까지</span></div><nav class="chapter-list" aria-label="리포트 목록">${reportData.reports.map(report=>`<a class="chapter-card" href="#/report/${report.id}"><span class="chapter-number">${report.id}</span><div><div class="chapter-meta"><span>${report.isNew ? '<b class="new-badge">NEW</b> ' : ''}${esc(report.eyebrow)}</span><span class="reading-min">${report.reading}분 읽기</span></div><h3>${esc(flatTitle(report))}</h3><p>${esc(report.deck)}</p></div><span class="chapter-arrow" aria-hidden="true">↗</span></a>`).join('')}</nav><div class="home-endnote"><p>이 리포트는 두 사람을 한 가지 성격으로 고정하지 않습니다. 마음을 단정하기보다, 다음 대화를 조금 더 정확하게 시작하기 위한 기록입니다.</p><button type="button" class="text-button" data-action="print">전체 리포트 인쇄 / PDF 저장 ↗</button></div></div>`;
}

function reportHtml(report) {
  const index=reportData.reports.indexOf(report);
  const next=reportData.reports[index+1];
  const prev=reportData.reports[index-1];
  return `<div class="reader-shell"><aside class="reader-aside" aria-label="다른 리포트"><a class="back-link" href="#/"><span aria-hidden="true">←</span>전체 리포트로</a><p class="eyebrow">OUR CHAPTERS</p><ol class="side-chapters">${reportData.reports.map(item=>`<li><a href="#/report/${item.id}" class="${item.id===report.id?'active':''}" ${item.id===report.id?'aria-current="page"':''}><span class="side-no">${item.id}</span><span>${esc(item.short)}</span></a></li>`).join('')}</ol><p class="aside-note">${esc(reportData.title)}<br>${esc(reportData.period)}<br>카톡 인용과 AI의 해석으로 구성한<br>두 사람만의 관계 리포트.</p></aside><article class="report-article"><a class="back-link mobile-back" href="#/"><span aria-hidden="true">←</span>전체 리포트로</a><header class="report-head"><p class="eyebrow">REPORT ${report.id} / ${String(reportData.reports.length).padStart(2,'0')} · ${esc(report.eyebrow)}</p><h1 tabindex="-1">${multiline(report.title)}</h1><p class="report-deck">${esc(report.deck)}</p><div class="author-bar"><div class="author-avatar" aria-hidden="true">${report.emoji}</div><div class="author-info"><strong>사이 · 대화를 읽은 AI</strong><span>${esc(report.byline || '다정하지만, 봐주지는 않는 기록.')} · ${report.reading}분 읽기</span></div></div><div class="report-actions"><button class="button" type="button" data-action="share">↗ 이 리포트 링크 복사</button><button class="button" type="button" data-action="print">↓ 전체 리포트 인쇄</button></div><p class="report-micro"><span class="tiny-lock" aria-hidden="true"></span><span>전용 링크로 읽는 리포트 · 날짜가 있는 말은 실제 카톡 인용입니다.</span></p></header><p class="report-intro">${format(report.intro)}</p><details class="toc"><summary>이 리포트의 목차 <span>${report.sections.length}가지 이야기</span></summary><ol>${report.sections.map((section,i)=>`<li><a href="#/report/${report.id}/${i+1}">${esc(section.title)}</a></li>`).join('')}</ol></details>${sectionsHtml(report)}<footer class="report-end"><p class="report-end-label">END OF REPORT ${report.id} · 다음 대화는 두 사람이 써주세요.</p>${next?`<a class="next-chapter" href="#/report/${next.id}"><span>NEXT · REPORT ${next.id} ↗</span><h2>${esc(flatTitle(next))}</h2></a>`:`<a class="next-chapter" href="#/report/06"><span>BACK TO OUR NEXT CHAPTER ↗</span><h2>읽고 난 뒤, 함께 실천할 약속.</h2></a>`}<div class="end-actions">${prev?`<a href="#/report/${prev.id}">← 이전 리포트</a>`:'<span></span>'}<a href="#/">전체 리포트 보기 ↗</a></div></footer></article></div>`;
}

function updateProgress() {
  const progress=document.getElementById('reading-progress');
  if (!reportData || !activeReport) { progress.style.width='0%'; return; }
  const total=document.documentElement.scrollHeight-window.innerHeight;
  progress.style.width=`${Math.max(0,Math.min(100,total>0?window.scrollY/total*100:0))}%`;
}

function route() {
  if (!reportData) return;
  const match=location.hash.split('?')[0].match(/^#\/report\/(\d{2})(?:\/(\d+))?$/);
  const selected=match?reportData.reports.find(r=>r.id===match[1]):null;
  const sectionNumber=match?.[2];
  if (selected?.id===activeReport && sectionNumber) {
    const target=document.getElementById(`section-${selected.id}-${sectionNumber}`);
    if (target) target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    return;
  }
  activeReport=selected?.id ?? null;
  main.innerHTML=selected?reportHtml(selected):homeHtml();
  syncAccessLinks();
  document.title=selected?`${flatTitle(selected)} — 사이`:`${reportData.title} — 사이`;
  window.scrollTo({top:0,behavior:'instant'});
  main.querySelector('h1')?.focus({preventScroll:true});
  if (selected && sectionNumber) document.fonts.ready.then(()=>requestAnimationFrame(()=>document.getElementById(`section-${selected.id}-${sectionNumber}`)?.scrollIntoView({behavior:'instant'})));
  updateProgress();
}

document.addEventListener('click', async event => {
  const internalLink=event.target.closest('a[href^="#/"]');
  if (internalLink && internalLink.getAttribute('href')===location.hash) {
    event.preventDefault();
    route();
  }
  if (event.target.closest('.skip-link')) {
    event.preventDefault();
    main.focus({preventScroll:true});
    main.scrollIntoView({behavior:'instant'});
    return;
  }
  const action=event.target.closest('[data-action]')?.dataset.action;
  if (action==='lock') { reportData=null; accessKey=null; document.getElementById('print-content').replaceChildren(); main.replaceChildren(); history.replaceState(null,'',location.pathname+location.search+'#/'); location.reload(); }
  if (action==='print'&&reportData) window.print();
  if (action==='share'&&reportData) {
    try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}${accessHash('#/report/'+activeReport)}`); toast('링크를 복사했어요. 이 링크로 바로 읽을 수 있어요.'); }
    catch { toast('복사하지 못했어요. 주소창의 링크를 복사해주세요.'); }
  }
});

window.addEventListener('hashchange',route);
window.addEventListener('scroll',updateProgress,{passive:true});
window.addEventListener('resize',updateProgress,{passive:true});

const initialAccess = new URLSearchParams(location.hash.split('?')[1] || '').get('key');
if (initialAccess && initialAccess.length <= 128) {
  document.body.classList.add('auto-opening');
  void unlockReport(initialAccess);
}
