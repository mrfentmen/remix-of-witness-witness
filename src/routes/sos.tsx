import { createFileRoute } from "@tanstack/react-router";
import { ScreenHeader } from "@/components/witness/screen-header";
import {
  Siren,
  UserPlus,
  Trash2,
  MapPin,
  MessageSquare,
  Phone,
  X,
  ShieldCheck,
  ShieldAlert,
  Hourglass,
  Pencil,
  Radio,
  Copy,
  Share2,
  Check,
  XCircle,
  FlaskConical,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addContact,
  buildSosMessage,
  buildVerificationMessage,
  confirmVerification,
  createStreamLink,
  getQuickLocation,
  listContacts,
  removeContact,
  smsHref,
  startVerification,
  updateContact,
  type SosContact,
  type SosLocation,
  type StreamLink,
} from "@/lib/witness-contacts";
import { toast } from "sonner";
import { announce } from "@/components/witness/a11y-announcer";
import { useSettings, setShareLocation } from "@/lib/witness-settings";
import { useSession } from "@/lib/cloud-auth";
import { startLocationBroadcast, stopLocationBroadcast } from "@/lib/location-broadcaster";
import {
  deleteShare,
  inviteContactByPhone,
  listSharedContacts,
  respondToShare,
  setMySosState,
  type SharedContact,
} from "@/lib/contact-locations";
import { notifySosTriggered, notifyLocationShareRequest } from "@/lib/push.functions";
import { isValidInternationalPhone } from "@/lib/witness-international";
import { hapticSosSent } from "@/lib/haptics";
import { sanitizeText, sanitizePhone } from "@/lib/witness-sanitize";

export const Route = createFileRoute("/sos")({
  head: () => ({
    meta: [
      { title: "SOS Contacts — Witness R.E.P" },
      {
        name: "description",
        content:
          "Trusted contacts get a text with your live location and stream link when you trigger SOS.",
      },
    ],
  }),
  component: SosScreen,
});

function SosScreen() {
  const [contacts, setContacts] = useState<SosContact[]>([]);
  const [editing, setEditing] = useState<SosContact | "new" | null>(null);
  const [verifying, setVerifying] = useState<SosContact | null>(null);
  const [triggering, setTriggering] = useState(false);
  const [lastLoc, setLastLoc] = useState<SosLocation | null>(null);
  const [lastStream, setLastStream] = useState<StreamLink | null>(null);
  const [testSosMode, setTestSosMode] = useState(false);
  const settings = useSettings();
  const { user } = useSession();
  const [shares, setShares] = useState<SharedContact[]>([]);
  const [inviting, setInviting] = useState(false);
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteName, setInviteName] = useState("");

  function refresh() {
    setContacts(listContacts());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function refreshShares() {
    if (!user) {
      setShares([]);
      return;
    }
    setShares(await listSharedContacts());
  }
  useEffect(() => {
    void refreshShares();
    if (!user) return;
    const t = window.setInterval(() => void refreshShares(), 30_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const pendingIncoming = useMemo(
    () => shares.filter((s) => s.direction === "incoming" && s.status === "pending"),
    [shares],
  );
  const acceptedShares = useMemo(() => shares.filter((s) => s.status === "accepted"), [shares]);
  const pendingOutgoing = useMemo(
    () => shares.filter((s) => s.direction === "outgoing" && s.status === "pending"),
    [shares],
  );

  async function handleToggleShare(v: boolean) {
    if (!user) {
      toast.error("Sign in to share your location with contacts");
      return;
    }
    setShareLocation(v);
    if (v) {
      const ok = await startLocationBroadcast();
      if (!ok) {
        setShareLocation(false);
        toast.error("Couldn't start location sharing");
        return;
      }
      toast.success("Sharing your location every 30s");
    } else {
      await stopLocationBroadcast();
      toast.success("Location sharing stopped");
    }
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    const phone = sanitizePhone(invitePhone.trim());
    if (!/^[+()\d\s.-]{5,20}$/.test(phone)) {
      toast.error("Enter a valid phone number");
      return;
    }
    const name = inviteName.trim() ? sanitizeText(inviteName.trim(), 40) : undefined;
    try {
      await inviteContactByPhone(phone, name);
      toast.success("Invite sent");
      setInvitePhone("");
      setInviteName("");
      setInviting(false);
      void refreshShares();
      try {
        const fresh = await listSharedContacts();
        const norm = phone.replace(/[^0-9+]/g, "");
        const last = fresh.find(
          (s) =>
            s.direction === "outgoing" &&
            s.status === "pending" &&
            (s.phone ?? "").replace(/[^0-9+]/g, "") === norm,
        );
        if (last) {
          notifyLocationShareRequest({ data: { shareId: last.shareId } }).catch(() => undefined);
        }
      } catch {
        /* ignore */
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send invite");
    }
  }

  async function handleRespond(s: SharedContact, accept: boolean) {
    try {
      await respondToShare(s.shareId, accept);
      toast.success(accept ? "Share accepted" : "Share declined");
      void refreshShares();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't respond");
    }
  }

  async function handleRevoke(s: SharedContact) {
    if (!confirm("Stop sharing locations with this contact?")) return;
    try {
      await deleteShare(s.shareId);
      toast.success("Share removed");
      void refreshShares();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove share");
    }
  }

  const verifiedCount = useMemo(
    () => contacts.filter((c) => c.verification === "verified").length,
    [contacts],
  );

  async function triggerSos() {
    if (contacts.length === 0) {
      toast.error("Add at least one trusted contact first.");
      return;
    }
    if (testSosMode) {
      toast.success("DRY RUN — no real SOS sent");
      setLastLoc({ latitude: 0, longitude: 0, accuracy: 0 });
      setLastStream({ id: "test", url: "https://witness.app/test" });
      return;
    }
    setTriggering(true);
    hapticSosSent();
    announce("SOS triggered — alerting contacts");
    try {
      const stream = createStreamLink();
      setLastStream(stream);
      const loc = await getQuickLocation();
      setLastLoc(loc);
      const body = buildSosMessage(loc, stream);
      const href = smsHref(
        contacts.map((c) => c.phone),
        body,
      );
      window.location.href = href;
      toast.success(
        `SOS armed: texting ${contacts.length} contact${contacts.length === 1 ? "" : "s"}`,
      );
      if (user && settings.shareLocation) {
        void setMySosState(true);
      }
      if (user) {
        notifySosTriggered({ data: undefined as never }).catch((e) =>
          console.warn("[witness] notifySosTriggered failed", e),
        );
      }
    } finally {
      setTriggering(false);
    }
  }

  return (
    <main className="min-h-dvh">
      <ScreenHeader title="SOS Contacts" />
      <section className="mx-auto flex max-w-md flex-col gap-5 px-6 py-6">
        <StatusBanner total={contacts.length} verified={verifiedCount} />

        <button
          type="button"
          onClick={triggerSos}
          disabled={contacts.length === 0 || triggering}
          className="flex h-16 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-bold uppercase tracking-wider text-primary-foreground shadow-lg shadow-primary/30 transition active:scale-95 disabled:opacity-50"
        >
          <Siren className="h-5 w-5" />
          {testSosMode ? "Send SOS (Dry Run)" : triggering ? "Locating…" : "Send SOS"}
        </button>

        <button
          type="button"
          onClick={() => setTestSosMode((v) => !v)}
          className={`inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition border ${
            testSosMode
              ? "bg-primary border-primary text-primary-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          <FlaskConical className="h-3 w-3" />
          {testSosMode ? "Dry run ON" : "Test mode"}
        </button>

        {(lastLoc || lastStream) && (
          <div className="rounded-2xl border border-border bg-card p-3 text-[11px] text-muted-foreground">
            {lastLoc && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 text-primary" />
                {lastLoc.latitude.toFixed(4)}, {lastLoc.longitude.toFixed(4)} (±
                {Math.round(lastLoc.accuracy ?? 0)}m)
              </p>
            )}
            {lastStream && (
              <p className="mt-1 flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-primary" />
                <span className="truncate">{lastStream.url}</span>
                <button
                  type="button"
                  aria-label="Copy stream link"
                  onClick={() => {
                    void navigator.clipboard?.writeText(lastStream.url);
                    toast.success("Stream link copied");
                  }}
                  className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground active:bg-secondary"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </p>
            )}
          </div>
        )}

        {/* Share my location */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
              <Share2 className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Share my location</p>
                <Switch
                  checked={settings.shareLocation && !!user}
                  onChange={handleToggleShare}
                  ariaLabel="Share my location"
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {user
                  ? "Broadcasts your GPS to mutually-accepted contacts every 30 seconds."
                  : "Sign in to share your live location with trusted contacts."}
              </p>
            </div>
          </div>

          {user && (
            <>
              {pendingIncoming.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                    {pendingIncoming.length} location share request
                    {pendingIncoming.length === 1 ? "" : "s"}
                  </p>
                  {pendingIncoming.map((s) => (
                    <div key={s.shareId} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{s.alias || s.phone}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{s.phone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRespond(s, true)}
                        aria-label="Accept"
                        className="grid h-9 w-9 place-items-center rounded-full bg-success/15 text-success active:scale-95"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(s, false)}
                        aria-label="Decline"
                        className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground active:scale-95"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sharing with
                </p>
                <button
                  type="button"
                  onClick={() => setInviting(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              </div>

              {acceptedShares.length === 0 && pendingOutgoing.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Invite a Witness R.E.P contact by phone to start sharing locations.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {acceptedShares.map((s) => (
                    <ShareRow key={s.shareId} share={s} onRevoke={() => handleRevoke(s)} />
                  ))}
                  {pendingOutgoing.map((s) => (
                    <ShareRow key={s.shareId} share={s} onRevoke={() => handleRevoke(s)} pending />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Trusted contacts
            </p>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>

          {contacts.length === 0 ? (
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-semibold uppercase tracking-wider text-muted-foreground active:bg-secondary"
            >
              <UserPlus className="h-4 w-4" />
              Add your first contact
            </button>
          ) : (
            <ul className="flex flex-col gap-2">
              {contacts.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  onEdit={() => setEditing(c)}
                  onDelete={() => {
                    if (!confirm(`Remove ${c.name} from SOS contacts?`)) return;
                    removeContact(c.id);
                    refresh();
                  }}
                  onVerify={() => setVerifying(c)}
                />
              ))}
            </ul>
          )}
        </div>
      </section>

      {editing && (
        <ContactSheet
          existing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSave={(payload) => {
            if (editing === "new") {
              addContact(payload);
              toast.success("Contact added");
            } else {
              updateContact(editing.id, payload);
              toast.success("Contact updated");
            }
            refresh();
            setEditing(null);
          }}
        />
      )}

      {verifying && (
        <VerifySheet
          contact={verifying}
          onClose={() => {
            setVerifying(null);
            refresh();
          }}
          onDone={() => {
            setVerifying(null);
            refresh();
          }}
        />
      )}

      {inviting && (
        <Sheet onClose={() => setInviting(false)} title="Invite a contact">
          <form onSubmit={submitInvite} className="flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">
              They must already have a Witness R.E.P account using this phone number. They'll see
              your request inside the app and can accept or decline.
            </p>
            <Field label="Phone number">
              <input
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                type="tel"
                inputMode="tel"
                maxLength={20}
                autoFocus
                placeholder="+1 555 0100"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <Field label="Nickname (optional)">
              <input
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                maxLength={40}
                placeholder="Mom"
                className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </Field>
            <button
              type="submit"
              className="mt-2 h-12 w-full rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
            >
              Send invite
            </button>
          </form>
        </Sheet>
      )}
    </main>
  );
}

function ShareRow({
  share,
  onRevoke,
  pending,
}: {
  share: SharedContact;
  onRevoke: () => void;
  pending?: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2.5">
      <span
        className={`grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold uppercase ${
          pending ? "bg-secondary text-muted-foreground" : "bg-success/15 text-success"
        }`}
      >
        {(share.alias || share.phone || "?").slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{share.alias || share.phone}</p>
        <p className="truncate text-[11px] text-muted-foreground">
          {pending ? "Awaiting acceptance · " : ""}
          {share.phone}
        </p>
      </div>
      <button
        type="button"
        onClick={onRevoke}
        aria-label="Remove"
        className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-muted-foreground active:scale-95"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );
}

/* ---------------- Banner & cards ---------------- */

function StatusBanner({ total, verified }: { total: number; verified: number }) {
  const armed = verified > 0;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        armed
          ? "border-success/30 bg-success/10"
          : total > 0
            ? "border-primary/30 bg-primary/10"
            : "border-border bg-card"
      }`}
    >
      <div
        className={`flex items-center gap-2 ${
          armed ? "text-success" : total > 0 ? "text-primary" : "text-muted-foreground"
        }`}
      >
        <Siren className="h-5 w-5" />
        <h2 className="text-sm font-bold uppercase tracking-wider">
          {armed ? "SOS armed" : total > 0 ? "Verify a contact" : "SOS not configured"}
        </h2>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        {armed
          ? `${verified} of ${total} contact${total === 1 ? "" : "s"} verified. Pressing SOS texts everyone your live GPS and stream link.`
          : total > 0
            ? "Send a verification code so you know your contact's number actually receives texts."
            : "Add at least one trusted contact. When you press SOS they'll receive a text with your live location and stream link."}
      </p>
    </div>
  );
}

function ContactCard({
  contact,
  onEdit,
  onDelete,
  onVerify,
}: {
  contact: SosContact;
  onEdit: () => void;
  onDelete: () => void;
  onVerify: () => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold uppercase">
          {contact.name.slice(0, 1) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{contact.name}</p>
            <VerificationBadge status={contact.verification} />
          </div>
          <p className="truncate text-[11px] text-muted-foreground">
            {contact.phone}
            {contact.relation ? ` · ${contact.relation}` : ""}
          </p>
        </div>
        <a
          href={`tel:${contact.phone}`}
          aria-label={`Call ${contact.name}`}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground active:scale-95"
        >
          <Phone className="h-4 w-4" />
        </a>
        <a
          href={smsHref([contact.phone], buildSosMessage(null))}
          aria-label={`Text ${contact.name}`}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground active:scale-95"
        >
          <MessageSquare className="h-4 w-4" />
        </a>
      </div>
      <div className="flex gap-2">
        {contact.verification !== "verified" && (
          <button
            type="button"
            onClick={onVerify}
            className="flex-1 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-primary active:bg-primary/20"
          >
            {contact.verification === "pending" ? "Enter code" : "Send code"}
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground active:bg-secondary"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${contact.name}`}
          className="grid w-10 place-items-center rounded-xl border border-border text-primary active:bg-secondary"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function VerificationBadge({ status }: { status: SosContact["verification"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-success">
        <ShieldCheck className="h-3 w-3" />
        Verified
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
        <Hourglass className="h-3 w-3" />
        Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      <ShieldAlert className="h-3 w-3" />
      Unverified
    </span>
  );
}

/* ---------------- Add / edit sheet ---------------- */

function ContactSheet({
  existing,
  onClose,
  onSave,
}: {
  existing: SosContact | null;
  onClose: () => void;
  onSave: (c: { name: string; phone: string; relation?: string }) => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [relation, setRelation] = useState(existing?.relation ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const p = phone.trim();
    if (!n || n.length > 80) {
      toast.error("Name must be 1–80 characters");
      return;
    }
    const normP = p.replace(/[^0-9+]/g, "");
    if (!/^[+()\d\s.-]{5,20}$/.test(p) && !isValidInternationalPhone(normP)) {
      toast.error("Enter a valid phone number (e.g. +1 555 0100 or +44 7700 900123)");
      return;
    }
    onSave({
      name: sanitizeText(n, 80),
      phone: sanitizePhone(p),
      relation: relation.trim() ? sanitizeText(relation.trim(), 40) : undefined,
    });
  }

  return (
    <Sheet onClose={onClose} title={existing ? "Edit contact" : "Add trusted contact"}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            placeholder="Jamie Rivera"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="+1 555 0100"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>
        <Field label="Relation (optional)">
          <input
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
            maxLength={40}
            placeholder="Lawyer, partner, friend…"
            className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </Field>
        <button
          type="submit"
          className="mt-2 h-12 w-full rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
        >
          {existing ? "Save changes" : "Save contact"}
        </button>
      </form>
    </Sheet>
  );
}

/* ---------------- Verification sheet ---------------- */

function VerifySheet({
  contact,
  onClose,
  onDone,
}: {
  contact: SosContact;
  onClose: () => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState<string | null>(contact.verificationCode ?? null);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  function send() {
    const res = startVerification(contact.id);
    if (!res) return;
    setCode(res.code);
    const href = smsHref([contact.phone], buildVerificationMessage(res.code));
    window.location.href = href;
    toast.success("Opening SMS with the code");
  }

  function confirm() {
    if (confirmVerification(contact.id, entered)) {
      toast.success(`${contact.name} verified`);
      onDone();
    } else {
      setError("Code doesn't match. Re-send and try again.");
    }
  }

  return (
    <Sheet onClose={onClose} title={`Verify ${contact.name}`}>
      <p className="text-sm text-muted-foreground">
        We'll text {contact.phone} a 6-digit code. Have them read it back to you, then enter it
        below to confirm the number works.
      </p>

      {!code ? (
        <button
          type="button"
          onClick={send}
          className="mt-2 h-12 w-full rounded-2xl bg-primary text-sm font-bold uppercase tracking-wider text-primary-foreground active:scale-95"
        >
          Send verification code
        </button>
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Code sent</p>
            <p className="mt-1 font-mono text-2xl tracking-[0.4em] text-foreground">{code}</p>
          </div>
          <Field label="Enter the code your contact received">
            <input
              value={entered}
              onChange={(e) => {
                setEntered(e.target.value.replace(/\D/g, "").slice(0, 6));
                setError(null);
              }}
              inputMode="numeric"
              autoFocus
              placeholder="123456"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
            />
          </Field>
          {error && <p className="text-xs text-primary">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={send}
              className="flex-1 h-11 rounded-2xl border border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground active:bg-secondary"
            >
              Re-send
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={entered.length !== 6}
              className="flex-[2] h-11 rounded-2xl bg-primary text-xs font-bold uppercase tracking-wider text-primary-foreground active:scale-95 disabled:opacity-50"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

/* ---------------- Shared sheet primitives ---------------- */

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl border border-border bg-card p-5 sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
        checked ? "border-primary bg-primary" : "border-border bg-secondary"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${
          checked ? "left-[1.375rem]" : "left-0.5"
        }`}
      />
    </button>
  );
}
