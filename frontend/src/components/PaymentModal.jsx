import { useRef, useState } from 'react'
import { Banknote, Check, CreditCard, LoaderCircle, QrCode } from 'lucide-react'
import { api, apiError } from '../api'
import { fromCents, money, parseMoney } from '../format'
import { Modal, Notice } from './ui'

const methods = [
  { id: 'CASH', label: 'Tiền mặt', icon: Banknote },
  { id: 'QR', label: 'Chuyển khoản VietQR', icon: QrCode },
  { id: 'CARD', label: 'Thẻ', icon: CreditCard },
]
const quickCash = [50000, 100000, 200000, 500000]

export default function PaymentModal({ cart, discount, total, onClose, onPaid }) {
  const [method, setMethod] = useState('CASH')
  const [cash, setCash] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const [qrError, setQrError] = useState(false)
  const pending = useRef(false)
  const paidCash = parseMoney(cash)
  const cashReady = paidCash !== null && paidCash >= total
  const qrUrl = 'https://img.vietqr.io/image/VCB-0123456789-compact.png?amount=' +
    encodeURIComponent(fromCents(total)) + '&addInfo=Thanh+toan+POS'

  async function confirm(event) {
    event.preventDefault()
    if (pending.current || uncertain || (method === 'CASH' && !cashReady)) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      if (method === 'CARD') await new Promise((resolve) => setTimeout(resolve, 1500))
      const { data } = await api.post('/orders/checkout', {
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
        discountAmount: fromCents(discount),
        paymentMethod: method,
        amountPaid: fromCents(method === 'CASH' ? paidCash : total),
      })
      onPaid(data)
    } catch (failure) {
      if (!failure.response) {
        setUncertain(true)
        setError('Chưa xác nhận được kết quả. Hãy kiểm tra Lịch sử đơn hàng trước khi thử thanh toán lại.')
      } else {
        setError(apiError(failure))
      }
    } finally {
      setBusy(false)
      pending.current = false
    }
  }

  return (
    <Modal title="Thanh toán" onClose={onClose} locked={busy} className="payment-dialog">
      <form onSubmit={confirm} className="dialog-body">
        <div className="payment-total"><span>Tổng thanh toán</span><strong>{money(total)}</strong></div>
        <div className="payment-methods" role="group" aria-label="Phương thức thanh toán">
          {methods.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={method === id ? 'active' : ''}
            aria-pressed={method === id} disabled={busy || uncertain} onClick={() => { setMethod(id); setError(''); setQrError(false) }}><Icon size={19} />{label}</button>)}
        </div>
        {method === 'CASH' && <div className="payment-pane">
          <label htmlFor="cash-received">Tiền khách đưa</label>
          <div className="amount-field"><input id="cash-received" type="text" inputMode="decimal" value={cash} placeholder="0" onChange={(event) => setCash(event.target.value.replace(',', '.'))} disabled={busy} /><span>VNĐ</span></div>
          <div className="cash-options">{quickCash.map((value) => <button type="button" className="button secondary" key={value} disabled={busy} onClick={() => setCash(String(value))}>{value / 1000}k</button>)}</div>
          <div className="cash-change"><span>Tiền thối lại</span><strong>{money(cashReady ? paidCash - total : 0)}</strong></div>
        </div>}
        {method === 'QR' && <div className="payment-pane qr-pane">
          {qrError ? <Notice>Không tải được ảnh VietQR.</Notice> : <img src={qrUrl} width="200" height="200" alt="Mã VietQR chuyển khoản cho hóa đơn" onError={() => setQrError(true)} referrerPolicy="no-referrer" />}
          <p><strong>Vietcombank · 0123456789</strong><br />Tài khoản demo</p>
        </div>}
        {method === 'CARD' && <div className="payment-pane card-pane"><CreditCard size={34} /><strong>Thanh toán bằng thẻ</strong><p>Mô phỏng quẹt thẻ tại quầy.</p></div>}
        <Notice>{error}</Notice>
        <button type="submit" className="button primary full-button" disabled={busy || uncertain || (method === 'CASH' && !cashReady)}>
          {busy ? <><LoaderCircle className="animate-spin" size={18} />Đang xử lý…</> :
            <>{method === 'CARD' ? <CreditCard size={18} /> : <Check size={18} />}{method === 'QR' ? 'Xác nhận đã nhận tiền' : method === 'CARD' ? 'Mô phỏng quẹt thẻ' : 'Xác nhận thanh toán'}</>}
        </button>
      </form>
    </Modal>
  )
}
