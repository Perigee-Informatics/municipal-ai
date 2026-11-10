import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;
const db: {
  session: { user: { id: string } } | null;
  events: Row[];
  profile: Row | null;
  rpc: Row[];
  active: Row[];
} = {
  session: null,
  events: [],
  profile: null,
  rpc: [],
  active: [],
};

// Minimal stand-in for the Supabase query builder: filters by eq(), honours maybeSingle()/limit().
function query(rows: () => Row[]) {
  let list = rows();
  const q = {
    select: () => q,
    eq: (k: string, v: unknown) => ((list = list.filter((r) => r[k] === v)), q),
    not: (k: string) => ((list = list.filter((r) => r[k] != null)), q),
    order: () => q,
    limit: (n: number) => Promise.resolve({ data: list.slice(0, n), error: null }),
    maybeSingle: () => Promise.resolve({ data: list[0] ?? null, error: null }),
  };
  return q;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: db.session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
    from: (table: string) =>
      query(() => (table === "events" ? db.events : db.profile ? [db.profile] : [])),
    rpc: async (name: string) => ({
      data: name === "active_event_brand" ? db.active : db.rpc,
      error: null,
    }),
  },
}));

import { brandLine, loadEventBrand, normalizeOrg } from "@/hooks/use-event-brand";

const EVENTS = [
  { id: "r1", code: "R-01", organized_by: "सन्धिखर्क नगरपालिका", address: "सभाहल" },
  { id: "e1", code: "E-01", organized_by: "मालारानी गाउँपालिका", address: "मालारानी" },
];

describe("event brand", () => {
  beforeEach(() => {
    db.session = null;
    db.events = EVENTS;
    db.profile = null;
    db.rpc = [];
    db.active = [];
    window.localStorage.clear();
    window.history.replaceState(null, "", "/auth");
  });

  it("adds पालिका only when missing", () => {
    expect(normalizeOrg("मालारानी")).toBe("मालारानी पालिका");
    expect(normalizeOrg("मालारानी गाउँपालिका")).toBe("मालारानी गाउँपालिका");
    expect(normalizeOrg("  ")).toBe("");
    expect(brandLine(null)).toBe("AI तालिम");
    expect(brandLine({ org: "क", place: "" })).toBe("क · AI तालिम");
  });

  it("shows nothing for a visitor without an event link", async () => {
    expect(await loadEventBrand()).toBeNull();
  });

  it("uses public_event_brand for a visitor with ?event= and remembers the code", async () => {
    db.rpc = [{ organized_by: "मालारानी गाउँपालिका", address: "मालारानी" }];
    window.history.replaceState(null, "", "/auth?event=e-01");
    expect(await loadEventBrand()).toEqual({ org: "मालारानी गाउँपालिका", place: "मालारानी" });
    expect(window.localStorage.getItem("ws-event")).toBe("E-01");
  });

  it("uses the signed-in participant's own event", async () => {
    db.session = { user: { id: "u" } };
    db.profile = { id: "u", event_id: "e1", role: "participant", status: "approved" };
    expect((await loadEventBrand())?.org).toBe("मालारानी गाउँपालिका");
  });

  it("shows the active event to a visitor without an event link", async () => {
    db.active = [{ organized_by: "पाणिनी गाउँपालिका, अर्घाखाँची", address: "अर्घाखाँची" }];
    expect((await loadEventBrand())?.org).toBe("पाणिनी गाउँपालिका, अर्घाखाँची");
  });

  it("prefers the active event over the newest for the trainer", async () => {
    db.session = { user: { id: "u" } };
    db.profile = { id: "u", event_id: null, role: "trainer", status: "approved" };
    const [rep, emp] = EVENTS;
    db.events = [rep as Row, { ...(emp as Row), is_active: true }];
    expect((await loadEventBrand())?.org).toBe("मालारानी गाउँपालिका");
  });

  it("uses the newest event for the trainer", async () => {
    db.session = { user: { id: "u" } };
    db.profile = { id: "u", event_id: null, role: "trainer", status: "approved" };
    expect((await loadEventBrand())?.org).toBe("सन्धिखर्क नगरपालिका");
  });

  it("prefers an explicit ?event= code when signed in", async () => {
    db.session = { user: { id: "u" } };
    db.profile = { id: "u", event_id: "r1", role: "participant", status: "approved" };
    window.history.replaceState(null, "", "/account?event=E-01");
    expect((await loadEventBrand())?.org).toBe("मालारानी गाउँपालिका");
  });
});

describe("front page", () => {
  it("opens the active event's course, else the employee materials", async () => {
    const { frontPageTarget } = await import("@/lib/front-page");
    db.active = [{ package_key: "representative" }];
    expect(await frontPageTarget()).toBe("/workshop/representative/index.html");
    db.active = [{ package_key: "employee" }];
    expect(await frontPageTarget()).toBe("/workshop/index.html");
    db.active = [];
    expect(await frontPageTarget()).toBe("/workshop/index.html");
  });
});
