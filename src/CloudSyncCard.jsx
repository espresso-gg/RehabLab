import { useState } from 'react'

const CloudSyncCard = ({ cloud }) => {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!cloud.configured) return null

  const handleSubmit = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) return
    setSubmitting(true)
    await cloud.sendMagicLink(normalizedEmail)
    setSubmitting(false)
  }

  const userEmail = cloud.session?.user?.email
  const lastSync = cloud.lastSyncedAt?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

  return (
    <section className="progress-card cloud-card" aria-labelledby="cloud-heading">
      <div className="cloud-heading-row">
        <div className={`cloud-mark ${cloud.syncState}`} aria-hidden="true">⌁</div>
        <div>
          <p className="section-kicker">CLOUD BACKUP</p>
          <h2 id="cloud-heading">{userEmail ? 'Synced across devices' : 'Keep a secure copy'}</h2>
        </div>
        {userEmail && <span className={`sync-state ${cloud.syncState}`}>{cloud.syncState === 'syncing' ? 'Syncing' : cloud.syncState === 'error' ? 'Needs attention' : 'Connected'}</span>}
      </div>

      {cloud.authLoading ? (
        <p className="cloud-description">Checking your secure session…</p>
      ) : userEmail ? (
        <>
          <p className="cloud-description">Local-first logging is active. Changes sync automatically whenever this device is online.</p>
          <div className="cloud-account">
            <div><small>Signed in as</small><strong>{userEmail}</strong></div>
            <span>{lastSync ? `Last sync ${lastSync}` : 'Waiting to sync'}</span>
          </div>
          <div className="cloud-actions">
            <button type="button" className="cloud-sync-btn" onClick={cloud.syncNow} disabled={cloud.syncState === 'syncing'}>{cloud.syncState === 'syncing' ? 'Syncing…' : 'Sync now'}</button>
            <button type="button" className="cloud-signout-btn" onClick={cloud.signOut}>Sign out</button>
          </div>
        </>
      ) : (
        <>
          <p className="cloud-description">Sign in by email to back up your local recovery history. You can still use RehabLab without an account.</p>
          <form className="cloud-signin" onSubmit={handleSubmit}>
            <label htmlFor="cloud-email" className="visually-hidden">Email address</label>
            <input id="cloud-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <button type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Email sign-in link'}</button>
          </form>
          <p className="cloud-footnote">No password. Your local records stay available offline.</p>
        </>
      )}

      {cloud.notice && <p className={`cloud-notice ${cloud.notice.type}`} role="status">{cloud.notice.text}</p>}
    </section>
  )
}

export default CloudSyncCard
