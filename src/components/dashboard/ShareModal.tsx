"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Send, 
  Mail, 
  Check, 
  X, 
  Clock, 
  Trash2, 
  UserPlus,
  Eye,
  Edit3,
  LogOut
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<"invite" | "shared" | "pending">("invite");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState("VIEW");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const fetchShareData = async () => {
    try {
      const res = await fetch("/api/invitations");
      if (res.ok) {
        const data = await res.json();
        setShareData(data);
      }
    } catch (err) {
      console.error("Failed to fetch share data:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchShareData();
    }
  }, [isOpen]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter an email address");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, permission }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send invitation");
      }

      setSuccess("Invitation sent successfully!");
      setEmail("");
      fetchShareData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: "POST",
      });

      if (res.ok) {
        fetchShareData();
      }
    } catch (err) {
      console.error("Failed to accept invitation:", err);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invitations/${invitationId}/decline`, {
        method: "POST",
      });

      if (res.ok) {
        fetchShareData();
      }
    } catch (err) {
      console.error("Failed to decline invitation:", err);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchShareData();
      }
    } catch (err) {
      console.error("Failed to cancel invitation:", err);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    if (!confirm("Are you sure you want to revoke this access?")) return;

    try {
      const res = await fetch(`/api/shares?id=${shareId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchShareData();
      }
    } catch (err) {
      console.error("Failed to revoke share:", err);
    }
  };

  const handleLeaveShare = async (shareId: string) => {
    if (!confirm("Are you sure you want to leave this shared dashboard?")) return;

    try {
      const res = await fetch(`/api/shares?id=${shareId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchShareData();
      }
    } catch (err) {
      console.error("Failed to leave share:", err);
    }
  };

  const pendingCount = (shareData?.receivedInvitations?.length || 0);
  const tabs: Array<{ id: "invite" | "shared" | "pending"; label: string; icon: typeof UserPlus; badge?: number }> = [
    { id: "invite", label: "Invite", icon: UserPlus },
    { id: "shared", label: "Shared", icon: Users },
    { id: "pending", label: "Pending", icon: Clock, badge: pendingCount > 0 ? pendingCount : undefined },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share Your Dashboard">
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-sage-100 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-white text-sage-900 shadow-sm"
                  : "text-sage-600 hover:text-sage-900"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge && (
                <span className="px-1.5 py-0.5 text-xs bg-sage-500 text-white rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Invite Tab */}
        {activeTab === "invite" && (
          <form onSubmit={handleInvite} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl text-sage-700 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              autoFocus
            />

            <Select
              label="Permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              options={[
                { value: "VIEW", label: "View Only - Can see your dashboard" },
                { value: "EDIT", label: "Edit - Can add transactions" },
              ]}
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              <Send className="w-4 h-4" />
              Send Invitation
            </Button>

            {/* Sent invitations */}
            {shareData?.sentInvitations && shareData.sentInvitations.length > 0 && (
              <div className="pt-4 border-t border-sage-100">
                <h4 className="text-sm font-medium text-sage-700 mb-3">Sent Invitations</h4>
                <div className="space-y-2">
                  {shareData.sentInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-sage-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-sage-500" />
                        <div>
                          <p className="text-sm font-medium text-sage-900">{inv.email}</p>
                          <p className="text-xs text-sage-500 capitalize">
                            {inv.status.toLowerCase()} • {inv.permission.toLowerCase()} access
                          </p>
                        </div>
                      </div>
                      {inv.status === "PENDING" && (
                        <button
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="p-1.5 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Cancel invitation"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Shared Tab */}
        {activeTab === "shared" && (
          <div className="space-y-4">
            {/* Dashboards I've shared */}
            <div>
              <h4 className="text-sm font-medium text-sage-700 mb-3">People with Access</h4>
              {isLoadingData ? (
                <p className="text-sm text-sage-500 text-center py-4">Loading...</p>
              ) : shareData?.sharedByMe && shareData.sharedByMe.length > 0 ? (
                <div className="space-y-2">
                  {shareData.sharedByMe.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-sage-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-sage-200 rounded-full">
                          <Users className="w-4 h-4 text-sage-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sage-900">
                            {share.viewer.name || share.viewer.email}
                          </p>
                          <p className="text-xs text-sage-500 flex items-center gap-1">
                            {share.permission === "EDIT" ? (
                              <><Edit3 className="w-3 h-3" /> Can edit</>
                            ) : (
                              <><Eye className="w-3 h-3" /> View only</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        className="p-1.5 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Revoke access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-sage-500 text-center py-4">
                  You haven&apos;t shared your dashboard with anyone yet
                </p>
              )}
            </div>

            {/* Dashboards shared with me */}
            <div className="pt-4 border-t border-sage-100">
              <h4 className="text-sm font-medium text-sage-700 mb-3">Shared with Me</h4>
              {isLoadingData ? (
                <p className="text-sm text-sage-500 text-center py-4">Loading...</p>
              ) : shareData?.sharedWithMe && shareData.sharedWithMe.length > 0 ? (
                <div className="space-y-2">
                  {shareData.sharedWithMe.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-200 rounded-full">
                          <Users className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-sage-900">
                            {share.owner.name || share.owner.email}&apos;s Dashboard
                          </p>
                          <p className="text-xs text-sage-500 flex items-center gap-1">
                            {share.permission === "EDIT" ? (
                              <><Edit3 className="w-3 h-3" /> Can edit</>
                            ) : (
                              <><Eye className="w-3 h-3" /> View only</>
                            )}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleLeaveShare(share.id)}
                        className="p-1.5 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Leave dashboard"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-sage-500 text-center py-4">
                  No one has shared their dashboard with you yet
                </p>
              )}
            </div>
          </div>
        )}

        {/* Pending Tab */}
        {activeTab === "pending" && (
          <div className="space-y-2">
            {isLoadingData ? (
              <p className="text-sm text-sage-500 text-center py-4">Loading...</p>
            ) : shareData?.receivedInvitations && shareData.receivedInvitations.length > 0 ? (
              shareData.receivedInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-4 bg-sage-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-sage-200 rounded-full">
                      <Mail className="w-4 h-4 text-sage-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-sage-900">
                        {inv.sender.name || inv.sender.email}
                      </p>
                      <p className="text-xs text-sage-500">
                        Invited you to view their dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvitation(inv.id)}
                      className="p-2 text-sage-600 hover:text-sage-900 hover:bg-sage-100 rounded-lg transition-all"
                      title="Accept"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(inv.id)}
                      className="p-2 text-sage-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Decline"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-sage-500 text-center py-8">
                No pending invitations
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

