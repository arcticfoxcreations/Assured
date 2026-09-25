"use client";

import { useEffect, useState } from "react";
import { Copy, Link2, Mail, MessageCircle, MessageSquare, MoreHorizontal, Send, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { hasLink, mailLink, smsLink, telegramLink, whatsappLink, withLink } from "@/lib/travel/share";
import type { Contact } from "@/lib/travel/types";

const chip = "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-surface-2";

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", ""); t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(t);
    return ok;
  } catch { return false; }
}

/**
 * Editable message + every way to send it. ASSURED never sends anything:
 * each button opens the chosen app (or share sheet) with the text pre-filled,
 * and the person still has to press send there.
 */
export function ShareSheet({ template, link, contact, title, linkLabel = "Copy Link" }: {
  template: string; link: string; contact?: Contact | null; title: string; linkLabel?: string;
}) {
  const [text, setText] = useState(() => withLink(template, link));
  const [dirty, setDirty] = useState(false);
  const [more, setMore] = useState(false);
  const [note, setNote] = useState("");
  const [canShare, setCanShare] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
  }, []);
  // A fresh link replaces the message unless the person has edited it.
  useEffect(() => { if (!dirty) setText(withLink(template, link)); }, [template, link, dirty]);

  const phone = contact?.phone;
  const who = contact?.name ? ` · ${contact.name}` : "";

  async function nativeShare() {
    if (!canShare) { setMore(true); setNote("This browser has no share sheet — choose an option below instead."); return; }
    try { await navigator.share({ title, text }); setNote(""); }
    catch (e) { if ((e as Error).name !== "AbortError") { setMore(true); setNote("Sharing didn't open — choose an option below instead."); } }
  }
  async function copy(what: "link" | "message") {
    const ok = await copyText(what === "link" ? link : text);
    setNote(ok ? (what === "link" ? "Link copied." : "Message copied.") : "Couldn't copy automatically — select the text and copy it manually.");
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="share-msg">Message — edit it before sharing</label>
      <textarea id="share-msg" value={text} rows={5} maxLength={1000}
        onChange={(e) => { setText(e.target.value); setDirty(true); }}
        className="w-full rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed" />
      {!hasLink(text, link) && (
        <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">Your message no longer contains the location link, so the person won&apos;t be able to open it.</p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={nativeShare} className="col-span-2"><Share2 className="h-4 w-4" aria-hidden="true" />Share</Button>
        <a className={chip} href={whatsappLink(text, phone)} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" aria-hidden="true" />WhatsApp{who}</a>
        <a className={chip} href={smsLink(text, phone, ios)}><MessageSquare className="h-4 w-4" aria-hidden="true" />Messages{who}</a>
        <button type="button" className={chip} onClick={() => copy("link")}><Link2 className="h-4 w-4" aria-hidden="true" />{linkLabel}</button>
        <button type="button" className={chip} aria-expanded={more} onClick={() => setMore((m) => !m)}><MoreHorizontal className="h-4 w-4" aria-hidden="true" />More Apps</button>
      </div>
      {more && (
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2/60 p-2">
          <a className={chip} href={telegramLink(text, link)} target="_blank" rel="noopener noreferrer"><Send className="h-4 w-4" aria-hidden="true" />Telegram</a>
          <a className={chip} href={mailLink(title, text)}><Mail className="h-4 w-4" aria-hidden="true" />Email</a>
          <button type="button" className={chip} onClick={() => copy("message")}><Copy className="h-4 w-4" aria-hidden="true" />Copy text</button>
        </div>
      )}
      <p className="text-xs text-muted" aria-live="polite">
        {note || "Nothing is sent until you press send in the app you choose. ASSURED never sends this for you."}
      </p>
    </div>
  );
}
