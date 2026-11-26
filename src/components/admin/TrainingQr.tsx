import { useEffect, useState } from "react";
import { Copy, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { workshop } from "@/lib/workshop-legacy";
import { eventTitle, type TrainingEvent } from "@/lib/training-data";

export type QrKind = "link" | "pre" | "post";

/** Where a QR leads: the event's materials (sign in, then back to this event), or a test. */
export function qrTarget(ev: TrainingEvent, packageKey: string | null | undefined, kind: QrKind, eventLink: (c: string, k?: string | null) => string) {
  if (kind === "link") return eventLink(ev.code, packageKey);
  return `${location.origin}/workshop/assessment/index.html?e=${encodeURIComponent(ev.code)}&t=${kind}`;
}

const NOTE: Record<QrKind, (pub: boolean) => string> = {
  link: (pub) =>
    pub
      ? "Opens this event's materials. They are public, so anyone with the link can read them; signing in is only needed for the tests."
      : "Opens this event's materials. Someone not signed in first signs in or registers, then comes straight back to this event.",
  pre: () => "Opens the pre-training test of this event. The code holds only the event code and the test type, no personal data.",
  post: () => "Opens the post-training test of this event. The code holds only the event code and the test type, no personal data.",
};
const LABEL: Record<QrKind, string> = { link: "Event link", pre: "Pre-training test", post: "Post-training test" };

export function TrainingQr({
  ev,
  packageKey,
  kinds = ["link", "pre", "post"],
  initial = "link",
}: {
  ev: TrainingEvent;
  packageKey: string | null | undefined;
  kinds?: QrKind[];
  initial?: QrKind;
}) {
  const [kind, setKind] = useState<QrKind>(initial);
  const [qr, setQr] = useState<{ href: string; svg: string; png: string } | null>(null);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    workshop()
      .then(({ EVI }) => {
        const href = qrTarget(ev, packageKey, kind, EVI.eventLink);
        const lines = [eventTitle(ev), `${LABEL[kind]} · ${ev.code}`, href.replace(/^https?:\/\//, "")];
        if (alive) setQr({ href, svg: EVI.qrSvg(href, 6), png: EVI.qrPng(href, lines) });
      })
      .catch((e) => alive && setErr(String(e?.message ?? e)));
    return () => {
      alive = false;
    };
  }, [ev, packageKey, kind]);

  function print() {
    if (!qr) return;
    const w = window.open("", "_blank", "width=600,height=800");
    if (!w) return;
    w.document.write(`<title>${ev.code} ${LABEL[kind]} QR</title><img src="${qr.png}" style="width:100%;max-width:560px" onload="print()">`);
    w.document.close();
  }

  return (
    <div className="space-y-4">
      {kinds.length > 1 && (
        <div className="inline-flex rounded-lg border border-border p-0.5" role="group" aria-label="QR type">
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`rounded-md px-3 py-1.5 text-sm ${kind === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {LABEL[k]}
            </button>
          ))}
        </div>
      )}
      {err && <p className="text-sm text-destructive">QR could not be made: {err}</p>}
      {qr && (
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div
            className="shrink-0 rounded-lg border border-border bg-white p-3 [&_svg]:h-52 [&_svg]:w-52"
            // the SVG is produced by the QR library from our own URL
            dangerouslySetInnerHTML={{ __html: qr.svg }}
          />
          <div className="min-w-0 space-y-3 text-sm">
            <p className="text-muted-foreground">{NOTE[kind](!!ev.materials_public)}</p>
            <a href={qr.href} target="_blank" rel="noopener" className="block break-all text-primary underline-offset-2 hover:underline">
              {qr.href}
            </a>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <a href={qr.png} download={`${ev.code}-${kind}-qr.png`}>
                  <Download />
                  PNG
                </a>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(qr.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    prompt("Copy the link:", qr.href);
                  }
                }}
              >
                <Copy />
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button size="sm" variant="outline" onClick={print}>
                <Printer />
                Print
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
