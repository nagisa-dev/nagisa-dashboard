// nagisa today widget
// Scriptable用 — ホーム画面ウィジェット
//
// 初回セットアップ：Scriptable で以下を1度実行してKeychainにPATを保存する
//   Keychain.set("GITHUB_PAT", "gho_xxxxxxxxxxxxxxxx")

const GITHUB_PAT   = Keychain.contains("GITHUB_PAT") ? Keychain.get("GITHUB_PAT") : (() => { throw new Error("Set GITHUB_PAT via Keychain.set first"); })();
const REPO         = "nagisa-dev/furuta-database";
const FILE_PATH    = "output/today-schedule.json";
const APP_URL      = "safari-https://nagisa-dashboard.vercel.app";

const ACCENT  = new Color("#22c55e");
const BG      = new Color("#0f0f0f");
const CARD    = new Color("#1a1a1a");
const MUTED   = new Color("#555555");
const TEXT    = new Color("#f0f0f0");
const DONE_C  = new Color("#333333");

// ── データ取得 ──
async function fetchSchedule() {
  const url = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;
  const req = new Request(url);
  req.headers = {
    "Authorization": `Bearer ${GITHUB_PAT}`,
    "Accept": "application/vnd.github.v3+json"
  };
  try {
    const res = await req.loadJSON();
    const bytes = Data.fromBase64String(res.content.replace(/\n/g, ""));
    const json  = JSON.parse(bytes.toRawString());
    return json;
  } catch (e) {
    return null;
  }
}

// ── 時刻 → 分 ──
function toMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── 現在時刻（分） ──
function nowMin() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// ── ウィジェット作成 ──
async function buildWidget(data) {
  const widget = new ListWidget();
  widget.backgroundColor = BG;
  widget.setPadding(14, 14, 14, 14);
  widget.url = APP_URL;

  if (!data) {
    const t = widget.addText("スケジュールなし");
    t.textColor = MUTED;
    t.font = Font.systemFont(12);
    return widget;
  }

  // ヘッダー
  const header = widget.addStack();
  header.layoutHorizontally();
  header.centerAlignContent();

  const sun = header.addText("☀️ ");
  sun.font = Font.systemFont(13);

  const title = header.addText("今日のタスク");
  title.textColor = TEXT;
  title.font = Font.boldSystemFont(13);

  header.addSpacer();

  const now = nowMin();
  const dow = ["日","月","火","水","木","金","土"][new Date().getDay()];
  const dateStr = data.date.slice(5).replace("-", "/") + `（${dow}）`;
  const dateLabel = header.addText(dateStr);
  dateLabel.textColor = MUTED;
  dateLabel.font = Font.systemFont(10);

  widget.addSpacer(8);

  // 直近タスクを最大5件（現在時刻以降 or 未完了）
  const upcoming = data.items.filter(item =>
    item.type === "task" && toMin(item.end) >= now
  ).slice(0, 5);

  const all = data.items.filter(item => item.type === "task");
  const done = all.filter(item => toMin(item.end) < now).length;
  const remaining = all.length - done;

  if (upcoming.length === 0) {
    const empty = widget.addText("今日のタスクは完了！");
    empty.textColor = ACCENT;
    empty.font = Font.mediumSystemFont(12);
  } else {
    for (const item of upcoming) {
      const row = widget.addStack();
      row.layoutHorizontally();
      row.centerAlignContent();
      row.spacing = 6;
      row.setPadding(5, 8, 5, 8);
      row.backgroundColor = CARD;
      row.cornerRadius = 7;
      row.url = APP_URL;

      // 時刻
      const time = row.addText(item.start || "");
      time.textColor = MUTED;
      time.font = Font.systemFont(10);
      time.minimumScaleFactor = 0.8;

      row.addSpacer(2);

      // タイトル
      const isNow = toMin(item.start) <= now && toMin(item.end) > now;
      const taskTitle = row.addText(item.title);
      taskTitle.textColor = isNow ? ACCENT : TEXT;
      taskTitle.font = isNow ? Font.boldSystemFont(11) : Font.systemFont(11);
      taskTitle.lineLimit = 1;
      taskTitle.minimumScaleFactor = 0.8;

      row.addSpacer();

      // 進行中バッジ
      if (isNow) {
        const badge = row.addText("NOW");
        badge.textColor = ACCENT;
        badge.font = Font.boldSystemFont(9);
      }

      widget.addSpacer(4);
    }
  }

  widget.addSpacer();

  // フッター：残り件数
  const footer = widget.addStack();
  footer.layoutHorizontally();

  const remain = footer.addText(`残り ${remaining} 件`);
  remain.textColor = MUTED;
  remain.font = Font.systemFont(10);

  footer.addSpacer();

  const tap = footer.addText("タップで開く →");
  tap.textColor = MUTED;
  tap.font = Font.systemFont(10);

  return widget;
}

// ── メイン ──
const data = await fetchSchedule();
const widget = await buildWidget(data);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentMedium();
}
Script.complete();
