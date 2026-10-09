import { useCallback, useEffect, useState } from "react";
import {
  useFinance,
  getQuickAddPlugin,
  type QuickAddGesture,
  type SheetBackupFrequency,
} from "@/finance/FinanceContext";
import AppShell from "@/finance/AppShell";
import { fmtMoney, CURRENCIES, setCurrency } from "@/finance/format";
import { CatIcon } from "@/finance/icons";
import {
  Plus,
  Trash2,
  Download,
  Building2,
  X,
  FileSpreadsheet,
  Pencil,
  Hand,
  Ban,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  Smartphone,
  Copy,
  Check,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  RotateCcw,
} from "lucide-react";

type Tab = "categories" | "accounts" | "preferences";

interface SecurityPluginApi {
  setLockEnabled: (o: { enabled: boolean }) => Promise<unknown>;
  isLockEnabled: (o?: Record<string, never>) => Promise<{ enabled?: boolean }>;
  canAuthenticate: (o?: Record<string, never>) => Promise<{ available?: boolean }>;
}

export function getSecurityPlugin(): SecurityPluginApi | null {
  try {
    const cap = (window as unknown as {
      Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { BalFinSecurity?: SecurityPluginApi } };
    }).Capacitor;
    if (cap?.isNativePlatform?.() && cap.Plugins?.BalFinSecurity) return cap.Plugins.BalFinSecurity;
  } catch {}
  return null;
}

const GESTURES: Array<{
  key: QuickAddGesture;
  label: string;
  desc: string;
  icon: React.ComponentType<{ size?: number }>;
}> = [
  {
    key: "bubble",
    label: "Floating Bubble (Enabled)",
    desc: "Always-on draggable bubble over any app — tap it to log with auto-timestamp",
    icon: Hand,
  },
  {
    key: "none",
    label: "Off",
    desc: "Open quick entry only from inside the app",
    icon: Ban,
  },
];

interface QaStatus {
  bubble: boolean;
  batteryOk: boolean;
}

export default function Manage() {
  const {
    categories,
    transactions,
    accounts,
    addCategory,
    updateCategory,
    deleteCategory,
    addSub,
    deleteSub,
    addAccount,
    updateAccount,
    deleteAccount,
    currency,
    setCurrencyPref,
    catName,
    quickAddGesture,
    setQuickAddGesture,
    sheetSync,
    setSheetEndpoint,
    setBackupFrequency,
    syncSheets,
    sheetsSyncing,
    savedPin,
    setSavedPin,
    lockApp,
    maskBalances,
    setMaskBalances,
    bubbleOpacity,
    setBubbleOpacity,
  } = useFinance();

  const [tab, setTab] = useState<Tab>("categories");
  const [endpoint, setEndpoint] = useState(sheetSync?.endpoint ?? "");
  const [epSaved, setEpSaved] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showScriptHelp, setShowScriptHelp] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const backupFreq = (sheetSync?.backupFrequency as SheetBackupFrequency | undefined) ?? "daily";

  const [overlayGranted, setOverlayGranted] = useState<boolean | null>(null);
  const [qaStatus, setQaStatus] = useState<QaStatus | null>(null);
  const isNative = !!getQuickAddPlugin();
  const [bioLock, setBioLock] = useState(false);

  useEffect(() => {
    getSecurityPlugin()
      ?.isLockEnabled({})
      .then((r) => setBioLock(!!r?.enabled))
      .catch(() => {});
  }, []);

  const refreshQa = useCallback(() => {
    const qa = getQuickAddPlugin();
    if (!qa) return;
    qa.canDrawOverlays()
      .then((r) => {
        const granted = !!r?.granted;
        setOverlayGranted(granted);
        if (granted && quickAddGesture === "bubble") {
          qa.setGesture({ gesture: quickAddGesture }).catch(() => {});
        }
      })
      .catch(() => {});
    qa.getStatus()
      .then((s) => setQaStatus({ bubble: !!s.bubble, batteryOk: !!s.batteryOk }))
      .catch(() => {});
  }, [quickAddGesture]);

  useEffect(() => {
    if (!isNative) return;
    refreshQa();
    const onVis = () => {
      if (document.visibilityState === "visible") refreshQa();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [isNative, refreshQa]);

  const requestOverlay = () => {
    getQuickAddPlugin()?.requestOverlayPermission({}).catch(() => {});
  };

  const restartQa = () => {
    getQuickAddPlugin()?.restartServices({}).catch(() => {});
    setTimeout(refreshQa, 700);
  };

  const requestBattery = () => {
    getQuickAddPlugin()?.requestIgnoreBatteryOptimizations({}).catch(() => {});
  };

  const exportCsv = () => {
    const rows = [
      ["Date", "Type", "Category", "Subcategory", "Account", "Amount", "Note"],
      ...transactions
        .slice()
        .sort((a, b) => a.date - b.date)
        .map((t) => [
          new Date(t.date).toISOString(),
          t.kind,
          t.categoryId ? catName(t.categoryId) : "Transfer",
          t.subcategory ?? "",
          t.accountId ? accounts.find((a) => a._id === t.accountId)?.name ?? "" : "",
          String(t.amount),
          (t.note ?? "").replace(/"/g, '""'),
        ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "balfin-export.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const saveEndpoint = async () => {
    await setSheetEndpoint(endpoint);
    setEpSaved(true);
    setTimeout(() => setEpSaved(false), 2000);
  };

  const handleTestSync = async () => {
    if (!endpoint.trim()) {
      setTestResult("Please enter your Google Apps Script web app URL first.");
      return;
    }
    await setSheetEndpoint(endpoint);
    setTestResult("Testing connection to Google Sheet...");
    try {
      const res = await syncSheets(endpoint.trim());
      if (res === "synced") {
        setTestResult("✓ Connected and synced successfully! All ledger transactions pushed.");
      } else {
        const err = sheetSync?.lastError;
        setTestResult(err ? `Sync error: ${err}` : "Sync failed. Please check the URL.");
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  };

  const copyAppsScript = () => {
    const code = `function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, status: "BalFin sync endpoint is live" })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: "busy" })).setMimeType(ContentService.MimeType.JSON);
  }
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.txns && data.txns.headers && data.txns.rows) {
      writeTab_("BalFin Ledger", data.txns.headers, data.txns.rows);
    }
    if (data.summary && data.summary.rows && data.summary.rows.length) {
      writeTab_("Monthly Summary", data.summary.headers, data.summary.rows);
    }
    return ContentService.createTextOutput(JSON.stringify({ ok: true, rows: data.txns ? data.txns.rows.length : 0, at: data.generatedAt })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function writeTab_(name, headers, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  var all = [headers].concat(rows || []);
  var width = headers.length;
  var values = all.map(function (r) {
    var out = [];
    for (var i = 0; i < width; i++) out.push(r[i] === "" || r[i] === undefined ? "" : r[i]);
    return out;
  });
  sheet.getRange(1, 1, values.length, width).setValues(values);
  var head = sheet.getRange(1, 1, 1, width);
  head.setFontWeight("bold").setBackground("#0b1326").setFontColor("#42e5a2");
  sheet.setFrozenRows(1);
  for (var c = 1; c <= width; c++) {
    var isMoney = /debit|credit|amount|income|expense|net|budget|goal/i.test(headers[c - 1]);
    if (isMoney) sheet.getRange(2, c, Math.max(1, values.length - 1), 1).setNumberFormat("#,##0.00");
  }
  sheet.autoResizeColumns(1, width);
};
    `
    navigator.clipboard.writeText(code);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const status = sheetSync?.lastStatus;
  const statusPill =
    status === "synced" ? (
      <span className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary-bright">
        <CheckCircle2 size={12} /> Auto-synced
      </span>
    ) : status === "error" ? (
      <span className="flex items-center gap-1 rounded-full bg-tertiary-deep/20 px-2.5 py-1 text-[11px] font-semibold text-tertiary">
        <AlertCircle size={12} /> Error
      </span>
    ) : sheetSync?.endpoint ? (
      <span className="flex items-center gap-1 rounded-full bg-secondary-deep/30 px-2.5 py-1 text-[11px] font-semibold text-secondary">
        <RefreshCw size={12} className="animate-spin" /> Pending
      </span>
    ) : null;

  return (
    <AppShell title="Manage" subtitle="Categories, accounts and preferences">
      {/* Tab Switcher */}
      <div className="mb-3 grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
        {(["categories", "accounts", "preferences"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full py-2 text-xs font-semibold capitalize transition ${
              tab === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "categories" && <CategoriesTab />}
      {tab === "accounts" && <AccountsTab />}
      {tab === "preferences" && (
        <section className="space-y-4">
          {/* General Settings */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <h3 className="text-sm font-bold text-white">General Settings</h3>
            <label className="flex items-center justify-between">
              <span className="text-sm">Currency</span>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrencyPref(e.target.value);
                  setCurrency(e.target.value);
                }}
                className="rounded-lg border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink font-semibold"
              >
                {Object.entries(CURRENCIES).map(([code, c]) => (
                  <option key={code} value={code}>
                    {code} — {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Quick-Add Floating Bubble */}
          <div className="space-y-3 rounded-2xl border border-primary/20 bg-card p-5 shadow-[0_4px_24px_rgba(0,200,136,0.08)]">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-primary-bright">
                  <Hand size={14} />
                </span>
                Floating Quick-Add Bubble
              </h3>
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold text-primary-bright">
                Active
              </span>
            </div>
            <div className="space-y-2">
              {GESTURES.map((g) => {
                const active = quickAddGesture === g.key;
                const Icon = g.icon;
                return (
                  <button
                    key={g.key}
                    onClick={() => setQuickAddGesture(g.key)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition active:scale-[0.99] ${
                      active
                        ? "border-primary/40 bg-primary/10"
                        : "border-white/10 bg-surface-low"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        active ? "bg-primary/20 text-primary-bright" : "bg-card-high text-ink-faint"
                      }`}
                    >
                      <Icon size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${active ? "text-primary-bright" : "text-white"}`}>
                        {g.label}
                      </span>
                      <span className="block text-[11px] text-ink-faint">{g.desc}</span>
                    </span>
                    <span
                      className={`h-4 w-4 flex-shrink-0 rounded-full border-2 ${
                        active ? "border-primary bg-primary" : "border-ink-faint/50"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Bubble Transparency Adjustment Option */}
            {quickAddGesture === "bubble" && (
              <div className="rounded-xl border border-white/10 bg-surface-low p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">Bubble Transparency</span>
                  <span className="text-xs font-bold text-primary-bright tabular-nums">
                    {Math.round(bubbleOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={bubbleOpacity}
                  onChange={(e) => setBubbleOpacity(parseFloat(e.target.value))}
                  className="w-full accent-primary h-1.5 bg-surface-2 rounded-lg cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-ink-faint">
                  <span>Translucent (25%)</span>
                  <div className="flex gap-1.5">
                    {[0.5, 0.75, 0.9, 1.0].map((val) => (
                      <button
                        key={val}
                        onClick={() => setBubbleOpacity(val)}
                        className={`px-2 py-0.5 rounded-full border text-[10px] transition ${
                          Math.abs(bubbleOpacity - val) < 0.04
                            ? "border-primary bg-primary/20 text-primary-bright font-bold"
                            : "border-white/10 bg-surface-2 text-ink-soft hover:text-white"
                        }`}
                      >
                        {Math.round(val * 100)}%
                      </button>
                    ))}
                  </div>
                  <span>Solid (100%)</span>
                </div>
              </div>
            )}

            {quickAddGesture === "bubble" && isNative && overlayGranted === false && (
              <div className="space-y-2 rounded-xl bg-surface-low px-3 py-2.5">
                <p className="text-[11px] text-ink-faint">
                  Permission required on Android: allow BalFin to <b className="text-ink-soft">"Display over other apps"</b>.
                </p>
                <button
                  onClick={requestOverlay}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823]"
                >
                  Grant "Display over other apps"
                </button>
              </div>
            )}
          </div>

          {/* Google Sheets Auto-Sync */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <FileSpreadsheet size={15} className="text-primary" /> Google Sheets Sync
              </h3>
              {statusPill}
            </div>
            <p className="text-[11px] text-ink-faint">
              Every transaction and investment flow is automatically formatted with Debit/Credit columns and pushed to your Google Sheet.
            </p>

            {/* Cadence */}
            <div className="flex items-center justify-between rounded-xl bg-surface-low px-3 py-2">
              <span className="text-[11px] font-semibold text-ink-soft">Auto-backup Cadence</span>
              <div className="inline-flex rounded-full bg-card p-1">
                {(["daily", "weekly", "monthly"] as SheetBackupFrequency[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => setBackupFrequency(f)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize transition ${
                      backupFreq === f ? "bg-primary text-[#003823]" : "text-ink-faint"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoint Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-ink-faint block">
                Apps Script Web App URL
              </label>
              <div className="flex gap-2">
                <input
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-xs font-mono text-ink placeholder:text-ink-faint/50"
                />
                <button
                  onClick={saveEndpoint}
                  disabled={epSaved}
                  className="flex-shrink-0 rounded-full bg-primary px-4 text-xs font-bold text-[#003823] disabled:opacity-60"
                >
                  {epSaved ? "Saved" : "Save"}
                </button>
              </div>
            </div>

            {/* Test Connection Button */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleTestSync}
                disabled={sheetsSyncing}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823] disabled:opacity-40 shadow-sm"
              >
                <RefreshCw size={14} className={sheetsSyncing ? "animate-spin" : ""} />
                {sheetsSyncing ? "Testing & Syncing..." : "Test Connection & Sync Now"}
              </button>
              <a
                href="https://sheets.new"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center rounded-full border border-white/10 px-4 text-ink-soft hover:text-white"
                title="Create a new Google Sheet"
              >
                <ExternalLink size={15} />
              </a>
            </div>

            {testResult && (
              <p
                className={`rounded-xl px-3 py-2 text-[11px] font-medium ${
                  testResult.startsWith("✓")
                    ? "bg-primary/15 text-primary-bright"
                    : "bg-tertiary-deep/15 text-tertiary"
                }`}
              >
                {testResult}
              </p>
            )}

            {/* Script Helper Accordion */}
            <div className="rounded-xl border border-white/5 bg-surface-low p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Google Sheet Apps Script Setup</span>
                <button
                  onClick={() => setShowScriptHelp((s) => !s)}
                  className="text-xs text-primary underline"
                >
                  {showScriptHelp ? "Hide Guide" : "View Code & Instructions"}
                </button>
              </div>

              {showScriptHelp && (
                <div className="space-y-3 pt-2 text-[11px] text-ink-faint animate-fade">
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Create or open your Google Sheet (<a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-primary underline">sheets.new</a>).</li>
                    <li>Click <b>Extensions → Apps Script</b> in the top menu.</li>
                    <li>Delete any placeholder code, and paste the code below:</li>
                  </ol>
                  <button
                    onClick={copyAppsScript}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-2 border border-white/10 py-2 text-xs font-bold text-primary-bright hover:bg-card-high transition"
                  >
                    {copiedScript ? <Check size={14} /> : <Copy size={14} />}
                    {copiedScript ? "Script Code Copied to Clipboard!" : "Copy Full Apps Script Code"}
                  </button>
                  <ol start={4} className="list-decimal pl-4 space-y-1">
                    <li>Click <b>Deploy → New Deployment</b>, select <b>Web app</b>.</li>
                    <li>Set <b>Execute as: Me</b> and <b>Who has access: Anyone</b>.</li>
                    <li>Click Deploy, approve authorization, copy the <b>/exec</b> URL, and paste it above!</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Security (Fixed with PIN + Biometric support) */}
          <div className="space-y-3 rounded-2xl border border-white/5 bg-card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <Shield size={15} className="text-secondary" /> Privacy &amp; App Security
            </h3>

            {/* PIN Lock */}
            <div className="flex items-center justify-between rounded-xl bg-surface-low p-3">
              <div>
                <p className="text-sm font-semibold text-white">Security PIN Lock</p>
                <p className="text-[11px] text-ink-faint">
                  {savedPin ? `PIN active (${savedPin.replace(/./g, "•")})` : "No PIN set (Default: 0000)"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPinModal(true)}
                  className="rounded-full bg-surface-2 border border-white/10 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-white"
                >
                  <KeyRound size={13} className="inline mr-1" />
                  {savedPin ? "Change PIN" : "Set 4-Digit PIN"}
                </button>
              </div>
            </div>

            {/* Lock App Immediately Button */}
            <div className="flex gap-2">
              <button
                onClick={lockApp}
                className="flex flex-1 items-center justify-center gap-2 rounded-full border border-white/10 bg-surface-low py-2.5 text-xs font-bold text-ink-soft hover:text-white hover:border-white/25 active:scale-98 transition"
              >
                <Lock size={14} /> Test Lock Screen Now
              </button>

              {/* Mask Balances */}
              <button
                onClick={() => setMaskBalances(!maskBalances)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                  maskBalances
                    ? "bg-primary text-[#003823]"
                    : "border border-white/10 bg-surface-low text-ink-soft"
                }`}
              >
                {maskBalances ? <EyeOff size={14} /> : <Eye size={14} />}
                {maskBalances ? "Balances Masked" : "Mask Balances"}
              </button>
            </div>
          </div>



          {/* Data Export & Backup */}
          <div className="space-y-2">
            <button
              onClick={exportCsv}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-low border border-white/5 py-3 text-sm font-semibold text-ink hover:text-white transition"
            >
              <Download size={15} /> Export All Ledger Data (CSV)
            </button>
          </div>
        </section>
      )}

      {/* PIN Setup Modal */}
      {showPinModal && (
        <PINSetupModal
          currentPin={savedPin}
          onSave={(newPin) => {
            setSavedPin(newPin);
            setShowPinModal(false);
          }}
          onClose={() => setShowPinModal(false)}
        />
      )}


    </AppShell>
  );

  function CategoriesTab() {
    const [type, setType] = useState<"expense" | "income">("expense");
    const [newName, setNewName] = useState("");
    const [subFor, setSubFor] = useState<string | null>(null);
    const [subName, setSubName] = useState("");
    const [renaming, setRenaming] = useState<string | null>(null);
    const [draft, setDraft] = useState("");
    const cats = categories.filter((c) => c.type === type);

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-surface-low p-1">
          {(["expense", "income"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={`rounded-full py-1.5 text-xs font-semibold capitalize ${
                type === k ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"
              }`}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={`New ${type} category`}
            className="flex-1 rounded-full border border-white/10 bg-card px-4 py-2 text-sm text-ink"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) {
                addCategory(newName.trim(), type);
                setNewName("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newName.trim()) {
                addCategory(newName.trim(), type);
                setNewName("");
              }
            }}
            className="rounded-full bg-primary px-4 text-[#003823] font-bold"
          >
            <Plus size={16} />
          </button>
        </div>
        {cats.map((c) => (
          <div key={c._id} className="rounded-2xl border border-white/5 bg-card p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary-bright">
                <CatIcon name={c.icon} categoryName={c.name} size={16} />
              </span>
              {renaming === c._id ? (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => {
                    const v = draft.trim();
                    if (v && v !== c.name) updateCategory(c._id, { name: v });
                    setRenaming(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                    if (e.key === "Escape") setRenaming(null);
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-white/10 bg-surface-low px-1 py-0.5 text-sm font-semibold outline-none text-ink"
                />
              ) : (
                <button
                  onClick={() => {
                    setRenaming(c._id);
                    setDraft(c.name);
                  }}
                  aria-label={`Rename ${c.name}`}
                  className="min-w-0 flex-1 truncate rounded-lg px-1 py-0.5 text-left text-sm font-semibold hover:text-primary-bright text-white"
                >
                  {c.name}
                </button>
              )}
              <button
                onClick={() => deleteCategory(c._id)}
                className="text-ink-faint hover:text-tertiary-deep p-1"
                aria-label="Delete category"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {c.subcategories.map((s, i) => (
                <span
                  key={s.name + i}
                  className="flex items-center gap-1 rounded-full bg-surface-low px-2.5 py-1 text-xs text-ink-soft"
                >
                  <CatIcon name={s.icon} categoryName={s.name} size={12} />
                  {s.name}
                  <button
                    onClick={() => deleteSub(c._id, i)}
                    className="text-ink-faint hover:text-tertiary-deep"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                onClick={() => setSubFor(subFor === c._id ? null : c._id)}
                className="flex items-center gap-0.5 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-xs text-ink-faint hover:text-white"
              >
                <Plus size={10} /> sub
              </button>
            </div>
            {subFor === c._id && (
              <div className="mt-2 flex gap-2">
                <input
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder="Subcategory name"
                  autoFocus
                  className="flex-1 rounded-full border border-white/10 bg-surface-low px-3 py-1.5 text-xs text-ink"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && subName.trim()) {
                      addSub(c._id, subName.trim());
                      setSubName("");
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (subName.trim()) {
                      addSub(c._id, subName.trim());
                      setSubName("");
                    }
                  }}
                  className="rounded-full bg-primary px-3 text-xs font-bold text-[#003823]"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  function AccountsTab() {
    const [name, setName] = useState("");
    const [bank, setBank] = useState("");
    const [type, setType] = useState<"savings" | "wallet" | "investment">("savings");
    const [opening, setOpening] = useState("");
    const [editId, setEditId] = useState<string | null>(null);

    const balanceOf = (accountId: string, openingBalance: number) => {
      let flow = 0;
      for (const t of transactions) {
        if (t.accountId === accountId) flow += t.kind === "income" ? t.amount : -t.amount;
        if (t.toAccountId === accountId) flow += t.amount;
      }
      return openingBalance + flow;
    };

    const netTotal = accounts.reduce((s, a) => s + balanceOf(a._id, a.openingBalance), 0);
    const byType = { savings: 0, wallet: 0, investment: 0 } as Record<string, number>;
    for (const a of accounts) byType[a.type] += balanceOf(a._id, a.openingBalance);

    return (
      <div className="space-y-3">
        <section className="rounded-2xl border border-white/5 bg-card p-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 rounded-xl bg-primary/15 p-3 text-center">
              <p className="text-xs text-primary-bright font-semibold">Total across all accounts</p>
              <p className="text-2xl font-extrabold tabular text-white">
                {maskBalances ? "₹••••••" : fmtMoney(netTotal)}
              </p>
            </div>
            {(Object.keys(byType) as Array<keyof typeof byType>).map((t) => (
              <div key={t} className="rounded-xl bg-surface-low p-2.5 text-center">
                <p className="text-[11px] capitalize text-ink-faint">{t}</p>
                <p className="text-sm font-semibold tabular text-white">
                  {maskBalances ? "₹••••" : fmtMoney(byType[t], { compact: true })}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
          <h3 className="text-sm font-bold text-white">Add account</h3>
          <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
            {(["savings", "wallet", "investment"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-full py-1.5 text-xs font-semibold capitalize ${
                  type === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Account name (e.g. HDFC Salary)"
            className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
          />
          {type === "savings" && (
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Bank name"
              className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
            />
          )}
          <input
            type="number"
            inputMode="decimal"
            value={opening}
            onChange={(e) => setOpening(e.target.value)}
            placeholder="Opening balance"
            className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
          />
          <button
            onClick={() => {
              if (!name.trim()) return;
              addAccount({
                name: name.trim(),
                type,
                bankName: bank.trim() || undefined,
                openingBalance: parseFloat(opening) || 0,
              });
              setName("");
              setBank("");
              setOpening("");
            }}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823]"
          >
            <Plus size={15} /> Add account
          </button>
        </div>

        {accounts.map((a) => (
          <AccountRow
            key={a._id}
            a={a}
            balance={balanceOf(a._id, a.openingBalance)}
            editing={editId === a._id}
            onStartEdit={() => setEditId(editId === a._id ? null : a._id)}
            onCancel={() => setEditId(null)}
            onSave={async (patch) => {
              await updateAccount(a._id, patch);
              setEditId(null);
            }}
            onDelete={() => deleteAccount(a._id)}
            masked={maskBalances}
          />
        ))}
      </div>
    );
  }
}

function AccountRow({
  a,
  balance,
  editing,
  onStartEdit,
  onCancel,
  onSave,
  onDelete,
  masked,
}: {
  a: { _id: string; name: string; type: "savings" | "wallet" | "investment"; bankName?: string; openingBalance: number };
  balance: number;
  editing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: (patch: any) => Promise<void>;
  onDelete: () => void;
  masked?: boolean;
}) {
  const [name, setName] = useState(a.name);
  const [bank, setBank] = useState(a.bankName ?? "");
  const [type, setType] = useState<"savings" | "wallet" | "investment">(a.type);
  const [opening, setOpening] = useState(String(a.openingBalance));
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <div className="space-y-2 rounded-2xl border border-white/5 bg-card p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Edit account</h4>
        <div className="grid grid-cols-3 gap-1 rounded-full bg-surface-low p-1">
          {(["savings", "wallet", "investment"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full py-1.5 text-xs font-semibold capitalize ${
                type === t ? "bg-card-high text-primary shadow-sm" : "text-ink-faint"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Account name"
          className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
        />
        {type === "savings" && (
          <input
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            placeholder="Bank name"
            className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
          />
        )}
        <input
          type="number"
          inputMode="decimal"
          value={opening}
          onChange={(e) => setOpening(e.target.value)}
          placeholder="Opening balance"
          className="w-full rounded-xl border border-white/10 bg-surface-low px-3 py-2 text-sm text-ink"
        />
        <div className="flex gap-2">
          <button
            onClick={async () => {
              if (!name.trim()) return;
              setSaving(true);
              try {
                await onSave({
                  name: name.trim(),
                  type,
                  bankName: bank.trim() || undefined,
                  openingBalance: parseFloat(opening) || 0,
                });
              } finally {
                setSaving(false);
              }
            }}
            disabled={!name.trim() || saving}
            className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-[#003823] disabled:opacity-40"
          >
            Save changes
          </button>
          <button
            onClick={onCancel}
            className="rounded-full border border-white/10 px-4 py-2.5 text-sm font-semibold text-ink-soft"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary-bright">
        <Building2 size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{a.name}</p>
        <p className="text-xs text-ink-faint">
          {a.bankName ? `${a.bankName} · ` : ""}
          {a.type} · opening {fmtMoney(a.openingBalance)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular text-white">
          {masked ? "₹••••" : fmtMoney(balance)}
        </p>
      </div>
      <button onClick={onStartEdit} className="text-ink-faint hover:text-primary p-1" aria-label="Edit account">
        <Pencil size={15} />
      </button>
      <button onClick={onDelete} className="text-ink-faint hover:text-tertiary-deep p-1" aria-label="Delete account">
        <X size={15} />
      </button>
    </div>
  );
}

function PINSetupModal({
  currentPin,
  onSave,
  onClose,
}: {
  currentPin: string | null;
  onSave: (pin: string | null) => void;
  onClose: () => void;
}) {
  const [pinVal, setPinVal] = useState("");
  const [confirmVal, setConfirmVal] = useState("");
  const [step, setStep] = useState<"enter" | "confirm">("enter");
  const [errorMsg, setErrorMsg] = useState("");

  const handleNext = () => {
    if (pinVal.length !== 4) {
      setErrorMsg("PIN must be 4 digits");
      return;
    }
    setStep("confirm");
    setErrorMsg("");
  };

  const handleFinalSave = () => {
    if (confirmVal !== pinVal) {
      setErrorMsg("PINs do not match. Try again.");
      setConfirmVal("");
      return;
    }
    onSave(pinVal);
  };

  const handleDisable = () => {
    onSave(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade">
      <div className="w-full max-w-xs rounded-3xl border border-white/10 bg-surface-low p-6 shadow-2xl text-ink space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-1.5">
            <Lock size={16} className="text-primary" /> Setup Security PIN
          </h3>
          <button onClick={onClose} className="text-ink-faint p-1">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-ink-faint">
          {step === "enter"
            ? "Enter a 4-digit PIN to secure BalFin on every launch:"
            : "Re-enter your 4-digit PIN to confirm:"}
        </p>

        <div className="flex justify-center gap-2">
          <input
            type="password"
            maxLength={4}
            value={step === "enter" ? pinVal : confirmVal}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 4);
              if (step === "enter") setPinVal(v);
              else setConfirmVal(v);
            }}
            placeholder="••••"
            className="w-36 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-primary/30 bg-surface-2 py-2 text-white font-bold"
          />
        </div>

        {errorMsg && <p className="text-xs text-error text-center font-medium">{errorMsg}</p>}

        <div className="flex gap-2 pt-2">
          {step === "enter" ? (
            <>
              {currentPin && (
                <button
                  onClick={handleDisable}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-tertiary"
                >
                  Remove PIN
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={pinVal.length !== 4}
                className="flex-1 rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823] disabled:opacity-40"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep("enter")}
                className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-ink-soft"
              >
                Back
              </button>
              <button
                onClick={handleFinalSave}
                disabled={confirmVal.length !== 4}
                className="flex-1 rounded-full bg-primary py-2.5 text-xs font-bold text-[#003823] disabled:opacity-40"
              >
                Confirm &amp; Save
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
