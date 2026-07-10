import Image from 'next/image';
import SignInForm from '@/components/auth/SignInForm';

export const metadata = {
  title: 'Sign In — Swami Avdheshanand G Admin',
  description: 'Administrative portal for Swami Avdheshanand G — steward the website, app content and records.',
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen bg-[#F7F1E7]">
      {/* ── Left: editorial hero ── */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <Image
          src="/images/swamiji-hero.jpg"
          alt="Swami Avdheshanand G"
          fill
          priority
          sizes="50vw"
          className="object-cover object-top"
        />
        {/* tonal overlays for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#2A0009]/95 via-[#2A0009]/35 to-[#2A0009]/70" />
        <div className="absolute inset-0 bg-[#3A0010]/15" />
        {/* subtle gold inset frame */}
        <div className="absolute inset-6 rounded-sm border border-[#D4A017]/25" />

        <div className="absolute inset-0 flex flex-col justify-between p-12 text-white xl:p-16">
          {/* brand mark */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D4A017]/60 text-lg text-[#FFD54F]">
              &#x950;
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.32em] text-[#EAD9BC]">
              Swami Avdheshanand G
            </span>
          </div>

          {/* headline */}
          <div>
            <div className="mb-6 h-px w-12 bg-[#D4A017]" />
            <h2 className="font-serif text-[3.25rem] font-bold leading-[1.05] tracking-tight xl:text-6xl">
              Seva, Sanskriti
              <br />
              &amp; Sanatan
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#E4D3B6]">
              The administrative sanctum of Swami Avdheshanand G — where the work of dharma, service
              and continuity is stewarded.
            </p>
            <p className="mt-9 font-serif text-lg italic text-[#E7B44C]">&#x965; &#x936;&#x94D;&#x930;&#x940; &#x917;&#x941;&#x930;&#x935;&#x947; &#x928;&#x92E;&#x903; &#x965;</p>
          </div>
        </div>
      </div>

      {/* ── Right: sign-in ── */}
      <div
        className="relative flex flex-1 items-center justify-center px-6 py-12 md:px-12"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(128,0,32,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,0,32,0.045) 1px, transparent 1px)',
          backgroundSize: '26px 26px',
        }}
      >
        {/* soft radial fade so the grid stays whisper-light behind the form */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(247,241,231,0) 30%, rgba(247,241,231,0.75) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[27rem]">
          <SignInForm />
        </div>
      </div>
    </div>
  );
}
