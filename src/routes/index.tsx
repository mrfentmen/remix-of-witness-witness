import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera,
  ShieldCheck,
  Radio,
  Siren,
  Lock,
  FileCheck2,
  Download,
  Heart,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { getInstallPrompt, subscribeInstallPrompt, triggerInstall } from "@/lib/pwa";
import { toast } from "sonner";
import { fetchProfileExtras } from "@/lib/witness-youth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Witness R.E.P — Record. Encrypt. Prove." },
      {
        name: "description",
        content:
          "Witness R.E.P — Record. Encrypt. Prove. Camera-first civil rights and personal safety tool. One tap to record. Every video is encrypted, GPS stamped, and backed up to the cloud.",
      },
      { property: "og:title", content: "Witness R.E.P — Record. Encrypt. Prove." },
      {
        property: "og:description",
        content: "Open the app and your camera is live. Encrypted, GPS stamped, tamper-proof.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [installAvailable, setInstallAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isStudent, setIsStudent] = useState(false);

  useEffect(() => {
    const evaluate = () => setInstallAvailable(!!getInstallPrompt());
    evaluate();
    const unsub = subscribeInstallPrompt(evaluate);
    if (typeof window !== "undefined") {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS Safari
        (window.navigator as { standalone?: boolean }).standalone === true;
      setInstalled(standalone);
    }
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const extras = await fetchProfileExtras();
        if (!cancelled) setIsStudent(extras?.profileType === "student");
      } catch {
        /* not signed in */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleInstall() {
    const result = await triggerInstall();
    if (result === "accepted") {
      toast.success("Installing Witness R.E.P…");
    } else if (result === "unavailable") {
      toast.message("Open this page on your phone to install", {
        description: "On iOS: Share → Add to Home Screen. On Android: tap the menu → Install app.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary"
          >
            <Camera className="h-4 w-4" />
          </span>
          <span className="text-sm font-bold uppercase tracking-[0.25em]">Witness R.E.P</span>
        </div>
        <Link
          to="/camera"
          className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
        >
          Open app <ArrowRight className="ml-1 inline h-3 w-3" />
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-12 sm:pt-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
          Witness R.E.P
        </p>
        <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Record. <span className="text-primary">Encrypt.</span> Prove.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          The moment you open Witness R.E.P your camera is ready. One tap starts recording. Every
          video is encrypted, GPS stamped, and backed up to the cloud before anyone can take your
          phone.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <InstallButton onClick={handleInstall} installed={installed} primary />
          {!installAvailable && !installed && (
            <p className="text-xs text-muted-foreground sm:max-w-[14rem]">
              On iPhone, tap Share → Add to Home Screen.
            </p>
          )}
        </div>

        {isStudent && (
          <Link
            to="/curriculum"
            className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm active:scale-[0.99]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-foreground">Know Your Rights</span>
              <span className="text-xs text-muted-foreground">
                Student curriculum and ambassador badges
              </span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* Why */}
      <Section kicker="Why Witness R.E.P exists" title="Built for the moments that matter.">
        <p>
          Getting pulled over. Watching an arrest. Seeing something the world needs to see. In those
          moments you do not have time to fumble through menus or worry about your footage
          disappearing.
        </p>
        <p className="mt-4">
          Witness R.E.P opens straight to the camera. Always ready. Always recording. Always
          protecting you.
        </p>
      </Section>

      {/* Features */}
      <Section kicker="Features" title="What Witness R.E.P does.">
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <Feature
            icon={<Camera className="h-4 w-4" />}
            title="Instant recording"
            body="Open the app and your camera is live. One tap to start. Your footage is encrypted and uploading before the situation even ends."
          />
          <Feature
            icon={<FileCheck2 className="h-4 w-4" />}
            title="Tamper-proof certificates"
            body="Every recording generates a Witness R.E.P Certificate with a SHA-256 hash, GPS coordinates, and timestamp. Anyone can verify it was never altered at /verify."
          />
          <Feature
            icon={<Siren className="h-4 w-4" />}
            title="SOS alerts"
            body="One tap sends your live location and a link to your trusted contacts so someone is always watching in real time."
          />
          <Feature
            icon={<Radio className="h-4 w-4" />}
            title="Go live"
            body="Broadcast what you are seeing to anyone nearby. Your stream is saved automatically so the footage is never lost."
          />
          <Feature
            icon={<Lock className="h-4 w-4" />}
            title="Your vault"
            body="Every recording lives in a PIN-protected encrypted vault. Only you can access it."
            full
          />
        </div>
      </Section>

      {/* Trust */}
      <Section kicker="Trust" title="No ads. No subscriptions. No paywalls. Ever.">
        <p>
          Witness R.E.P was built to protect people, not make money off them. It is completely free.
          If you believe in what we are building you can support us with a voluntary donation.
        </p>
        <div className="mt-6">
          <a
            href="#donate"
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold uppercase tracking-wider text-foreground active:scale-[0.98]"
          >
            <Heart className="h-4 w-4 text-primary" />
            Support Witness R.E.P
          </a>
        </div>
      </Section>

      {/* How to install */}
      <Section kicker="How to install" title="Install in seconds. No app store needed.">
        <ol className="mt-2 space-y-3">
          {[
            "Open this page on your phone",
            "Tap the Install button",
            "Add to your home screen",
            "Open Witness R.E.P and start recording",
          ].map((step, i) => (
            <li
              key={step}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span className="pt-0.5 text-sm text-foreground">{step}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Works on iPhone and Android.
        </p>
        <div className="mt-6">
          <InstallButton onClick={handleInstall} installed={installed} primary />
        </div>
      </Section>

      {/* Footer */}
      <footer className="mx-auto mt-12 max-w-3xl border-t border-border px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Witness R.E.P Built for the people.</p>
        </div>
        <nav className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <Link to="/legal/privacy" className="hover:text-foreground">
            Privacy Policy
          </Link>
          <span aria-hidden>|</span>
          <Link to="/legal/terms" className="hover:text-foreground">
            Terms of Service
          </Link>
          <span aria-hidden>|</span>
          <Link to="/verify" search={{ hash: undefined }} className="hover:text-foreground">
            Verify a Certificate
          </Link>
          <span aria-hidden>|</span>
          <a href="mailto:contactae2000@gmail.com" className="hover:text-foreground">
            Contact
          </a>
        </nav>
      </footer>
    </main>
  );
}

function Section({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">{kicker}</p>
      <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <div className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
        {children}
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  body,
  full,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  full?: boolean;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${full ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-foreground">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function InstallButton({
  onClick,
  installed,
  primary,
}: {
  onClick: () => void;
  installed: boolean;
  primary?: boolean;
}) {
  if (installed) {
    return (
      <Link
        to="/camera"
        className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-sm font-bold uppercase tracking-[0.2em] text-primary-foreground active:scale-[0.98]"
      >
        <Camera className="h-4 w-4" />
        Open Witness R.E.P
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-14 items-center justify-center gap-2 rounded-2xl px-7 text-sm font-bold uppercase tracking-[0.2em] active:scale-[0.98] ${
        primary
          ? "bg-primary text-primary-foreground shadow-[0_10px_40px_-10px_oklch(0.64_0.24_27_/_0.6)]"
          : "border border-border bg-card text-foreground"
      }`}
    >
      <Download className="h-4 w-4" />
      Install Witness R.E.P — It's Free
    </button>
  );
}
