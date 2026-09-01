const CONFIG = {
  spreadsheetId: '160_eV8tgT_eXH7dm8pHP8Ym2mHPyHhlFpKWf1bpxEP0',
  gid: '1585177730',
  refreshMs: 5 * 60 * 1000,
};

const state = { rows: [], title: '', updatedAt: null };
const $ = (id) => document.getElementById(id);
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
const numberID = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function value(cell, fallback = 0) {
  if (!cell || cell.v === null || cell.v === undefined) return fallback;
  return cell.v;
}

function formatted(cell, fallback = '') {
  return cell?.f ?? cell?.v ?? fallback;
}

function cell(row, index) { return row?.c?.[index]; }

function mapSheet(response) {
  if (response.status !== 'ok') throw new Error('Google Sheets mengembalikan status error.');
  const title = response.table.cols[2]?.label || '';
  const mapped = [];
  for (const row of response.table.rows) {
    const name = String(value(cell(row, 3), '')).trim();
    const idText = String(formatted(cell(row, 2), '')).replace(/\.0$/, '');
    if (!name || name === 'Sales Name') {
      if (mapped.length) break;
      continue;
    }
    const isChannel = !idText;
    mapped.push({
      id: idText,
      name,
      isChannel,
      allocation: Number(value(cell(row, 4))),
      salesTarget: Number(value(cell(row, 5))),
      salesActual: Number(value(cell(row, 6))),
      salesVariance: Number(value(cell(row, 7))),
      accTarget: Number(value(cell(row, 8))),
      accActual: Number(value(cell(row, 9))),
      accVariance: Number(value(cell(row, 10))),
      vasTarget: Number(value(cell(row, 11))),
      vasActual: Number(value(cell(row, 12))),
      vasVariance: Number(value(cell(row, 13))),
      accRate: Number(value(cell(row, 14))),
      vasRate: Number(value(cell(row, 15))),
      upt: Number(value(cell(row, 16))),
    });
  }
  if (!mapped.length) throw new Error('Baris staff tidak ditemukan pada sheet.');
  return { rows: mapped, title };
}

function totals(rows) {
  return rows.reduce((a, r) => {
    ['salesTarget','salesActual','accTarget','accActual','vasTarget','vasActual'].forEach(k => a[k] += r[k] || 0);
    return a;
  }, { salesTarget:0,salesActual:0,accTarget:0,accActual:0,vasTarget:0,vasActual:0 });
}

function pct(actual, target) { return target > 0 ? (actual / target) * 100 : 0; }
function statusFor(score) {
  if (score >= 100) return { label:'Achieved', cls:'achieved' };
  if (score >= 90) return { label:'On Track', cls:'on-track' };
  if (score >= 80) return { label:'Need Attention', cls:'attention' };
  return { label:'Critical', cls:'critical' };
}
function shortRp(n) {
  const sign = n < 0 ? '-' : '';
  const a = Math.abs(n);
  if (a >= 1e9) return `${sign}Rp${numberID.format(a/1e9)} M`;
  if (a >= 1e6) return `${sign}Rp${numberID.format(a/1e6)} Jt`;
  if (a >= 1e3) return `${sign}Rp${numberID.format(a/1e3)} Rb`;
  return `${sign}Rp${numberID.format(a)}`;
}
function initials(name) { return name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase(); }
function escapeHtml(text) { return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function render() {
  const staff = state.rows.filter(r => !r.isChannel);
  const allTotals = totals(state.rows);
  const achievement = pct(allTotals.salesActual, allTotals.salesTarget);
  const accAchievement = pct(allTotals.accActual, allTotals.accTarget);
  const vasAchievement = pct(allTotals.vasActual, allTotals.vasTarget);
  const gap = allTotals.salesActual - allTotals.salesTarget;
  const storeStatus = statusFor(achievement);

  const dateMatch = state.title.match(/(Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),?\s+\d{1,2}\s+\w+\s+\d{4}/i);
  $('reportDate').textContent = dateMatch ? `${dateMatch[0]} • Daily Report` : 'Daily Sales Report';
  $('storeAchievement').textContent = `${numberID.format(achievement)}%`;
  $('ringValue').textContent = `${numberID.format(achievement)}%`;
  $('storeStatus').textContent = storeStatus.label;
  $('heroSummary').textContent = `${shortRp(allTotals.salesActual)} dari target ${shortRp(allTotals.salesTarget)}`;
  $('storeProgress').style.width = `${Math.min(achievement,100)}%`;
  $('achievementRing').style.setProperty('--progress', `${Math.min(achievement,100)*3.6}deg`);
  $('heroActual').textContent = rupiah.format(allTotals.salesActual);
  $('heroTarget').textContent = rupiah.format(allTotals.salesTarget);
  $('heroGap').textContent = rupiah.format(gap);
  $('heroGap').style.color = gap >= 0 ? '#5ae0ae' : '#ff8d9a';
  $('salesActual').textContent = shortRp(allTotals.salesActual);
  $('salesTargetText').textContent = `Target ${shortRp(allTotals.salesTarget)}`;
  $('accActual').textContent = shortRp(allTotals.accActual);
  $('accAchievement').textContent = `${numberID.format(accAchievement)}% achievement`;
  $('vasActual').textContent = shortRp(allTotals.vasActual);
  $('vasAchievement').textContent = `${numberID.format(vasAchievement)}% achievement`;
  const avgUpt = staff.filter(r=>r.upt>0).reduce((s,r)=>s+r.upt,0) / Math.max(staff.filter(r=>r.upt>0).length,1);
  $('storeUpt').textContent = numberID.format(avgUpt);

  const categories = [
    {name:'Sales',actual:allTotals.salesActual,target:allTotals.salesTarget,color:'#1769ff'},
    {name:'Accessories',actual:allTotals.accActual,target:allTotals.accTarget,color:'#7a55e8'},
    {name:'VAS',actual:allTotals.vasActual,target:allTotals.vasTarget,color:'#0baa7b'},
  ];
  $('categoryBars').innerHTML = categories.map(c => {
    const score = pct(c.actual,c.target);
    return `<div><div class="category-row-head"><span class="category-name"><i class="category-dot" style="background:${c.color}"></i>${c.name}</span><span class="category-values"><strong>${shortRp(c.actual)}</strong> / ${shortRp(c.target)} · ${numberID.format(score)}%</span></div><div class="category-track"><span style="width:${Math.min(score,100)}%;background:${c.color}"></span></div></div>`;
  }).join('');

  const ranked = [...staff].sort((a,b) => pct(b.salesActual,b.salesTarget)-pct(a.salesActual,a.salesTarget) || b.salesActual-a.salesActual);
  $('topRanking').innerHTML = ranked.slice(0,5).map((r,i) => `<div class="rank-row"><span class="rank-num">${i+1}</span><div class="rank-info"><strong>${escapeHtml(r.name)}</strong><small>${shortRp(r.salesActual)} actual sales</small></div><div class="rank-score"><strong>${numberID.format(pct(r.salesActual,r.salesTarget))}%</strong><small>achievement</small></div></div>`).join('');

  renderTeam(ranked);
  $('lastUpdated').textContent = `Updated ${state.updatedAt.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`;
  $('loadingState').classList.add('hidden');
  $('errorState').classList.add('hidden');
  $('dashboard').classList.remove('hidden');
  $('syncState').className = 'sync-state online';
  $('syncState').querySelector('strong').textContent = 'Live & synced';
}

function renderTeam(rankedRows = null) {
  const query = ($('searchInput')?.value || '').trim().toLowerCase();
  const base = rankedRows || state.rows.filter(r=>!r.isChannel).sort((a,b)=>pct(b.salesActual,b.salesTarget)-pct(a.salesActual,a.salesTarget)||b.salesActual-a.salesActual);
  const rows = base.filter(r => r.name.toLowerCase().includes(query));
  const achieved = base.filter(r=>pct(r.salesActual,r.salesTarget)>=100).length;
  const active = base.filter(r=>r.salesActual>0).length;
  $('teamSummary').innerHTML = `<div class="mini-stat"><span>Total Staff</span><strong>${base.length}</strong></div><div class="mini-stat"><span>Staff Achieved</span><strong>${achieved}</strong></div><div class="mini-stat"><span>Staff with Sales</span><strong>${active}</strong></div>`;
  $('staffTable').innerHTML = rows.map((r,i) => {
    const score = pct(r.salesActual,r.salesTarget), status = statusFor(score);
    return `<tr><td>${i+1}</td><td><div class="staff-cell"><span class="avatar">${initials(r.name)}</span><div><strong>${escapeHtml(r.name)}</strong><small>${escapeHtml(r.id)}</small></div></div></td><td>${rupiah.format(r.salesTarget)}</td><td><strong>${rupiah.format(r.salesActual)}</strong></td><td><div class="table-progress"><div class="table-progress-track"><span style="width:${Math.min(score,100)}%"></span></div><strong>${numberID.format(score)}%</strong></div></td><td>${rupiah.format(r.accActual)}</td><td>${rupiah.format(r.vasActual)}</td><td>${numberID.format(r.upt)}</td><td><span class="status ${status.cls}">${status.label}</span></td></tr>`;
  }).join('') || `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:35px">Staff tidak ditemukan.</td></tr>`;
}

function loadData() {
  $('refreshBtn').classList.add('loading');
  $('syncState').className = 'sync-state';
  $('syncState').querySelector('strong').textContent = 'Syncing…';
  const old = document.getElementById('sheetDataScript');
  if (old) old.remove();
  window.dashboardData = (response) => {
    try {
      const data = mapSheet(response);
      state.rows = data.rows;
      state.title = data.title;
      state.updatedAt = new Date();
      localStorage.setItem('digimapDashboardCache', JSON.stringify({ ...state, updatedAt: state.updatedAt.toISOString() }));
      render();
    } catch (err) { showError(err); }
    finally { $('refreshBtn').classList.remove('loading'); }
  };
  const script = document.createElement('script');
  script.id = 'sheetDataScript';
  script.src = `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=responseHandler:dashboardData&gid=${CONFIG.gid}&t=${Date.now()}`;
  script.onerror = () => { showError(new Error('Koneksi ke Google Sheets gagal.')); $('refreshBtn').classList.remove('loading'); };
  document.body.appendChild(script);
}

function showError(err) {
  console.error(err);
  const cached = localStorage.getItem('digimapDashboardCache');
  if (cached && !state.rows.length) {
    try {
      const parsed = JSON.parse(cached); state.rows=parsed.rows;state.title=parsed.title;state.updatedAt=new Date(parsed.updatedAt);render();
      $('syncState').className='sync-state error';$('syncState').querySelector('strong').textContent='Cached data'; return;
    } catch (_) {}
  }
  $('loadingState').classList.add('hidden');
  if (!state.rows.length) $('dashboard').classList.add('hidden');
  $('errorState').classList.remove('hidden');
  $('errorMessage').textContent = err.message;
  $('syncState').className = 'sync-state error';
  $('syncState').querySelector('strong').textContent = 'Sync failed';
}

function setView(view) {
  document.querySelectorAll('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  $('sidebar').classList.remove('open'); $('mobileOverlay').classList.remove('show');
}

document.querySelectorAll('.nav-item').forEach(x=>x.addEventListener('click',()=>setView(x.dataset.view)));
document.querySelectorAll('[data-jump]').forEach(x=>x.addEventListener('click',()=>setView(x.dataset.jump)));
$('refreshBtn').addEventListener('click',loadData); $('retryBtn').addEventListener('click',loadData);
$('searchInput').addEventListener('input',()=>renderTeam());
$('themeBtn').addEventListener('click',()=>{document.body.classList.toggle('dark');const dark=document.body.classList.contains('dark');$('themeBtn').textContent=dark?'☀':'☾';localStorage.setItem('digimapTheme',dark?'dark':'light')});
$('menuBtn').addEventListener('click',()=>{$('sidebar').classList.toggle('open');$('mobileOverlay').classList.toggle('show')});
$('mobileOverlay').addEventListener('click',()=>{$('sidebar').classList.remove('open');$('mobileOverlay').classList.remove('show')});
if(localStorage.getItem('digimapTheme')==='dark'){document.body.classList.add('dark');$('themeBtn').textContent='☀'}
loadData(); setInterval(loadData,CONFIG.refreshMs);
