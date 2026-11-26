"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { inputClass } from "@/components/admin/ui";
import { KNOWLEDGE_KIND_LABEL } from "@/lib/creative-os/labels";

/*
 * File uploads post to CreativeOS's own routes (server actions cap bodies at
 * 1 MB; the routes take up to 4 MB, inside Vercel's 4.5 MB limit). Text is
 * extracted on the server with local libraries: no AI, no cost.
 */

async function post(url: string, data: FormData) {
  const response = await fetch(url, { method: "POST", body: data });
  const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; chars?: number; added?: number };
  return { ok: Boolean(result.ok), error: result.error ?? `Upload failed (${response.status}).`, result };
}

export function KnowledgeUpload({ projectId, products }: { projectId: number; products: { id: number; name: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("projectId", String(projectId));
    setBusy(true);
    setMessage(null);
    const { ok, error, result } = await post("/admin/creative-os/api/knowledge-upload", data);
    setBusy(false);
    setMessage(ok ? { ok, text: `Added: ${result.chars?.toLocaleString("en-US")} characters of text.` } : { ok, text: error });
    if (ok) {
      form.reset();
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid content-start gap-1">
          <span className="text-sm font-semibold">File</span>
          <input
            name="file"
            type="file"
            required
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,application/pdf,text/plain,text/markdown"
            className="text-sm file:mr-3 file:rounded-[4px] file:border file:border-line-strong file:bg-background file:px-3 file:py-1 file:text-sm"
          />
          <span className="text-xs text-faint">PDF, Word (.docx), text or Markdown, under 4 MB. Only the text is kept.</span>
        </label>
        <KindAndTitle products={products} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Reading the file…" : "Upload"}
        </button>
        {message ? (
          <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-[#107c10]" : "text-sm text-danger"}>
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** The type, title and product pickers shared by the three ways of adding knowledge. */
export function KindAndTitle({ products }: { products: { id: number; name: string }[] }) {
  return (
    <div className="grid content-start gap-4">
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Type</span>
        <select name="kind" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Choose…
          </option>
          {Object.entries(KNOWLEDGE_KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-sm font-semibold">Title</span>
        <input name="title" className={inputClass} placeholder="Optional for pages and files" />
      </label>
      {products.length > 0 ? (
        <label className="grid gap-1">
          <span className="text-sm font-semibold">Product</span>
          <select name="productId" defaultValue="" className={inputClass}>
            <option value="">Whole project</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

export function AdImagesUpload({ adId, remaining }: { adId: number; remaining: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("adId", String(adId));
    setBusy(true);
    setMessage(null);
    const { ok, error } = await post("/admin/creative-os/api/ad-images", data);
    setBusy(false);
    setMessage(ok ? { ok, text: "Added." } : { ok, text: error });
    if (ok) {
      form.reset();
      router.refresh();
    }
  }

  if (remaining <= 0) return <p className="text-xs text-faint">Four screenshots is the most an ad can hold.</p>;

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
      <input
        name="files"
        type="file"
        multiple
        required
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="text-sm file:mr-3 file:rounded-[4px] file:border file:border-line-strong file:bg-background file:px-3 file:py-1 file:text-sm"
      />
      <button type="submit" className="btn btn-secondary" disabled={busy}>
        {busy ? "Uploading…" : "Add screenshots"}
      </button>
      <span className="text-xs text-faint">Up to {remaining} more, 1.5 MB each.</span>
      {message ? (
        <p role={message.ok ? "status" : "alert"} className={message.ok ? "text-sm text-[#107c10]" : "text-sm text-danger"}>
          {message.text}
        </p>
      ) : null}
    </form>
  );
}
