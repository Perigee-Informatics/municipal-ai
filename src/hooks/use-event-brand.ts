import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/* Organiser (municipality) and place of the event a visitor belongs to, from the event record
 * (trainer console → इभेन्ट मास्टर). Mirrors public/workshop/event-info.js:
 *   1. ?event=CODE in the address (remembered on this device),
 *   2. the signed-in participant's own event,
 *   3. the active event (the trainer marks one; visitors get it via active_event_brand),
 *   4. a remembered code,
 *   5. for the trainer, the newest event.
 * Returns null while loading or when no event applies; pages then show the generic wording. */

export type EventBrand = { org: string; place: string };

const STORE_KEY = "ws-event";

export function normalizeOrg(raw: string | null | undefined): string {
  const org = (raw ?? "").trim();
  if (!org) return "";
  return /पालिका/.test(org) ? org : `${org} पालिका`;
}

function urlCode(): string {
  if (typeof window === "undefined") return "";
  const fromUrl = (new URLSearchParams(window.location.search).get("event") ?? "")
    .trim()
    .toUpperCase();
  if (fromUrl) {
    try {
      window.localStorage.setItem(STORE_KEY, fromUrl);
    } catch {
      /* storage blocked: the code still applies to this visit */
    }
  }
  return fromUrl;
}

function storedCode(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(STORE_KEY) ?? "";
  } catch {
    return "";
  }
}

type EventRow = { organized_by: string | null; address: string | null };

function toBrand(row: EventRow | null | undefined): EventBrand | null {
  const org = normalizeOrg(row?.organized_by);
  return org ? { org, place: (row?.address ?? "").trim() } : null;
}

export async function loadEventBrand(): Promise<EventBrand | null> {
  const code = urlCode();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;

  if (!user) {
    if (code) {
      const { data } = await supabase.rpc("public_event_brand", { p_code: code });
      const brand = toBrand(data?.[0]);
      if (brand) return brand;
    }
    const { data: active } = await supabase.rpc("active_event_brand");
    const activeBrand = toBrand(active?.[0]);
    if (activeBrand) return activeBrand;
    const stored = storedCode();
    if (!stored) return null;
    const { data } = await supabase.rpc("public_event_brand", { p_code: stored });
    return toBrand(data?.[0]);
  }

  if (code) {
    const { data } = await supabase
      .from("events")
      .select("organized_by, address")
      .eq("code", code)
      .maybeSingle();
    const brand = toBrand(data);
    if (brand) return brand;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("event_id, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.event_id) {
    const { data } = await supabase
      .from("events")
      .select("organized_by, address")
      .eq("id", profile.event_id)
      .maybeSingle();
    const brand = toBrand(data);
    if (brand) return brand;
  }

  const { data: activeRows } = await supabase
    .from("events")
    .select("organized_by, address")
    .eq("is_active", true)
    .limit(1);
  const activeBrand = toBrand(activeRows?.[0]);
  if (activeBrand) return activeBrand;

  const stored = storedCode();
  if (stored) {
    const { data } = await supabase
      .from("events")
      .select("organized_by, address")
      .eq("code", stored)
      .maybeSingle();
    const brand = toBrand(data);
    if (brand) return brand;
  }

  if (profile?.role === "trainer" && profile.status === "approved") {
    const { data } = await supabase
      .from("events")
      .select("organized_by, address")
      .not("organized_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    return toBrand(data?.[0]);
  }

  return null;
}

/* The header line used on the app pages: "<organiser> · AI तालिम", or "AI तालिम". */
export function brandLine(brand: EventBrand | null): string {
  return brand ? `${brand.org} · AI तालिम` : "AI तालिम";
}

/* Loads the brand once; when `title` is given, the browser tab becomes "<title> · <organiser>". */
export function useEventBrand(title?: string): EventBrand | null {
  const [brand, setBrand] = useState<EventBrand | null>(null);

  useEffect(() => {
    let alive = true;
    loadEventBrand()
      .then((b) => {
        if (alive) setBrand(b);
      })
      .catch(() => {});
    const sub = supabase.auth.onAuthStateChange(() => {
      loadEventBrand()
        .then((b) => {
          if (alive) setBrand(b);
        })
        .catch(() => {});
    });
    return () => {
      alive = false;
      sub.data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (title && brand) document.title = `${title} · ${brand.org}`;
  }, [title, brand]);

  return brand;
}
