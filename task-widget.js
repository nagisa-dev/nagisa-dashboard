// nagisa task widget v2 (simple)
// Scriptable用 — タスク一覧ウィジェット
// 配置：ホーム画面 / ロック画面（Small / Medium / Large 対応）
// タップでPWA（nagisa-dashboard）起動
//
// データ取得は Cloudflare Worker /tasks エンドポイント経由（GraphQLは Worker 側に集約）

// ── 設定（nagiが書き換える） ──
const AUTH_TOKEN = "REPLACE_WITH_YOUR_AUTH_TOKEN"; // task-webhook の AUTH_TOKEN
const WEBHOOK_URL = "https://task-webhook.nagisa-furuta5.workers.dev/tasks";
const APP_URL = "https://nagisa-dashboard.vercel.app";

// ── 配色 ──
const ACCENT  = new Color("#22c55e");
const OVERDUE = new Color("#dc2626");
const BG      = new Color("#0f0f0f");
const TEXT    = new Color("#f0f0f0");
const MUTED   = new Color("#888888");
const SUBTLE  = new Color("#444444");

const DONE_OPTION_ID = "b43841e5";

// ── データ取得（Worker経由） ──
async function fetchTasks() {
  const req = new Request(WEBHOOK_URL);
  req.method = "GET";
  req.headers = { "X-Auth-Token": AUTH_TOKEN };
  try {
    const res = await req.loadJSON();
    if (!res.ok) return null;
    return res.items || [];
  } catch (e) {
    console.log("Fetch error: " + e.message);
    return null;
  }
}

// ── タスク分類 ──
function localDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function classifyByDue(items) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(today);

  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const weekEndStr = localDateStr(weekEnd);

  const overdue = [];
  const todayList = [];
  const week = [];

  items.forEach(item => {
    if (item.statusOptionId === DONE_OPTION_ID) return;
    if (!item.due) return;
    if (item.due < todayStr) overdue.push({ item, label: "超過" });
    else if (item.due === todayStr) todayList.push({ item, label: "今日" });
    else if (item.due <= weekEndStr) week.push({ item, label: weekDaysLeft(item.due) });
  });

  const sortByDue = (a, b) => a.item.due.localeCompare(b.item.due);
  overdue.sort(sortByDue);
  todayList.sort(sortByDue);
  week.sort(sortByDue);

  return { overdue, todayList, week };
}

function weekDaysLeft(due) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(due + "T00:00:00");
  const diff = Math.floor((dueDate - today) / (1000 * 60 * 60 * 24));
  if (diff === 1) return "明日";
  return `あと${diff}日`;
}

// ── ウィジェット作成 ──
async function buildWidget(items) {
  const widget = new ListWidget();
  widget.backgroundColor = BG;
  widget.setPadding(12, 12, 12, 12);
  widget.url = APP_URL;

  if (items === null) {
    const t = widget.addText("接続エラー");
    t.textColor = MUTED;
    t.font = Font.systemFont(12);
    return widget;
  }

  const { overdue, todayList, week } = classifyByDue(items);
  const totalShown = overdue.length + todayList.length + week.length;

  const size = config.widgetFamily || "medium";
  const maxByGroup = {
    small:  { overdue: 2, today: 2, week: 0 },
    medium: { overdue: 3, today: 3, week: 0 },
    large:  { overdue: 4, today: 4, week: 6 },
  }[size] || { overdue: 3, today: 3, week: 0 };

  // ヘッダー
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();
  const icon = header.addText("📋 ");
  icon.font = Font.systemFont(13);
  const title = header.addText("タスク");
  title.textColor = TEXT;
  title.font = Font.boldSystemFont(13);
  header.addSpacer();
  const overdueBadge = header.addText(`${overdue.length}超過`);
  overdueBadge.textColor = overdue.length > 0 ? OVERDUE : MUTED;
  overdueBadge.font = Font.systemFont(10);

  widget.addSpacer(8);

  // タスク描画
  let drawn = 0;
  let firstSection = true;

  const drawSection = (group, max, color) => {
    if (group.length === 0 || max === 0) return;
    if (!firstSection) widget.addSpacer(4);
    firstSection = false;

    group.slice(0, max).forEach(({ item, label }) => {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      const dot = row.addText("●");
      dot.textColor = color;
      dot.font = Font.systemFont(8);
      const space = row.addText(" ");
      space.font = Font.systemFont(10);
      const t = row.addText(truncate(item.title, size === "small" ? 14 : 22));
      t.textColor = TEXT;
      t.font = Font.systemFont(11);
      row.addSpacer();
      const lbl = row.addText(label);
      lbl.textColor = color;
      lbl.font = Font.systemFont(9);
      drawn++;
    });
  };

  drawSection(overdue,   maxByGroup.overdue, OVERDUE);
  drawSection(todayList, maxByGroup.today,   ACCENT);
  drawSection(week,      maxByGroup.week,    MUTED);

  if (drawn === 0) {
    widget.addSpacer();
    const t = widget.addText("タスクなし 🎉");
    t.textColor = MUTED;
    t.font = Font.systemFont(12);
    t.centerAlignText();
    widget.addSpacer();
  }

  if (totalShown > drawn) {
    widget.addSpacer(4);
    const more = widget.addText(`他 ${totalShown - drawn} 件...`);
    more.textColor = SUBTLE;
    more.font = Font.systemFont(9);
  }

  return widget;
}

function truncate(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

// ── 実行 ──
const items = await fetchTasks();
const widget = await buildWidget(items);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}
Script.complete();
