import { Gift, ShieldCheck } from 'lucide-react';

export function PublicGiftLandingPage() {
  return <main className="flex min-h-screen items-center justify-center bg-[#07111f] bg-fixed px-5 py-12 text-white [background-image:radial-gradient(circle_at_75%_10%,rgba(68,77,190,0.30),transparent_38%),radial-gradient(circle_at_15%_45%,rgba(30,140,255,0.18),transparent_42%)] [color-scheme:light]">
    <section className="w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#2488ff]/35 bg-[#0b1728] text-center shadow-xl shadow-black/30">
      <div className="h-2 bg-[#146cff]" />
      <div className="px-6 py-12 sm:px-12 sm:py-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#146cff] text-white shadow-lg shadow-[#146cff]/20">
          <Gift className="h-8 w-8" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.24em] text-[#20d4ff]">Gift Item Shop</p>
        <h1 className="mt-4 text-3xl font-black uppercase leading-tight tracking-tight text-white sm:text-4xl">A valid gift link is required to access the Item Shop.</h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-7 text-[#b9c8db]">Please open the unique link provided by your seller.</p>
        <div className="mx-auto mt-8 flex w-fit items-center gap-2 rounded-full bg-[#19c98b]/15 px-4 py-2 text-xs font-bold text-[#64efbe]">
          <ShieldCheck className="h-4 w-4" /> Secure customer storefront
        </div>
      </div>
    </section>
  </main>;
}
