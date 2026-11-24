import { useState } from 'react'
import { ArrowRight, BadgeCheck, Barcode, CreditCard, Eye, EyeOff, LoaderCircle, LockKeyhole, ShoppingBag, UserRound } from 'lucide-react'
import { api, apiError } from '../api'
import { Brand, Notice } from '../components/ui'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function fill(account) {
    setUsername(account)
    setPassword('123456')
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/login', { username, password })
      onLogin(data)
    } catch (failure) {
      setError(apiError(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <Brand />
        <div className="login-art" aria-hidden="true">
          <div className="art-orbit orbit-large" /><div className="art-orbit orbit-small" />
          <span className="art-tile art-barcode"><Barcode size={38} strokeWidth={1.6} /></span>
          <span className="art-tile art-credit"><CreditCard size={38} strokeWidth={1.6} /></span>
          <div className="art-receipt">
            <span className="art-store"><ShoppingBag size={35} strokeWidth={1.65} /></span>
            <span /><span /><span /><span className="art-receipt-total" />
            <BadgeCheck size={32} strokeWidth={1.8} />
          </div>
        </div>
        <div className="login-tagline"><h1>Bán hàng tại quầy</h1></div>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="login-lock"><LockKeyhole size={23} /></span>
          <h2>Đăng nhập</h2>
          <p>Đăng nhập để bắt đầu ca bán hàng.</p>
          <form className="login-form" onSubmit={submit}>
            <Notice>{error}</Notice>
            <label htmlFor="username">Tên đăng nhập</label>
            <div className="field-icon"><UserRound size={18} /><input id="username" autoComplete="username" placeholder="Nhập tên đăng nhập" required maxLength={80} value={username} onChange={(event) => setUsername(event.target.value)} /></div>
            <label htmlFor="password">Mật khẩu</label>
            <div className="field-icon"><LockKeyhole size={18} /><input id="password" type={visible ? 'text' : 'password'} autoComplete="current-password" placeholder="Nhập mật khẩu" required maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" className="icon-button" aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <button type="submit" className="button primary login-submit" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={18} /> : null} Đăng nhập {!busy && <ArrowRight size={18} />}</button>
          </form>
          <div className="demo"><span>Tài khoản demo</span><div className="demo-buttons">
            <button className="button secondary" type="button" disabled={busy} onClick={() => fill('admin')}>Điền tài khoản Admin</button>
            <button className="button secondary" type="button" disabled={busy} onClick={() => fill('cashier')}>Điền tài khoản Thu ngân</button>
          </div></div>
        </div>
      </section>
    </main>
  )
}
