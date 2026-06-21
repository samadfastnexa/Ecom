"use client";

import { useState } from "react";
import { Bell, Send, Users, User, Truck, CheckCircle2 } from "lucide-react";
import { notificationsApi, type NotificationAudience } from "@/lib/api";
import { Button, Card, Input, Textarea, useToast } from "@/components/ui";
import { cn } from "@/lib/cn";

const AUDIENCES: { value: NotificationAudience; label: string; icon: typeof Users; hint: string }[] = [
  { value: "all", label: "Everyone", icon: Users, hint: "All app users with notifications on" },
  { value: "customers", label: "Customers", icon: User, hint: "Customer accounts only" },
  { value: "riders", label: "Riders", icon: Truck, hint: "Delivery staff only" },
];

export function SendNotificationPage() {
  const notify = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<NotificationAudience>("all");
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<{ sent: number; total: number } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      notify("Title and message are required.", "error");
      return;
    }
    setSending(true);
    setLastResult(null);
    try {
      const res = await notificationsApi.send({
        title: title.trim(),
        body: body.trim(),
        recipient_type: audience,
      });
      setLastResult({ sent: res.sent, total: res.total_tokens });
      notify(`Sent to ${res.sent} device${res.sent === 1 ? "" : "s"}.`);
      setTitle("");
      setBody("");
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send.", "error");
    } finally {
      setSending(false);
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
          Push a message to your users&apos; phones.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Form */}
        <Card className="p-6">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <div>
              <label className="label">Audience</label>
              <div className="grid grid-cols-3 gap-2">
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
            </div>

            <Input
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Special Offer 💧"
              maxLength={100}
            />

            <Textarea
              label="Message"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="What do you want to tell your users?"
              maxLength={240}
            />

            <Button type="submit" loading={sending} fullWidth>
              <Send size={16} /> Send notification
            </Button>

            {lastResult && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-sm text-emerald-300">
                <CheckCircle2 size={16} />
                Delivered to {lastResult.sent} of {lastResult.total} registered device
                {lastResult.total === 1 ? "" : "s"}.
              </div>
            )}
          </form>
        </Card>

        {/* Live preview */}
        <div>
          <label className="label">Preview</label>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wave-gradient">
                <Bell size={16} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-mist">
                  {title.trim() || "Notification title"}
                </p>
                <p className="mt-0.5 text-sm text-mist/70 line-clamp-3">
                  {body.trim() || "Your message will appear here…"}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-mist/30">
                  Century Sip · now
                </p>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-mist/40">
            Only users who installed the app and enabled notifications will receive it.
          </p>
        </div>
      </div>
    </div>
  );
}
