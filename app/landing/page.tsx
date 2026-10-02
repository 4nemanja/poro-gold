import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  Coins,
  ExternalLink,
  Gamepad2,
  Headphones,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "PoroGold — Game Top-Ups, Crew & Gifting on GameBoost, Playerok and G2G",
  description:
    "PoroGold sells Fortnite top-ups, Crew, gifting and pre-loaded accounts plus top-ups for Genshin Impact, Valorant, Free Fire and more. Verified seller on GameBoost, Playerok and G2G.",
};

/* ---------------------------------------------------------------------------
   Our seller profiles. REPLACE every `href` with the real profile URL — they
   currently point at each marketplace homepage so nothing 404s, but these are
   NOT our storefronts yet. The URL shapes look like:
     GameBoost  https://gameboost.com/seller/<slug>
     Playerok   https://playerok.com/profile/<username>
     G2G        https://www.g2g.com/user/<username>
--------------------------------------------------------------------------- */
const PLATFORMS = [
  {
    name: "GameBoost",
    href: "https://gameboost.com",
    tagline: "Our main storefront",
    blurb:
      "The widest selection we run: Fortnite top-ups, Crew subscriptions, gifting and pre-loaded accounts, all with buyer protection on every order.",
    offers: ["Fortnite Top-Ups", "Crew", "Gifting", "Pre-loaded Accounts"],
    accent: "#8B5CF6",
  },
  {
    name: "Playerok",
    href: "https://playerok.com",
    tagline: "Fast in-chat delivery",
    blurb:
      "Built around live chat, so you can message us, agree the order and get delivered inside the same conversation — ideal for custom requests.",
    offers: ["Top-Ups", "Crew", "Custom Orders"],
    accent: "#A855F7",
  },
  {
    name: "G2G",
    href: "https://www.g2g.com",
    tagline: "Global marketplace",
    blurb:
      "One of the largest gaming marketplaces in the world, with escrow on every purchase and payment methods for just about every country.",
    offers: ["Fortnite Top-Ups", "Crew", "Escrow Protected"],
    accent: "#6366F1",
  },
] as const;

const CATALOG = [
  {
    icon: Coins,
    title: "Fortnite Top-Ups",
    body: "V-Bucks delivered straight to your account. No account sharing, no password needed.",
  },
  {
    icon: Sparkles,
    title: "Fortnite Crew & Gifting",
    body: "Crew subscriptions and in-game item gifting handled through official gifting.",
  },
  {
    icon: Gamepad2,
    title: "Pre-loaded Accounts",
    body: "Ready-to-play accounts with full credentials handed over at delivery.",
  },
  {
    icon: Zap,
    title: "Multi-Game Top-Ups",
    body: "Genshin Impact, Valorant, Free Fire, Brawl Stars, Clash Royale, Rocket League and more.",
  },
] as const;

const TRUST = [
  {
    icon: Clock,
    title: "Delivery in minutes",
    body:
      "Most top-ups are completed within minutes of payment clearing. If anything needs longer, you hear it from us first — not after the fact.",
  },
  {
    icon: ShieldCheck,
    title: "Marketplace protected",
    body:
      "Every order runs through GameBoost, Playerok or G2G. Your payment sits in their escrow until you confirm delivery, so you are never exposed.",
  },
  {
    icon: Lock,
    title: "No account risk",
    body:
      "Top-ups and gifting use official in-game flows. We never ask for your password, and credentials we do hand over are yours to change immediately.",
  },
  {
    icon: Headphones,
    title: "Real humans on chat",
    body:
      "Questions before you buy, or something odd after? You get a person who knows the order, not a macro reply from a queue.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Pick a marketplace",
    body:
      "Open our profile on GameBoost, Playerok or G2G — whichever has the payment method you prefer.",
  },
  {
    n: "02",
    title: "Order and pay",
    body:
      "Choose your package and check out on the platform. Your money is held in escrow, not sent to us directly.",
  },
  {
    n: "03",
    title: "Get delivered",
    body:
      "We fulfil the order and confirm on the platform. You release the escrow once you have what you paid for.",
  },
] as const;

const STATS = [
  { icon: BadgeCheck, value: "3", label: "Verified storefronts" },
  { icon: Gamepad2, value: "16+", label: "Games supported" },
  { icon: Users, value: "1,000+", label: "Orders delivered" },
  { icon: Star, value: "Escrow", label: "On every order" },
] as const;

export default function LandingPage() {
  return (
    <div
      id="porogold-landing"
      className="min-h-screen bg-[#070B20] font-sans text-white antialiased"
    >
      {/* ---------------------------------------------------------------- nav */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070B20]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-white/70 md:flex">
            <a className="transition-colors hover:text-white" href="#platforms">
              Where to buy
            </a>
            <a className="transition-colors hover:text-white" href="#catalog">
              What we sell
            </a>
            <a className="transition-colors hover:text-white" href="#why">
              Why PoroGold
            </a>
            <a className="transition-colors hover:text-white" href="#how">
              How it works
            </a>
          </nav>
          <a
            href="#platforms"
            className="rounded-lg bg-[#8B5CF6] px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(139,92,246,0.9)] transition-colors hover:bg-[#7C3AED]"
          >
            Buy now
          </a>
        </div>
      </header>

      {/* -------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        {/* Purple glows. Pointer-events off so they never swallow a click. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.38),transparent)] blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-[380px] w-[380px] rounded-full bg-[radial-gradient(closest-side,rgba(99,102,241,0.3),transparent)] blur-2xl"
        />

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pb-28 md:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#8B5CF6]/40 bg-[#8B5CF6]/10 px-4 py-1.5 text-xs font-medium tracking-wide text-[#C4B5FD]">
            <BadgeCheck className="h-3.5 w-3.5" />
            Verified seller on GameBoost · Playerok · G2G
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            Game top-ups, Crew and gifting —{" "}
            <span className="bg-[linear-gradient(100deg,#A78BFA_0%,#8B5CF6_45%,#6366F1_100%)] bg-clip-text text-transparent">
              delivered in minutes
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
            PoroGold is a verified seller of Fortnite top-ups, Crew subscriptions,
            gifting and pre-loaded accounts — plus top-ups across 16+ other games. Buy
            through the marketplace you already trust, with escrow on every order.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#platforms"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B5CF6] px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_40px_-12px_rgba(139,92,246,0.95)] transition-colors hover:bg-[#7C3AED] sm:w-auto"
            >
              See our storefronts
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              href="#catalog"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:border-white/30 hover:bg-white/10 sm:w-auto"
            >
              Browse what we sell
            </a>
          </div>

          {/* Trust strip */}
          <dl className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {STATS.map(({ icon: Icon, value, label }) => (
              <div key={label} className="bg-[#0B1130] px-5 py-6">
                <Icon className="mx-auto h-4 w-4 text-[#A78BFA]" />
                <dd className="mt-2.5 text-2xl font-bold tracking-tight">{value}</dd>
                <dt className="mt-1 text-xs text-white/55">{label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* --------------------------------------------------------- platforms */}
      <Section
        id="platforms"
        eyebrow="Where to find us"
        title="Buy from PoroGold on the marketplace you trust"
        lead="We don't take payments on this site. Every order goes through a marketplace that holds your money in escrow until you confirm delivery — pick the one that suits you."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {PLATFORMS.map((p) => (
            <article
              key={p.name}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1130] p-7 transition-colors hover:border-[#8B5CF6]/50"
            >
              {/* Accent hairline picks up each platform's own hue. */}
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px"
                style={{
                  background: `linear-gradient(90deg,transparent,${p.accent},transparent)`,
                }}
              />
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#A78BFA]">
                {p.tagline}
              </p>
              <h3 className="mt-2.5 text-2xl font-bold tracking-tight">{p.name}</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/65">{p.blurb}</p>

              <ul className="mt-5 mb-7 flex flex-wrap gap-2">
                {p.offers.map((o) => (
                  <li
                    key={o}
                    className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70"
                  >
                    {o}
                  </li>
                ))}
              </ul>

              {/* mt-auto pins the CTA to the card bottom so all three line up
                  even when the tag list above wraps onto a second row. */}
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B5CF6]/45 bg-[#8B5CF6]/15 px-5 py-3 text-sm font-semibold text-white transition-colors hover:border-[#8B5CF6] hover:bg-[#8B5CF6]"
              >
                View our {p.name} profile
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </article>
          ))}
        </div>
      </Section>

      {/* ----------------------------------------------------------- catalog */}
      <Section
        id="catalog"
        eyebrow="What we sell"
        title="Top-ups, subscriptions, gifting and accounts"
        lead="Fortnite is our core, but our top-up catalogue runs well past it."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {CATALOG.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-[#0B1130] p-7 transition-colors hover:border-[#8B5CF6]/40"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-white/45">
          Genshin Impact · Honkai: Star Rail · Zenless Zone Zero · Valorant · Free Fire ·
          PUBG Mobile · Marvel Rivals · Clash Royale · Brawl Stars · Destiny 2 · Rocket
          League · Telegram Premium
        </p>
      </Section>

      {/* --------------------------------------------------------------- why */}
      <Section
        id="why"
        eyebrow="Why PoroGold"
        title="The boring parts, done properly"
        lead="Buying game currency online is full of ways to get burned. Here is how we take those off the table."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {TRUST.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-white/10 bg-[#0B1130] p-7"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#A78BFA]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* --------------------------------------------------------------- how */}
      <Section id="how" eyebrow="How it works" title="Three steps, no surprises">
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="rounded-2xl border border-white/10 bg-[#0B1130] p-7"
            >
              <span className="text-4xl font-bold tracking-tight text-[#8B5CF6]/35">
                {s.n}
              </span>
              <h3 className="mt-3 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{s.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* --------------------------------------------------------- final CTA */}
      <section className="px-6 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-[#8B5CF6]/30 bg-[linear-gradient(135deg,#101845_0%,#0B1130_55%,#1A1150_100%)] px-8 py-14 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[640px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(139,92,246,0.35),transparent)] blur-2xl"
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to top up?</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/70">
              Open our profile on GameBoost, Playerok or G2G and order in a couple of
              minutes. Message us first if you want something custom.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              {PLATFORMS.map((p) => (
                <a
                  key={p.name}
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#8B5CF6] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_34px_-12px_rgba(139,92,246,0.95)] transition-colors hover:bg-[#7C3AED]"
                >
                  {p.name}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ footer */}
      <footer className="border-t border-white/10 bg-[#060917]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-sm">
              <Wordmark />
              <p className="mt-4 text-sm leading-relaxed text-white/55">
                Verified seller of game top-ups, Crew subscriptions, gifting and
                pre-loaded accounts across GameBoost, Playerok and G2G.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
              <FooterCol title="Marketplaces">
                {PLATFORMS.map((p) => (
                  <FooterLink key={p.name} href={p.href}>
                    {p.name}
                  </FooterLink>
                ))}
              </FooterCol>
              <FooterCol title="Site">
                <FooterLink href="#platforms">Where to buy</FooterLink>
                <FooterLink href="#catalog">What we sell</FooterLink>
                <FooterLink href="#why">Why PoroGold</FooterLink>
                <FooterLink href="#how">How it works</FooterLink>
              </FooterCol>
              <FooterCol title="Support">
                <li className="flex items-center gap-2 text-sm text-white/55">
                  <MessageCircle className="h-3.5 w-3.5 text-[#A78BFA]" />
                  Chat on any marketplace
                </li>
              </FooterCol>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-7 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} PoroGold. All rights reserved.</p>
            <p>
              Not affiliated with or endorsed by Epic Games, Riot Games, HoYoverse or any
              other game publisher. All trademarks belong to their respective owners.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* --------------------------------------------------------------- partials */

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#A78BFA,#7C3AED)] text-sm font-bold text-white">
        P
      </span>
      <span className="text-lg font-bold tracking-tight">
        Poro<span className="text-[#A78BFA]">Gold</span>
      </span>
    </span>
  );
}

function Section({
  id,
  eyebrow,
  title,
  lead,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-white/5 px-6 py-20 md:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A78BFA]">
            {eyebrow}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
          {lead && <p className="mt-4 leading-relaxed text-white/65">{lead}</p>}
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith("http");
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-sm text-white/55 transition-colors hover:text-white"
      >
        {children}
      </a>
    </li>
  );
}
