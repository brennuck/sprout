"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Edit3, Eye, LogOut, Mail, Send, Trash2, UserPlus, Users, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

interface ShareData {
  sentInvitations: Array<{
    id: string;
    email: string;
    permission: string;
    status: string;
    createdAt: string;
    recipient?: { name: string | null; email: string } | null;
  }>;
  receivedInvitations: Array<{
    id: string;
    permission: string;
    sender: { name: string | null; email: string };
  }>;
  sharedWithMe: Array<{
    id: string;
    permission: string;
    owner: { id: string; name: string | null; email: string };
  }>;
  sharedByMe: Array<{
    id: string;
    permission: string;
    viewer: { id: string; name: string | null; email: string };
  }>;
}

type Tab = "invite" | "shared" | "pending";

/** Household sharing management. Renders inline (Settings) or inside ShareSheet. */
export function SharingPanel({ active = true }: { active?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("invite");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("VIEW");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmRevoke, setConfirmRevoke] = useState<{ id: string; kind: "revoke" | "leave" } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/invitations");
      if (response.ok) setData(await response.json());
    } catch {
      // Keep whatever we had; the user can retry by reopening.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void load();
  }, [active, load]);

  const call = async (input: RequestInfo, init: RequestInit | undefined, success: string) => {
    const response = await fetch(input, init);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast.show({ title: body.error || "Something went wrong", variant: "error" });
      return false;
    }
    toast.show({ title: success, variant: "success" });
    await load();
    router.refresh();
    return true;
  };

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setError("Enter an email address");
      return;
    }
    setSubmitting(true);
    setError("");
    const response = await fetch("/api/invitations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, permission }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Could not send the invitation");
    } else {
      toast.show({ title: `Invitation sent to ${email}`, variant: "success" });
      setEmail("");
      await load();
    }
    setSubmitting(false);
  };

  const pendingCount = data?.receivedInvitations?.length || 0;

  return (
    <div className="space-y-5">
      <SegmentedControl<Tab>
        label="Sharing sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: "invite", label: "Invite", icon: <UserPlus className="h-4 w-4" aria-hidden="true" /> },
          { value: "shared", label: "Access", icon: <Users className="h-4 w-4" aria-hidden="true" /> },
          {
            value: "pending",
            label: (
              <span className="inline-flex items-center gap-1.5">
                Pending
                {pendingCount > 0 && (
                  <span className="rounded-full bg-brand px-1.5 text-[11px] font-bold text-brand-contrast">
                    {pendingCount}
                  </span>
                )}
              </span>
            ),
            icon: <Clock className="h-4 w-4" aria-hidden="true" />,
          },
        ]}
      />

      {tab === "invite" && (
        <form onSubmit={invite} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="partner@example.com"
            autoComplete="email"
            error={error || undefined}
            data-autofocus
          />
          <Select
            label="Permission"
            value={permission}
            onChange={(event) => setPermission(event.target.value)}
            options={[
              { value: "VIEW", label: "View only — can see everything" },
              { value: "EDIT", label: "Edit — can add and change money moves" },
            ]}
          />
          <Button type="submit" className="w-full" isLoading={submitting} loadingLabel="Sending…">
            <Send className="h-4 w-4" aria-hidden="true" /> Send invitation
          </Button>

          {data?.sentInvitations && data.sentInvitations.length > 0 && (
            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-sm font-semibold text-ink-secondary">Sent invitations</h3>
              <ul className="space-y-2">
                {data.sentInvitations.map((invitation) => (
                  <li key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Mail className="h-4 w-4 flex-none text-ink-muted" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{invitation.email}</p>
                        <p className="text-xs capitalize text-ink-muted">
                          {invitation.status.toLowerCase()} · {invitation.permission.toLowerCase()} access
                        </p>
                      </div>
                    </div>
                    {invitation.status === "PENDING" && (
                      <IconButton
                        label={`Cancel invitation to ${invitation.email}`}
                        variant="danger"
                        size="sm"
                        onClick={() =>
                          call(`/api/invitations?id=${invitation.id}`, { method: "DELETE" }, "Invitation cancelled")
                        }
                      >
                        <X />
                      </IconButton>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </form>
      )}

      {tab === "shared" && (
        <div className="space-y-5">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-ink-secondary">People with access to your money</h3>
            {loading ? (
              <Skeleton className="h-14 w-full" />
            ) : data?.sharedByMe?.length ? (
              <ul className="space-y-2">
                {data.sharedByMe.map((share) => (
                  <li key={share.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                    <PersonRow
                      name={share.viewer.name || share.viewer.email}
                      permission={share.permission}
                    />
                    <IconButton
                      label={`Revoke access for ${share.viewer.name || share.viewer.email}`}
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmRevoke({ id: share.id, kind: "revoke" })}
                    >
                      <Trash2 />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="Not shared yet" description="Invite a partner to plan together." />
            )}
          </section>

          <section className="border-t border-line pt-4">
            <h3 className="mb-3 text-sm font-semibold text-ink-secondary">Shared with you</h3>
            {loading ? (
              <Skeleton className="h-14 w-full" />
            ) : data?.sharedWithMe?.length ? (
              <ul className="space-y-2">
                {data.sharedWithMe.map((share) => (
                  <li key={share.id} className="flex items-center justify-between gap-3 rounded-xl bg-info-soft p-3">
                    <PersonRow
                      name={`${share.owner.name || share.owner.email}'s dashboard`}
                      permission={share.permission}
                    />
                    <IconButton
                      label="Leave this shared dashboard"
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmRevoke({ id: share.id, kind: "leave" })}
                    >
                      <LogOut />
                    </IconButton>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState compact title="Nothing shared with you" description="Invitations you accept will show here." />
            )}
          </section>
        </div>
      )}

      {tab === "pending" && (
        <div>
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : data?.receivedInvitations?.length ? (
            <ul className="space-y-2">
              {data.receivedInvitations.map((invitation) => (
                <li key={invitation.id} className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
                  <PersonRow
                    name={invitation.sender.name || invitation.sender.email}
                    permission={invitation.permission}
                    caption="invited you to their dashboard"
                  />
                  <div className="flex gap-1">
                    <IconButton
                      label={`Accept invitation from ${invitation.sender.name || invitation.sender.email}`}
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        call(`/api/invitations/${invitation.id}/accept`, { method: "POST" }, "Invitation accepted")
                      }
                    >
                      <Check />
                    </IconButton>
                    <IconButton
                      label={`Decline invitation from ${invitation.sender.name || invitation.sender.email}`}
                      variant="danger"
                      size="sm"
                      onClick={() =>
                        call(`/api/invitations/${invitation.id}/decline`, { method: "POST" }, "Invitation declined")
                      }
                    >
                      <X />
                    </IconButton>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState compact icon={<Clock />} title="No pending invitations" />
          )}
        </div>
      )}

      <Sheet
        open={Boolean(confirmRevoke)}
        onClose={() => setConfirmRevoke(null)}
        title={confirmRevoke?.kind === "leave" ? "Leave shared dashboard?" : "Revoke access?"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRevoke(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!confirmRevoke) return;
                const ok = await call(
                  `/api/shares?id=${confirmRevoke.id}`,
                  { method: "DELETE" },
                  confirmRevoke.kind === "leave" ? "You left the shared dashboard" : "Access revoked",
                );
                if (ok) setConfirmRevoke(null);
              }}
            >
              {confirmRevoke?.kind === "leave" ? "Leave" : "Revoke"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-ink-secondary">
          {confirmRevoke?.kind === "leave"
            ? "You will no longer see this person's accounts, envelopes, or activity."
            : "They will immediately lose access to your dashboard. You can invite them again later."}
        </p>
      </Sheet>
    </div>
  );
}

function PersonRow({ name, permission, caption }: { name: string; permission: string; caption?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-soft text-brand-strong">
        <Users className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        <p className="flex items-center gap-1 text-xs text-ink-muted">
          {caption ? (
            caption
          ) : permission === "EDIT" ? (
            <>
              <Edit3 className="h-3 w-3" aria-hidden="true" /> Can edit
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" aria-hidden="true" /> View only
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export function ShareModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Sheet open={isOpen} onClose={onClose} title="Household sharing" description="Plan money together with view or edit access.">
      <SharingPanel active={isOpen} />
    </Sheet>
  );
}
