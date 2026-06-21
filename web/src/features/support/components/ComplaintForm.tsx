"use client";

import { useState } from "react";
import { Send, MessageSquare } from "lucide-react";
import { complaintsApi } from "@/lib/api";
import { Button, Input, Textarea, MultiImagePicker, useToast } from "@/components/ui";

export function ComplaintForm({ onCreated }: { onCreated: () => void }) {
  const notify = useToast();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await complaintsApi.create({
        subject,
        description,
        images: images.length ? images : undefined,
      });
      setSubject("");
      setDescription("");
      setImages([]);
      notify("Your message has been sent.");
      onCreated();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Failed to send.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="glass-strong h-fit space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-mist">
        <MessageSquare size={18} className="text-wave" /> New Message
      </h2>
      <Input
        label="Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="What's this about?"
        required
      />
      <Textarea
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={5}
        placeholder="Tell us what happened…"
        required
      />
      <MultiImagePicker
        label="Attach photos (optional)"
        value={images}
        onChange={setImages}
        onError={(msg) => notify(msg, "error")}
      />
      <Button type="submit" loading={submitting} fullWidth>
        <Send size={16} /> Send message
      </Button>
    </form>
  );
}
