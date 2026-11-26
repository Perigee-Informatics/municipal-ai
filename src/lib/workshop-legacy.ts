/**
 * The AI for ALL course pages (public/workshop/*) share a few plain scripts with the admin:
 * event facts and Nepali dates (event-info.js → window.EVI), QR codes (vendor/qrcode.js),
 * question banks with their set pickers (assessment/pool-*.js) and photo/video preparation
 * (media.js → window.EventMedia). The admin loads those same files instead of keeping a second
 * copy, so a change to, say, how a question set is picked applies everywhere at once.
 * Browser only.
 */

type EventLike = {
  code?: string | null;
  name?: string | null;
  organized_by?: string | null;
  address?: string | null;
  event_dates?: string[] | null;
  is_active?: boolean | null;
};

export type EventInfo = {
  code: string;
  name: string;
  org: string;
  orgName: string;
  place: string;
  iso: string[];
  dateRange: string;
};

export type Prepared = { blob: Blob; width: number; height: number };

export type Evi = {
  COURSE_PAGE: Record<string, string>;
  LEVEL_LABEL: Record<string, string>;
  courseOf: (key: string | null | undefined) => "employee" | "representative" | "cso" | "hied";
  levelOf: (key: string | null | undefined) => string;
  isShort: (key: string | null | undefined) => boolean;
  hasAssessment: (key: string | null | undefined) => boolean;
  info: (ev: EventLike) => EventInfo | null;
  eventLink: (code: string, packageKey?: string | null) => string;
  qrSvg: (text: string, cell?: number) => string;
  qrPng: (text: string, lines?: string[]) => string;
  dn: (s: string | number) => string;
};

type EventMedia = {
  preparePhoto: (file: File) => Promise<{ full: Prepared; thumb: Prepared }>;
  prepareVideo: (file: File) => Promise<{ width: number; height: number; thumb: Prepared | null }>;
  resize: (file: File, side: number, quality: number) => Promise<Prepared>;
  MAX_SIDE: number;
  MAX_VIDEO_SECONDS: number;
};

type Pickers = { pickEventSet: () => number[]; pickRepresentativeSet: () => number[]; pickCsoSet: () => number[] };

type W = Window & { EVI?: Evi; EventMedia?: EventMedia; qrcode?: unknown } & Partial<Pickers>;

const SCRIPTS = [
  "/workshop/vendor/qrcode.js?v=1.4.4",
  "/workshop/event-info.js?v=20261126a",
  "/workshop/media.js?v=20261114b",
  "/workshop/assessment/pool-employee.js?v=k2",
  "/workshop/assessment/pool-representative.js?v=k2",
  "/workshop/assessment/pool-cso.js?v=k1",
];

function load(src: string) {
  return new Promise<void>((resolve, reject) => {
    const path = src.split("?")[0];
    if (document.querySelector(`script[data-ws="${path}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false; // keep order: event-info needs qrcode at call time only, pools are independent
    s.dataset["ws"] = path;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Could not load ${path}`));
    document.head.appendChild(s);
  });
}

let ready: Promise<{ EVI: Evi; EventMedia: EventMedia; pick: (course: string) => number[] }> | null = null;

export function workshop() {
  if (!ready)
    ready = Promise.all(SCRIPTS.map(load)).then(() => {
      const w = window as W;
      if (!w.EVI || !w.EventMedia) throw new Error("Workshop scripts did not load");
      const pick = (course: string) =>
        course === "representative" ? w.pickRepresentativeSet!() : course === "cso" ? w.pickCsoSet!() : w.pickEventSet!();
      return { EVI: w.EVI, EventMedia: w.EventMedia, pick };
    });
  ready.catch(() => (ready = null)); // allow a retry after a network hiccup
  return ready;
}
