import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleParking,
  Clock3,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import type {
  User,
  Street,
  Zone,
  Spot,
  Reservation,
} from "@smartparking/contracts";
import "./style.css";

type Data = {
  streets: Street[];
  zones: Zone[];
  spots: Spot[];
  reservations: Reservation[];
  users: User[];
};
const empty: Data = {
  streets: [],
  zones: [],
  spots: [],
  reservations: [],
  users: [],
};
async function api(path: string, body?: unknown, method?: string) {
  const r = await fetch(`/api${path}`, {
    credentials: "same-origin",
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await r.json();
  } catch {
    throw new Error("The service is unavailable. Please try again.");
  }
  if (!r.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
const money = (cents: number) =>
  new Intl.NumberFormat("en", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: 2,
  }).format(cents / 100);
const date = (v: Date | string) =>
  new Date(v).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
function App() {
  const [user, setUser] = useState<User | null>(null),
    [checking, setChecking] = useState(true),
    [data, setData] = useState<Data>(empty),
    [page, setPage] = useState("overview"),
    [street, setStreet] = useState("all"),
    [zone, setZone] = useState("all"),
    [query, setQuery] = useState(""),
    [availableOnly, setAvailableOnly] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [loading, setLoading] = useState(false),
    [updated, setUpdated] = useState<Date | null>(null),
    [dialog, setDialog] = useState<{ type: string; item?: any } | null>(null),
    [busy, setBusy] = useState(false),
    [dialogError, setDialogError] = useState("");
  const requestSeq = useRef(0);
  useEffect(() => {
    api("/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);
  async function load() {
    if (!user) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    try {
      let next: Data;
      if (user.role === "admin") next = await api("/admin/overview");
      else {
        const { streets } = await api("/streets");
        const zones = (
          await Promise.all(
            streets.map((s: Street) => api(`/zones?streetId=${s.id}`)),
          )
        ).flatMap((r) => r.zones);
        const spots = (
          await Promise.all(
            zones.map((z: Zone) => api(`/spots?zoneId=${z.id}`)),
          )
        ).flatMap((r) => r.spots);
        const { reservations } = await api("/reservations");
        next = { streets, zones, spots, reservations, users: [] };
      }
      const me = await api("/auth/me");
      if (seq !== requestSeq.current) return;
      setData(next);
      setUser(me.user);
      setUpdated(new Date());
      setError("");
    } catch (e) {
      if (seq === requestSeq.current) setError((e as Error).message);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!user) return;
    load();
    const timer = setInterval(load, 15000);
    return () => {
      clearInterval(timer);
      ++requestSeq.current;
    };
  }, [user?.id]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    setDialogError("");
  }, [dialog]);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page, user?.id]);
  useEffect(() => {
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector(".modal");
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !modal) return;
      const controls = Array.from(
        modal.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
        ),
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [dialog, busy]);
  useEffect(() => {
    if (!dialog) return;
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setDialog(null);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [dialog, busy]);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await api("/auth/logout", {});
      ++requestSeq.current;
      setUser(null);
      setData(empty);
      setError("");
      setToast("");
      setUpdated(null);
      setStreet("all");
      setZone("all");
      setQuery("");
      setAvailableOnly(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }
  async function action(fn: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      setToast(message);
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <div className="boot">
        <CircleParking size={44} />
        <p>Opening SmartParking…</p>
      </div>
    );
  if (!user)
    return (
      <Auth
        onLogin={(u) => {
          setUser(u);
          setPage(u.role === "admin" ? "overview" : "parking");
        }}
      />
    );
  const isAdmin = user.role === "admin";
  const visibleZones = data.zones.filter(
    (z) => street === "all" || z.streetId === street,
  );
  const filteredSpots = data.spots.filter((s) => {
    const z = data.zones.find((z) => z.id === s.zoneId);
    return (
      (street === "all" || z?.streetId === street) &&
      (zone === "all" || s.zoneId === zone) &&
      (!availableOnly || (s.enabled && !s.occupied && !s.reservationId)) &&
      `${s.name} ${z?.name}`.toLowerCase().includes(query.toLowerCase())
    );
  });
  const enabledSpots = data.spots.filter(
    (s) =>
      s.enabled &&
      data.zones.some(
        (z) =>
          z.id === s.zoneId &&
          z.enabled &&
          data.streets.some((t) => t.id === z.streetId && t.enabled),
      ),
  );
  const free = enabledSpots.filter(
    (s) => !s.occupied && !s.reservationId,
  ).length;
  const active = data.reservations.filter((r) => r.status === "active");
  const myActive = active.find((r) => r.userId === user.id);
  const spotName = (id: string) =>
    data.spots.find((s) => s.id === id)?.name || "Archived spot";
  const zoneName = (id: string) =>
    data.zones.find((z) => z.id === id)?.name || "Zone";
  const title = (
    {
      overview: "A clearer view of your streets.",
      parking: "A space for every arrival.",
      reservations: "Every booking, in one place.",
      users: "People behind the parking.",
      settings: "Make room for better parking.",
    } as any
  )[page];
  async function submitDialog(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const val = (k: string) => String(form.get(k) || "");
    setBusy(true);
    setDialogError("");
    try {
      if (dialog?.type === "book")
        await api("/reservations", {
          spotId: dialog.item.id,
          vehiclePlate: val("vehiclePlate"),
          hours: Number(val("hours")),
        });
      if (dialog?.type === "renew")
        await api(`/reservations/${dialog.item.id}/renew`, {
          hours: Number(val("hours")),
        });
      if (dialog?.type === "credit")
        await api(`/admin/users/${dialog.item.id}/credit`, {
          amountCents: Math.round(Number(val("amount")) * 100),
          reason: val("reason"),
        });
      if (dialog?.type === "street")
        await api("/admin/streets", {
          name: val("name"),
          city: val("city"),
          image: "",
        });
      if (dialog?.type === "zone")
        await api("/admin/zones", {
          streetId: val("streetId"),
          name: val("name"),
          distance: Number(val("distance")),
          hourlyRate: Number(val("hourlyRate")),
        });
      if (dialog?.type === "spot")
        await api("/admin/spots", {
          zoneId: val("zoneId"),
          name: val("name"),
          distance: Number(val("distance")),
        });
      if (dialog?.type === "editZone")
        await api(
          `/admin/zones/${dialog.item.id}`,
          {
            name: val("name"),
            distance: Number(val("distance")),
            hourlyRate: Number(val("hourlyRate")),
          },
          "PATCH",
        );
      if (dialog?.type === "editStreet")
        await api(
          `/admin/streets/${dialog.item.id}`,
          { name: val("name"), city: val("city") },
          "PATCH",
        );
      setDialog(null);
      setToast("Changes saved successfully");
      await load();
    } catch (e) {
      setDialogError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, admin: true },
    { id: "parking", label: "Parking spaces", icon: MapPin },
    { id: "reservations", label: "Reservations", icon: ListChecks },
    { id: "users", label: "Drivers & credits", icon: Users, admin: true },
    { id: "settings", label: "Streets & zones", icon: Settings2, admin: true },
  ].filter((n) => !n.admin || isAdmin);
  return (
    <div className="app">
      <aside className="sidebar">
        <a className="brand" href="/" onClick={(e) => e.preventDefault()}>
          <span className="brand-icon">
            <CircleParking size={27} />
          </span>
          smartparking<span className="brand-dot">.</span>
        </a>
        <div className="workspace">
          <span className="workspace-icon">
            <MapPin size={18} />
          </span>
          <div>
            <strong>Parking workspace</strong>
            <small>{isAdmin ? "Administration" : "Driver portal"}</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "selected" : ""}
              onClick={() => {
                setPage(n.id);
                setQuery("");
              }}
            >
              <n.icon size={19} />
              {n.label}
              {n.id === "reservations" && active.length > 0 && (
                <span className="nav-count">
                  {isAdmin ? active.length : myActive ? 1 : 0}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="balance-card">
            <CreditCard size={19} />
            <small>Your parking balance</small>
            <strong>{money(user.balanceCents)}</strong>
            <span>Credits are managed by your administrator.</span>
          </div>
          <div className="profile">
            <span className="avatar">
              {user.firstName.slice(0, 1)}
              {user.lastName.slice(0, 1)}
            </span>
            <div>
              <strong>
                {user.firstName} {user.lastName}
              </strong>
              <small>{isAdmin ? "Administrator" : "Driver"}</small>
            </div>
            <button
              className="icon-btn"
              title="Sign out"
              aria-label="Sign out"
              onClick={signOut}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="crumb">Workspace</span>
            <span className="slash">/</span>
            <strong>{nav.find((n) => n.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            <div className="mobile-account">
              <span>{money(user.balanceCents)}</span>
              <button
                aria-label="Sign out"
                className="icon-btn"
                onClick={signOut}
              >
                <LogOut size={16} />
              </button>
            </div>
            <span className="live">
              <i />
              {updated ? "Connected" : "Connecting"}
            </span>
            <span className="today">
              {new Date().toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {isAdmin
                  ? "SMARTER STREETS. BETTER DAYS."
                  : "LESS SEARCHING. MORE LIVING."}
              </div>
              <h1>{title}</h1>
              <p>
                {page === "overview"
                  ? "Your parking network, with a little more perspective."
                  : page === "parking"
                    ? "Explore zones, check availability, and find your next space."
                    : page === "reservations"
                      ? "Track arrivals, renew your time, and keep things moving."
                      : page === "users"
                        ? "Manage driver accounts and their prepaid parking credits."
                        : "Manage the streets and zones that keep your city moving."}
              </p>
            </div>
            <button
              className="button secondary"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? "spin" : ""} />
              Refresh
            </button>
          </div>
          {error && (
            <div className="alert" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {myActive && page !== "reservations" && (
            <div className="active-banner">
              <span className="active-dot" />
              <div>
                <strong>
                  Your space is reserved · {spotName(myActive.spotId)}
                </strong>
                <span>
                  Until {date(myActive.expiresAt)} ·{" "}
                  {myActive.confirmed
                    ? "Arrival confirmed"
                    : "Confirm your arrival in Reservations"}
                </span>
              </div>
              <button
                className="button secondary"
                onClick={() => setPage("reservations")}
              >
                View booking
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {(page === "overview" || page === "parking") && (
            <>
              <section className="stats">
                <Stat
                  icon={CircleParking}
                  label="Total spaces"
                  value={enabledSpots.length}
                  detail={`${data.zones.filter((z) => z.enabled).length} zones in your network`}
                />
                <Stat
                  icon={ArrowDownLeft}
                  label="Available now"
                  value={free}
                  detail="Ready for the next arrival"
                  green
                />
                <Stat
                  icon={Clock3}
                  label="Active reservations"
                  value={active.length}
                  detail="Bookings currently in progress"
                />
                <Stat
                  icon={MapPin}
                  label="Occupancy"
                  value={`${enabledSpots.length ? Math.round(((enabledSpots.length - free) / enabledSpots.length) * 100) : 0}%`}
                  detail="Occupied or reserved spaces"
                />
              </section>
              {page === "overview" && (
                <section className="overview-grid">
                  <div className="panel network">
                    <div className="panel-heading">
                      <div>
                        <h2>Your network at a glance</h2>
                        <p>One street. Many possibilities.</p>
                      </div>
                      <span className="tag">{data.streets.length} streets</span>
                    </div>
                    <div className="street-feature">
                      <img
                        src="/images/jaffa.jpg"
                        alt="Original project map of Jaffa Street"
                      />
                      <div className="street-overlay">
                        <span className="tag light">
                          THE ORIGINAL SMARTPARKING STREET
                        </span>
                        <h3>It all starts on Jaffa.</h3>
                        <p>Less circling. More arriving.</p>
                        <button
                          onClick={() => setPage("parking")}
                          className="button white"
                        >
                          Explore parking
                          <ArrowUpRight size={17} />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="panel availability">
                    <div className="panel-heading">
                      <div>
                        <h2>Room to arrive</h2>
                        <p>Availability across your zones</p>
                      </div>
                      <CircleParking size={21} />
                    </div>
                    <div className="zone-bars">
                      {data.zones.slice(0, 6).map((z) => {
                        const spots = enabledSpots.filter(
                            (s) => s.zoneId === z.id,
                          ),
                          count = spots.filter(
                            (s) => !s.occupied && !s.reservationId,
                          ).length;
                        return (
                          <div className="zone-bar" key={z.id}>
                            <div>
                              <strong>{z.name}</strong>
                              <span>
                                {count}
                                <small> / {spots.length} free</small>
                              </span>
                            </div>
                            <div className="track">
                              <i
                                style={{
                                  width: `${spots.length ? (count / spots.length) * 100 : 0}%`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {!data.zones.length && (
                        <Empty text="Add a street and zone to start your parking network." />
                      )}
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setPage("settings")}
                    >
                      Manage your zones
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
              )}
              <section className="panel parking-panel">
                <div className="panel-heading">
                  <div>
                    <h2>
                      {page === "overview"
                        ? "Spaces, in focus"
                        : "Find your space"}
                    </h2>
                    <p>
                      Availability refreshes every 15 seconds. Occupancy is
                      managed manually.
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      className="button primary"
                      onClick={() => setDialog({ type: "spot" })}
                    >
                      <Plus size={16} />
                      Add space
                    </button>
                  )}
                </div>
                <div className="filters">
                  <label className="search">
                    <Search size={17} />
                    <input
                      aria-label="Search spaces"
                      placeholder="Search spaces or zones…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <select
                    aria-label="Filter street"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      setZone("all");
                    }}
                  >
                    <option value="all">All streets</option>
                    {data.streets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Filter zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                  >
                    <option value="all">All zones</option>
                    {visibleZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                  <label className="check-filter">
                    <input
                      type="checkbox"
                      checked={availableOnly}
                      onChange={(e) => setAvailableOnly(e.target.checked)}
                    />
                    Available only
                  </label>
                </div>
                <div className="parking-legend">
                  <span>
                    <i className="green" />
                    Available
                  </span>
                  <span>
                    <i className="amber" />
                    Reserved
                  </span>
                  <span>
                    <i className="gray" />
                    Occupied / offline
                  </span>
                  <small>{filteredSpots.length} spaces</small>
                </div>
                <div className="spot-grid">
                  {filteredSpots.map((s) => {
                    const parent = data.zones.find((z) => z.id === s.zoneId);
                    const enabled =
                      s.enabled &&
                      parent?.enabled &&
                      data.streets.some(
                        (t) => t.id === parent.streetId && t.enabled,
                      );
                    const status = !enabled
                      ? "Offline"
                      : s.reservationId
                        ? "Reserved"
                        : s.occupied
                          ? "Occupied"
                          : "Available";
                    return (
                      <article
                        key={s.id}
                        className={`spot ${status.toLowerCase()}`}
                      >
                        <div className="spot-top">
                          <strong>{s.name}</strong>
                          <span className={`pill ${status.toLowerCase()}`}>
                            {status}
                          </span>
                        </div>
                        <div className="parking-symbol">
                          <span />
                          <CircleParking size={32} strokeWidth={1.3} />
                          <span />
                        </div>
                        <div className="spot-info">
                          <span>{zoneName(s.zoneId)}</span>
                          <span>{s.distance} m</span>
                        </div>
                        <div className="spot-action">
                          <strong>
                            {money(Math.round((parent?.hourlyRate || 0) * 100))}
                            <small> / hr</small>
                          </strong>
                          {isAdmin ? (
                            <button
                              disabled={busy || !s.enabled}
                              onClick={() =>
                                action(
                                  () =>
                                    api(
                                      `/admin/spots/${s.id}`,
                                      { occupied: !s.occupied },
                                      "PATCH",
                                    ),
                                  "Occupancy updated",
                                )
                              }
                            >
                              {s.occupied ? "Mark free" : "Mark occupied"}
                              <ArrowUpRight size={13} />
                            </button>
                          ) : (
                            <button
                              disabled={
                                busy || status !== "Available" || !!myActive
                              }
                              onClick={() =>
                                setDialog({ type: "book", item: s })
                              }
                            >
                              Reserve
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                        </div>
                        {isAdmin && (
                          <button
                            className="archive-link"
                            disabled={busy || !!s.reservationId}
                            onClick={() =>
                              action(
                                () =>
                                  api(
                                    `/admin/spots/${s.id}`,
                                    { enabled: !s.enabled },
                                    "PATCH",
                                  ),
                                s.enabled ? "Space archived" : "Space restored",
                              )
                            }
                          >
                            {s.enabled ? "Archive space" : "Restore space"}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
                {!filteredSpots.length && (
                  <Empty
                    text={
                      loading
                        ? "Loading spaces…"
                        : "No spaces match. Try another filter or add a space."
                    }
                  />
                )}
                <div className="panel-footer">
                  <span>
                    <span className="mini-dot" />{" "}
                    {updated
                      ? `Updated ${updated.toLocaleTimeString()}`
                      : "Fetching your network…"}
                  </span>
                  <span>Designed for a little less circling.</span>
                </div>
              </section>
            </>
          )}
          {page === "reservations" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>{isAdmin ? "All reservations" : "Your reservations"}</h2>
                  <p>
                    Unconfirmed cancellations refund the full prepaid amount.
                    Confirmed time is non-refundable.
                  </p>
                </div>
                <span className="tag">{active.length} active</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Space / zone</th>
                      {isAdmin && <th>Driver</th>}
                      <th>Vehicle</th>
                      <th>Reserved until</th>
                      <th>Prepaid</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.reservations.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <strong>{spotName(r.spotId)}</strong>
                          <small>{zoneName(r.zoneId)}</small>
                        </td>
                        {isAdmin && (
                          <td>
                            {data.users.find((u) => u.id === r.userId)?.email ||
                              "Driver"}
                          </td>
                        )}
                        <td>{r.vehiclePlate}</td>
                        <td>
                          {date(r.expiresAt)}
                          <small>
                            {r.hours} hours ·{" "}
                            {r.confirmed ? "Arrived" : "Not confirmed"}
                          </small>
                        </td>
                        <td>{money(r.paidCents)}</td>
                        <td>
                          <span
                            className={`pill ${r.status === "active" ? "reserved" : "muted"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            {r.status === "active" && (
                              <>
                                {r.userId === user.id && !r.confirmed && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      action(
                                        () =>
                                          api(
                                            `/reservations/${r.id}/confirm`,
                                            {},
                                          ),
                                        "Arrival confirmed",
                                      )
                                    }
                                  >
                                    Confirm arrival
                                  </button>
                                )}
                                {r.userId === user.id && (
                                  <button
                                    disabled={busy}
                                    onClick={() =>
                                      setDialog({ type: "renew", item: r })
                                    }
                                  >
                                    Renew
                                  </button>
                                )}
                                <button
                                  disabled={busy}
                                  onClick={() =>
                                    action(
                                      () =>
                                        api(`/reservations/${r.id}/end`, {
                                          status: r.confirmed
                                            ? "completed"
                                            : "cancelled",
                                        }),
                                      "Reservation ended",
                                    )
                                  }
                                >
                                  {r.confirmed ? "Finish" : "Cancel & refund"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.reservations.length && (
                <Empty text="No reservations yet. Your next space is waiting in Parking spaces." />
              )}
            </section>
          )}
          {page === "users" && isAdmin && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Drivers & credits</h2>
                  <p>
                    Prepaid credits are recorded in an audit ledger. No payment
                    gateway is connected.
                  </p>
                </div>
                <span className="tag">{data.users.length} accounts</span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Email</th>
                      <th>Phone</th>
                      <th>Role</th>
                      <th>Balance</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong>
                            {u.firstName} {u.lastName}
                          </strong>
                          <small>
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                        <td>{u.email}</td>
                        <td>{u.phone || "—"}</td>
                        <td>
                          <span className="pill muted">{u.role}</span>
                        </td>
                        <td>
                          <strong>{money(u.balanceCents)}</strong>
                        </td>
                        <td>
                          <button
                            className="button secondary small"
                            onClick={() =>
                              setDialog({ type: "credit", item: u })
                            }
                          >
                            <Plus size={14} />
                            Add credits
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {page === "settings" && isAdmin && (
            <div className="settings-grid">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Streets</h2>
                    <p>The starting point of every journey.</p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => setDialog({ type: "street" })}
                  >
                    <Plus size={16} />
                    Add street
                  </button>
                </div>
                {data.streets.map((s) => (
                  <div className="setting-row" key={s.id}>
                    <span className="setting-icon">
                      <MapPin size={20} />
                    </span>
                    <div>
                      <strong>{s.name}</strong>
                      <small>
                        {s.city} ·{" "}
                        {data.zones.filter((z) => z.streetId === s.id).length}{" "}
                        zones · {s.enabled ? "Enabled" : "Archived"}
                      </small>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setDialog({ type: "editStreet", item: s })}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        action(
                          () =>
                            api(
                              `/admin/streets/${s.id}`,
                              { enabled: !s.enabled },
                              "PATCH",
                            ),
                          "Street updated",
                        )
                      }
                    >
                      {s.enabled ? "Archive" : "Restore"}
                    </button>
                  </div>
                ))}
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h2>Zones</h2>
                    <p>Set rates, distances, and availability.</p>
                  </div>
                  <button
                    className="button primary"
                    onClick={() => setDialog({ type: "zone" })}
                  >
                    <Plus size={16} />
                    Add zone
                  </button>
                </div>
                {data.zones.map((z) => (
                  <div className="setting-row" key={z.id}>
                    <span className="setting-icon">
                      <CircleParking size={20} />
                    </span>
                    <div>
                      <strong>{z.name}</strong>
                      <small>
                        {data.streets.find((s) => s.id === z.streetId)?.name} ·{" "}
                        {z.distance} m · {money(Math.round(z.hourlyRate * 100))}
                        /hr · {z.enabled ? "Enabled" : "Archived"}
                      </small>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setDialog({ type: "editZone", item: z })}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() =>
                        action(
                          () =>
                            api(
                              `/admin/zones/${z.id}`,
                              { enabled: !z.enabled },
                              "PATCH",
                            ),
                          "Zone updated",
                        )
                      }
                    >
                      {z.enabled ? "Archive" : "Restore"}
                    </button>
                  </div>
                ))}
              </section>
            </div>
          )}
          <footer className="footer">
            <span>
              smartparking<span>.</span> <small>A better way to arrive.</small>
            </span>
            <span>
              <ShieldCheck size={14} />{" "}
              {isAdmin ? "Administrator workspace" : "Secure driver portal"}
            </span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
      {dialog && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <button
              className="modal-close icon-btn"
              disabled={busy}
              aria-label="Close dialog"
              onClick={() => setDialog(null)}
            >
              <X size={20} />
            </button>
            <span className="modal-icon">
              {dialog.type === "credit" ? <CreditCard /> : <CircleParking />}
            </span>
            <h2 id="dialog-title">
              {
                (
                  {
                    book: `Reserve ${dialog.item?.name}`,
                    renew: "A little more time",
                    credit: "Add parking credits",
                    street: "Add a street",
                    zone: "Add a zone",
                    spot: "Add a parking space",
                    editZone: "Edit zone",
                    editStreet: "Edit street",
                  } as any
                )[dialog.type]
              }
            </h2>
            <p>
              {dialog.type === "book"
                ? "Time starts immediately. Confirm your arrival after parking."
                : dialog.type === "credit"
                  ? `Credit ${dialog.item.email}. No real payment is processed.`
                  : "A few details to keep your network moving."}
            </p>
            <form onSubmit={submitDialog}>
              {dialog.type === "book" && (
                <>
                  <Field label="Vehicle registration">
                    <input
                      autoFocus
                      required
                      name="vehiclePlate"
                      maxLength={20}
                      minLength={2}
                      placeholder="e.g. 12-345-67"
                    />
                  </Field>
                  <div className="booking-price">
                    {money(
                      Math.round(
                        (data.zones.find((z) => z.id === dialog.item.zoneId)
                          ?.hourlyRate || 0) * 100,
                      ),
                    )}{" "}
                    per hour · Balance {money(user.balanceCents)}
                  </div>
                </>
              )}
              {["book", "renew"].includes(dialog.type) && (
                <Field label="Number of hours">
                  <input
                    autoFocus={dialog.type === "renew"}
                    required
                    name="hours"
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    defaultValue="1"
                  />
                </Field>
              )}
              {dialog.type === "credit" && (
                <>
                  <Field label="Amount (NIS)">
                    <input
                      autoFocus
                      required
                      name="amount"
                      type="number"
                      min="0.01"
                      max="1000"
                      step="0.01"
                      placeholder="50.00"
                    />
                  </Field>
                  <Field label="Reason (saved in the ledger)">
                    <input
                      required
                      name="reason"
                      minLength={3}
                      maxLength={200}
                      placeholder="e.g. Prepaid parking credit"
                    />
                  </Field>
                </>
              )}
              {["street", "zone", "spot", "editZone", "editStreet"].includes(
                dialog.type,
              ) && (
                <Field label="Name">
                  <input
                    autoFocus
                    required
                    name="name"
                    maxLength={100}
                    defaultValue={dialog.item?.name || ""}
                    placeholder={
                      dialog.type === "spot" ? "e.g. J1-09" : "Display name"
                    }
                  />
                </Field>
              )}
              {["street", "editStreet"].includes(dialog.type) && (
                <Field label="City">
                  <input
                    required
                    name="city"
                    maxLength={100}
                    defaultValue={dialog.item?.city || ""}
                    placeholder="e.g. Jerusalem"
                  />
                </Field>
              )}
              {dialog.type === "zone" && (
                <Field label="Street">
                  <select name="streetId" required>
                    <option value="">Select a street</option>
                    {data.streets.map((s) => (
                      <option value={s.id} key={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {dialog.type === "spot" && (
                <Field label="Zone">
                  <select name="zoneId" required>
                    <option value="">Select a zone</option>
                    {data.zones.map((z) => (
                      <option value={z.id} key={z.id}>
                        {data.streets.find((s) => s.id === z.streetId)?.name} ·{" "}
                        {z.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {["zone", "spot", "editZone"].includes(dialog.type) && (
                <Field label="Distance from street entrance (meters)">
                  <input
                    required
                    name="distance"
                    type="number"
                    min="0"
                    max="100000"
                    step="1"
                    defaultValue={dialog.item?.distance || 0}
                  />
                </Field>
              )}
              {["zone", "editZone"].includes(dialog.type) && (
                <Field label="Hourly rate (NIS)">
                  <input
                    required
                    name="hourlyRate"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    defaultValue={dialog.item?.hourlyRate ?? 2}
                  />
                </Field>
              )}
              {dialogError && (
                <div className="alert" role="alert">
                  {dialogError}
                </div>
              )}
              <div className="modal-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setDialog(null)}
                >
                  Cancel
                </button>
                <button className="button primary" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : dialog.type === "book"
                      ? "Reserve & pay with credits"
                      : "Save changes"}
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
function Stat({ icon: Icon, label, value, detail, green = false }: any) {
  return (
    <article className={`stat ${green ? "highlight" : ""}`}>
      <div>
        <span>{label}</span>
        <Icon size={18} />
      </div>
      <strong>{value}</strong>
      <small>
        {green && <span className="mini-dot" />}
        {detail}
      </small>
    </article>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <CircleParking size={32} />
      <p>{text}</p>
    </div>
  );
}
function Auth({ onLogin }: { onLogin: (u: User) => void }) {
  const [invitation] = useState(
    () => new URLSearchParams(window.location.hash.slice(1)),
  );
  const setup = invitation.get("setup");
  const [register, setRegister] = useState(!!setup),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (setup) history.replaceState(null, "", window.location.pathname);
  }, []);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const body: any = { email: f.get("email"), password: f.get("password") };
      if (register)
        Object.assign(body, {
          firstName: f.get("firstName"),
          lastName: f.get("lastName"),
          phone: f.get("phone") || "",
          ...(setup ? { setupToken: setup } : {}),
        });
      const r = await api(register ? "/auth/register" : "/auth/login", body);
      onLogin(r.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth">
      <section className="auth-story">
        <a className="brand" href="/">
          <span className="brand-icon">
            <CircleParking size={27} />
          </span>
          smartparking.
        </a>
        <div>
          <span className="eyebrow">MAKE ROOM FOR WHAT MATTERS.</span>
          <h1>
            Good days start
            <br />
            with a space.
          </h1>
          <p>
            Find your spot. Take your time.
            <br />
            We’ll keep the streets moving.
          </p>
          <div className="auth-road">
            <div />
            <CircleParking size={72} strokeWidth={1} />
            <div />
          </div>
        </div>
        <small>From a Jaffa Street idea to a smarter way to park.</small>
      </section>
      <section className="auth-form">
        <div className="auth-box">
          <span className="tag">
            {setup ? "ADMINISTRATOR SETUP" : "YOUR NEXT SPACE IS WAITING"}
          </span>
          <h2>
            {register
              ? setup
                ? "Make it yours."
                : "A fresh start."
              : "Welcome back."}
          </h2>
          <p>
            {register
              ? "Create your account and a password of at least 10 characters."
              : "Sign in to your SmartParking workspace."}
          </p>
          <form onSubmit={submit}>
            {register && (
              <div className="form-row">
                <Field label="First name">
                  <input
                    autoComplete="given-name"
                    required
                    name="firstName"
                    maxLength={50}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    autoComplete="family-name"
                    required
                    name="lastName"
                    maxLength={50}
                  />
                </Field>
              </div>
            )}
            <Field label="Email address">
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                readOnly={!!setup}
                defaultValue={setup ? invitation.get("email") || "" : ""}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                name="password"
                minLength={register ? 10 : 1}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                placeholder={
                  register ? "At least 10 characters" : "Your password"
                }
              />
            </Field>
            {register && (
              <Field label="Phone (optional)">
                <input
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={30}
                />
              </Field>
            )}
            {error && (
              <div className="alert" role="alert">
                {error}
              </div>
            )}
            <button className="button primary auth-submit" disabled={busy}>
              {busy ? "One moment…" : register ? "Create account" : "Sign in"}
              <ArrowRight size={18} />
            </button>
          </form>
          {!setup && (
            <p className="switch-auth">
              {register ? "Already have an account?" : "New around here?"}{" "}
              <button
                onClick={() => {
                  setRegister(!register);
                  setError("");
                }}
              >
                {register ? "Sign in" : "Create an account"}
              </button>
            </p>
          )}
          <div className="auth-note">
            <ShieldCheck size={16} /> Your space. Your account. Securely
            connected.
          </div>
        </div>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
