"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Copy, Download, Paperclip, Plus, Printer, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  buildSummary,
  CATEGORIES,
  checklistFor,
  emptyCase,
  isCategory,
  nowLocal,
  sortedEntries,
  type EvidenceCase,
  type EvidenceEntry,
} from "@/lib/evidence/model";
import { clearAll, deleteFile, getFile, loadCase, MAX_FILES, MAX_FILE_BYTES, putFile, saveCase, uid } from "@/lib/evidence/store";

const field = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm";
const area = "min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
const label = "mb-1 block text-xs font-medium text-muted";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function Attachment({ entry }: { entry: EvidenceEntry }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    let made: string | null = null;
    if (entry.file) {
      getFile(entry.id)
        .then((blob) => {
          if (blob && !dead) {
            made = URL.createObjectURL(blob);
            setUrl(made);
          }
        })
        .catch(() => undefined);
    }
    return () => {
      dead = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [entry.id, entry.file]);

  if (!entry.file) return null;
  const isImage = entry.file.type.startsWith("image/");
  return (
    <div className="mt-2 text-xs text-muted">
      {isImage && url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Attachment: ${entry.file.name}`} className="mb-2 max-h-40 rounded-lg border border-border" />
      )}
      <span className="inline-flex items-center gap-1">
        <Paperclip className="h-3 w-3" aria-hidden="true" />
        {entry.file.name}
      </span>
      {url && (
        <a href={url} download={entry.file.name} className="ml-2 text-primary underline">
          Download
        </a>
      )}
    </div>
  );
}

export function EvidenceOrganizer() {
  const params = useSearchParams();
  const wanted = params.get("category");
  const [c, setC] = useState<EvidenceCase>(emptyCase());
  const [ready, setReady] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // new entry form
  const [title, setTitle] = useState("");
  const [at, setAt] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    const loaded = loadCase();
    // A link from Mewvi or a guide can preselect the category, but never overwrites an existing case.
    if (wanted && isCategory(wanted) && loaded.entries.length === 0 && !loaded.summary) loaded.category = wanted;
    setC(loaded);
    setAt(nowLocal());
    setReady(true);
  }, [wanted]);

  function change(p: Partial<EvidenceCase>) {
    const next = { ...c, ...p };
    setC(next);
    setSaveFailed(!saveCase(next));
  }

  async function addEntry() {
    setErr("");
    if (!title.trim() && !text.trim() && !file) {
      setErr("Add a title, a note or a file first.");
      return;
    }
    const id = uid();
    let meta: EvidenceEntry["file"];
    if (file) {
      if (file.size > MAX_FILE_BYTES) return setErr("That file is over 10 MB. Try a smaller copy or a screenshot.");
      if (c.entries.filter((e) => e.file).length >= MAX_FILES) return setErr(`You can keep up to ${MAX_FILES} files here.`);
      try {
        await putFile(id, file);
        meta = { name: file.name, type: file.type, size: file.size };
      } catch {
        return setErr("This browser couldn't store that file (private mode or storage full).");
      }
    }
    change({ entries: [...c.entries, { id, at: at || nowLocal(), title: title.trim(), text: text.trim(), file: meta }] });
    setTitle("");
    setText("");
    setFile(null);
    setAt(nowLocal());
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeEntry(e: EvidenceEntry) {
    if (e.file) await deleteFile(e.id).catch(() => undefined);
    change({ entries: c.entries.filter((x) => x.id !== e.id) });
  }

  const summary = buildSummary(c);
  const checklist = checklistFor(c.category);

  function download() {
    const url = URL.createObjectURL(new Blob([summary], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "assured-incident-summary.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setNote("Couldn't copy automatically. Select the text in the preview and copy it.");
    }
  }
  function print() {
    const w = window.open("", "_blank");
    if (!w) return setNote("Your browser blocked the print window. Allow pop-ups for this site, or use Download.");
    w.document.write(`<!doctype html><title>Incident summary</title><pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap;padding:24px">${esc(summary)}</pre>`);
    w.document.close();
    w.focus();
    w.print();
  }
  async function wipe() {
    if (!window.confirm("Delete everything in the Evidence Organizer from this device? This can't be undone.")) return;
    await clearAll();
    setC(emptyCase());
    setNote("Everything was deleted from this device.");
  }

  if (!ready) return <p className="mx-auto max-w-2xl px-4 py-6 text-sm text-muted">Loading…</p>;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <div className="flex gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Everything here stays on <strong>this device</strong>, in this browser. ASSURED doesn&apos;t upload it. Clearing your browser&apos;s site data deletes it, so download a copy you want to keep.
        </p>
      </div>
      {saveFailed && <p role="alert" className="text-sm text-emergency">This browser couldn&apos;t save your notes (private mode or storage full). Download a copy now.</p>}

      <Card className="space-y-3">
        <p className="font-medium">1. What happened</p>
        <div>
          <label className={label} htmlFor="ev-cat">Category</label>
          <select id="ev-cat" className={field} value={c.category} onChange={(e) => change({ category: e.target.value })}>
            {CATEGORIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ev-when">When did it start?</label>
            <input id="ev-when" type="datetime-local" className={field} value={c.incidentAt} onChange={(e) => change({ incidentAt: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="ev-where">Where (or which app/site)?</label>
            <input id="ev-where" className={field} maxLength={200} value={c.place} onChange={(e) => change({ place: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ev-people">People, accounts, numbers or IDs involved</label>
          <input id="ev-people" className={field} maxLength={300} value={c.people} onChange={(e) => change({ people: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor="ev-sum">Describe what happened, in your own words</label>
          <textarea id="ev-sum" className={area} maxLength={3000} value={c.summary} onChange={(e) => change({ summary: e.target.value })} />
        </div>
      </Card>

      <Card className="space-y-3">
        <p className="font-medium">2. Add to the timeline</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="ev-title">Title</label>
            <input id="ev-title" className={field} maxLength={120} placeholder="e.g. Threatening message received" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label} htmlFor="ev-at">Date and time</label>
            <input id="ev-at" type="datetime-local" className={field} value={at} onChange={(e) => setAt(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="ev-text">Note</label>
          <textarea id="ev-text" className={area} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="ev-file">Screenshot, image or document (optional, up to 10 MB)</label>
          <input id="ev-file" ref={fileRef} type="file" accept="image/*,application/pdf,.doc,.docx,.txt" className="block w-full text-sm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        {err && <p role="alert" className="text-sm text-emergency">{err}</p>}
        <Button onClick={addEntry}><Plus className="h-4 w-4" aria-hidden="true" />Add to timeline</Button>
      </Card>

      <Card>
        <p className="font-medium">Timeline</p>
        {c.entries.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing yet. Entries you add appear here in date order.</p>
        ) : (
          <ol className="mt-3 space-y-3">
            {sortedEntries(c).map((e) => (
              <li key={e.id} className="rounded-xl border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted">{e.at.replace("T", " ")}</p>
                    <p className="text-sm font-medium">{e.title || "Untitled entry"}</p>
                  </div>
                  <button onClick={() => removeEntry(e)} aria-label={`Delete entry ${e.title || "untitled"}`} className="rounded-lg p-2 text-muted hover:bg-surface-2">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {e.text && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{e.text}</p>}
                <Attachment entry={e} />
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <p className="font-medium">Evidence checklist</p>
        <p className="mt-1 text-xs text-muted">Taken from ASSURED&apos;s reporting guides for this category. Tick what you have.</p>
        <ul className="mt-3 space-y-2">
          {checklist.map((item) => {
            const on = c.checked.includes(item);
            return (
              <li key={item}>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input type="checkbox" className="mt-1 h-4 w-4" checked={on} onChange={() => change({ checked: on ? c.checked.filter((x) => x !== item) : [...c.checked, item] })} />
                  <span>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="space-y-3">
        <p className="font-medium">3. Your summary</p>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2/60 p-3 text-xs" aria-label="Summary preview">{summary}</pre>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={download}><Download className="h-4 w-4" aria-hidden="true" />Download</Button>
          <Button size="sm" variant="secondary" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied ? "Copied" : "Copy"}</Button>
          <Button size="sm" variant="secondary" onClick={print}><Printer className="h-4 w-4" aria-hidden="true" />Print / Save as PDF</Button>
        </div>
        {note && <p role="status" className="text-xs text-muted">{note}</p>}
        <p className="text-xs text-muted">
          Attached files aren&apos;t inside the summary; they stay on this device and are listed by name. Share them yourself when you report. This helps you stay organised — it doesn&apos;t make anything legally admissible, and it isn&apos;t legal advice.
        </p>
        <p className="text-xs text-muted">Ready to report? <Link className="text-primary underline" href="/report">Choose a reporting guide</Link>. ASSURED never submits a report for you.</p>
      </Card>

      <div className="text-center">
        <button onClick={wipe} className="text-xs text-muted underline hover:text-foreground">Delete everything from this device</button>
      </div>
    </div>
  );
}
