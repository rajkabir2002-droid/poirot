/* Poirot — never miss a case.
   One file of app logic, two modes:
   DEMO  sample data held in memory, nothing is saved.
   LIVE  Supabase: Google sign-in limited to @iiml.ac.in, data in Postgres, proofs in private storage.
   The screens are drawn from the same arrays in both modes; only where the arrays come from differs. */

const H = 3600e3;
const DOMAIN = 'iiml.ac.in';
const CFG = window.POIROT_CONFIG || {};
const canLive = !!(CFG.supabaseUrl && CFG.supabaseKey && window.supabase);
const sb = canLive ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;

let LIVE = false, me = null, roster = [], members = [];
let comps = [], queue = [], posts = [], fame = [], decks = [], guides = [], KT = [];
let kind = 'team', defRows = [], defEmails = [];

document.head.insertAdjacentHTML('beforeend', '<style>textarea{background:var(--field);border:1px solid var(--line);padding:8px 10px;width:100%;min-height:96px;resize:vertical;font:inherit;color:inherit}details .in .acts{margin-top:10px}</style>');
const S = { open: ['s-open', 'Not registered'], confirm: ['s-confirm', 'Confirm your team'], proof: ['s-proof', 'Proof sent'], closed: ['s-closed', 'Case closed'] };
// Styles for the confirmation banner live here so that this feature needs only this one file.
document.head.insertAdjacentHTML('beforeend', '<style>.s-confirm{color:var(--brass)}.duecard.ask{border-top-color:var(--brass)}.ask-row{display:flex;gap:12px 16px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:14px 16px;border:1px solid var(--brass);background:var(--card)}.ask-row p{margin:0;flex:1 1 260px;min-width:0}#asks{display:flex;flex-direction:column;gap:10px}</style>');
const INT = { serious: 'Serious', time: 'Serious if time permits', reg: 'For the sake of registering' };
const DOM = ['Finance', 'Consulting', 'Operations', 'Supply chain', 'Analytics', 'Tech', 'Product management', 'Marketing', 'General management'];
const WX = { any: 'Any work experience', fresher: 'Fresher', lt2: 'Under 2 years of work', '2plus': '2+ years of work' };
const CE = { any: 'Any case comp experience', first: 'First timer', some: 'Has competed before', podium: 'Has a podium finish' };
const SECTIONS = 'ABCDEFGHI'.split('');

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const left = t => { const m = Math.max(0, t - Date.now()), d = Math.floor(m / (24 * H)), h = Math.floor(m % (24 * H) / H); return d ? `${d}d ${h}h` : `${h}h ${Math.floor(m % H / 6e4)}m`; };
const chip = st => `<span class="chip ${S[st][0]}">${S[st][1]}</span>`;
const by = id => comps.find(x => x.id == id);
const full = c => `${c.co} ${c.name}`;
const ready = () => queue.filter(q => q.conf[0] == q.conf[1]);
const opts = (list, any) => (any ? `<option value="all">${any}</option>` : '') + list.map(x => `<option>${esc(x)}</option>`).join('');
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => e.hidden = true, 3200); }
async function copy(text, ok) { try { await navigator.clipboard.writeText(text); toast(ok); } catch (_) { toast('Copying is blocked in this browser. Select the list and copy it by hand.'); } }

/* ---------------------------------------------------------------- library shapes (hall of fame, playbook) */
const KINDS = { comp: ['competitions', 'competition'], winner: ['winners', 'winner'], deck: ['decks', 'winning deck'], guide: ['guides', 'repository item'], kt: ['kt_notes', 'knowledge-transfer note'] };
const POSITIONS = ['National winner', 'National finalist', 'Campus winner'], GTYPES = ['Guide', 'Checklist', 'Template', 'Recording'], TOPICS = ['Round format', 'What judges rewarded', 'Common mistakes', 'Seniors to ask'];
const isLink = u => /^(https?:|blob:)/i.test(u || '');
const toRow = {
  winner: x => ({ id: x.id, team: x.team_name, c: x.competition, pos: x.position, yr: x.year, raw: x.photo_url || '', photo: x.photo || (isLink(x.photo_url) ? x.photo_url : ''), m: (x.members || []).map(y => [y.name, y.role]) }),
  deck: x => [x.competition, x.team_name, x.position, x.year, x.slides, x.domain, x.file_url || '', x.id],
  guide: x => [x.title, x.type, x.domain, x.points || [], x.link || '', x.id],
  kt: x => [x.competition, x.topic, x.year, x.body || '', x.id],
};
const store = { winner: () => fame, deck: () => decks, guide: () => guides, kt: () => KT };
const idOf = (kind, it) => kind == 'winner' || kind == 'comp' ? it.id : it[{ deck: 7, guide: 5, kt: 4 }[kind]];
const find = (kind, id) => kind == 'comp' ? by(id) : store[kind]().find(it => idOf(kind, it) == id);
const localInput = ms => new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const adm = (kind, id, extra) => me && me.admin ? `<span class="acts">${extra || ''}<button class="btn sm ghost" data-edit="${kind}:${id}">Edit</button><button class="btn sm ghost" data-del="${kind}:${id}">Remove</button></span>` : (extra || '');

/* ---------------------------------------------------------------- demo data */
function demoData() {
  const now = Date.now();
  me = { id: 'demo', name: 'Raj', pgp: 'PGP42365', sec: 'C', admin: true };
  comps = [
    { id: 'lime', co: 'HUL', name: 'L.I.M.E.', about: "HUL's marketing case competition for business schools. Teams work on a live brand problem.", team: 3, due: now + 9 * H, st: 'open', n: [273, 307] },
    { id: 'wired', co: 'Flipkart', name: 'WiRED', about: "Flipkart's flagship case competition for business schools, set around a real business problem at Flipkart.", team: 3, due: now + 31 * H, st: 'proof', n: [392, 188], reg: { team: 'Team Hastings', tid: 'UNS-48213', mates: [['Ananya', true], ['Kabir', false]] } },
    { id: 'ace', co: 'Amazon', name: 'ACE Challenge', about: "Amazon's case challenge for business school students, built around customer experience and operations.", team: 3, due: now + 3 * 24 * H, st: 'closed', n: [391, 189], reg: { team: 'Team Hastings', tid: 'UNS-51177', mates: [['Ananya', true], ['Kabir', true]] } },
    { id: 'brand', co: "L'Oréal", name: 'Brandstorm', about: "L'Oréal's global innovation competition for students. Teams pitch a new idea for the beauty industry.", team: 3, due: now + 6 * 24 * H, st: 'confirm', n: [155, 425], reg: { team: 'Team Battle', tid: 'UNS-52240', by: 'Tanvi', needConfirm: true, mates: [['Tanvi', true], ['Dev', false]] } },
    { id: 'tic', co: 'Tata', name: 'Imagination Challenge', about: "The Tata group's innovation challenge for students. You submit an idea as an individual.", team: 1, due: now + 9 * 24 * H, st: 'open', n: [118, 462] },
    { id: 'epic', co: 'TVS Credit', name: 'E.P.I.C', about: "TVS Credit's campus challenge, with separate tracks such as finance, strategy, analytics and IT.", team: 2, due: now + 13 * 24 * H, st: 'open', n: [52, 528] },
  ];
  queue = [
    { team: 'Team Hastings', c: 'wired', tid: 'UNS-48213', conf: [1, 2], mine: true },
    { team: 'Team Lemon', c: 'wired', tid: 'UNS-48377', conf: [2, 2] },
    { team: 'Team Oliver', c: 'lime', tid: 'UNS-50021', conf: [2, 2] },
    { team: 'Team Race', c: 'lime', tid: 'UNS-50102', conf: [2, 2] },
    { team: 'Team Battle', c: 'brand', tid: 'UNS-52240', conf: [0, 2] },
  ];
  posts = [
    { k: 'team', c: 'lime', who: 'Team Oliver', sec: 'B', by: 'Meera', n: 1, i: 'serious', dom: ['Marketing'], wx: 'any', ce: 'some', note: 'Two of us have done consumer research before. Aiming for the national round.' },
    { k: 'team', c: 'lime', who: 'Team Race', sec: 'D', by: 'Rohan', n: 2, i: 'time', dom: ['Finance', 'Marketing'], wx: 'any', ce: 'any', note: 'Will give it weekends.' },
    { k: 'team', c: 'brand', who: 'Team Battle', sec: 'A', by: 'Tanvi', n: 2, i: 'serious', dom: ['Finance', 'Product management'], wx: '2plus', ce: 'any', note: 'Have an idea already, need someone for the numbers.' },
    { k: 'team', c: 'epic', who: 'Team Bundle', sec: 'H', by: 'Dev', n: 1, i: 'reg', dom: ['Analytics'], wx: 'any', ce: 'any', note: 'Registering so none of us is fined.' },
    { k: 'team', c: 'wired', who: 'Team Lemon', sec: 'C', by: 'Isha', n: 1, i: 'time', dom: ['Supply chain', 'Operations'], wx: 'lt2', ce: 'any', note: '' },
    { k: 'team', c: 'ace', who: 'Team Tommy', sec: 'I', by: 'Kunal', n: 1, i: 'serious', dom: ['Operations', 'Consulting'], wx: 'any', ce: 'podium', note: 'Reached a national final last year and want to go one better.' },
    { k: 'solo', c: 'lime', who: 'Arjun', sec: 'E', i: 'serious', dom: ['Marketing'], wx: '2plus', ce: 'some', note: 'Worked in FMCG sales for two years.' },
    { k: 'solo', c: 'brand', who: 'Sara', sec: 'F', i: 'time', dom: ['Marketing', 'Product management'], wx: 'lt2', ce: 'first', note: 'Happy to own the deck.' },
    { k: 'solo', c: 'wired', who: 'Neel', sec: 'B', i: 'serious', dom: ['Supply chain', 'Finance'], wx: '2plus', ce: 'podium', note: '' },
    { k: 'solo', c: 'epic', who: 'Riya', sec: 'G', i: 'reg', dom: ['Analytics', 'Tech'], wx: 'fresher', ce: 'first', note: 'Need a partner to register with.' },
    { k: 'solo', c: 'lime', who: 'Aman', sec: 'A', i: 'reg', dom: ['Finance'], wx: 'fresher', ce: 'first', note: '' },
    { k: 'solo', c: 'tic', who: 'Pooja', sec: 'I', i: 'serious', dom: ['Consulting', 'General management'], wx: '2plus', ce: 'some', note: 'Three years in strategy consulting.' },
  ];
  const N = id => full(by(id));
  fame = [
    { team: 'Team Marple', c: N('ace'), pos: 'National winner', yr: 2025, m: [['Ananya R.', 'Section C · built the cost model'], ['Kabir S.', 'Section F · led the pitch'], ['Meera J.', 'Section A · research and deck']] },
    { team: 'Team Tuppence', c: N('lime'), pos: 'National finalist', yr: 2025, m: [['Rohan D.', 'Section D · consumer interviews'], ['Tanvi P.', 'Section B · brand strategy'], ['Arjun K.', 'Section E · design']] },
    { team: 'Team Japp', c: N('wired'), pos: 'National finalist', yr: 2026, m: [['Isha M.', 'Section A · supply chain analysis'], ['Dev N.', 'Section C · financials'], ['Sara T.', 'Section F · storyline']] },
    { team: 'Team Ariadne', c: N('brand'), pos: 'Campus winner', yr: 2026, m: [['Neel B.', 'Section B · concept'], ['Riya G.', 'Section D · prototype'], ['Aman V.', 'Section E · go-to-market']] },
  ];
  decks = [['ace', 'Team Marple', 'National winner', 2025, 14, 'Operations'], ['ace', 'Team Lemon', 'Campus winner', 2024, 12, 'Operations'], ['ace', 'Team Tommy', 'National finalist', 2026, 13, 'Consulting'], ['lime', 'Team Tuppence', 'National finalist', 2025, 10, 'Marketing'], ['lime', 'Team Oliver', 'Campus winner', 2026, 11, 'Marketing'], ['wired', 'Team Japp', 'National finalist', 2026, 15, 'Supply chain'], ['wired', 'Team Race', 'Campus winner', 2024, 9, 'Product management'], ['brand', 'Team Ariadne', 'Campus winner', 2026, 8, 'Marketing'], ['epic', 'Team Bundle', 'National winner', 2025, 12, 'Finance'], ['epic', 'Team Battle', 'Campus winner', 2026, 10, 'Analytics']]
    .map((d, i) => [N(d[0]), ...d.slice(1), '', 'd' + i]);
  fame = fame.map((f, i) => ({ ...f, id: 'w' + i, raw: '', photo: '' }));
  guides = [
    ['Reading the brief', 'Guide', 'General management', ['Underline what is being judged before you start on ideas.', 'Write the problem in one sentence. If the team disagrees on it, settle that first.', 'List what the company already does, so you do not pitch it back to them.']],
    ['Building the deck', 'Checklist', 'Consulting', ['One message per slide, written as the slide title.', 'Put your recommendation on the second slide and the proof after it.', 'Show the numbers behind every claim, with the source.']],
    ['Splitting the work in a team', 'Guide', 'General management', ['Agree on one owner each for research, numbers and the deck.', 'Fix an internal deadline a full day before the real one.', 'Book a deck review slot with a senior before you submit.']],
    ['Sizing a market in ten minutes', 'Guide', 'Finance', ['Start from people or households, then narrow by who can buy.', 'State each assumption on the slide so judges can follow it.', 'Check the answer against one public number.']],
    ['Executive summary slide', 'Template', 'Consulting', ['Problem, recommendation, impact and ask, in four boxes.', 'Each box is one sentence.', 'Write it last, place it first.']],
    ['Case Comp 101 session', 'Recording', 'General management', ['The foundation session run for the incoming batch.', 'Covers how competitions are structured and judged.', 'Watch before your first registration.']],
    ['Costing a supply chain idea', 'Checklist', 'Supply chain', ['List every cost the change adds and every cost it removes.', 'Separate one-time costs from recurring ones.', 'Show payback in months.']],
    ['Consumer interviews in a weekend', 'Guide', 'Marketing', ['Talk to ten real users before you write a slide.', 'Ask what they did last time, not what they would do.', 'Quote them directly in the deck.']],
  ].map((g, i) => [...g, '', 'g' + i]);
  KT = [];
  ['lime', 'wired', 'ace', 'brand', 'tic', 'epic'].forEach((id, n) => ['Round format', 'What judges rewarded', 'Common mistakes', 'Seniors to ask'].forEach((t, i) => KT.push([N(id), t, (n + i) % 2 ? 2025 : 2026, '', 'k' + n + i])));
}
const FN = ['Aarav', 'Diya', 'Kabir', 'Ishita', 'Rohan', 'Sneha', 'Vikram', 'Ananya', 'Nikhil', 'Pooja', 'Arnav', 'Tanya', 'Siddharth', 'Kavya', 'Harsh', 'Mira', 'Yash', 'Naina', 'Dhruv', 'Rhea', 'Aditya', 'Simran', 'Karan'],
  LN = ['Sharma', 'Iyer', 'Patel', 'Reddy', 'Singh', 'Nair', 'Gupta', 'Das', 'Mehta', 'Bose', 'Kulkarni', 'Chopra', 'Menon', 'Jain', 'Verma', 'Rao', 'Bhatt'];
function demoRoster(c) {
  const seed = [...c.id].reduce((a, x) => a + x.charCodeAt(0), 0), out = [];
  for (let i = 0; i < c.n[1]; i++) { const k = (i * 37 + seed) % 580; out.push([FN[k % FN.length] + ' ' + LN[(k * 7 + 3) % LN.length], 'PGP42' + String(k + 1).padStart(3, '0'), SECTIONS[k % 9]]); }
  return out.sort((a, b) => a[1].localeCompare(b[1]));
}

/* ---------------------------------------------------------------- live data */
const must = r => { if (r.error) throw r.error; return r.data; };
async function loadAll() {
  const q = t => sb.from(t).select('*');
  const [c, r, m, p, rq, pr, w, d, g, k] = (await Promise.all([
    q('competitions').order('deadline'), q('registrations'), q('registration_members'),
    q('team_posts').order('created_at', { ascending: false }), q('team_requests'),
    sb.from('profiles').select('id,name,section,pgp_id'),
    q('winners').order('year', { ascending: false }), q('decks').order('year', { ascending: false }),
    q('guides').order('title'), q('kt_notes').order('year', { ascending: false }),
  ])).map(must);
  roster = me.admin ? must(await sb.from('roster').select('pgp_id,name,section').order('pgp_id')) : [];
  members = m;
  const who = Object.fromEntries(pr.map(x => [x.id, x]));
  comps = c.map(x => {
    const mem = m.filter(y => y.competition_id == x.id), mine = mem.find(y => y.pgp_id == me.pgp), reg = mine && r.find(y => y.id == mine.registration_id);
    return {
      id: x.id, co: x.company, name: x.name, about: x.about, team: x.team_size, due: new Date(x.deadline).getTime(), url: x.unstop_url,
      st: !reg ? 'open' : reg.status == 'approved' ? 'closed' : !mine.confirmed ? 'confirm' : 'proof', n: [mem.length, Math.max(0, roster.length - mem.length)],
      reg: reg && { id: reg.id, team: reg.team_name, tid: reg.unstop_team_id, needConfirm: !mine.confirmed && reg.status != 'approved', by: (who[reg.filed_by] || {}).name || (who[reg.filed_by] || {}).pgp_id || 'A teammate', mates: mem.filter(y => y.registration_id == reg.id && y.pgp_id != me.pgp).map(y => [y.pgp_id, y.confirmed]) },
    };
  });
  queue = r.filter(x => x.status == 'pending' && by(x.competition_id)).map(x => {
    const mem = m.filter(y => y.registration_id == x.id);
    return { id: x.id, team: x.team_name, c: x.competition_id, tid: x.unstop_team_id, path: x.proof_path, mine: x.filed_by == me.id, conf: [Math.max(0, mem.filter(y => y.confirmed).length - 1), Math.max(0, mem.length - 1)] };
  });
  posts = p.filter(x => by(x.competition_id)).map(x => {
    const a = who[x.author] || {}, reqs = rq.filter(y => y.post_id == x.id);
    return {
      id: x.id, k: x.kind, c: x.competition_id, who: x.kind == 'team' ? (x.team_name || 'A team') : (a.name || a.pgp_id || 'A student'), sec: a.section || '?', by: a.name || a.pgp_id || '',
      n: x.members_needed || 1, i: x.commitment, dom: x.domains || [], wx: x.work_ex, ce: x.case_exp, note: x.note || '', mine: x.author == me.id,
      req: reqs.some(y => y.from_user == me.id), asks: reqs.filter(y => y.from_user != me.id).map(y => (who[y.from_user] || {}).name || (who[y.from_user] || {}).pgp_id || 'Someone'),
    };
  });
  const signed = {}, paths = w.map(x => x.photo_url).filter(u => u && !isLink(u));
  if (paths.length) try { must(await sb.storage.from('library').createSignedUrls(paths, 3600)).forEach(x => { if (x.signedUrl) signed[x.path] = x.signedUrl; }); } catch (e) { console.warn('Team photos could not be loaded', e); }
  fame = w.map(x => toRow.winner({ ...x, photo: signed[x.photo_url] }));
  decks = d.map(toRow.deck); guides = g.map(toRow.guide); KT = k.map(toRow.kt);
}
async function refresh() { if (LIVE) await loadAll(); fill(); render(); renderStatic(); }

/* ---------------------------------------------------------------- actions (each works in both modes) */
const api = {
  async fileProof(c, team, tid, mates, file) {
    if (!LIVE) {
      c.reg = { team, tid, mates: mates.map(m => [m, false]) }; c.st = 'proof'; c.n[0]++; c.n[1]--;
      queue.unshift({ team, c: c.id, tid, conf: [0, mates.length], mine: true }); return;
    }
    let path = null;
    if (file) {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      path = `${me.id}/${c.id}-${Date.now()}.${ext}`;
      must(await sb.storage.from('proofs').upload(path, file));
    }
    const reg = must(await sb.from('registrations').insert({ competition_id: c.id, team_name: team, unstop_team_id: tid, proof_path: path }).select().single());
    const rows = [...new Set([me.pgp, ...mates])].map(p => ({ registration_id: reg.id, competition_id: c.id, pgp_id: p, confirmed: p == me.pgp }));
    const mem = await sb.from('registration_members').insert(rows);
    if (mem.error) {
      await sb.from('registrations').delete().eq('id', reg.id);
      throw new Error(mem.error.code == '23505' ? 'Someone in this team is already registered for this competition.' : mem.error.message);
    }
  },
  async confirm(c) {
    if (!LIVE) { c.reg.needConfirm = false; c.st = 'proof'; const q = queue.find(x => x.c == c.id && x.team == c.reg.team); if (q) q.conf[0]++; return; }
    must(await sb.from('registration_members').update({ confirmed: true }).eq('registration_id', c.reg.id).eq('pgp_id', me.pgp));
  },
  async leave(c) {
    if (!LIVE) { const q = queue.find(x => x.c == c.id && x.team == c.reg.team); if (q) q.conf[1]--; delete c.reg; c.st = 'open'; return; }
    must(await sb.from('registration_members').delete().eq('registration_id', c.reg.id).eq('pgp_id', me.pgp));
  },
  async approve(list) {
    if (!LIVE) { list.forEach(q => { const c = by(q.c); if (q.mine) c.st = 'closed'; queue = queue.filter(x => x != q); }); return; }
    if (list.length) must(await sb.from('registrations').update({ status: 'approved', reviewed_by: me.id }).in('id', list.map(q => q.id)));
  },
  async sendBack(q) {
    if (!LIVE) { const c = by(q.c); c.n[0]--; c.n[1]++; if (q.mine) { c.st = 'open'; delete c.reg; } queue = queue.filter(x => x != q); return; }
    must(await sb.from('registrations').delete().eq('id', q.id));
  },
  async addComp(v) {
    if (!LIVE) { comps.push({ id: 'c' + comps.length, co: v.company, name: v.name, about: v.about, team: v.team_size, due: new Date(v.deadline).getTime(), url: v.unstop_url, st: 'open', n: [0, 580] }); return; }
    must(await sb.from('competitions').insert(v));
  },
  async addPost(v) {
    if (!LIVE) { posts.unshift({ k: v.kind, c: v.competition_id, who: v.kind == 'team' ? (v.team_name || 'Your team') : me.name, by: me.name, sec: me.sec, n: v.members_needed, i: v.commitment, dom: v.domains, wx: v.work_ex, ce: v.case_exp, note: v.note, mine: true }); return; }
    must(await sb.from('team_posts').insert(v));
  },
  async removePost(p) { if (!LIVE) { posts = posts.filter(x => x != p); return; } must(await sb.from('team_posts').delete().eq('id', p.id)); },
  async toggleReq(p) {
    if (!LIVE) { p.req = !p.req; return; }
    must(p.req ? await sb.from('team_requests').delete().eq('post_id', p.id).eq('from_user', me.id) : await sb.from('team_requests').insert({ post_id: p.id }));
    p.req = !p.req;
  },
  async save(kind, id, v, file) {
    const fileCol = { winner: 'photo_url', deck: 'file_url' }[kind];
    if (!LIVE) {
      if (file && fileCol) v[fileCol] = URL.createObjectURL(file);
      if (kind == 'comp') {
        const t = { co: v.company, name: v.name, about: v.about, team: v.team_size, due: new Date(v.deadline).getTime(), url: v.unstop_url }, c = id && by(id);
        if (c) Object.assign(c, t); else comps.push({ id: 'c' + Date.now(), st: 'open', n: [0, 580], ...t }); return;
      }
      const row = toRow[kind]({ ...v, id: id || kind + Date.now() }), list = store[kind](), i = list.findIndex(x => idOf(kind, x) == id);
      if (i >= 0) list[i] = row; else list.unshift(row); return;
    }
    if (file && fileCol) {
      const path = `${kind}s/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_').slice(-60)}`, up = await sb.storage.from('library').upload(path, file);
      if (up.error) throw new Error(/bucket/i.test(up.error.message) ? 'File storage for the library is not set up yet. Run supabase/library_storage.sql in Supabase, then try again.' : up.error.message);
      v[fileCol] = path;
    }
    must(id ? await sb.from(KINDS[kind][0]).update(v).eq('id', id) : await sb.from(KINDS[kind][0]).insert(v));
  },
  async remove(kind, id) {
    if (!LIVE) {
      if (kind == 'comp') { comps = comps.filter(c => c.id != id); posts = posts.filter(p => p.c != id); queue = queue.filter(q => q.c != id); }
      else { const list = store[kind](), i = list.findIndex(x => idOf(kind, x) == id); if (i >= 0) list.splice(i, 1); }
      return;
    }
    must(await sb.from(KINDS[kind][0]).delete().eq('id', id));
  },
  async fileUrl(raw) { return isLink(raw) ? raw : must(await sb.storage.from('library').createSignedUrl(raw, 600)).signedUrl; },
  async saveSection(sec) { if (LIVE) must(await sb.from('profiles').update({ section: sec }).eq('id', me.id)); me.sec = sec; },
  async proofUrl(q) { return must(await sb.storage.from('proofs').createSignedUrl(q.path, 300)).signedUrl; },
};
// Stops a form being sent twice while the first save is still in progress.
async function once(form, job) {
  if (form.dataset.busy) return; form.dataset.busy = 1;
  const b = form.querySelector('button:not([type=button])'); if (b) b.disabled = true;
  try { await job(); } finally { delete form.dataset.busy; if (b) b.disabled = false; }
}
async function run(fn, done) {
  try { await fn(); await refresh(); if (done) toast(done); return true; }
  catch (e) { console.error(e); toast(e.message || 'That did not work. Please try again.'); return false; }
}
function autoApprove() { return $('auto').checked && me.admin && ready().length ? api.approve(ready()) : null; }

/* ---------------------------------------------------------------- drawing */
function render() {
  const sorted = [...comps].sort((a, b) => a.due - b.due), open = sorted.filter(c => c.due > Date.now());
  let asks = $('asks'); if (!asks) { asks = document.createElement('div'); asks.id = 'asks'; const top = $('v-board').firstElementChild; top.insertBefore(asks, top.firstChild); }
  const waiting = open.filter(c => c.st == 'confirm'); asks.hidden = !waiting.length;
  asks.innerHTML = waiting.map(c => `<div class="ask-row"><p><b>${esc(c.reg.by || 'A teammate')} added you to ${esc(c.reg.team)}</b> for ${esc(full(c))}. Are you in this team?</p><span class="acts"><button class="btn sm" data-confirm="${c.id}">Yes, confirm</button><button class="btn sm ghost" data-leave="${c.id}">Not my team</button><button class="btn sm ghost" data-open="${c.id}">View</button></span></div>`).join('');
  $('due').innerHTML = open.slice(0, 3).map(c => `<button class="card duecard ${c.st == 'closed' ? 'ok' : c.st == 'proof' ? 'mid' : c.st == 'confirm' ? 'ask' : ''}" data-open="${c.id}">
    <span class="label">${esc(c.co)}</span><h3>${esc(c.name)}</h3><span class="t">${left(c.due)} <small>left</small></span>${chip(c.st)}</button>`).join('')
    || '<p class="note">No open competitions right now. Crack Tank will add them here.</p>';
  $('later').hidden = open.length <= 3;
  $('list').innerHTML = open.slice(3).map(c => `<button class="row" data-open="${c.id}"><span class="n"><b>${esc(full(c))}</b><span>${c.team == 1 ? 'Individual' : 'Team of ' + c.team} · registers on Unstop</span></span>
    <span class="left">${left(c.due)} left</span>${chip(c.st)}</button>`).join('');
  const todo = open.filter(c => c.st == 'open' || c.st == 'confirm').length;
  $('count').textContent = open.length ? (todo ? todo + ' need your action' : 'All cases closed') : '';

  const F = { c: $('tf').value || 'all', i: $('ti').value, s: $('ts').value || 'all', sec: $('tsec').value || 'all', wx: $('twx').value, ce: $('tce').value };
  const openTo = p => (p.wx == 'any' && p.ce == 'any') ? 'open to anyone' : 'wants ' + [{ fresher: 'freshers', lt2: 'under 2 years of work', '2plus': '2+ years of work' }[p.wx], { first: 'first timers', some: 'case comp experience', podium: 'a podium finish' }[p.ce]].filter(Boolean).join(' and ');
  const fit = (want, v) => want == 'all' || v == want || v == 'any';
  const shown = posts.filter(p => p.k == kind && by(p.c) && by(p.c).due > Date.now() && (F.c == 'all' || p.c == F.c) && (F.i == 'all' || p.i == F.i) && (F.s == 'all' || !p.dom.length || p.dom.includes(F.s)) && (F.sec == 'all' || p.sec == F.sec) && fit(F.wx, p.wx) && fit(F.ce, p.ce));
  $('tcount').textContent = shown.length + (kind == 'team' ? ' teams looking for members' : ' people looking for a team');
  $('posts').innerHTML = shown.map(p => {
    const c = by(p.c), team = p.k == 'team', i = posts.indexOf(p);
    return `<div class="card post"><span class="label">${esc(full(c))} · ${left(c.due)} left</span>
    <h3>${team ? esc(p.who) + ' needs ' + p.n : esc(p.who) + ' · Section ' + esc(p.sec)}</h3>
    <p>${team ? 'Section ' + esc(p.sec) + ' · ' + openTo(p) : WX[p.wx] + ' · ' + CE[p.ce]}</p>${p.note ? '<p style="color:var(--ink)">“' + esc(p.note) + '”</p>' : ''}
    ${p.mine && p.asks && p.asks.length ? '<p>' + (team ? 'Asked to join: ' : 'Invited by: ') + esc(p.asks.join(', ')) + '</p>' : ''}
    <div class="tags"><span class="tag" style="border-color:var(--brass);color:var(--brassdim)">${INT[p.i]}</span>${p.dom.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
    ${p.mine ? `<button class="btn sm ghost" data-unpost="${i}">Remove my post</button>` : `<button class="btn sm ${p.req ? 'ghost' : ''}" data-req="${i}">${team ? (p.req ? 'Request sent · undo' : 'Request to join') : (p.req ? 'Invite sent · undo' : 'Invite to my team')}</button>${me.admin ? `<button class="btn sm ghost" style="margin-top:0" data-unpost="${i}">Remove post</button>` : ''}`}</div>`;
  }).join('') || '<p class="note">Nothing matches these filters. Clear them, or post your own need.</p>';
  more();

  if (!me || !me.admin) return;
  const soon = open[0];
  $('stat').innerHTML = `<div class="card"><b>${queue.length}</b><span class="label">Proofs to check</span></div><div class="card"><b>${open.length}</b><span class="label">Competitions live</span></div>` +
    (soon ? `<div class="card"><b>${soon.n[1]}</b><span class="label">Not registered for ${esc(soon.name)}, closing first</span></div>` : '');
  $('bulk').textContent = `Approve all fully confirmed (${ready().length})`; $('bulk').disabled = !ready().length;
  $('queue').innerHTML = queue.map((q, i) => `<div class="row"><span class="n"><b>${esc(q.team)} · ${esc(full(by(q.c)))}</b><span>Unstop ID ${esc(q.tid)} · ${q.conf[0]} of ${q.conf[1]} teammates confirmed · <a href="#" data-shot="${i}">view screenshot</a></span></span>
    <span class="left"></span><span class="acts"><button class="btn sm" data-ok="${i}">Approve</button><button class="btn sm ghost" data-back="${i}">Send back</button></span></div>`).join('')
    || '<div class="row"><span class="n"><span>Nothing waiting. Every proof has been checked.</span></span></div>';
  $('desk').innerHTML = sorted.map(c => `<tr><td>${esc(full(c))}</td><td class="num">${c.due > Date.now() ? left(c.due) : 'Closed'}</td><td class="num">${c.n[0]}</td><td class="num"><a href="#" data-def="${c.id}">${c.n[1]}</a></td>
    <td><span class="acts"><button class="btn sm ghost" data-remind="${c.id}">Remind them</button><button class="btn sm ghost" data-def="${c.id}">Defaulter list</button><button class="btn sm ghost" data-edit="comp:${c.id}">Edit</button><button class="btn sm ghost" data-del="comp:${c.id}">Remove</button></span></td></tr>`).join('')
    || '<tr><td colspan="5">No competitions yet. Add the first one above.</td></tr>';
}
function renderStatic() {
  $('fame').innerHTML = fame.map(f => `<div class="col g8"><button class="flip" aria-pressed="false" data-flip aria-label="${esc(f.team)}, ${esc(f.pos)}. Tap to see the team."><span class="in">
    <span class="face"><span class="photo"${f.photo ? ` style="background:center/cover url('${encodeURI(f.photo)}')"` : ''}><span>${f.photo ? '' : 'Team photo'}</span><span class="pos">${esc(f.pos)}</span></span>
      <span class="cap"><small>${esc(f.c)} · ${esc(f.yr)}</small><h3>${esc(f.team)}</h3></span></span>
    <span class="face back paper"><small>${esc(f.team)} · ${esc(f.pos)}</small><ul>${f.m.map(m => `<li><b>${esc(m[0])}</b><span>${esc(m[1])}</span></li>`).join('')}</ul></span></span></button>${adm('winner', f.id)}</div>`).join('')
    || '<p class="note">No winners added yet.</p>';
  lib();
}
function more() {
  document.querySelectorAll('[data-more]').forEach(b => {
    const box = $(b.dataset.more), n = [...box.querySelectorAll('select')].filter(x => x.value != 'all').length;
    b.textContent = (box.hidden ? 'More filters' : 'Fewer filters') + (n ? ' · ' + n + ' on' : '');
  });
}
function lib() {
  const D = { c: $('dk-c').value || 'all', p: $('dk-p').value, y: $('dk-y').value, d: $('dk-d').value || 'all' };
  const ds = decks.filter(d => (D.c == 'all' || d[0] == D.c) && (D.p == 'all' || d[2] == D.p) && (D.y == 'all' || d[3] == D.y) && (D.d == 'all' || d[5] == D.d));
  $('dk-count').textContent = ds.length + ' of ' + decks.length + ' decks · shared with the team’s consent, for IIML students only';
  $('dk-list').innerHTML = [...new Set(ds.map(d => d[0]))].map(name => `<div class="col g8"><h3>${esc(name)}</h3><div class="card rows">${ds.filter(d => d[0] == name).map(d => `<div class="row"><span class="n"><b>${esc(d[1])}</b><span>${esc(d[2])} · ${esc(d[3])}${d[4] ? ' · ' + esc(d[4]) + ' slides' : ''}${d[5] ? ' · ' + esc(d[5]) : ''}</span></span><span class="left"></span>${adm('deck', d[7], `<button class="btn sm ghost" data-deck="${decks.indexOf(d)}">View deck</button>`)}</div>`).join('')}</div></div>`).join('')
    || '<p class="note">No decks match these filters.</p>';
  const q = $('g-q').value.trim().toLowerCase(), gt = $('g-t').value, gd = $('g-d').value || 'all';
  const gs = guides.filter(g => (gt == 'all' || g[1] == gt) && (gd == 'all' || g[2] == gd) && (!q || (g[0] + ' ' + g[3].join(' ')).toLowerCase().includes(q)));
  $('g-count').textContent = gs.length + ' of ' + guides.length + ' items';
  $('guides').innerHTML = gs.map(g => `<details><summary><span>${esc(g[0])} <span class="tag" style="margin-left:6px">${esc(g[1])}</span> <span class="tag">${esc(g[2])}</span></span></summary><div class="in"><ul>${g[3].map(x => `<li>${esc(x)}</li>`).join('')}</ul>${g[4] ? `<p><a href="${esc(g[4])}" target="_blank" rel="noopener">Open the full resource</a></p>` : ''}${adm('guide', g[5])}</div></details>`).join('')
    || '<p class="note">Nothing matches. Try a different word or clear the filters.</p>';
  const kc = $('kt').value || 'all', kt = $('kt-t').value, ky = $('kt-y').value;
  const ks = KT.filter(k => (kc == 'all' || k[0] == kc) && (kt == 'all' || k[1] == kt) && (ky == 'all' || k[2] == ky));
  $('kt-count').textContent = ks.length + ' of ' + KT.length + ' notes';
  more();
  $('ktbody').innerHTML = ks.map(k => `<details><summary><span>${esc(k[0])} · ${esc(k[1])} <span class="tag" style="margin-left:6px">${esc(k[2])}</span></span></summary><div class="in">${k[3] ? esc(k[3]) : `Crack Tank’s ${esc(k[2])} note on ${esc(String(k[1]).toLowerCase())} for ${esc(k[0])} appears here.`}${me && me.admin ? '<p style="margin:10px 0 0">' + adm('kt', k[4]) + '</p>' : ''}</div></details>`).join('')
    || '<p class="note">No notes match these filters.</p>';
}
function fill() {
  const keep = (id, html) => { const e = $(id), v = e.value; e.innerHTML = html; if ([...e.options].some(o => o.value == v)) e.value = v; };
  const live = comps.filter(c => c.due > Date.now()).sort((a, b) => a.due - b.due), o = live.map(c => `<option value="${c.id}">${esc(full(c))}</option>`).join('');
  keep('tf', '<option value="all">Any competition</option>' + o); keep('pf-comp', o);
  keep('dk-c', opts([...new Set(decks.map(d => d[0]))].sort(), 'Any competition'));
  keep('kt', opts([...new Set(KT.map(k => k[0]))].sort(), 'Any competition'));
  keep('dk-y', opts([...new Set(decks.map(d => d[3]))].sort().reverse(), 'Any year'));
  keep('kt-y', opts([...new Set(KT.map(k => k[2]))].sort().reverse(), 'Any year'));
}

/* ---------------------------------------------------------------- side sheets */
const sheetHead = t => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="label">${t}</span><button class="btn sm ghost" data-close>Close</button></div>`;
function openCase(id) {
  const c = by(id); if (!c) return; let body;
  if (c.st == 'open') body = `<ol class="steps"><li>Register your team on Unstop.</li><li>Come back and file the proof below.</li><li>Your teammates confirm, and Crack Tank approves it.</li></ol>
    <a class="btn ghost" style="text-align:center;text-decoration:none" href="${esc(c.url || 'https://unstop.com')}" target="_blank" rel="noopener">Register on Unstop</a>
    <form id="regform"><span class="label">File your proof</span>
    <label>Team name<input type="text" id="rf-team" required maxlength="60"></label>
    <label>Unstop team ID<input type="text" id="rf-tid" required maxlength="40" placeholder="From your Unstop confirmation"></label>
    ${c.team > 1 ? `<label>Teammates’ PGP IDs, comma separated<input type="text" id="rf-mates" placeholder="PGP42xxx, PGP42yyy"></label>` : ''}
    <label>Screenshot of the Unstop confirmation<input type="file" id="rf-file" accept="image/*" required></label>
    <button class="btn" id="rf-go">Mark as registered</button></form>`;
  else body = `<dl class="kv"><dt>Team</dt><dd>${esc(c.reg.team)}</dd><dt>Unstop ID</dt><dd style="font-family:var(--mono)">${esc(c.reg.tid)}</dd><dt>Proof</dt><dd>Screenshot attached</dd></dl>
    ${c.reg.needConfirm ? `<div class="col g8"><p style="margin:0">${esc(c.reg.by || 'A teammate')} added you to ${esc(c.reg.team)}. Confirm that you are in this team.</p><button class="btn" data-confirm="${c.id}">Yes, I am in this team</button><button class="btn ghost" data-leave="${c.id}">This is not my team</button></div>` : ''}
    ${c.reg.mates.length ? `<span class="label">Teammates</span><div class="mates">${c.reg.mates.map(m => `<div><span>${esc(m[0])}</span><span class="chip ${m[1] ? 's-closed' : 's-proof'}">${m[1] ? 'Confirmed' : 'Waiting'}</span></div>`).join('')}</div>` : ''}
    <p class="note">${c.st == 'closed' ? 'Crack Tank has approved this registration. Nothing more to do.' : c.st == 'confirm' ? 'You are counted as registered. Confirming helps Crack Tank approve the team faster.' : 'Waiting for Crack Tank to approve your proof. You will not be marked as a defaulter while it is pending.'}</p>`;
  $('sheetbody').innerHTML = `${sheetHead('Case file')}
    <h2>${esc(full(c))}</h2><div>${chip(c.st)}</div>
    <dl class="kv"><dt>Closes in</dt><dd style="font-family:var(--mono)">${left(c.due)}</dd><dt>Format</dt><dd>${c.team == 1 ? 'Individual' : 'Team of ' + c.team}</dd><dt>Platform</dt><dd>Unstop</dd><dt>Teams</dt><dd>${posts.filter(p => p.c == c.id).length} posts open in the team finder</dd></dl>
    <div class="col g8"><span class="label">About this competition</span><p style="margin:0">${esc(c.about || 'Crack Tank has not added a description yet.')}</p><span class="note">${LIVE ? 'Full rules are on Unstop.' : 'Example description. Full rules are on Unstop.'}</span></div>${body}`;
  $('sheet').hidden = false;
  const f = $('regform'); if (f) f.onsubmit = async e => {
    e.preventDefault();
    const mates = [...new Set(($('rf-mates')?.value || '').split(/[,\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean))].filter(p => p != me.pgp);
    if (mates.length > c.team - 1) return toast(`This competition allows a team of ${c.team}. Remove ${mates.length - (c.team - 1)} teammate${mates.length - (c.team - 1) > 1 ? 's' : ''}.`);
    $('rf-go').disabled = true;
    const ok = await run(() => api.fileProof(c, $('rf-team').value.trim(), $('rf-tid').value.trim(), mates, $('rf-file').files[0]), mates.length ? 'Proof filed. Your teammates need to confirm in Poirot.' : 'Proof filed. Crack Tank will check it.');
    if (ok) openCase(id); else $('rf-go').disabled = false;
  };
}
function openDef(id) {
  const c = by(id), over = c.due < Date.now();
  const inTeam = new Set(members.filter(m => m.competition_id == c.id).map(m => m.pgp_id));
  const all = LIVE ? roster.filter(r => !inTeam.has(r.pgp_id)).map(r => [r.name || '', r.pgp_id, r.section || '']) : demoRoster(c);
  $('sheetbody').innerHTML = `${sheetHead('Defaulter list')}
    <h2>${esc(full(c))}</h2>
    <p class="note" style="margin:0">${over ? 'The deadline has passed. These students did not register.' : 'Closes in ' + left(c.due) + '. These students have no approved or pending proof yet, and become defaulters when the deadline passes.'}${LIVE ? (roster.length ? '' : '<br>The batch list is empty. Import it into the roster table to see names here.') : '<br>Example names and PGP IDs.'}</p>
    <div class="inline"><label class="label">Search<input type="text" id="dq" placeholder="Name or PGP ID"></label><label class="label">Section<select id="dsec">${opts(SECTIONS, 'Any section')}</select></label></div>
    <div class="acts"><button class="btn sm" data-copylist>Copy list</button><button class="btn sm ghost" data-remind="${c.id}">Remind them</button><span class="note" id="dcount" style="align-self:center"></span></div>
    <div class="tablewrap"><table style="min-width:0"><thead><tr><th>Name</th><th>PGP ID</th><th>Sec</th></tr></thead><tbody id="drows"></tbody></table></div>`;
  const draw = () => {
    const q = $('dq').value.trim().toLowerCase(), sec = $('dsec').value;
    defRows = all.filter(r => (sec == 'all' || r[2] == sec) && (!q || r[0].toLowerCase().includes(q) || r[1].toLowerCase().includes(q)));
    $('dcount').textContent = defRows.length + ' of ' + all.length + ' shown';
    $('drows').innerHTML = defRows.map(r => `<tr><td>${esc(r[0])}</td><td class="num">${esc(r[1])}</td><td class="num">${esc(r[2])}</td></tr>`).join('') || '<tr><td colspan="3">No one to show.</td></tr>';
  };
  $('dq').oninput = draw; $('dsec').onchange = draw; draw(); $('sheet').hidden = false;
}
function remind(c) {
  if (!LIVE) return toast('Reminder sent to ' + c.n[1] + ' students not yet registered for ' + c.name + '.');
  const inTeam = new Set(members.filter(m => m.competition_id == c.id).map(m => m.pgp_id));
  const mails = roster.filter(r => !inTeam.has(r.pgp_id)).map(r => r.pgp_id.toLowerCase() + '@' + DOMAIN);
  if (!mails.length) return toast(roster.length ? 'Everyone on the batch list has registered.' : 'The batch list is empty. Import it into the roster table first.');
  // Opens a ready-to-send Gmail draft from the admin's own IIML account. The admin reads it and presses Send.
  const when = new Date(c.due).toLocaleString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' });
  const subject = `Reminder: register for ${full(c)} by ${when}`;
  const body = [`Hi,`, ``, `Poirot shows that you have not yet registered for ${full(c)}.`, `Registration closes on ${when}.`, ``,
    `1. Register on Unstop: ${c.url || 'https://unstop.com'}`, `2. File your proof on Poirot: ${location.origin + location.pathname}`, ``,
    `If you have already registered, please file your proof on Poirot so that you are not marked as a defaulter.`, ``, `Crack Tank`].join('\n');
  const fits = mails.length <= 150;   // very long links are refused, so large lists are pasted instead
  const url = 'https://mail.google.com/mail/?view=cm&fs=1' + (me.email ? '&authuser=' + encodeURIComponent(me.email) : '') +
    (fits ? '&bcc=' + encodeURIComponent(mails.join(',')) : '') + '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const w = window.open(url, '_blank');
  if (fits) return toast(w ? `Draft opened with ${mails.length} students in BCC. Check it and press Send.` : 'Your browser blocked the new tab. Allow pop-ups for Poirot and try again.');
  copy(mails.join(', '), `Draft opened. ${mails.length} addresses are too many for a link, so they are copied: paste them into BCC and press Send.`);
}
function openEditor(kind, id) {
  const it = id ? find(kind, id) : null, label = KINDS[kind][1], v = x => esc(x ?? '');
  const txt = (n, l, val, req, ph, max) => `<label>${l}<input type="text" id="e-${n}" value="${v(val)}" ${req ? 'required' : ''} maxlength="${max || 120}" placeholder="${ph || ''}"></label>`;
  const num = (n, l, val, min, max, req) => `<label>${l}<input type="number" id="e-${n}" value="${v(val)}" min="${min}" max="${max}" ${req ? 'required' : ''}></label>`;
  const sel = (n, l, list, val) => `<label>${l}<select id="e-${n}">${list.map(o => `<option${o == val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  const area = (n, l, val, ph) => `<label>${l}<textarea id="e-${n}" placeholder="${ph || ''}">${v(val)}</textarea></label>`;
  const names = [...new Set([...comps.map(full), ...fame.map(f => f.c), ...decks.map(d => d[0]), ...KT.map(k => k[0])])].sort();
  const compField = val => `<label>Competition<input type="text" id="e-competition" list="e-comps" value="${v(val)}" required maxlength="120" placeholder="For example, HUL L.I.M.E."></label><datalist id="e-comps">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
  const yr = new Date().getFullYear();
  const fields = {
    comp: () => txt('company', 'Company', it?.co, 1, '', 60) + txt('name', 'Competition name', it?.name, 1, '', 80) + `<label>Deadline<input type="datetime-local" id="e-deadline" value="${it ? localInput(it.due) : ''}" required></label>` + num('team', 'Team size', it?.team ?? 3, 1, 6, 1) + txt('url', 'Unstop link', it?.url, 0, 'https://unstop.com/...', 300) + area('about', 'Description shown to students', it?.about, 'Two lines on what the competition is about'),
    winner: () => compField(it?.c) + txt('team', 'Team name', it?.team, 1, '', 60) + sel('position', 'Position achieved', POSITIONS, it?.pos) + num('year', 'Year', it?.yr ?? yr, 2000, 2100, 1) + `<label>Team photo${it?.raw ? ' (leave empty to keep the current one)' : ''}<input type="file" id="e-file" accept="image/*"></label>` + area('members', 'Team members, one per line', it ? it.m.map(m => m.filter(Boolean).join(' - ')).join('\n') : '', 'Name - what they did'),
    deck: () => compField(it?.[0]) + txt('team', 'Team name', it?.[1], 1, '', 60) + sel('position', 'Position achieved', POSITIONS, it?.[2]) + num('year', 'Year', it?.[3] ?? yr, 2000, 2100, 1) + num('slides', 'Number of slides', it?.[4], 1, 200, 0) + sel('domain', 'Domain', DOM, it?.[5]) + `<label>Deck file, PDF or PowerPoint${it?.[6] ? ' (leave empty to keep the current one)' : ''}<input type="file" id="e-file" accept=".pdf,.ppt,.pptx"></label>` + txt('link', 'Or paste a link to the deck', it && /^https?:/i.test(it[6]) ? it[6] : '', 0, 'https://...', 400),
    guide: () => txt('title', 'Title', it?.[0], 1, '', 100) + sel('type', 'Type', GTYPES, it?.[1]) + sel('domain', 'Domain', DOM, it?.[2]) + area('points', 'Key points, one per line', it ? it[3].join('\n') : '', 'One tip per line') + txt('link', 'Link to the full resource', it?.[4], 0, 'https://...', 400),
    kt: () => compField(it?.[0]) + sel('topic', 'Topic', TOPICS, it?.[1]) + num('year', 'Year', it?.[2] ?? yr, 2000, 2100, 1) + area('body', 'The note', it?.[3], 'What future teams should know'),
  };
  $('sheetbody').innerHTML = `${sheetHead(it ? 'Edit' : 'Add')}<h2>${it ? 'Edit' : 'Add a'} ${esc(label)}</h2>
    <form id="editform">${fields[kind]()}<div class="acts"><button class="btn" id="e-go">${it ? 'Save changes' : 'Add'}</button><button type="button" class="btn ghost" data-close>Cancel</button></div></form>`;
  $('sheet').hidden = false;
  $('editform').onsubmit = async e => {
    e.preventDefault();
    const g = n => ($('e-' + n)?.value || '').trim(), lines = n => g(n).split('\n').map(x => x.trim()).filter(Boolean), n0 = n => g(n) === '' ? null : +g(n);
    const link = n => { const u = g(n); if (u && !/^https:\/\//i.test(u)) throw new Error('Links should start with https://'); return u || null; };
    const file = $('e-file')?.files[0] || null;
    let val;
    try {
      if (kind == 'comp') { const due = new Date(g('deadline')); if (isNaN(due)) throw new Error('Pick a deadline.'); val = { company: g('company'), name: g('name'), about: g('about') || null, team_size: n0('team') || 1, deadline: due.toISOString(), unstop_url: link('url') }; }
      if (kind == 'winner') val = { competition: g('competition'), team_name: g('team'), position: g('position'), year: n0('year'), photo_url: it?.raw || null, members: lines('members').map(l => { const i = l.indexOf(' - '); return i < 0 ? { name: l, role: '' } : { name: l.slice(0, i).trim(), role: l.slice(i + 3).trim() }; }) };
      if (kind == 'deck') val = { competition: g('competition'), team_name: g('team'), position: g('position'), year: n0('year'), slides: n0('slides'), domain: g('domain'), file_url: link('link') || (it && !/^https?:/i.test(it[6]) ? it[6] : null) || null };
      if (kind == 'guide') val = { title: g('title'), type: g('type'), domain: g('domain'), points: lines('points'), link: link('link') };
      if (kind == 'kt') val = { competition: g('competition'), topic: g('topic'), year: n0('year'), body: g('body') || null };
    } catch (err) { return toast(err.message); }
    $('e-go').disabled = true;
    if (await run(() => api.save(kind, id, val, file), it ? 'Saved.' : 'Added.')) $('sheet').hidden = true; else $('e-go').disabled = false;
  };
}
function askSection() {
  $('sheetbody').innerHTML = `${sheetHead('One quick thing')}<h2>Which section are you in?</h2>
    <p style="margin:0">Teams use this to find people they can meet easily.</p>
    <form id="secform"><label>Section<select id="sf-sec">${opts(SECTIONS)}</select></label><button class="btn">Save</button></form>`;
  $('sheet').hidden = false;
  $('secform').onsubmit = async e => { e.preventDefault(); if (await run(() => api.saveSection($('sf-sec').value), 'Saved.')) $('sheet').hidden = true; };
}

/* ---------------------------------------------------------------- navigation and events */
const views = ['board', 'teams', 'fame', 'play', 'desk'];
function show(v) {
  if (!views.includes(v) || (v == 'desk' && !(me && me.admin))) v = 'board';
  views.forEach(x => $('v-' + x).hidden = x != v);
  document.querySelectorAll('#nav button').forEach(b => b.setAttribute('aria-selected', b.dataset.v == v));
}
function seg(id, t) { document.querySelectorAll('#' + id + ' button').forEach(b => b.setAttribute('aria-pressed', b == t)); }
document.addEventListener('click', async e => {
  if (e.target.id == 'sheet') { $('sheet').hidden = true; return; }
  const t = e.target.closest('[data-open],[data-close],[data-req],[data-unpost],[data-k],[data-more],[data-p],[data-ok],[data-back],[data-v],[data-flip],[data-f],[data-deck],[data-remind],[data-def],[data-copylist],[data-lib],[data-shot],[data-confirm],[data-leave],[data-edit],[data-del],[data-new]'); if (!t) return; const d = t.dataset;
  if (d.v) { show(d.v); try { history.replaceState(null, '', '#' + d.v); } catch (_) { } }
  else if (d.more) { const b = $(d.more); b.hidden = !b.hidden; more(); }
  else if (d.p) { seg('playseg', t); $('p-repo').hidden = d.p != 'repo'; $('p-kt').hidden = d.p != 'kt'; }
  else if (d.open) openCase(d.open);
  else if ('close' in d) $('sheet').hidden = true;
  else if ('flip' in d) t.setAttribute('aria-pressed', t.getAttribute('aria-pressed') != 'true');
  else if (d.f) { seg('fameseg', t); $('f-win').hidden = d.f != 'win'; $('f-deck').hidden = d.f != 'deck'; }
  else if (d.k) { kind = d.k; seg('tfseg', t); render(); }
  else if (d.req) { const p = posts[+d.req], was = p.req; run(() => api.toggleReq(p), p.k == 'team' ? (was ? 'Request withdrawn.' : 'Request sent to ' + p.who + '.') : (was ? 'Invite withdrawn.' : 'Invite sent to ' + p.who + '.')); }
  else if (d.unpost) {
    const p = posts[+d.unpost];
    if (!p.mine && !t.dataset.sure) { t.dataset.sure = 1; t.textContent = 'Tap again to remove'; return; }
    run(() => api.removePost(p), p.mine ? 'Your post was removed.' : 'Post removed.');
  }
  else if (d.confirm) { const c = by(d.confirm); const team = c.reg.team, inSheet = !$('sheet').hidden; if (await run(() => api.confirm(c), 'Confirmed. You are in ' + team + '.') && inSheet) openCase(c.id); }
  else if (d.leave) { const c = by(d.leave); const inSheet = !$('sheet').hidden; if (await run(() => api.leave(c), 'You have been taken off that team.') && inSheet) openCase(c.id); }
  else if (d.ok) { const q = queue[+d.ok]; run(() => api.approve([q]), q.team + ' approved.'); }
  else if (d.back) { const q = queue[+d.back]; if (t.dataset.sure) run(() => api.sendBack(q), q.team + ' asked to file the proof again.'); else { t.dataset.sure = 1; t.textContent = 'Tap again to send back'; } }
  else if (d.edit) { const [kind, id] = d.edit.split(':'); openEditor(kind, id); }
  else if (d.new) openEditor(d.new, null);
  else if (d.del) {
    const [kind, id] = d.del.split(':');
    if (!t.dataset.sure) { t.dataset.sure = 1; t.textContent = kind == 'comp' ? 'Tap again: also deletes its proofs and posts' : 'Tap again to remove'; return; }
    run(() => api.remove(kind, id), 'Removed.');
  }
  else if (d.deck) {
    const k = decks[+d.deck];
    if (!k[6]) return toast(LIVE ? 'No file has been attached to this deck yet.' : 'This sample deck has no file. Add one with Edit, or upload a new deck from the Crack Tank desk.');
    const w = window.open('', '_blank');   // opened straight away so the browser does not block it
    try { const u = LIVE ? await api.fileUrl(k[6]) : k[6]; if (w) w.location = u; else location.href = u; } catch (err) { if (w) w.close(); toast(err.message || 'Could not open the deck.'); }
  }
  else if (d.remind) remind(by(d.remind));
  else if (d.def) { e.preventDefault(); openDef(d.def); }
  else if ('copylist' in d) copy('Name, PGP ID, Section\n' + defRows.map(r => r.join(', ')).join('\n'), defRows.length + ' names and PGP IDs copied. Paste them into a sheet or a message.');
  else if (d.lib) toast(LIVE ? 'In this version, Crack Tank adds ' + d.lib + ' in the Supabase table editor.' : 'In the live version, this opens a short form to add ' + d.lib + '.');
  else if (d.shot) {
    e.preventDefault(); const q = queue[+d.shot];
    if (!LIVE) return toast('In the live version, the screenshot opens here.');
    if (!q.path) return toast('No screenshot was attached to this proof.');
    try { window.open(await api.proofUrl(q), '_blank', 'noopener'); } catch (err) { toast(err.message || 'Could not open the screenshot.'); }
  }
});
function bind() {
  const libRow = document.querySelector('[data-lib]'); if (libRow) libRow.parentElement.innerHTML = [['winner', 'Add a winner'], ['deck', 'Add a winning deck'], ['guide', 'Add a repository item'], ['kt', 'Add a KT note']].map(x => `<button class="btn ghost" data-new="${x[0]}">${x[1]}</button>`).join('');
  $('ts').innerHTML = opts(DOM, 'Any domain'); $('pf-dom').innerHTML = '<option value="">Any domain</option>' + opts(DOM);
  ['dk-d', 'g-d'].forEach(i => $(i).innerHTML = opts(DOM, 'Any domain'));
  $('tsec').innerHTML = opts(SECTIONS, 'Any section');
  const tf = ['tf', 'ti', 'ts', 'tsec', 'twx', 'tce'];
  tf.forEach(i => $(i).onchange = render);
  $('treset').onclick = () => { tf.forEach(i => $(i).value = 'all'); render(); };
  ['dk-c', 'dk-p', 'dk-y', 'dk-d', 'g-t', 'g-d', 'kt', 'kt-t', 'kt-y'].forEach(i => $(i).onchange = lib); $('g-q').oninput = lib;
  $('bulk').onclick = () => { const r = ready(); run(() => api.approve(r), r.length + ' proofs approved.'); };
  $('auto').onchange = e => { try { localStorage.setItem('poirot-auto', e.target.checked ? '1' : ''); } catch (_) { } if (e.target.checked) { const n = ready().length; run(() => api.approve(ready()), 'On. ' + n + ' fully confirmed proofs approved. New ones are approved when a Crack Tank member opens Poirot.'); } };
  $('newpost').onclick = () => { if (!$('pf-comp').options.length) return toast('There is no open competition to post for yet.'); $('postform').hidden = false; };
  $('pf-cancel').onclick = () => $('postform').hidden = true;
  $('pf-kind').onchange = () => { const team = $('pf-kind').value == 'team'; $('pf-teamwrap').hidden = !team; $('pf-nwrap').hidden = !team; };
  $('postform').onsubmit = async e => {
    e.preventDefault(); const k = $('pf-kind').value;
    const v = { competition_id: $('pf-comp').value, kind: k, team_name: k == 'team' ? $('pf-team').value.trim() || null : null, members_needed: k == 'team' ? +$('pf-n').value || 1 : null, commitment: $('pf-intent').value, domains: [$('pf-dom').value].filter(Boolean), work_ex: $('pf-wx').value, case_exp: $('pf-ce').value, note: $('pf-note').value.trim() || null };
    const form = e.target;
    once(form, async () => { if (await run(() => api.addPost(v), 'Posted to the team finder.')) { kind = k; seg('tfseg', document.querySelector(`#tfseg [data-k="${k}"]`)); form.reset(); $('pf-kind').onchange(); form.hidden = true; render(); } });
  };
  $('addc').onclick = () => $('cform').hidden = false; $('cf-cancel').onclick = () => $('cform').hidden = true;
  $('cform').onsubmit = async e => {
    e.preventDefault(); const due = new Date($('cf-due').value);
    if (isNaN(due) || due < new Date()) return toast('Pick a deadline in the future.');
    const v = { company: $('cf-co').value.trim(), name: $('cf-name').value.trim(), about: $('cf-about').value.trim() || null, team_size: +$('cf-team').value || 1, deadline: due.toISOString(), unstop_url: $('cf-link').value.trim() || null };
    if (v.unstop_url && !/^https:\/\//i.test(v.unstop_url)) return toast('The Unstop link should start with https://');
    const form = e.target;
    once(form, async () => { if (await run(() => api.addComp(v), 'Published. It is now on every student’s board.')) { form.reset(); form.hidden = true; } });
  };
  document.addEventListener('keydown', e => { if (e.key == 'Escape') $('sheet').hidden = true; });
  $('signin').onclick = async () => {
    $('signin').disabled = true;
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + location.pathname, queryParams: { hd: DOMAIN, prompt: 'select_account' } } });
    if (error) { $('signin').disabled = false; loginMsg(error.message); }
  };
  $('demo').onclick = enterDemo;
  $('out').onclick = async () => { if (LIVE) { await sb.auth.signOut(); } location.hash = ''; location.reload(); };
  setInterval(() => { if (me) render(); }, 60e3);
}

/* ---------------------------------------------------------------- signing in */
function loginMsg(t) { $('loginmsg').textContent = t || ''; $('loginmsg').hidden = !t; }
function showLogin(msg) {
  $('login').hidden = false; $('app').hidden = true;
  $('signin').hidden = !canLive; $('nolive').hidden = canLive; loginMsg(msg);
}
function enter() {
  $('login').hidden = true; $('app').hidden = false;
  $('who').textContent = (LIVE ? '' : 'Demo · ') + (me.name || me.pgp) + ' · ' + me.pgp;
  $('out').textContent = LIVE ? 'Sign out' : 'Exit demo';
  $('nav-desk').hidden = !me.admin;
  $('foot').textContent = LIVE ? 'Poirot · built for Team SynapsE Overtures 2026 · content is maintained by Crack Tank.' : 'Demo mode. All names, deadlines, counts and content are example data, and nothing you do here is saved.';
  show(location.hash.slice(1));
}
async function enterDemo() { LIVE = false; demoData(); $('auto').checked = false; await refresh(); enter(); }
async function enterLive(session) {
  const email = (session.user.email || '').toLowerCase();
  if (!email.endsWith('@' + DOMAIN)) { await sb.auth.signOut(); return showLogin('Poirot is only for @' + DOMAIN + ' accounts. Sign in with your IIML Google account.'); }
  try {
    let p = (await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()).data;
    if (!p) { await new Promise(r => setTimeout(r, 800)); p = must(await sb.from('profiles').select('*').eq('id', session.user.id).maybeSingle()); }
    if (!p) throw new Error('Your profile could not be found. Ask Team SynapsE to check the database setup.');
    me = { id: p.id, name: p.name, pgp: p.pgp_id, sec: p.section, admin: p.is_admin, email: p.email };
    LIVE = true;
    try { $('auto').checked = !!localStorage.getItem('poirot-auto'); } catch (_) { }
    await refresh();
    if (await autoApprove()) await refresh();
    try { if (/access_token|code=|error/.test(location.hash + location.search)) history.replaceState(null, '', location.pathname); } catch (_) { }
    enter();
    if (!me.sec) askSection();
  } catch (e) { console.error(e); LIVE = false; me = null; showLogin('Could not load Poirot: ' + (e.message || 'unknown error') + '. You can still look around the demo.'); }
}
async function boot() {
  bind();
  if (!canLive) return showLogin('');
  const params = new URLSearchParams((location.hash || '').replace(/^#/, '') || location.search);
  const err = params.get('error_description');
  let entered = false;
  const go = s => { if (s && !entered) { entered = true; enterLive(s); } };
  sb.auth.onAuthStateChange((ev, s) => { if (ev == 'SIGNED_IN') setTimeout(() => go(s), 0); });
  const { data } = await sb.auth.getSession();
  if (data && data.session) return go(data.session);
  showLogin(err ? (/iiml|database|saving/i.test(err) ? 'Only @' + DOMAIN + ' accounts can sign in. Choose your IIML Google account.' : err) : '');
}
boot();
