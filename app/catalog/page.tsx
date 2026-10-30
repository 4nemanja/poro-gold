import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Cloud,
  Gamepad2,
  GraduationCap,
  Headphones,
  Heart,
  MessageCircle,
  Palette,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PoroGold — What We Offer",
  description:
    "Game top-ups and premium subscriptions from PoroGold: PUBG Mobile, Fortnite, Mobile Legends, Pokémon GO, Netflix, Spotify, YouTube Premium, Canva, Notion, Duolingo and more.",
};

/* ---------------------------------------------------------------------------
   The public catalogue. No prices on purpose — this page is for showing people
   the range; pricing is handled in chat. To add a product, drop it into the
   right category below and save its app icon as
   public/catalog-icons/<slug>.png (128×128, slug from iconSlug(name)).
--------------------------------------------------------------------------- */
type Item = { name: string; detail: string };

const CATEGORIES: {
  id: string;
  icon: typeof Gamepad2;
  title: string;
  lead: string;
  items: Item[];
}[] = [
  {
    id: "games",
    icon: Gamepad2,
    title: "Games",
    lead: "In-game currency, passes and packs, topped up straight to your account.",
    items: [
      { name: "PUBG Mobile", detail: "UC & Royale Pass" },
      { name: "Fortnite", detail: "V-Bucks & Crew" },
      { name: "Pokémon GO", detail: "PokéCoins" },
      { name: "Mobile Legends", detail: "Diamonds & passes" },
      { name: "Kingshot", detail: "Gems & packs" },
      { name: "Whiteout Survival", detail: "Gems & packs" },
      { name: "Coin Master", detail: "Spins & coins" },
      { name: "Archero 2", detail: "Gems & packs" },
      { name: "Plague Inc.", detail: "Premium content" },
    ],
  },
  {
    id: "streaming",
    icon: PlayCircle,
    title: "Streaming & Music",
    lead: "Premium plans for the apps you already use every day.",
    items: [
      { name: "Netflix", detail: "Premium plans" },
      { name: "YouTube", detail: "YouTube Premium" },
      { name: "Spotify", detail: "Spotify Premium" },
      { name: "Deezer", detail: "Deezer Premium" },
      { name: "SoundCloud", detail: "SoundCloud Go+" },
    ],
  },
  {
    id: "productivity",
    icon: Palette,
    title: "Creative & Productivity",
    lead: "Pro tiers for design, writing, notes and meetings.",
    items: [
      { name: "Canva", detail: "Canva Pro" },
      { name: "Picsart", detail: "Picsart Pro" },
      { name: "Notion", detail: "Plus & AI" },
      { name: "Grammarly", detail: "Grammarly Pro" },
      { name: "Zoom", detail: "Zoom Pro" },
    ],
  },
  {
    id: "learning",
    icon: GraduationCap,
    title: "Learning",
    lead: "Keep the streak going, or pick up a new skill.",
    items: [
      { name: "Duolingo", detail: "Super & Max" },
      { name: "LinkedIn Learning", detail: "Full course library" },
    ],
  },
  {
    id: "cloud",
    icon: Cloud,
    title: "Cloud & Privacy",
    lead: "Storage and private email, VPN and drive.",
    items: [
      { name: "Google One", detail: "Storage plans" },
      { name: "Proton", detail: "Mail, VPN & Drive" },
    ],
  },
  {
    id: "social",
    icon: Heart,
    title: "Social & Dating",
    lead: "Yes, really.",
    items: [{ name: "Tinder", detail: "Plus, Gold & Platinum" }],
  },
];

const TOTAL = CATEGORIES.reduce((n, c) => n + c.items.length, 0);

const PERKS = [
  {
    icon: Clock,
    title: "Fast delivery",
    body: "Most orders are done within minutes. If something needs longer, we tell you up front.",
  },
  {
    icon: ShieldCheck,
    title: "Safe for your account",
    body: "Official top-up and activation methods only. We never need your password for a top-up.",
  },
  {
    icon: Headphones,
    title: "A real person on chat",
    body: "Ask anything before you buy. You talk to someone who handles your order directly.",
  },
  {
    icon: Sparkles,
    title: "Don't see it? Ask",
    body: "The list keeps growing. If a game or app isn't here, message us — we can usually source it.",
  },
] as const;

export default function CatalogPage() {
  return (
    <div
      // Reuses the landing id so globals.css paints the body navy behind it.
      id="porogold-landing"
      className="min-h-screen bg-[#070B20] font-sans text-white antialiased"
    >
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070B20]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
            {CATEGORIES.slice(0, 4).map((c) => (
              <a key={c.id} className="transition-colors hover:text-white" href={`#${c.id}`}>
                {c.title}
              </a>
            ))}
          </nav>
          <a
            href="#contact"
            className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.9)] transition-colors hover:bg-[#7C3AED]"
          >
            Get in touch
          </a>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.38),transparent)] blur-2xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-20 text-center sm:px-6 md:pb-20 md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
            <BadgeCheck className="h-3.5 w-3.5" />
            {TOTAL}+ games &amp; apps and counting
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Game top-ups &amp; premium subscriptions,{" "}
            <span className="bg-[linear-gradient(100deg,#A78BFA_0%,#8B5CF6_45%,#6366F1_100%)] bg-clip-text text-transparent">
              all in one place
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            From PUBG Mobile UC and Fortnite V-Bucks to Netflix, Spotify and Canva Pro —
            here is everything PoroGold can get you. See something you like? Message us
            for current availability.
          </p>

          {/* Category jump chips — the quickest way around on a phone. */}
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
            {CATEGORIES.map(({ id, icon: Icon, title, items }) => (
              <a
                key={id}
                href={`#${id}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-[#8B5CF6]/60 hover:bg-[#8B5CF6]/15 hover:text-white"
              >
                <Icon className="h-4 w-4 text-[#A78BFA]" />
                {title}
                <span className="text-white/40">{items.length}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- categories */}
      {CATEGORIES.map(({ id, icon: Icon, title, lead, items }) => (
        <section
          key={id}
          id={id}
          className="scroll-mt-20 border-t border-white/5 px-4 py-14 sm:px-6 md:py-16"
        >
          <div className="mx-auto max-w-6xl">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
                <p className="mt-1.5 text-white/60">{lead}</p>
              </div>
            </div>

            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((item) => (
                <li
                  key={item.name}
                  className="group flex items-center gap-3.5 rounded-2xl border border-white/10 bg-[#0B1130] p-4 transition-colors hover:border-[#8B5CF6]/45"
                >
                  <AppIcon name={item.name} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold tracking-tight">{item.name}</p>
                    <p className="truncate text-xs text-white/50">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* ------------------------------------------------------------- perks */}
      <section className="border-t border-white/5 px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Why people buy from us
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PERKS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-[#0B1130] p-6">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- contact */}
      <section id="contact" className="scroll-mt-20 px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#8B5CF6]/30 bg-[linear-gradient(135deg,#101845_0%,#0B1130_55%,#1A1150_100%)] px-6 py-14 text-center sm:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.35),transparent)] blur-2xl"
          />
          <div className="relative">
            <MessageCircle className="mx-auto h-8 w-8 text-[#A78BFA]" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Interested in something?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Message us with the game or app you want and we&apos;ll get back to you with
              options and availability. Prices are shared in chat.
            </p>
            <a
              href="/landing#platforms"
              className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-7 py-3.5 font-semibold text-white shadow-[0_14px_40px_-12px_rgba(139,92,246,0.95)] transition-colors hover:bg-[#7C3AED]"
            >
              Find us on the marketplaces
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-white/10 bg-[#060917]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} PoroGold. All rights reserved.</p>
          <p>
            Not affiliated with or endorsed by any game publisher or app listed. All
            trademarks belong to their respective owners.
          </p>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------- partials */

// "Pokémon GO" -> "pokemon-go", "Plague Inc." -> "plague-inc".
function iconSlug(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ.]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

function AppIcon({ name }: { name: string }) {
  return (
    // Plain <img>: 24 tiny static PNGs, nothing for the optimizer to win.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/catalog-icons/${iconSlug(name)}.png`}
      alt=""
      width={44}
      height={44}
      loading="lazy"
      className="h-11 w-11 shrink-0 rounded-xl ring-1 ring-white/10"
    />
  );
}

function Wordmark() {
  return (
    <a href="/catalog" className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#A78BFA,#7C3AED)] text-sm font-bold text-white">
        P
      </span>
      <span className="text-lg font-bold tracking-tight">
        Poro<span className="text-[#A78BFA]">Gold</span>
      </span>
    </a>
  );
}
