const P = require('../../utils/plan.js');

const KEY = 'wb-checkin-v1';           // 本机存储键，与网页版同名但各自独立
const PHASE_CLS = { '1': 'p-sleep', '2': 'p-trip', '3': 'p-study', '4': 'p-tidy' };

Page({

  data: {
    tab: 'today',
    start: P.START,
    end: P.END,
    cur: P.START,
    weekHeads: ['一', '二', '三', '四', '五', '六', '日'],

    curLabel: '',
    curMeta: '',
    curTasks: [],
    doneCount: 0,
    curPct: 0,
    phaseText: '',
    phaseCls: 'p-sleep',
    phaseNote: '',

    sleepVal: -1,
    sleepHint: '',

    stats: { pct: 0, done: 0, total: 0, sleepRate: '—', daysLeft: 0 },

    calCells: [],
    calSum: '',
    milestones: [],

    sleepBars: [],
    sleepDist: [],
    sleepSum: '',
    ladRows: [],

    rhythm: [],
    planSleep: [],
    planStudy: [],
    planTidy: [],
    schedule: [],

    toolGroups: [],
    toolSum: '',
    gaps: [],
    whyTools: []
  },

  /* ================= 生命周期 ================= */
  onLoad() {
    this.S = wx.getStorageSync(KEY) || {};
    if (!this.S.tasks) this.S.tasks = {};
    if (!this.S.sleep) this.S.sleep = {};
    if (!this.S.tools) this.S.tools = {};

    const today = P.fmt(new Date());
    const cur = (today >= P.START && today <= P.END) ? today : P.START;

    /* 静态文案 */
    const ladRows = P.WEEKS.map((w, i) => {
      const a = P.addDays(P.parse('2026-09-14'), i * 7);
      const b = P.addDays(a, 6);
      return {
        k: 'w' + i,
        w: w.title.split(' · ')[0],
        range: (a.getMonth() + 1) + '.' + a.getDate() + ' – ' + (b.getMonth() + 1) + '.' + b.getDate(),
        target: w.sleepTarget,
        note: w.sleepNote
      };
    });

    this.setData({
      cur,
      ladRows,
      milestones: P.MILESTONES.map((m, i) => ({ k: 'm' + i, d: m.d, t: m.t, hot: m.d === '11.21' })),
      planSleep: P.PLAN.sleep,
      planStudy: P.PLAN.study,
      planTidy: P.PLAN.tidy,
      rhythm: [
        { k: 'r1', phase: '① 启动止损', date: '9.15 – 9.25', desc: '早睡目标 00:30 前入睡，先把每周 1–2 次的 3–4 点熬夜彻底清零。备考通读《政策与法律法规》40 分钟/天。整理做玄关和卫生间这两个小空间。' },
        { k: 'r2', phase: '② 旅行', date: '9.26 – 10.7', desc: '睡眠弹性（不连续熬夜），备考减量到 15 分钟/天，整理不规划。' },
        { k: 'r3', phase: '③ 主攻', date: '10.8 – 10.31', desc: '作息 00:00 → 23:30 逐步前移。四科二轮刷题 60 分钟/天，10 月底同步启动科目五。整理进入主力期，每周攻克 1–2 个空间。' },
        { k: 'r4', phase: '④ 冲刺收尾', date: '11.1 – 11.15', desc: '作息锁死 23:00。整卷模拟 + 错题三轮 + 口试演练 90 分钟/天。整理减量，做阳台和全屋收尾。' },
        { k: 'r5', phase: '⑤ 考前周', date: '11.16 – 11.21', desc: '11.16 打印准考证；只过错题不做新题；23:00 前睡，养精蓄锐。' }
      ],
      schedule: [
        { k: 's1', date: '9.15 – 9.25', space: '玄关 + 卫生间', desc: '小空间速胜。玄关鞋子三分（当季常穿 / 换季 / 待处理），常穿控制在 12 双；卫生间台面只留 3 件，确认镜柜重装或换浴室镜方案。' },
        { k: 's2', date: '9.26 – 10.7', space: '—', desc: '旅行期间不规划整理。' },
        { k: 's3', date: '10.8 – 10.11', space: '厨房', desc: '台面清空后按使用频率三档分区；调料统一到密封罐；水槽下方加置物架；纪念品统一进「待处理筐」。' },
        { k: 's4', date: '10.12 – 10.18', space: '主卧衣柜', desc: '衣服主战场第一轮。全部下架走四箱法；衣架统一；Lolita / JK / 汉服分区挂；做一张「衣柜地图」。' },
        { k: 's5', date: '10.19 – 10.25', space: '4㎡ 衣帽间 + 次卧', desc: '用现有 2 个双层衣架 + 2 个 1.5m 落地衣架重组；布料按材质分箱 + 干燥剂；次卧备好「访客三件套」收纳包。' },
        { k: 's6', date: '10.26 – 11.1', space: '客厅 + 玩偶 + 手账', desc: '开放格配收纳筐（一格一类）；玩偶进防尘柜；手账素材分盒；相机镜头进密封防潮箱（放衣柜底层）。' },
        { k: 's7', date: '11.2 – 11.15', space: '阳台 + 全屋收尾', desc: '植物按喜阳 / 耐阴重排并贴养护卡；全屋收纳箱统一标签；建立「每日 5 分钟复位」和「进一件出一件」规则。' }
      ],
      gaps: [
        { k: 'g1', lv: '必买', name: '密封防潮箱（可入柜）+ 变色硅胶 + 迷你湿度计', price: '¥105–175', desc: '相机 + 2 镜头 + CCD 的防潮方案。不插电、无异味，能塞进衣柜底层或衣帽间，不占客厅台面。硅胶变色后微波炉烘干可反复使用。' },
        { k: 'g2', lv: '必买', name: '密封防潮收纳箱 ×3', price: '¥120–180', desc: '布料、汉服、3D 打印耗材（PLA 受潮会直接堵头爆管）。' },
        { k: 'g3', lv: '必买', name: '除湿盒 ×8 + 干燥剂', price: '¥80–120', desc: '书柜、衣柜、衣帽间、各收纳箱内的长期防潮。' },
        { k: 'g4', lv: '按需', name: '抽屉分隔 / 收纳筐', price: '¥100–150', desc: '厨房抽屉、玄关小物、手账素材，按实际缺口补。' },
        { k: 'g5', lv: '按需', name: '美纹纸 + 油性记号笔', price: '¥20–30', desc: '替代标签机做全屋标签，便宜且撕下不留胶。' }
      ],
      whyTools: [
        { k: 'y1', t: '尺寸不合', d: '箱比物品大 → 里面还是乱的；箱比柜子小 → 塞不满、浪费空间。先量柜内净尺寸再买，箱体至少占柜内容积的 85%。' },
        { k: 'y2', t: '位置不对', d: '容器离使用场景超过「一步」，就一定会被随手乱放。玄关的鞋、厨房的调料、床头的充电线，都要放在用到它的地方一步之内。' },
        { k: 'y3', t: '没有分类规则', d: '一个筐什么都能放，三个月后又变成杂物筐。一个容器只放一类东西，并且贴标签写清「放什么」。' },
        { k: 'y4', t: '买在了整理之前', d: '先囤工具再整理，等于在不知道要装什么的情况下买容器。正确顺序永远是：清空 → 减量 → 量尺寸 → 再买。' }
      ]
    });

    this.refreshAll();
  },

  /* ================= 存储 ================= */
  save() {
    try { wx.setStorageSync(KEY, this.S); } catch (e) { /* 存储失败时静默，不影响交互 */ }
  },

  refreshAll() {
    this.refreshToday();
    this.refreshStats();
    this.refreshCal();
    this.refreshSleep();
    this.refreshTools();
  },

  /* ================= 今日 ================= */
  refreshToday() {
    const s = this.data.cur;
    const d = P.parse(s);
    const wk = P.WEEKS[P.weekIdx(s)];
    const trip = P.isTrip(s);
    const w = d.getDay();
    const weekend = (w === 0 || w === 6);

    const list = P.tasksOf(s).map((t, i) => ({
      c: t.c, t: t.t, m: t.m,
      idx: i,
      done: !!this.S.tasks[s + '#' + i]
    }));
    const doneCount = list.filter(x => x.done).length;

    const meta = [P.WD[w]];
    if (trip) { meta.push('旅行期'); }
    else { meta.push(weekend ? '周末（可加长时间）' : '工作日 · 20:00 到家'); }
    if (wk) meta.push(wk.title + ' · 目标 ' + wk.sleepTarget);

    const ph = P.phaseOf(s);
    let phaseNote = '';
    if (trip) {
      phaseNote = '旅行期间备考减量、整理不规划，好好玩。';
    } else if (wk) {
      phaseNote = '本周重点：' + wk.sleepNote;
    }

    const sv = this.S.sleep[s];
    const sleepVal = (sv === undefined) ? -1 : sv;
    const labels = ['按时达标', '稍晚（晚 ≤45 分钟）', '熬夜（晚 45–120 分钟）', '严重（凌晨 2 点后）'];
    const target = wk ? (trip ? '01:00（弹性）' : wk.sleepTarget) : '—';
    const sleepHint = (sleepVal < 0)
      ? ('还没记录。就寝目标 ' + target + '　|　按时达标 = 不晚于目标 · 稍晚 = 晚 45 分钟内 · 熬夜 = 晚 45–120 分钟 · 严重 = 凌晨 2 点后')
      : ('已记录：' + labels[sleepVal]);

    this.setData({
      curLabel: (d.getMonth() + 1) + '月' + d.getDate() + '日',
      curMeta: meta.join(' · '),
      curTasks: list,
      doneCount,
      curPct: list.length ? Math.round(doneCount / list.length * 100) : 0,
      phaseText: P.PHASES[ph].n + ' · ' + P.PHASES[ph].d,
      phaseCls: PHASE_CLS[ph],
      phaseNote,
      sleepVal,
      sleepHint
    });
  },

  /* ================= 统计 ================= */
  refreshStats() {
    let doneAll = 0, totalAll = 0, sleepOk = 0, sleepRec = 0;

    P.ALL.forEach(s => {
      const ts = P.tasksOf(s);
      totalAll += ts.length;
      for (let i = 0; i < ts.length; i++) {
        if (this.S.tasks[s + '#' + i]) doneAll++;
      }
      const v = this.S.sleep[s];
      if (v !== undefined) { sleepRec++; if (v === 0) sleepOk++; }
    });

    const cur = this.data.cur;
    const cs = P.tasksOf(cur);
    let cd = 0;
    for (let i = 0; i < cs.length; i++) { if (this.S.tasks[cur + '#' + i]) cd++; }

    const now = new Date();
    const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const left = Math.ceil((P.parse(P.EXAM) - today0) / 86400000);

    this.setData({
      stats: {
        pct: totalAll ? Math.round(doneAll / totalAll * 100) : 0,
        done: cd,
        total: cs.length,
        sleepRate: sleepRec ? Math.round(sleepOk / sleepRec * 100) + '%' : '—',
        daysLeft: left > 0 ? left : 0
      }
    });
  },

  /* ================= 日历 ================= */
  refreshCal() {
    const first = P.parse(P.START);
    const w0 = first.getDay();
    const mon = P.addDays(first, w0 === 0 ? -6 : 1 - w0);
    const todayStr = P.fmt(new Date());
    const cells = [];
    let sumDone = 0, sumTotal = 0;

    for (let i = 0; i < 63; i++) {
      const d = P.addDays(mon, i);
      const s = P.fmt(d);
      if (s < P.START || s > P.END) {
        cells.push({ key: 'out' + i, d: '', day: '', meta: '', pct: 0, cls: 'out' });
        continue;
      }
      const ts = P.tasksOf(s);
      let dn = 0;
      for (let k = 0; k < ts.length; k++) { if (this.S.tasks[s + '#' + k]) dn++; }
      sumDone += dn; sumTotal += ts.length;
      const pct = ts.length ? Math.round(dn / ts.length * 100) : 0;
      let cls = '';
      if (P.isTrip(s)) cls += 'trip ';
      if (s === todayStr) cls += 'today ';
      if (pct === 100 && ts.length) cls += 'full';
      cells.push({
        key: s, d: s, day: d.getDate(),
        meta: P.isTrip(s) ? '旅行' : (ts.length + ' 项'),
        pct, cls
      });
    }

    this.setData({ calCells: cells, calSum: '已完成 ' + sumDone + ' / ' + sumTotal + ' 项' });
  },

  /* ================= 睡眠 ================= */
  refreshSleep() {
    const COL = ['#7CAF92', '#DCB663', '#D48C9C', '#B07A7A'];
    const HV = [76, 118, 178, 240];
    const bars = [];
    const cnt = [0, 0, 0, 0];
    let rec = 0;

    P.ALL.forEach(s => {
      const v = this.S.sleep[s];
      let h = HV[0], bg = '#F0E8E0';
      if (v !== undefined) { h = HV[v]; bg = COL[v]; cnt[v]++; rec++; }
      const d = P.parse(s);
      bars.push({
        d: s, h, bg,
        ax: (d.getDate() === 1 || d.getDay() === 1) ? ((d.getMonth() + 1) + '/' + d.getDate()) : ''
      });
    });

    this.setData({
      sleepBars: bars,
      sleepDist: [
        { l: '按时达标', n: cnt[0], c: '#3B6B50' },
        { l: '稍晚 ≤45 分钟', n: cnt[1], c: '#A8802F' },
        { l: '熬夜 45–120 分钟', n: cnt[2], c: '#9E5568' },
        { l: '严重（2 点后）', n: cnt[3], c: '#8A5A5A' }
      ],
      sleepSum: rec
        ? ('已记录 ' + rec + ' 天　达标 ' + cnt[0] + ' 天（' + Math.round(cnt[0] / rec * 100) + '%）')
        : '还没有记录，从今天开始吧'
    });
  },

  /* ================= 工具盘点 ================= */
  refreshTools() {
    let n = 0, total = 0;
    const groups = P.TOOLS.map((g, gi) => ({
      g: g[0],
      items: g[1].map((t, ii) => {
        const k = gi + '_' + ii;
        total++;
        const on = !!this.S.tools[k];
        if (on) n++;
        return { k, t, on };
      })
    }));
    this.setData({ toolGroups: groups, toolSum: '已有 ' + n + ' / ' + total + ' 项' });
  },

  /* ================= 事件 ================= */
  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.t });
  },

  prevDay() {
    const i = P.ALL.indexOf(this.data.cur);
    if (i > 0) {
      this.setData({ cur: P.ALL[i - 1] });
      this.refreshToday(); this.refreshStats();
    }
  },

  nextDay() {
    const i = P.ALL.indexOf(this.data.cur);
    if (i >= 0 && i < P.ALL.length - 1) {
      this.setData({ cur: P.ALL[i + 1] });
      this.refreshToday(); this.refreshStats();
    }
  },

  gotoToday() {
    const today = P.fmt(new Date());
    const cur = (today >= P.START && today <= P.END) ? today : P.START;
    this.setData({ cur });
    this.refreshToday(); this.refreshStats();
  },

  onPick(e) {
    this.setData({ cur: e.detail.value });
    this.refreshToday(); this.refreshStats();
  },

  onTask(e) {
    const i = e.currentTarget.dataset.i;
    const k = this.data.cur + '#' + i;
    if (this.S.tasks[k]) delete this.S.tasks[k]; else this.S.tasks[k] = 1;
    this.save();
    this.refreshToday(); this.refreshStats(); this.refreshCal();
  },

  onSleep(e) {
    const k = Number(e.currentTarget.dataset.k);
    const s = this.data.cur;
    if (this.S.sleep[s] === k) delete this.S.sleep[s]; else this.S.sleep[s] = k;
    this.save();
    this.refreshToday(); this.refreshStats(); this.refreshSleep();
  },

  onCell(e) {
    const d = e.currentTarget.dataset.d;
    if (!d) return;                       // 越界格子
    this.setData({ cur: d, tab: 'today' });
    this.refreshToday(); this.refreshStats();
    wx.pageScrollTo({ scrollTop: 0, duration: 300 });
  },

  onTool(e) {
    const k = e.currentTarget.dataset.k;
    if (this.S.tools[k]) delete this.S.tools[k]; else this.S.tools[k] = 1;
    this.save();
    this.refreshTools();
  }
});
