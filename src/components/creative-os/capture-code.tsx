"use client";

import { useActionState, useState } from "react";

import { makeCaptureCode, revokeCaptureCode, type CodeState } from "@/actions/creative-os-research";

/**
 * Makes or revokes the Chrome extension's connection code. A new code is
 * shown once, here, with a copy button; only its hash is stored.
 */
export function CaptureCode({ connected, createdAt, usedAt }: { connected: boolean; createdAt: string | null; usedAt: string | null }) {
  const [made, make, making] = useActionState<CodeState, FormData>(makeCaptureCode, {});
  const [revoked, revoke, revoking] = useActionState<CodeState, FormData>(revokeCaptureCode, {});
  const [copied, setCopied] = useState(false);
  const active = (connected && !revoked.revoked) || Boolean(made.code);

  return (
    <div className="grid gap-3 text-sm">
      <p className={active ? "font-semibold text-[#0e700e]" : "font-semibold text-muted"}>
        {active ? "Connected" : "Not connected"}
        {active && createdAt && !made.code ? <span className="ml-2 font-normal text-faint">code made {createdAt}{usedAt ? `, last used ${usedAt}` : ", not used yet"}</span> : null}
      </p>

      {made.code ? (
        <div className="grid gap-2 rounded-[6px] border border-[#9fd89f] bg-[#f1faf1] p-3">
          <p className="font-semibold">Your connection code. Copy it now: it is shown only once.</p>
          <div className="flex gap-2">
            <input readOnly value={made.code} onFocus={(event) => event.currentTarget.select()} className="field font-mono text-xs" aria-label="Connection code" />
            <button
              type="button"
              className="btn btn-secondary shrink-0"
              onClick={() => {
                void navigator.clipboard.writeText(made.code!).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-muted">Paste it into the extension: click its icon in Chrome, then paste it under Connection code.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form action={make}>
          <button type="submit" className="btn btn-primary" disabled={making}>
            {active ? "Make a new code" : "Make a connection code"}
          </button>
        </form>
        {active ? (
          <form action={revoke}>
            <button type="submit" className="btn btn-secondary hover:!border-danger hover:!text-danger" disabled={revoking}>
              Disconnect
            </button>
          </form>
        ) : null}
      </div>
      {active ? <p className="text-xs text-faint">A new code replaces the old one; Disconnect stops the extension from saving until you make a new one.</p> : null}
    </div>
  );
}
