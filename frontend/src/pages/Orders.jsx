import { useEffect, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { api, apiError } from '../api'
import { Loading, Modal, Notice } from '../components/ui'
import { formatDate, formatMoney, paymentNames, statusNames } from '../format'

export default function Orders({ isAdmin }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState(null)
  const [refundError, setRefundError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    setLoading(true)
    api.get('/orders', {
      params: { status: status || undefined, paymentMethod: method || undefined },
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) setRows(data)
    }).catch((failure) => {
      if (!controller.signal.aborted) setError(apiError(failure))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [status, method, revision])

  async function refund(event) {
    event.preventDefault()
    setBusy(true)
    setRefundError('')
    try {
      await api.post('/orders/' + selected.id + '/refund')
      setSelected(null)
      setMessage('Đã hoàn tiền và hoàn lại tồn kho.')
      setRevision((value) => value + 1)
    } catch (failure) {
      setRefundError(apiError(failure))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading"><div><h1>Lịch sử đơn hàng</h1><p>Tra cứu hóa đơn và trạng thái thanh toán.</p></div></div>
    {message && <div className="success-message" role="status">{message}</div>}
    <section className="table-panel">
      <div className="table-toolbar">
        <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả</option>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        <label>Phương thức<select value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="">Tất cả</option>{Object.entries(paymentNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      {loading ? <Loading /> : error ? <div className="p-5"><Notice>{error}</Notice><button className="button secondary mt-3" type="button" onClick={() => setRevision((value) => value + 1)}>Thử lại</button></div> : rows.length === 0 ? <div className="empty-state"><History size={27} />Không có hóa đơn phù hợp.</div> :
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Hóa đơn</th><th>Thời gian</th><th>Thu ngân</th><th>Phương thức</th><th>Tổng tiền</th><th>Trạng thái</th>{isAdmin && <th>Thao tác</th>}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><strong className="order-code">{row.orderCode}</strong></td><td>{formatDate(row.createdAt)}</td><td>{row.cashierUsername}</td><td>{paymentNames[row.paymentMethod] || '—'}</td>
            <td><strong>{formatMoney(row.totalAmount)}</strong></td><td><span className={'status-label ' + row.status.toLowerCase()}>{statusNames[row.status]}</span></td>
            {isAdmin && <td>{row.status === 'PAID' && row.paymentStatus === 'SUCCESS' && <button className="button secondary small" type="button"
              onClick={() => { setMessage(''); setRefundError(''); setSelected(row) }}><RotateCcw size={15} />Hoàn tiền</button>}</td>}
          </tr>)}</tbody>
        </table></div>}
    </section>
    {selected && <Modal title="Hoàn tiền hóa đơn" onClose={() => setSelected(null)} locked={busy}>
      <form className="dialog-body" onSubmit={refund}>
        <p>Hoàn tiền <strong>{formatMoney(selected.totalAmount)}</strong> và nhập lại tồn kho cho các mặt hàng trong đơn?</p>
        <Notice>{refundError}</Notice>
        <div className="dialog-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Hủy</button>
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận hoàn tiền'}</button></div>
      </form>
    </Modal>}
  </>
}
