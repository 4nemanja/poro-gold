import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Filter, List, RotateCw, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { giftService } from './giftService';
import { type FortniteOffer, type PublicGiftOrder } from './types';

const RARITY_COLORS: Record<string, string> = {
  common: '#94a3b8', uncommon: '#2cc000', rare: '#00acec', epic: '#a855f7',
  legendary: '#f59e0b', mythic: '#eab308', icon: '#29b6f6', marvel: '#ef4444',
  dc: '#2563eb', dcuseries: '#2563eb', gaminglegends: '#7c3aed',
  gaminglegendsseries: '#7c3aed', marvelseries: '#ef4444', starwars: '#3b82f6',
  columbusseries: '#3b82f6',
};

const titleClass = 'font-black uppercase tracking-[0.035em] [font-family:Impact,Haettenschweiler,Arial_Narrow_Bold,sans-serif]';
const storefrontBackdropClass = 'bg-[#07111f] [background-image:radial-gradient(circle_at_75%_10%,rgba(68,77,190,0.30),transparent_38%),radial-gradient(circle_at_15%_45%,rgba(30,140,255,0.18),transparent_42%)]';
const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20d4ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#ffffff]';
const darkFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20d4ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1728]';
const itemFallbackImage = '/gift-item-fallback.svg';
const sectionId = (id: string) => {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) hash = Math.imul(hash ^ id.charCodeAt(index), 16777619);
  return `gift-section-${(hash >>> 0).toString(36)}`;
};
const discountPercent = (offer: FortniteOffer) => offer.regularPrice > offer.finalPrice
  ? Math.round((1 - offer.finalPrice / offer.regularPrice) * 100)
  : 0;
const rarityColor = (rarity?: string) => RARITY_COLORS[(rarity || 'common').replace(/[^a-z]/gi, '').toLowerCase()] || RARITY_COLORS.common;

const Vbucks = ({ className = '' }: { className?: string }) => <span aria-hidden="true" className={`inline-flex shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-cyan-300 to-blue-600 font-black italic text-white shadow-sm ${className}`}>V</span>;

function CosmeticImage({ src, className, loading = 'eager' }: { src: string | null; className: string; loading?: 'eager' | 'lazy' }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const resolvedSrc = src && failedSrc !== src ? src : itemFallbackImage;
  return <img src={resolvedSrc} alt="" loading={loading} decoding="async" className={className}
    onError={() => { if (resolvedSrc !== itemFallbackImage) setFailedSrc(resolvedSrc); }} />;
}

const SelectionSuccess = ({ order }: { order: PublicGiftOrder }) => <main className={`flex min-h-screen items-center justify-center bg-fixed px-5 py-12 text-white [color-scheme:light] ${storefrontBackdropClass}`}>
  <section className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#2488ff]/35 bg-[#0b1728] shadow-2xl shadow-black/35">
    <div className="h-2 bg-[#146cff]" />
    <div className="p-7 text-center sm:p-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#19c98b] text-white shadow-lg shadow-[#19c98b]/20"><Check className="h-9 w-9" strokeWidth={3} /></span>
      <h1 className={`mt-3 text-4xl leading-[1.05] text-white sm:text-5xl ${titleClass}`}>Your selection has been confirmed.</h1>
      <div className="mx-auto mt-8 grid max-w-xl overflow-hidden rounded-3xl border border-[#b9c8db] bg-[#ffffff] text-[#07111f] sm:grid-cols-[220px_1fr]">
        <div className="flex min-h-52 items-center justify-center bg-[#eef4fb] p-5">
          <CosmeticImage src={order.selectedItemImageUrl} className="h-48 w-48 object-contain drop-shadow-xl" />
        </div>
        <dl className="space-y-5 p-6 text-left">
          <div><dt className="text-[11px] font-black uppercase tracking-widest text-[#5f7592]">Selected item</dt><dd className="mt-1 text-xl font-black text-[#07111f]">{order.selectedItemName}</dd></div>
          <div><dt className="text-[11px] font-black uppercase tracking-widest text-[#5f7592]">Price</dt><dd className="mt-1 flex items-center gap-2 text-lg font-black text-[#146cff]"><Vbucks className="h-5 w-5 text-[9px]" />{order.selectedItemPrice?.toLocaleString()} V-Bucks</dd></div>
          <div><dt className="text-[11px] font-black uppercase tracking-widest text-[#5f7592]">Remaining balance</dt><dd className="mt-1 text-lg font-black text-[#146cff]">{order.remainingVbucks.toLocaleString()} V-Bucks</dd></div>
        </dl>
      </div>
      <p className="mt-8 font-medium text-[#b9c8db]">The seller will process your gift.</p>
    </div>
  </section>
</main>;

const ShopSkeleton = () => <div className="space-y-8" aria-label="Loading Item Shop">
  <div className="h-12 w-56 animate-pulse rounded-lg bg-slate-200" />
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{Array.from({ length: 10 }).map((_, index) => <div key={index} className="aspect-[4/5] animate-pulse rounded-3xl bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100" />)}</div>
</div>;

export function PublicGiftShopPage({ token }: { token: string }) {
  const [order, setOrder] = useState<PublicGiftOrder | null>(null);
  const [offers, setOffers] = useState<FortniteOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [selected, setSelected] = useState<FortniteOffer | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const sectionsMenuRef = useRef<HTMLDivElement>(null);
  const sectionsButtonRef = useRef<HTMLButtonElement>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await giftService.getPublicShop(token);
      setOrder(result.order); setOffers(result.offers);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to open this gift.');
    } finally { setLoading(false); }
  }, [token]);

  // Initial public data synchronization; no dashboard session is involved.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) { setSelected(null); setConfirming(false); setSelectionError(null); }
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', closeOnEscape); };
  }, [selected, submitting]);

  useEffect(() => {
    if (!sectionsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!sectionsMenuRef.current?.contains(event.target as Node)) setSectionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSectionsOpen(false);
        sectionsButtonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [sectionsOpen]);

  const sectionGroups = useMemo(() => {
    const groups: Array<{ section: FortniteOffer['section']; offers: FortniteOffer[] }> = [];
    const byId = new Map<string, { section: FortniteOffer['section']; offers: FortniteOffer[] }>();
    for (const offer of offers) {
      let group = byId.get(offer.section.id);
      if (!group) {
        group = { section: offer.section, offers: [] };
        byId.set(offer.section.id, group);
        groups.push(group);
      }
      if (!group.offers.some((item) => item.offerId === offer.offerId)) group.offers.push(offer);
    }
    return groups;
  }, [offers]);
  const typeFilters = useMemo(() => Array.from(new Set(offers.map((offer) => offer.type))).sort(), [offers]);
  const filteredOffers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesSearch = !query || `${offer.name} ${offer.type} ${offer.section.displayName}`.toLowerCase().includes(query);
      const matchesFilters = activeFilters.length === 0 || activeFilters.some((filter) =>
        filter === 'Sale' ? discountPercent(offer) > 0 : offer.type === filter,
      );
      return matchesSearch && matchesFilters;
    });
  }, [offers, search, activeFilters]);
  const groupedOffers = useMemo(() => {
    const visibleIds = new Set(filteredOffers.map((offer) => offer.offerId));
    return sectionGroups.map((group) => ({
      section: group.section,
      offers: group.offers.filter((offer) => visibleIds.has(offer.offerId)),
    })).filter((group) => group.offers.length);
  }, [sectionGroups, filteredOffers]);
  const sectionOptions = useMemo(() => {
    const byDisplayName = new Map<string, FortniteOffer['section']>();
    for (const group of groupedOffers) {
      if (!byDisplayName.has(group.section.displayName)) byDisplayName.set(group.section.displayName, group.section);
    }
    return Array.from(byDisplayName.values());
  }, [groupedOffers]);

  const openSectionsWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    setSectionsOpen(true);
    requestAnimationFrame(() => {
      const items = sectionsMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
      items?.[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus();
    });
  };
  const moveSectionFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    if (!items.length) return;
    event.preventDefault();
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowDown' ? (currentIndex + 1) % items.length
        : (currentIndex - 1 + items.length) % items.length;
    items[nextIndex]?.focus();
  };
  const goToSection = (section: FortniteOffer['section']) => {
    setActiveSectionId(section.id);
    setSectionsOpen(false);
    document.getElementById(sectionId(section.id))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    sectionsButtonRef.current?.focus({ preventScroll: true });
  };

  const toggleFilter = (filter: string) => setActiveFilters((current) =>
    current.includes(filter) ? current.filter((item) => item !== filter) : [...current, filter],
  );
  const clearSearchAndFilters = () => { setSearch(''); setActiveFilters([]); };
  const closeModal = () => { if (!submitting) { setSelected(null); setConfirming(false); setSelectionError(null); } };

  const choose = async () => {
    if (!selected || !order || selected.finalPrice > order.remainingVbucks || submitting) return;
    if (!confirming) { setConfirming(true); setSelectionError(null); return; }
    setSubmitting(true); setSelectionError(null);
    try {
      const result = await giftService.select(token, selected.offerId);
      setOrder({ ...order, selectedOfferId: selected.offerId, selectedItemName: result.selectedItemName,
        selectedItemPrice: result.selectedItemPrice, selectedItemImageUrl: result.selectedItemImageUrl,
        remainingVbucks: result.remainingVbucks, status: result.status });
      setSelected(null); setConfirming(false);
    } catch (nextError) {
      setSelectionError(nextError instanceof Error ? nextError.message : 'Unable to confirm your selection.');
    } finally { setSubmitting(false); }
  };

  if (!loading && order?.selectedOfferId) return <SelectionSuccess order={order} />;

  return <div className={`min-h-screen bg-fixed text-white [color-scheme:light] selection:bg-[#20d4ff]/35 selection:text-[#07111f] ${storefrontBackdropClass}`}>
    <div className="relative z-40 mx-auto mt-3 max-w-[1600px] px-4 sm:sticky sm:top-3 lg:px-8">
      <div className="rounded-2xl border border-white/10 bg-[#07111f]/90 p-3 shadow-xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-3 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)_minmax(0,1fr)] xl:items-center xl:gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2 xl:flex-nowrap xl:justify-self-start">
            {order && <>
              <div className="flex h-11 min-w-0 max-w-full items-center gap-2 rounded-full border border-white/15 bg-[#12233a] px-4 text-sm font-bold text-white shadow-sm">
                <UserRound aria-hidden="true" className="h-4 w-4 shrink-0 text-[#20d4ff]" />
                <span className="max-w-[12rem] truncate">{order.customer}</span>
              </div>
              <div className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[#12233a] px-4 text-sm font-black text-white shadow-sm">
                <Vbucks className="h-5 w-5 text-[9px]" />
                <span>{order.remainingVbucks.toLocaleString()} V-Bucks</span>
              </div>
            </>}
          </div>
          <label className="relative min-w-0 w-full xl:justify-self-center">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5f7592]" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search cosmetics..." aria-label="Search cosmetics" className={`h-11 w-full rounded-full border border-[#b9c8db] !bg-[#eef4fb] pl-10 pr-10 text-sm !text-[#07111f] outline-none placeholder:!text-[#5f7592] focus:border-[#146cff] focus:ring-2 focus:ring-[#146cff]/25 ${focusClass}`} />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search" className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#5f7592] hover:bg-[#b9c8db]/45 hover:text-[#07111f] ${focusClass}`}><X className="h-4 w-4" /></button>}
          </label>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:justify-self-end">
            <button type="button" onClick={() => { setFiltersOpen((open) => !open); setSectionsOpen(false); }} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#12233a] px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1a3150] xl:w-auto ${darkFocusClass}`}><Filter className="h-4 w-4" /> Filters{activeFilters.length > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#146cff] px-1 text-[10px]">{activeFilters.length}</span>}</button>
            <div ref={sectionsMenuRef} className="relative min-w-0">
              <button ref={sectionsButtonRef} type="button" aria-haspopup="menu" aria-expanded={sectionsOpen} aria-controls="gift-shop-sections-menu" disabled={!sectionOptions.length} onKeyDown={openSectionsWithKeyboard} onClick={() => { setSectionsOpen((open) => !open); setFiltersOpen(false); }} className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#12233a] px-5 text-xs font-black uppercase tracking-wider text-white hover:bg-[#1a3150] disabled:cursor-not-allowed disabled:opacity-50 xl:w-auto ${darkFocusClass}`}><List className="h-4 w-4" /> Shop Sections <ChevronDown className={`h-4 w-4 transition ${sectionsOpen ? 'rotate-180' : ''}`} /></button>
              {sectionsOpen && <div id="gift-shop-sections-menu" role="menu" aria-label="Shop sections" onKeyDown={moveSectionFocus} className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(24rem,calc(100dvh-8rem))] overflow-y-auto rounded-2xl border border-white/15 bg-[#0b1728] p-2 shadow-2xl shadow-black/40 sm:left-auto sm:w-80">
                {sectionOptions.map((section) => <button key={section.displayName} type="button" role="menuitem" onClick={() => goToSection(section)} className={`block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${activeSectionId === section.id ? 'bg-[#146cff] text-white' : 'text-[#eef4fb] hover:bg-white/10'} ${darkFocusClass}`}>{section.displayName}</button>)}
              </div>}
            </div>
          </div>
        </div>
        {filtersOpen && <div className="mt-3 border-t border-white/10 pt-3"><div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => toggleFilter('Sale')} className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${darkFocusClass} ${activeFilters.includes('Sale') ? 'border-[#f05a67] bg-[#f05a67] text-white' : 'border-[#f05a67] text-[#ff9aa4] hover:bg-[#f05a67]/15'}`}>Sale</button>
        {typeFilters.map((type) => <button type="button" key={type} onClick={() => toggleFilter(type)} className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition ${darkFocusClass} ${activeFilters.includes(type) ? 'border-[#146cff] bg-[#146cff] text-white' : 'border-white/20 text-[#b9c8db] hover:border-[#20d4ff] hover:text-white'}`}>{type}</button>)}
        {activeFilters.length > 0 && <button type="button" onClick={() => setActiveFilters([])} className={`px-3 text-[11px] font-black uppercase tracking-widest text-[#b9c8db] hover:text-white ${darkFocusClass}`}>Clear filters</button>}
        </div></div>}
      </div>
    </div>

    <div className="mx-auto max-w-[1600px] px-4 pt-3 lg:px-8"><p className="text-xs font-semibold uppercase tracking-wide text-[#b9c8db] sm:text-sm">Choose one eligible item from the current Fortnite Item Shop.</p></div>

    <main className="mx-auto max-w-[1600px] px-4 pb-20 lg:px-8">
      <div className="min-w-0 py-8 lg:py-10">
        {loading && <ShopSkeleton />}
        {!loading && error && <section className="flex flex-col items-center rounded-3xl border border-[#2488ff]/35 bg-[#0b1728] px-6 py-20 text-center text-white shadow-lg shadow-black/15"><ShoppingBag className="h-16 w-16 text-[#20d4ff]" /><h2 className={`mt-6 text-4xl text-white ${titleClass}`}>Shop is drifting away</h2><p className="mt-3 max-w-md leading-7 text-[#b9c8db]">{error}</p><button type="button" onClick={() => void load()} className={`mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#146cff] px-7 py-4 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-[#146cff]/20 hover:bg-[#2488ff] ${darkFocusClass}`}><RotateCw className="h-5 w-5" /> Retry connection</button></section>}
        {!loading && !error && groupedOffers.length === 0 && <section className="flex flex-col items-center rounded-3xl border border-[#b9c8db] bg-[#ffffff] px-6 py-20 text-center"><Search className="h-14 w-14 text-[#5f7592]" /><h2 className={`mt-5 text-4xl text-[#07111f] ${titleClass}`}>No items found</h2><p className="mt-2 text-[#5f7592]">Try adjusting your filters or search terms.</p><button type="button" onClick={clearSearchAndFilters} className={`mt-6 text-xs font-black uppercase tracking-widest text-[#146cff] hover:underline ${focusClass}`}>Clear all filters</button></section>}
        {!loading && !error && <div className="space-y-16">{groupedOffers.map((group) => <section id={sectionId(group.section.id)} key={group.section.id} className="scroll-mt-28">
          <div className="mb-7 flex items-end justify-between border-b border-white/15 pb-4"><h2 className={`text-4xl leading-none text-white sm:text-5xl ${titleClass}`}>{group.section.displayName}</h2><span className="text-[11px] font-black uppercase tracking-widest text-[#b9c8db]">{group.offers.length} {group.offers.length === 1 ? 'item' : 'items'}</span></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 xl:grid-cols-4 2xl:grid-cols-5">{group.offers.map((offer) => {
            const eligible = Boolean(order && offer.finalPrice <= order.remainingVbucks);
            const discount = discountPercent(offer);
            const accent = rarityColor(offer.rarity);
            return <button type="button" key={offer.offerId} onClick={() => { setSelected(offer); setConfirming(false); setSelectionError(null); }} aria-label={`View ${offer.name}`} className={`group relative overflow-hidden rounded-3xl bg-[#ffffff] text-left shadow-sm ring-1 ring-[#b9c8db] transition duration-200 hover:-translate-y-1 hover:scale-[1.01] hover:shadow-xl ${focusClass} ${eligible ? '' : 'opacity-70 grayscale-[55%]'}`}>
              <div className="relative aspect-[4/5] overflow-hidden bg-[#eef4fb]"><div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at 50% 35%, ${accent}, transparent 62%)` }} /><CosmeticImage src={offer.image} loading="lazy" className="relative h-full w-full object-contain p-4 drop-shadow-xl transition duration-500 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#07111f]/95 to-transparent" />
                {discount > 0 && <span className="absolute left-4 top-4 rounded-md bg-[#f05a67] px-2 py-1 text-[10px] font-black text-white shadow">-{discount}%</span>}
                {!eligible && <span className="absolute inset-x-3 top-3 rounded-lg bg-[#07111f]/95 px-2 py-2 text-center text-[10px] font-black uppercase tracking-wider text-white">Not enough V-Bucks</span>}
                <div className="absolute inset-x-4 bottom-4 text-white"><p className="text-[10px] font-black uppercase tracking-widest text-[#b9c8db]">{offer.type}</p><h3 className={`mt-1 line-clamp-2 text-2xl leading-none text-white ${titleClass}`}>{offer.name}</h3></div>
              </div>
              <div className="flex items-center justify-between gap-2 p-4"><span className="flex items-center gap-1.5 text-lg font-black text-[#07111f]"><Vbucks className="h-5 w-5 text-[9px]" />{offer.finalPrice.toLocaleString()}</span>{discount > 0 ? <span className="text-xs font-semibold text-[#5f7592] line-through">{offer.regularPrice.toLocaleString()}</span> : <ChevronRight className="h-4 w-4 text-[#5f7592] transition group-hover:translate-x-1 group-hover:text-[#146cff]" />}</div>
              <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
            </button>;
          })}</div>
        </section>)}</div>}
      </div>
    </main>

    <footer className="border-t border-white/10 bg-[#07111f]/55 px-5 py-8 text-center text-xs text-[#b9c8db]">Cosmetic data is supplied by Fortnite-API.com. This storefront is not affiliated with Epic Games.</footer>

    {selected && order && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#07111f]/85 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeModal(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="gift-item-title" className="relative my-auto flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-[#ffffff] text-[#12233a] shadow-2xl md:flex-row">
        <button type="button" onClick={closeModal} disabled={submitting} aria-label="Close item details" className={`absolute right-5 top-5 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#07111f]/85 text-white backdrop-blur transition hover:bg-[#12233a] ${darkFocusClass}`}><X className="h-5 w-5" /></button>
        <div className="relative flex min-h-72 w-full items-center justify-center bg-[#eef4fb] p-7 md:min-h-[560px] md:w-1/2">
          <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle at center, ${rarityColor(selected.rarity)}, transparent 65%)` }} />
          <CosmeticImage src={selected.image} className="relative max-h-[480px] w-full object-contain drop-shadow-2xl" />
          <div className="absolute inset-x-0 bottom-0 h-3" style={{ backgroundColor: rarityColor(selected.rarity) }} />
        </div>
        <div className="flex min-h-0 w-full flex-col overflow-y-auto p-7 md:w-1/2 md:p-11">
          {!confirming ? <>
            <div className="flex flex-wrap gap-2"><span className="rounded bg-[#eef4fb] px-2 py-1 text-[10px] font-black uppercase tracking-widest text-[#5f7592]">{selected.type}</span><span className="rounded px-2 py-1 text-[10px] font-black uppercase tracking-widest text-white" style={{ backgroundColor: rarityColor(selected.rarity) }}>{selected.rarity || 'Common'}</span></div>
            <h2 id="gift-item-title" className={`mt-4 pr-10 text-5xl leading-[1.02] text-[#07111f] md:text-6xl ${titleClass}`}>{selected.name}</h2>
            <p className="mt-5 leading-7 text-[#5f7592]">{selected.description || 'A cosmetic offer currently available in the Fortnite Item Shop.'}</p>
            <div className="mt-8 flex flex-wrap items-end gap-4"><span className="flex items-center gap-2 text-4xl font-black text-[#146cff]"><Vbucks className="h-8 w-8 text-sm" />{selected.finalPrice.toLocaleString()}</span>{discountPercent(selected) > 0 && <div className="mb-1"><span className="mr-2 text-lg font-semibold text-[#5f7592] line-through">{selected.regularPrice.toLocaleString()}</span><span className="rounded bg-[#f05a67] px-2 py-1 text-[10px] font-black uppercase text-white">Save {discountPercent(selected)}%</span></div>}</div>
            <dl className="mt-7 rounded-2xl border border-[#b9c8db] bg-[#eef4fb] p-4 text-sm">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 font-medium">
                <dt className="min-w-0 text-[#5f7592]">Current balance</dt>
                <dd className="whitespace-nowrap text-right text-[#12233a]">{order.remainingVbucks.toLocaleString()} V-Bucks</dd>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[#b9c8db]/70 pt-3 font-medium">
                <dt className="min-w-0 truncate pr-2 text-[#5f7592]" title={selected.name}>{selected.name}</dt>
                <dd className="whitespace-nowrap text-right text-[#8a6200]" aria-label={`${selected.finalPrice.toLocaleString()} V-Bucks deducted`}>−{selected.finalPrice.toLocaleString()} V-Bucks</dd>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[#b9c8db] pt-3 font-black">
                <dt className="min-w-0 text-[#07111f]">Balance after selection</dt>
                <dd className="whitespace-nowrap text-right text-[#146cff]">{(order.remainingVbucks - selected.finalPrice).toLocaleString()} V-Bucks</dd>
              </div>
            </dl>
            <div className="mt-auto pt-8"><button type="button" disabled={selected.finalPrice > order.remainingVbucks || submitting} onClick={() => void choose()} className={`w-full rounded-2xl py-5 text-base font-black uppercase tracking-wide text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-[#b9c8db] disabled:text-[#5f7592] disabled:shadow-none ${selected.finalPrice <= order.remainingVbucks ? 'bg-[#146cff] shadow-[#146cff]/20 hover:bg-[#2488ff]' : ''} ${focusClass}`}>{selected.finalPrice <= order.remainingVbucks ? 'Choose This Item' : 'Not enough V-Bucks'}</button></div>
          </> : <>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-[#146cff]">Final confirmation</p><h2 id="gift-item-title" className={`mt-3 text-5xl leading-[1.02] text-[#07111f] ${titleClass}`}>Confirm Gift Selection</h2>
            <div className="mt-7 flex items-center gap-4 rounded-2xl bg-[#eef4fb] p-4"><CosmeticImage src={selected.image} className="h-24 w-24 rounded-xl bg-[#ffffff] object-contain" /><div className="min-w-0"><p className="truncate text-lg font-black text-[#07111f]">{selected.name}</p><p className="mt-2 flex items-center gap-1.5 font-black text-[#146cff]"><Vbucks className="h-5 w-5 text-[9px]" />{selected.finalPrice.toLocaleString()} V-Bucks</p></div></div>
            <div className="mt-6 rounded-2xl border border-[#f4b740] bg-[#f4b740]/15 p-5"><p className="font-black text-[#704b00]">This choice cannot be changed after confirmation.</p><p className="mt-2 text-sm leading-6 text-[#704b00]">Confirm only when you are certain this is the Fortnite item you want to receive.</p></div>
            <dl className="mt-6 space-y-3 rounded-2xl border border-[#b9c8db] p-5 text-sm"><div className="flex justify-between"><dt className="text-[#5f7592]">Current balance</dt><dd className="font-bold text-[#12233a]">{order.remainingVbucks.toLocaleString()} V-Bucks</dd></div><div className="flex justify-between border-t border-[#b9c8db] pt-3"><dt className="text-[#5f7592]">Balance after selection</dt><dd className="font-black text-[#146cff]">{(order.remainingVbucks - selected.finalPrice).toLocaleString()} V-Bucks</dd></div></dl>
            {selectionError && <p role="alert" className="mt-5 rounded-xl border border-[#f05a67]/40 bg-[#f05a67]/10 p-4 text-sm font-medium text-[#b52e3c]">{selectionError}</p>}
            <div className="mt-auto grid gap-3 pt-8"><button type="button" disabled={submitting} onClick={() => void choose()} className={`w-full rounded-2xl bg-[#146cff] py-5 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-[#146cff]/20 hover:bg-[#2488ff] disabled:cursor-wait disabled:opacity-60 ${focusClass}`}>{submitting ? 'Confirming Selection...' : 'Confirm Gift Selection'}</button><button type="button" disabled={submitting} onClick={() => { setConfirming(false); setSelectionError(null); }} className={`w-full rounded-xl py-3 text-sm font-bold text-[#5f7592] hover:bg-[#eef4fb] hover:text-[#07111f] ${focusClass}`}>Back to item details</button></div>
          </>}
        </div>
      </section>
    </div>}
  </div>;
}
