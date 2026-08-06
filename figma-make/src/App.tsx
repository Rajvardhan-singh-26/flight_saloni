/**
 * Carewell Aviation — Charter Quotation (Figma Make canvas edition)
 *
 * Exact replica of the dashboard design: dark navy sidebar, topbar,
 * form cards with serif gold headings, aircraft photo carousel,
 * live quotation sheet with dark action toolbar.
 *
 * Fully self-contained: no backend. "AI" extraction runs in-browser
 * (same rules as the backend's fallback provider), and Download/Print
 * use the browser's print-to-PDF (print styles isolate the sheet).
 *
 * Drop into src/App.tsx of a Figma Make project (React + Tailwind v4 +
 * lucide-react are already available there).
 *
 * Demo login: sales@carewellaviation.com / carewell123
 */
import { useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Download,
  FileText,
  LayoutGrid,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Plane,
  PlaneTakeoff,
  Printer,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  User,
  Users,
} from "lucide-react";

/* ── Brand ──────────────────────────────────────────────────────────── */
const NAVY = "#122441";
const NAVY_DEEP = "#0b1730";
const SIDEBAR = "#0e1c38";
const GOLD = "#c9a24b";
const SERIF = "Georgia, 'Times New Roman', serif";

const DEMO_EMAIL = "sales@carewellaviation.com";
const DEMO_PASSWORD = "carewell123";
const SALES_NAME = "Sales Executive";

/* ── Fleet (images hotlinked from Wikimedia Commons / Unsplash) ─────── */
interface Aircraft {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  hourlyRate: number;
  maxPassengers: number;
  maxRangeNm: number;
  cruiseSpeedKt: number;
  image: string;
  description: string;
}

const FLEET: Aircraft[] = [
  { id: "citation-cj3", name: "Citation CJ3+", manufacturer: "Cessna", category: "Light Jet", hourlyRate: 3200, maxPassengers: 7, maxRangeNm: 2040, cruiseSpeedKt: 416, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Cessna_Citation_CJ3_N297KH_1.jpg/960px-Cessna_Citation_CJ3_N297KH_1.jpg", description: "A nimble light jet prized for short runway performance and efficient regional travel." },
  { id: "hawker-900xp", name: "Hawker 900XP", manufacturer: "Hawker Beechcraft", category: "Midsize Jet", hourlyRate: 4500, maxPassengers: 9, maxRangeNm: 2930, cruiseSpeedKt: 448, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Hawker_900XP_Private_ZS-BOT%2C_PMI_Palma_de_Mallorca%2C_Balearic_Islands%2C_Spain_PP1336649941.jpg/960px-Hawker_900XP_Private_ZS-BOT%2C_PMI_Palma_de_Mallorca%2C_Balearic_Islands%2C_Spain_PP1336649941.jpg", description: "A proven midsize workhorse with transatlantic-capable range and a stand-up cabin." },
  { id: "king-air-350", name: "King Air 350i", manufacturer: "Beechcraft", category: "Turboprop", hourlyRate: 2600, maxPassengers: 9, maxRangeNm: 1806, cruiseSpeedKt: 312, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Beechcraft_King_Air_350_N614CW_FDK_MD1.jpg/960px-Beechcraft_King_Air_350_N614CW_FDK_MD1.jpg", description: "A rugged, versatile turboprop with access to shorter runways and executive comfort." },
  { id: "challenger-350", name: "Challenger 350", manufacturer: "Bombardier", category: "Super Midsize Jet", hourlyRate: 6800, maxPassengers: 10, maxRangeNm: 3200, cruiseSpeedKt: 470, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Netjets_Bombardier_Challenger_350_N757QS_BWI_MD1.jpg/960px-Netjets_Bombardier_Challenger_350_N757QS_BWI_MD1.jpg", description: "Renowned for its smooth ride and wide-cabin comfort — a charter favorite." },
  { id: "legacy-650", name: "Legacy 650E", manufacturer: "Embraer", category: "Heavy Jet", hourlyRate: 7900, maxPassengers: 13, maxRangeNm: 3900, cruiseSpeedKt: 459, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/G-RBNS_Embraer_ERJ_135BJ_Legacy_650_%287608178118%29.jpg/960px-G-RBNS_Embraer_ERJ_135BJ_Legacy_650_%287608178118%29.jpg", description: "A spacious heavy jet offering a three-zone cabin and intercontinental range." },
  { id: "falcon-2000", name: "Falcon 2000LXS", manufacturer: "Dassault", category: "Heavy Jet", hourlyRate: 8500, maxPassengers: 10, maxRangeNm: 4000, cruiseSpeedKt: 482, image: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Dassault_Falcon_2000%2C_EBACE_2018%2C_Le_Grand-Saconnex_%28BL7C0628%29.jpg/960px-Dassault_Falcon_2000%2C_EBACE_2018%2C_Le_Grand-Saconnex_%28BL7C0628%29.jpg", description: "A large-cabin, long-range jet with exceptional short-field capability." },
  { id: "gulfstream-g650", name: "Gulfstream G650ER", manufacturer: "Gulfstream", category: "Ultra Long Range", hourlyRate: 11500, maxPassengers: 14, maxRangeNm: 7500, cruiseSpeedKt: 516, image: "https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=900&q=80&fm=jpg", description: "The pinnacle of private aviation — non-stop intercontinental range." },
];

const CATEGORIES = ["Light Jet", "Turboprop", "Midsize Jet", "Super Midsize Jet", "Heavy Jet", "Ultra Long Range"];

/* ── Quote state ────────────────────────────────────────────────────── */
interface QuoteState {
  customerName: string; company: string; phone: string; email: string;
  departureAirport: string; arrivalAirport: string; departureDate: string;
  passengers: number; flightHours: number; hourlyRate: number;
  landingCharges: number; handlingCharges: number; fuelCharges: number;
  parkingCharges: number; taxPercent: number; discount: number; notes: string;
}

const INITIAL: QuoteState = {
  customerName: "", company: "", phone: "", email: "",
  departureAirport: "", arrivalAirport: "", departureDate: "",
  passengers: 1, flightHours: 2.5, hourlyRate: 4500,
  landingCharges: 850, handlingCharges: 920, fuelCharges: 450,
  parkingCharges: 350, taxPercent: 18, discount: 0, notes: "",
};

const EXAMPLE =
  "Mr. Sharma requires a private charter from Delhi to Mumbai on 15 August for six passengers. " +
  "Preferred aircraft is a midsize jet. Estimated flying time is 2.5 hours.";

/* ── In-browser extraction (mirrors the backend fallback provider) ──── */
const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const MONTHS: Record<string, number> = { jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12 };

function extract(text: string): { fields: Partial<QuoteState>; category?: string } {
  const out: Partial<QuoteState> = {};
  let category: string | undefined;

  const name = text.match(/\b(Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Capt\.?)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if (name) out.customerName = `${name[1].replace(".", "")} ${name[2]}`;

  const route = text.match(/\bfrom\s+([A-Z][a-zA-Z\s]*?)\s+to\s+([A-Z][a-zA-Z\s]*?)(?:\s+on\b|\s+for\b|\s+with\b|,|\.|$)/);
  if (route) { out.departureAirport = route[1].trim(); out.arrivalAirport = route[2].trim(); }

  const paxN = text.match(/(\d+)\s*(?:passengers?|pax|people|guests?)/i);
  const paxW = text.match(new RegExp(`\\b(${Object.keys(WORDS).join("|")})\\s*(?:passengers?|pax|people|guests?)`, "i"));
  if (paxN) out.passengers = parseInt(paxN[1], 10);
  else if (paxW) out.passengers = WORDS[paxW[1].toLowerCase()];

  const lower = text.toLowerCase();
  if (lower.includes("ultra long range") || lower.includes("ultra-long range")) category = "Ultra Long Range";
  else if (lower.includes("heavy jet") || lower.includes("large jet")) category = "Heavy Jet";
  else if (lower.includes("super midsize")) category = "Super Midsize Jet";
  else if (lower.includes("midsize") || lower.includes("mid-size")) category = "Midsize Jet";
  else if (lower.includes("turboprop") || lower.includes("turbo prop")) category = "Turboprop";
  else if (lower.includes("light jet")) category = "Light Jet";

  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/i);
  if (hours) out.flightHours = parseFloat(hours[1]);

  const dm = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?\b/);
  if (dm && MONTHS[dm[2].toLowerCase()]) {
    let year = dm[3] ? parseInt(dm[3], 10) : new Date().getFullYear();
    const month = MONTHS[dm[2].toLowerCase()];
    const day = parseInt(dm[1], 10);
    if (!dm[3] && new Date(year, month - 1, day) < new Date()) year += 1;
    out.departureDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return { fields: out, category };
}

/* ── Pricing ────────────────────────────────────────────────────────── */
function price(q: QuoteState) {
  const flightCost = (q.flightHours || 0) * (q.hourlyRate || 0);
  const subtotal = flightCost + (+q.landingCharges || 0) + (+q.handlingCharges || 0) + (+q.fuelCharges || 0) + (+q.parkingCharges || 0);
  const afterDiscount = Math.max(subtotal - (+q.discount || 0), 0);
  const tax = (afterDiscount * (+q.taxPercent || 0)) / 100;
  return { flightCost, tax, grandTotal: afterDiscount + tax };
}

const usd = (v: number) => `$${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/* ── App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState<string | null>(null);
  return (
    <div className="min-h-screen font-sans text-[#1a2233]">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #quote-sheet, #quote-sheet * { visibility: visible; }
          #quote-sheet { position: absolute; inset: 0; width: 100%; border-radius: 0 !important; box-shadow: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      {user ? <Dashboard user={user} onLogout={() => setUser(null)} /> : <Login onSuccess={() => setUser(SALES_NAME)} />}
    </div>
  );
}

/* ── Login ──────────────────────────────────────────────────────────── */
function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) onSuccess();
    else setError(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4"
      style={{ background: `linear-gradient(180deg, ${NAVY} 0%, #0d1e3c 55%, ${NAVY_DEEP} 100%)` }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl" style={{ borderTop: `4px solid ${GOLD}` }}>
        <div className="mb-5 flex justify-center"><Logo /></div>
        <h2 className="text-center text-xl font-bold" style={{ color: NAVY, fontFamily: SERIF }}>Sales Portal</h2>
        <p className="mb-6 mt-1 text-center text-sm text-slate-500">Sign in to prepare charter quotations.</p>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3">
            <Mail className="size-4 text-slate-400" />
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full py-2.5 text-sm outline-none" />
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3">
            <Lock className="size-4 text-slate-400" />
            <input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full py-2.5 text-sm outline-none" />
          </div>
          {error && (
            <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              Invalid credentials. Try {DEMO_EMAIL} / {DEMO_PASSWORD}
            </p>
          )}
          <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg py-3 font-semibold text-white hover:brightness-110" style={{ background: NAVY }}>
            <LogIn className="size-4" /> Sign In
          </button>
        </form>
      </div>
    </div>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-xl" style={{ background: light ? "rgba(201,162,75,0.12)" : NAVY, border: `1.5px solid ${GOLD}` }}>
        <Plane className="size-4 rotate-45" style={{ color: GOLD }} />
      </div>
      <div className="text-lg font-bold tracking-widest" style={{ fontFamily: SERIF, color: light ? "#fff" : NAVY }}>
        CAREWELL <span style={{ color: GOLD }}>AVN</span>
      </div>
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────── */
const NAV = [
  { label: "Dashboard", icon: LayoutGrid },
  { label: "Generate Quote", icon: Sparkles, active: true },
  { label: "Aircraft", icon: Plane },
  { label: "Customers", icon: Users },
  { label: "Previous Quotes", icon: FileText },
  { label: "Settings", icon: Settings },
];

function Dashboard({ user, onLogout }: { user: string; onLogout: () => void }) {
  const [q, setQ] = useState<QuoteState>(INITIAL);
  const [selected, setSelected] = useState<Aircraft>(FLEET[1]); // Hawker, like the design
  const [aiText, setAiText] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const carousel = useRef<HTMLDivElement>(null);
  const pricing = useMemo(() => price(q), [q]);
  const quoteRef = useMemo(() => `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`, []);

  const set = (patch: Partial<QuoteState>) => setQ((p) => ({ ...p, ...patch }));

  const pick = (a: Aircraft) => {
    setSelected(a);
    set({ hourlyRate: a.hourlyRate });
  };

  const runAI = () => {
    const { fields, category } = extract(aiText);
    set(fields);
    if (category) {
      const match = FLEET.find((a) => a.category === category);
      if (match) { setSelected(match); set({ ...fields, hourlyRate: match.hourlyRate }); }
    }
    setAiDone(true);
  };

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex min-h-screen bg-[#eef1f5]">
      {/* Sidebar */}
      <aside className="print:hidden sticky top-0 hidden h-screen w-60 flex-col text-white md:flex" style={{ background: SIDEBAR }}>
        <div className="border-b border-white/10 px-5 py-5"><Logo light /></div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map(({ label, icon: Icon, active }) => (
            <div key={label}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14.5px] ${active ? "font-bold" : "cursor-pointer text-white/60 hover:bg-white/5 hover:text-white/90"}`}
              style={active ? { color: GOLD, background: "rgba(201,162,75,0.10)", borderLeft: `3px solid ${GOLD}` } : { borderLeft: "3px solid transparent" }}>
              <Icon className="size-5" /> {label}
            </div>
          ))}
        </nav>
        <button onClick={onLogout} className="flex items-center gap-3 border-t border-white/10 px-6 py-4 text-white/60 hover:text-white">
          <LogOut className="size-4" /> Sign Out
        </button>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="print:hidden sticky top-0 z-20 flex items-center gap-4 border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex max-w-lg flex-1 items-center gap-2 text-slate-400">
            <Search className="size-5" />
            <input placeholder="Search quotations, clients, aircraft..." className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
          <div className="relative">
            <Bell className="size-5 text-slate-400" />
            <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full" style={{ background: GOLD }} />
          </div>
          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-4">
            <div className="flex size-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: GOLD, color: NAVY }}>
              {user.split(" ").map((w) => w[0]).slice(0, 2).join("")}
            </div>
            <div className="hidden sm:block">
              <div className="text-sm font-bold leading-tight">{user}</div>
              <div className="text-xs text-slate-500">Charter Consultant</div>
            </div>
          </div>
        </header>

        <main className="grid flex-1 items-start lg:grid-cols-[0.95fr_1.05fr]">
          {/* LEFT: form column */}
          <div className="print:hidden space-y-5 p-4 md:p-6">
            {/* AI card */}
            <section className="rounded-2xl border bg-gradient-to-br from-[#fffdf7] to-white p-5 shadow-sm" style={{ borderColor: `${GOLD}55` }}>
              <CardTitle icon={<Sparkles className="size-5" style={{ color: GOLD }} />} title="AI Quote Assistant" />
              <p className="mb-3 text-sm text-slate-500">
                Paste the client's request — AI fills the form and picks an aircraft.{" "}
                <span className="cursor-pointer font-bold hover:underline" style={{ color: GOLD }} onClick={() => setAiText(EXAMPLE)}>
                  Try an example
                </span>
              </p>
              <textarea value={aiText} onChange={(e) => setAiText(e.target.value)} rows={3}
                placeholder="e.g. Mr. Sharma requires a charter from Delhi to Mumbai on 15 August for six passengers…"
                className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#1b3661]" />
              <button onClick={runAI} disabled={aiText.trim().length < 5}
                className="mt-2 flex items-center gap-2 rounded-lg px-5 py-2.5 font-semibold text-white hover:brightness-110 disabled:opacity-40"
                style={{ background: NAVY }}>
                <Sparkles className="size-4" /> Extract with AI
              </button>
              {aiDone && (
                <p className="mt-3 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
                  Details extracted and applied — review the form below.
                </p>
              )}
            </section>

            {/* Customer Information */}
            <Card>
              <CardTitle icon={<User className="size-5" style={{ color: GOLD }} />} title="Customer Information" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Customer Name" span2 value={q.customerName} onChange={(v) => set({ customerName: v })} />
                <Field label="Company" value={q.company} onChange={(v) => set({ company: v })} />
                <Field label="Phone" value={q.phone} onChange={(v) => set({ phone: v })} />
                <Field label="Email Address" span2 type="email" value={q.email} onChange={(v) => set({ email: v })} />
              </div>
            </Card>

            {/* Flight Details */}
            <Card>
              <CardTitle icon={<PlaneTakeoff className="size-5" style={{ color: GOLD }} />} title="Flight Details" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Departure City / ICAO" value={q.departureAirport} onChange={(v) => set({ departureAirport: v })} />
                <Field label="Arrival City / ICAO" value={q.arrivalAirport} onChange={(v) => set({ arrivalAirport: v })} />
                <Field label="Passengers" type="number" value={q.passengers} onChange={(v) => set({ passengers: Number(v) || 0 })} />
                <Field label="Travel Date" type="date" value={q.departureDate} onChange={(v) => set({ departureDate: v })} />
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm text-slate-500">Special Requirements</label>
                  <textarea value={q.notes} onChange={(e) => set({ notes: e.target.value })} rows={2}
                    placeholder="Catering, ground transport, lounge access..."
                    className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-[#1b3661]" />
                </div>
              </div>
            </Card>

            {/* Aircraft Selection */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <CardTitle icon={<Plane className="size-5 rotate-45" style={{ color: GOLD }} />} title="Aircraft Selection" tight />
                <div className="flex gap-2">
                  <button onClick={() => carousel.current?.scrollBy({ left: -270, behavior: "smooth" })} className="rounded-full border border-slate-200 bg-white p-1.5 hover:bg-slate-50">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button onClick={() => carousel.current?.scrollBy({ left: 270, behavior: "smooth" })} className="rounded-full border border-slate-200 bg-white p-1.5 hover:bg-slate-50">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
              <div ref={carousel} className="flex snap-x gap-4 overflow-x-auto pb-2">
                {FLEET.map((a) => {
                  const sel = selected.id === a.id;
                  return (
                    <button key={a.id} onClick={() => pick(a)}
                      className="w-60 shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left transition hover:-translate-y-0.5"
                      style={{ border: sel ? `2px solid ${GOLD}` : "1px solid #e5e8ee", boxShadow: sel ? "0 8px 26px rgba(201,162,75,0.30)" : "0 3px 14px rgba(18,36,65,0.07)" }}>
                      <img src={a.image} alt={a.name} className="h-32 w-full object-cover" />
                      <div className="p-3.5">
                        <div className="text-xs font-bold" style={{ color: GOLD }}>{a.category}</div>
                        <div className="text-lg font-bold leading-tight" style={{ fontFamily: SERIF, color: NAVY }}>{a.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{a.maxPassengers} pax · {a.maxRangeNm.toLocaleString()} nm</div>
                        <div className="mt-1.5 font-extrabold">{usd(a.hourlyRate)}<span className="text-xs font-medium text-slate-400">/hr</span></div>
                        <div className="mt-1 text-xs font-medium text-blue-600">View details →</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Pricing Configuration */}
            <Card>
              <CardTitle icon={<DollarSign className="size-5" style={{ color: GOLD }} />} title="Pricing Configuration" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Flight Hours" type="number" value={q.flightHours} onChange={(v) => set({ flightHours: Number(v) || 0 })} />
                <Field label="Landing Charges ($)" type="number" value={q.landingCharges} onChange={(v) => set({ landingCharges: Number(v) || 0 })} />
                <Field label="Handling Charges ($)" type="number" value={q.handlingCharges} onChange={(v) => set({ handlingCharges: Number(v) || 0 })} />
                <Field label="Fuel Surcharge ($)" type="number" value={q.fuelCharges} onChange={(v) => set({ fuelCharges: Number(v) || 0 })} />
                <Field label="Parking ($)" type="number" value={q.parkingCharges} onChange={(v) => set({ parkingCharges: Number(v) || 0 })} />
                <Field label="Discount ($)" type="number" value={q.discount} onChange={(v) => set({ discount: Number(v) || 0 })} />
                <Field label="Hourly Rate ($)" type="number" value={q.hourlyRate} onChange={(v) => set({ hourlyRate: Number(v) || 0 })} />
                <Field label="Taxes & Levies (%)" type="number" value={q.taxPercent} onChange={(v) => set({ taxPercent: Number(v) || 0 })} />
              </div>
            </Card>
          </div>

          {/* RIGHT: preview panel */}
          <div className="flex flex-col bg-[#e6eaf0] lg:sticky lg:top-[61px] lg:min-h-[calc(100vh-61px)]">
            <div className="print:hidden flex flex-wrap items-center gap-1 px-4 py-2.5" style={{ background: NAVY_DEEP }}>
              <div className="mr-auto flex items-center gap-2 text-white/75">
                <FileText className="size-4" />
                <span className="font-mono text-sm">{quoteRef}</span>
                <span className="hidden text-sm sm:inline">· Charter Quotation</span>
              </div>
              <Tb icon={<Download className="size-4" />} label="Download" primary onClick={() => window.print()} />
              <Tb icon={<Printer className="size-4" />} label="Print" onClick={() => window.print()} />
              <Tb icon={<Share2 className="size-4" />} label="Share" onClick={() => { navigator.clipboard?.writeText(location.href).catch(() => {}); notify("Share link copied."); }} />
              <Tb icon={<RefreshCw className="size-4" />} label="Regenerate" onClick={() => notify(`Quotation ${quoteRef} regenerated.`)} />
            </div>
            <div className="overflow-y-auto p-4 md:p-6">
              <Sheet q={q} aircraft={selected} pricing={pricing} quoteRef={quoteRef} user={user} />
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-xl" style={{ background: NAVY }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ── Bits ───────────────────────────────────────────────────────────── */
function Card({ children }: { children: React.ReactNode }) {
  return <section className="rounded-2xl border border-[#e8ebf0] bg-white p-5 shadow-sm">{children}</section>;
}

function CardTitle({ icon, title, tight = false }: { icon: React.ReactNode; title: string; tight?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${tight ? "" : "mb-4"}`}>
      {icon}
      <h3 className="text-xl font-bold" style={{ fontFamily: SERIF, color: "#1a2233" }}>{title}</h3>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", span2 = false }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; span2?: boolean }) {
  return (
    <label className={`block ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="mb-1 block text-sm text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1b3661]" />
    </label>
  );
}

function Tb({ icon, label, onClick, primary = false }: { icon: React.ReactNode; label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold"
      style={primary ? { background: GOLD, color: NAVY } : { color: "rgba(255,255,255,0.85)" }}>
      {icon} {label}
    </button>
  );
}

/* ── Quotation sheet ────────────────────────────────────────────────── */
function Sheet({ q, aircraft, pricing, quoteRef, user }: {
  q: QuoteState; aircraft: Aircraft; pricing: ReturnType<typeof price>; quoteRef: string; user: string;
}) {
  const dash = (v: string | number) => (v === "" || v === 0 && typeof v === "number" && false ? "—" : v === "" ? "—" : String(v));
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const hasCustomer = q.customerName || q.company || q.phone || q.email;

  const rows: Array<[string, string, string]> = [
    ["Charter Flight Cost", `${q.flightHours || 0} hrs × ${usd(q.hourlyRate || 0)}/hr`, usd(pricing.flightCost)],
    ["Landing Charges", "Per sector", usd(+q.landingCharges || 0)],
    ["Handling Charges", "Ground services", usd(+q.handlingCharges || 0)],
    ["Fuel Surcharge", `${q.flightHours || 0} hrs`, usd(+q.fuelCharges || 0)],
    ["Parking", "Overnight", usd(+q.parkingCharges || 0)],
  ];
  if (q.discount) rows.push(["Discount", "Negotiated", `− ${usd(+q.discount)}`]);
  rows.push(["Taxes & Levies", `${q.taxPercent || 0}% applicable`, usd(pricing.tax)]);

  return (
    <div id="quote-sheet" className="overflow-hidden rounded-xl bg-white shadow-2xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: NAVY }}>
              ✈ CAREWELL <span style={{ color: GOLD }}>AVIATION</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Charter Operations · Executive Aviation Services</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ fontFamily: SERIF, color: NAVY }}>QUOTATION</div>
            <div className="font-mono text-xs text-slate-500">{quoteRef}</div>
            <div className="text-xs text-slate-500">{today}</div>
          </div>
        </div>
        <div className="my-4 h-[3px] rounded" style={{ background: GOLD }} />

        {/* Two columns */}
        <div className="mb-4 grid grid-cols-2 gap-5">
          <div>
            <GLabel>Prepared For</GLabel>
            {hasCustomer ? (
              <>
                <KV k="Client" v={dash(q.customerName)} />
                <KV k="Company" v={dash(q.company)} />
                <KV k="Phone" v={dash(q.phone)} />
                <KV k="Email" v={dash(q.email)} />
              </>
            ) : (
              <p className="text-sm italic text-slate-400">Client details will appear here</p>
            )}
          </div>
          <div>
            <GLabel>Flight Summary</GLabel>
            <KV k="Route" v={q.departureAirport || q.arrivalAirport ? `${dash(q.departureAirport)} → ${dash(q.arrivalAirport)}` : "—"} />
            <KV k="Date" v={dash(q.departureDate)} />
            <KV k="Passengers" v={q.passengers ? String(q.passengers) : "—"} />
            <KV k="Aircraft" v={aircraft.name} />
            <KV k="Category" v={aircraft.category} />
          </div>
        </div>

        {/* Photo */}
        <div className="relative mb-4 overflow-hidden rounded-lg">
          <img src={aircraft.image} alt={aircraft.name} className="h-44 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-baseline gap-2 px-3 py-1.5" style={{ background: "rgba(11,23,48,0.88)" }}>
            <span className="text-[11px] font-extrabold tracking-wide" style={{ color: GOLD }}>{aircraft.category.toUpperCase()}</span>
            <span className="text-xs font-bold text-white">{aircraft.manufacturer} {aircraft.name}</span>
            <span className="text-[11px] text-slate-300">{aircraft.maxPassengers} pax · {aircraft.maxRangeNm.toLocaleString()} nm · {aircraft.cruiseSpeedKt} kt</span>
          </div>
        </div>

        {/* Cost breakdown */}
        <GLabel>Cost Breakdown</GLabel>
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1.5fr_1.2fr_0.9fr] px-3 py-2 text-xs font-bold text-white" style={{ background: NAVY }}>
            <span>Description</span><span className="text-center">Details</span><span className="text-right">Amount</span>
          </div>
          {rows.map(([d, det, amt], i) => (
            <div key={d} className={`grid grid-cols-[1.5fr_1.2fr_0.9fr] px-3 py-2 text-[13px] ${i % 2 ? "bg-slate-50" : "bg-white"}`}>
              <span className="font-bold">{d}</span>
              <span className="text-center text-slate-500">{det}</span>
              <span className="text-right font-bold">{amt}</span>
            </div>
          ))}
          <div className="flex items-center justify-between px-3 py-3" style={{ background: NAVY_DEEP }}>
            <span className="text-sm font-extrabold tracking-wide text-white">GRAND TOTAL</span>
            <span className="text-xl font-bold" style={{ fontFamily: SERIF, color: GOLD }}>{usd(pricing.grandTotal)}</span>
          </div>
        </div>

        {q.notes && (
          <>
            <GLabel className="mt-4">Special Requirements</GLabel>
            <p className="text-sm text-slate-500">{q.notes}</p>
          </>
        )}

        <GLabel className="mt-4">Terms &amp; Conditions</GLabel>
        <ol className="list-decimal pl-5 text-xs leading-relaxed text-slate-500">
          <li>This quotation is valid for 72 hours from the date of issue.</li>
          <li>A 50% deposit is required upon confirmation of booking.</li>
          <li>Pricing is subject to change based on fuel price fluctuations beyond ±5%.</li>
          <li>Cancellation within 24 hours of departure is non-refundable.</li>
          <li>All prices are exclusive of applicable government fees and airport charges unless stated.</li>
        </ol>

        {/* Signatures */}
        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-slate-100 pt-4">
          <div>
            <div className="mb-2 text-sm text-slate-500">Authorised Signature</div>
            <div className="border-b border-slate-300 pb-1 text-xl" style={{ fontFamily: SERIF }}>{user}</div>
            <div className="mt-1 text-[11px] text-slate-500">Charter Consultant · Carewell Aviation</div>
          </div>
          <div>
            <div className="mb-2 text-sm text-slate-500">Client Acceptance</div>
            <div className="h-8 border-b border-slate-300" />
            <div className="mt-1 text-[11px] text-slate-500">Signature &amp; Date</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-2.5" style={{ background: NAVY_DEEP }}>
        <span className="text-sm font-bold text-white" style={{ fontFamily: SERIF }}>
          CAREWELL <span style={{ color: GOLD }}>AVIATION</span>
        </span>
        <span className="text-[11px] text-white/70">carewellaviation.com · +91 98741 64445 · {quoteRef}</span>
      </div>
    </div>
  );
}

function GLabel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-1.5 text-xs font-extrabold uppercase tracking-widest ${className}`} style={{ color: GOLD }}>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="mb-1 flex text-[13px]">
      <span className="w-24 shrink-0 text-slate-500">{k}</span>
      <span className="font-bold">{v}</span>
    </div>
  );
}
