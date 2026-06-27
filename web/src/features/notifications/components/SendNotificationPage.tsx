"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Send,
  Users,
  User,
  Truck,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Smile,
  AlertTriangle,
  History,
  Wifi,
  BatteryFull,
  Signal,
  Bookmark,
  BookmarkPlus,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  notificationsApi,
  ApiError,
  type NotificationAudience,
  type NotificationTemplate,
} from "@/lib/api";
import { Button, Card, Input, Textarea, Modal, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";

const TITLE_MAX = 100;
const BODY_MAX = 240;

const AUDIENCES: {
  value: NotificationAudience;
  label: string;
  icon: typeof Users;
  hint: string;
}[] = [
  { value: "all", label: "Everyone", icon: Users, hint: "All app users with notifications on" },
  { value: "customers", label: "Customers", icon: User, hint: "Customer accounts only" },
  { value: "riders", label: "Riders", icon: Truck, hint: "Delivery staff only" },
  { value: "admins", label: "Admins", icon: ShieldCheck, hint: "Admin & staff accounts only" },
];

const audienceLabel = (value: NotificationAudience) =>
  AUDIENCES.find((a) => a.value === value)?.label ?? value;

/** One-tap starter presets (not persisted). */
const STARTERS: {
  label: string;
  emoji: string;
  title: string;
  body: string;
  audience: NotificationAudience;
}[] = [
  {
    label: "Promo",
    emoji: "💧",
    title: "Special Offer 💧",
    body: "Today only — order your favourite water packs and enjoy a special discount. Tap to shop now!",
    audience: "customers",
  },
  {
    label: "Back in stock",
    emoji: "📦",
    title: "Back in stock 📦",
    body: "Good news! The item you were waiting for is available again. Order before it runs out.",
    audience: "customers",
  },
  {
    label: "Order update",
    emoji: "🚚",
    title: "Your order is on the way 🚚",
    body: "Our rider has picked up your order and will reach you shortly. Thanks for choosing Century Sip!",
    audience: "customers",
  },
  {
    label: "Rider notice",
    emoji: "📋",
    title: "New deliveries assigned 📋",
    body: "You have new deliveries waiting. Open the app to view your route for today.",
    audience: "riders",
  },
];

const EMOJIS = ["💧", "🚚", "📦", "🎉", "🔥", "⭐", "🙏", "💙", "⏰", "✅"];

interface SentItem {
  id: number;
  title: string;
  audience: NotificationAudience;
  sent: number;
  total: number;
  at: string;
}

interface TemplateDraft {
  open: boolean;
  editing: NotificationTemplate | null;
  name: string;
  title: string;
  body: string;
  audience: NotificationAudience;
  saving: boolean;
}

const emptyDraft = (): TemplateDraft => ({
  open: false,
  editing: null,
  name: "",
  title: "",
  body: "",
  audience: "all",
  saving: false,
});

export function SendNotificationPage() {
  const notify = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [history, setHistory] = useState<SentItem[]>([]);

  // saved templates (server CRUD)
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const audienceMeta = useMemo(
    () => AUDIENCES.find((a) => a.value === audience)!,
    [audience]
  );

  useEffect(() => {
    let active = true;
    notificationsApi
      .listTemplates()
      .then((list) => active && setTemplates(list))
      .catch(() => active && setTemplates([]))
      .finally(() => active && setTemplatesLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const applyStarter = (t: (typeof STARTERS)[number]) => {
    setTitle(t.title);
    setBody(t.body);
    setAudience(t.audience);
  };

  const useTemplate = (t: NotificationTemplate) => {
    setTitle(t.title);
    setBody(t.body);
    setAudience(t.recipient_type);
    notify(`Loaded "${t.name}".`);
  };

  const insertEmoji = (emoji: string) => {
    setTitle((prev) =>
      prev.length + emoji.length <= TITLE_MAX ? prev + emoji : prev
    );
  };

  const validate = () => {
    if (!title.trim() || !body.trim()) {
      notify("Title and message are required.", "error");
      return false;
    }
    return true;
  };

  const openConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) setConfirmOpen(true);
  };

  const send = async () => {
    setSending(true);
    try {
      const res = await notificationsApi.send({
        title: title.trim(),
        body: body.trim(),
        recipient_type: audience,
      });
      setHistory((prev) => [
        {
          id: Date.now(),
          title: title.trim(),
          audience,
          sent: res.sent,
          total: res.total_tokens,
          at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...prev,
      ]);
      notify(`Sent to ${res.sent} device${res.sent === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
      setConfirmOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send.", "error");
    } finally {
      setSending(false);
    }
  };

  // ── template CRUD ──────────────────────────────────────────────────────────

  const openSaveCurrent = () => {
    setDraft({
      open: true,
      editing: null,
      name: "",
      title: title.trim(),
      body: body.trim(),
      audience,
      saving: false,
    });
  };

  const openEdit = (t: NotificationTemplate) => {
    setDraft({
      open: true,
      editing: t,
      name: t.name,
      title: t.title,
      body: t.body,
      audience: t.recipient_type,
      saving: false,
    });
  };

  const closeDraft = () => {
    if (!draft.saving) setDraft(emptyDraft());
  };

  const saveDraft = async () => {
    const payload = {
      name: draft.name.trim(),
      title: draft.title.trim(),
      body: draft.body.trim(),
      recipient_type: draft.audience,
    };
    if (!payload.name || !payload.title || !payload.body) {
      notify("Name, title and message are all required.", "error");
      return;
    }
    setDraft((d) => ({ ...d, saving: true }));
    try {
      if (draft.editing) {
        const updated = await notificationsApi.updateTemplate(draft.editing.id, payload);
        setTemplates((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        notify("Template updated.");
      } else {
        const created = await notificationsApi.createTemplate(payload);
        setTemplates((prev) => [created, ...prev]);
        notify("Template saved.");
      }
      setDraft(emptyDraft());
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Could not save template.";
      notify(msg, "error");
      setDraft((d) => ({ ...d, saving: false }));
    }
  };

  const removeTemplate = async (t: NotificationTemplate) => {
    if (!window.confirm(`Delete template "${t.name}"?`)) return;
    setDeletingId(t.id);
    try {
      await notificationsApi.deleteTemplate(t.id);
      setTemplates((prev) => prev.filter((x) => x.id !== t.id));
      notify("Template deleted.");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not delete.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-mist">
          <Bell size={22} className="text-wave" />
          Send Notification
        </h1>
        <p className="mt-0.5 text-sm text-mist/50">
          Push a message straight to your users&apos; phones.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* ── Form ── */}
        <Card className="p-6">
          <form onSubmit={openConfirm} className="flex flex-col gap-5">
            {/* Starters */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Sparkles size={13} className="text-wave" />
                Quick starters
              </label>
              <div className="flex flex-wrap gap-2">
                {STARTERS.map((t) => (
                  <button
                    key={t.label}
                    type="button"
                    onClick={() => applyStarter(t)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-mist/70 transition hover:border-wave/40 hover:bg-wave/10 hover:text-wave"
                  >
                    <span>{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audience */}
            <div>
              <label className="label">Audience</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AUDIENCES.map(({ value, label, icon: Icon, hint }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAudience(value)}
                    title={hint}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-sm transition",
                      audience === value
                        ? "border-wave/50 bg-wave/10 text-wave"
                        : "border-white/10 bg-white/5 text-mist/60 hover:bg-white/10"
                    )}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-mist/40">{audienceMeta.hint}</p>
            </div>

            {/* Title */}
            <div>
              <div className="flex items-end justify-between">
                <span className="label mb-0">Title</span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    title.length > TITLE_MAX * 0.9 ? "text-amber-300" : "text-mist/40"
                  )}
                >
                  {title.length}/{TITLE_MAX}
                </span>
              </div>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Special Offer 💧"
                maxLength={TITLE_MAX}
              />
              <div className="mt-2 flex items-center gap-1.5">
                <Smile size={13} className="text-mist/40" />
                <div className="flex flex-wrap gap-1">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => insertEmoji(emoji)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-sm transition hover:bg-white/10"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Message */}
            <div>
              <div className="flex items-end justify-between">
                <span className="label mb-0">Message</span>
                <span
                  className={cn(
                    "text-[11px] tabular-nums",
                    body.length > BODY_MAX * 0.9 ? "text-amber-300" : "text-mist/40"
                  )}
                >
                  {body.length}/{BODY_MAX}
                </span>
              </div>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="What do you want to tell your users?"
                maxLength={BODY_MAX}
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" fullWidth>
                <Send size={16} /> Review &amp; send
              </Button>
              <Button
                type="button"
                variant="ghost"
                fullWidth
                onClick={openSaveCurrent}
              >
                <BookmarkPlus size={16} /> Save as template
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4">
          <div>
            <label className="label">Preview</label>
            <PhonePreview title={title} body={body} />
            <p className="mt-2 text-xs text-mist/40">
              Only users who installed the app and enabled notifications will
              receive it.
            </p>
          </div>

          {/* Session history */}
          {history.length > 0 && (
            <div>
              <label className="label flex items-center gap-1.5">
                <History size={13} />
                Sent this session
              </label>
              <div className="flex flex-col gap-2">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-mist">
                        {h.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-mist/40">
                        {h.at}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-300">
                      <CheckCircle2 size={12} />
                      {h.sent}/{h.total} ·{" "}
                      <span className="text-mist/50">
                        {audienceLabel(h.audience)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Saved templates (CRUD) ── */}
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-mist">
            <Bookmark size={16} className="text-wave" />
            Saved templates
          </h2>
          <Button
            variant="ghost"
            onClick={() => setDraft({ ...emptyDraft(), open: true })}
            className="!px-3 !py-1.5 text-xs"
          >
            <BookmarkPlus size={14} /> New template
          </Button>
        </div>

        {templatesLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-mist/40">
            <Loader2 size={16} className="animate-spin" /> Loading templates…
          </div>
        ) : templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-mist/40">
            No saved templates yet. Build a message above and hit{" "}
            <span className="text-mist/60">Save as template</span>.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-mist">
                    {t.name}
                  </p>
                  <span className="shrink-0 rounded-full bg-wave/15 px-2 py-0.5 text-[10px] font-medium text-wave">
                    {audienceLabel(t.recipient_type)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs font-medium text-mist/70">
                  {t.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-mist/45">
                  {t.body}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => useTemplate(t)}
                    className="flex-1 rounded-lg border border-wave/40 bg-wave/10 px-2.5 py-1.5 text-xs font-medium text-wave transition hover:bg-wave/20"
                  >
                    Use
                  </button>
                  <button
                    onClick={() => openEdit(t)}
                    title="Edit"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-mist/50 transition hover:bg-white/10 hover:text-mist"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => removeTemplate(t)}
                    title="Delete"
                    disabled={deletingId === t.id}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-mist/50 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    {deletingId === t.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Send confirmation modal ── */}
      <Modal
        open={confirmOpen}
        onClose={() => !sending && setConfirmOpen(false)}
        title="Send this notification?"
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
            <audienceMeta.icon size={18} className="text-wave" />
            <span className="text-mist">
              Sending to <span className="font-semibold">{audienceMeta.label}</span>
            </span>
          </div>

          <PhonePreview title={title} body={body} compact />

          {audience === "all" && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              This reaches <strong>every</strong> registered device. Make sure the
              message is correct — it can&apos;t be unsent.
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setConfirmOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button fullWidth loading={sending} onClick={send}>
              <Send size={16} /> Send now
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Template create/edit modal ── */}
      <Modal
        open={draft.open}
        onClose={closeDraft}
        title={draft.editing ? "Edit template" : "New template"}
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <Input
            label="Template name"
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="e.g. Weekend promo"
            maxLength={120}
          />

          <div>
            <label className="label">Default audience</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {AUDIENCES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, audience: value }))}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition",
                    draft.audience === value
                      ? "border-wave/50 bg-wave/10 text-wave"
                      : "border-white/10 bg-white/5 text-mist/60 hover:bg-white/10"
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Title"
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Notification title"
            maxLength={TITLE_MAX}
          />

          <Textarea
            label="Message"
            value={draft.body}
            onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
            rows={4}
            placeholder="Notification message"
            maxLength={BODY_MAX}
          />

          <div className="flex gap-3">
            <Button
              variant="ghost"
              fullWidth
              onClick={closeDraft}
              disabled={draft.saving}
            >
              Cancel
            </Button>
            <Button fullWidth loading={draft.saving} onClick={saveDraft}>
              <Bookmark size={16} /> {draft.editing ? "Save changes" : "Save template"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** Android-style notification shade preview. */
function PhonePreview({
  title,
  body,
  compact = false,
}: {
  title: string;
  body: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-[#0b1322] to-[#070c16] p-3 shadow-xl",
        !compact && "shadow-glow"
      )}
    >
      {/* status bar */}
      <div className="flex items-center justify-between px-2 pb-2 pt-1 text-[10px] text-mist/50">
        <span className="font-medium">
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <div className="flex items-center gap-1">
          <Signal size={11} />
          <Wifi size={11} />
          <BatteryFull size={13} />
        </div>
      </div>

      {/* notification card */}
      <div className="rounded-2xl bg-white/95 p-3 text-abyss shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-wave-gradient">
            <Bell size={11} className="text-white" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-abyss/60">
            Century Sip
          </span>
          <span className="text-[10px] text-abyss/40">· now</span>
        </div>
        <p className="mt-1.5 text-sm font-bold leading-tight text-abyss">
          {title.trim() || "Notification title"}
        </p>
        <p
          className={cn(
            "mt-0.5 text-[13px] leading-snug text-abyss/70",
            compact ? "line-clamp-2" : "line-clamp-4"
          )}
        >
          {body.trim() || "Your message will appear here…"}
        </p>
      </div>
    </div>
  );
}
