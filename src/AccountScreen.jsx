import { useState } from 'react'

const MIN_PASSWORD_LENGTH = 8

const Notice = ({ notice }) => notice && (
  <p className={`account-notice ${notice.type}`} role="status">{notice.text}</p>
)

const AccountScreen = ({ cloud, onContinue }) => {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const user = cloud.session?.user
  const activeMode = cloud.passwordRecovery ? 'update' : mode

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (activeMode === 'reset') {
      setSubmitting(true)
      await cloud.sendPasswordReset(email.trim().toLowerCase())
      setSubmitting(false)
      return
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
      return
    }
    if ((activeMode === 'signup' || activeMode === 'update') && password !== confirmation) {
      setFormError('The passwords do not match.')
      return
    }

    setSubmitting(true)
    if (activeMode === 'signup') await cloud.signUp(email.trim().toLowerCase(), password)
    if (activeMode === 'signin') await cloud.signIn(email.trim().toLowerCase(), password)
    if (activeMode === 'update') await cloud.updatePassword(password)
    setSubmitting(false)
  }

  if (!cloud.configured) {
    return (
      <main className="account-screen">
        <p className="section-kicker">ACCOUNT</p>
        <h1>Cloud accounts are not configured</h1>
        <p className="account-lede">Your entries are still saved privately on this device.</p>
        <button type="button" className="account-secondary wide" onClick={onContinue}>Continue locally</button>
      </main>
    )
  }

  if (cloud.authLoading) {
    return <main className="account-screen account-loading" aria-live="polite"><span className="account-loader" />Checking your account...</main>
  }

  if (user && !cloud.passwordRecovery) {
    return (
      <main className="account-screen">
        <header className="account-header">
          <p className="section-kicker">YOUR ACCOUNT</p>
          <h1>Your recovery record, wherever you need it.</h1>
          <p className="account-lede">This device is connected and your entries are protected by your account.</p>
        </header>

        <section className="account-profile-card">
          <div className="account-orbit" aria-hidden="true"><span>{user.email?.charAt(0).toUpperCase()}</span></div>
          <div className="account-identity">
            <small>SIGNED IN AS</small>
            <strong>{user.email}</strong>
            <span><i /> Cloud sync active</span>
          </div>
        </section>

        <section className="account-benefits" aria-label="Account benefits">
          <div><span>01</span><strong>Private by default</strong><p>Only your account can read your recovery entries.</p></div>
          <div><span>02</span><strong>Available anywhere</strong><p>Sign in on another device to restore your history.</p></div>
          <div><span>03</span><strong>Local-first</strong><p>Keep logging offline. Changes sync when you reconnect.</p></div>
        </section>

        <button type="button" className="account-primary" onClick={cloud.syncNow} disabled={cloud.syncState === 'syncing'}>
          {cloud.syncState === 'syncing' ? 'Syncing...' : 'Sync now'}
        </button>
        <button type="button" className="account-secondary wide" onClick={cloud.signOut}>Sign out</button>
        <Notice notice={cloud.notice} />
      </main>
    )
  }

  const titles = {
    signin: ['WELCOME BACK', 'Continue your recovery story.', 'Sign in to restore your history and keep every check-in together.'],
    signup: ['CREATE ACCOUNT', 'Give your progress a safe home.', 'Your existing entries stay on this device and sync securely after confirmation.'],
    reset: ['RESET PASSWORD', 'Find your way back in.', 'We will send a secure reset link to your email address.'],
    update: ['NEW PASSWORD', 'Choose a fresh password.', 'Make it memorable, private, and at least eight characters long.'],
  }
  const [kicker, title, description] = titles[activeMode]

  return (
    <main className="account-screen auth-screen">
      <div className="auth-emblem" aria-hidden="true"><span>R</span></div>
      <header className="account-header auth-heading">
        <p className="section-kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="account-lede">{description}</p>
      </header>

      {activeMode !== 'reset' && activeMode !== 'update' && (
        <div className="auth-toggle" role="tablist" aria-label="Account action">
          <button type="button" role="tab" aria-selected={activeMode === 'signin'} className={activeMode === 'signin' ? 'active' : ''} onClick={() => setMode('signin')}>Sign in</button>
          <button type="button" role="tab" aria-selected={activeMode === 'signup'} className={activeMode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>
      )}

      <form className="auth-form" onSubmit={submit}>
        {activeMode !== 'update' && (
          <label>
            <span>Email address</span>
            <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
        )}
        {activeMode !== 'reset' && (
          <label>
            <span>{activeMode === 'update' ? 'New password' : 'Password'}</span>
            <input type="password" autoComplete={activeMode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
          </label>
        )}
        {(activeMode === 'signup' || activeMode === 'update') && (
          <label>
            <span>Confirm password</span>
            <input type="password" autoComplete="new-password" placeholder="Repeat your password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={MIN_PASSWORD_LENGTH} />
          </label>
        )}
        {formError && <p className="account-notice error" role="alert">{formError}</p>}
        <button type="submit" className="account-primary" disabled={submitting}>
          {submitting ? 'Please wait...' : activeMode === 'signin' ? 'Sign in securely' : activeMode === 'signup' ? 'Create my account' : activeMode === 'reset' ? 'Send reset link' : 'Update password'}
        </button>
      </form>

      {activeMode === 'signin' && <button type="button" className="auth-text-button" onClick={() => setMode('reset')}>Forgot your password?</button>}
      {activeMode === 'reset' && <button type="button" className="auth-text-button" onClick={() => setMode('signin')}>Back to sign in</button>}
      <Notice notice={cloud.notice} />

      {!cloud.passwordRecovery && (
        <div className="guest-path">
          <span>OR</span>
          <button type="button" onClick={onContinue}>Continue without an account</button>
          <p>Your entries will remain on this device only.</p>
        </div>
      )}
    </main>
  )
}

export default AccountScreen
