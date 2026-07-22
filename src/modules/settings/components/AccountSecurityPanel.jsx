import React, { useCallback, useEffect, useState } from "react";
import { useStore } from "@app/store/useStore";
import { changePassword, createMemberPasswordReset, inviteOrganizationMember, listOrganizationMembers, listSessions, removeOrganizationMember, revokeSession, setOrganizationMemberStatus, updateOrganizationMember } from "@modules/auth";
import { isMockMode } from "@infrastructure/http/client";

export default function AccountSecurityPanel() {
  const user = useStore((state) => state.user);
  const [sessions, setSessions] = useState([]);
  const [members, setMembers] = useState([]);
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = user?.roles?.includes("organization_admin");
  const organizationId = user?.organizationId;

  const refresh = useCallback(async () => {
    if (isMockMode()) return;
    const [activeSessions, organizationMembers] = await Promise.all([
      listSessions(),
      isAdmin ? listOrganizationMembers(organizationId) : Promise.resolve([]),
    ]);
    setSessions(activeSessions || []);
    setMembers(organizationMembers || []);
  }, [isAdmin, organizationId]);

  useEffect(() => { Promise.resolve().then(refresh).catch((error) => setMessage(error.message)); }, [refresh]);

  async function invite(event) {
    event.preventDefault(); setMessage("");
    try {
      const result = await inviteOrganizationMember(user.organizationId, { email, role: "member" });
      const link = `${window.location.origin}/register?token=${encodeURIComponent(result.token)}`;
      await navigator.clipboard.writeText(link);
      setEmail(""); setMessage("Invitation link copied. It is shown only once.");
    } catch (error) { setMessage(error.message); }
  }

  async function savePassword(event) {
    event.preventDefault(); setMessage("");
    try {
      await changePassword(currentPassword, newPassword);
      useStore.getState().logout();
      window.location.assign("/login");
    } catch (error) { setMessage(error.message); }
  }

  async function copyResetLink(member) {
    try {
      const result = await createMemberPasswordReset(user.organizationId, member.id);
      await navigator.clipboard.writeText(`${window.location.origin}/login?reset=${encodeURIComponent(result.token)}`);
      setMessage("Password reset link copied. It is shown only once.");
    } catch (error) { setMessage(error.message); }
  }

  if (isMockMode()) return null;
  return <>
    <section className="settings-panel settings-panel-wide">
      <div className="settings-panel-head"><span>Account</span><h2>Password and active sessions</h2></div>
      <form className="settings-field-grid" onSubmit={savePassword}>
        <label className="settings-field"><span>Current password</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label className="settings-field"><span>New password</span><input type="password" autoComplete="new-password" minLength={12} maxLength={1024} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
        <button className="btn primary" type="submit">Change password</button>
      </form>
      <div className="settings-field-grid">
        {sessions.map((session) => <div className="settings-field" key={session.id}><span>{session.current ? "Current session" : "Active session"}</span><small>{new Date(session.lastSeenAt).toLocaleString()}</small><button type="button" className="btn" onClick={() => revokeSession(session.id).then(refresh).catch((error) => setMessage(error.message))}>Revoke</button></div>)}
      </div>
    </section>
    {isAdmin ? <section className="settings-panel settings-panel-wide">
      <div className="settings-panel-head"><span>Organization</span><h2>Members and invitations</h2></div>
      <form className="settings-field-grid" onSubmit={invite}>
        <label className="settings-field"><span>Email to invite</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <button className="btn primary" type="submit">Create and copy invitation link</button>
      </form>
      <div className="settings-field-grid">
        {members.map((member) => <div className="settings-field" key={member.id}><span>{member.name} — {member.email}</span><select aria-label={`Role for ${member.email}`} value={member.role} onChange={(event) => updateOrganizationMember(user.organizationId, member.id, event.target.value).then(refresh).catch((error) => setMessage(error.message))}><option value="member">Member</option><option value="organization_admin">Organization admin</option></select><button type="button" className="btn" onClick={() => copyResetLink(member)}>Copy reset link</button><button type="button" className="btn" disabled={member.id === user.id} onClick={() => setOrganizationMemberStatus(user.organizationId, member.id, member.status === "disabled" ? "active" : "disabled").then(refresh).catch((error) => setMessage(error.message))}>{member.status === "disabled" ? "Enable" : "Disable"}</button><button type="button" className="btn" disabled={member.id === user.id} onClick={() => removeOrganizationMember(user.organizationId, member.id).then(refresh).catch((error) => setMessage(error.message))}>Remove</button></div>)}
      </div>
    </section> : null}
    {message ? <p className="settings-sync-status" role="status" aria-live="polite">{message}</p> : null}
  </>;
}
