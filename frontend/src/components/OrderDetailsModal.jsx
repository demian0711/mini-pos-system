import { useEffect, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { api, apiError } from '../api'
import { formatDate, formatMoney, paymentNames, statusNames } from '../format'
import { Loading, Modal, Notice } from './ui'

export default function OrderDetailsModal({ order, isAdmin, onClose, onRefund }) {
  const [detail, setDetail] = useState(null)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [confirming, setConfirming] = useState(false)
  const [refundError, setRefundError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    api.get('/orders/' + order.id, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setDetail(data)
      }).catch((failure) => {
        if (!controller.signal.aborted) setError(apiError(failure))
      })
    return () => controller.abort()
  }, [order.id, revision])

  async function refund(event) {
    event.preventDefault()
    setBusy(true)
    setRefundError('')
    try {
      const { data } = await api.post('/orders/' + order.id + '/refund')
      onRefund(data)
    } catch (failure) {
      setRefundError(apiError(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title={confirming ? 'Xác nhận hoàn tiền' : 'Chi tiết đơn hàng'} description={order.orderCode}
      className="order-detail-dialog" onClose={onClose} locked={busy}>
      {confirming ? (
        <form className="dialog-body" onSubmit={refund}>
          <p>Hoàn tiền <strong>{formatMoney(detail.totalAmount)}</strong> và nhập lại tồn kho cho các mặt hàng trong đơn?</p>
          <Notice>{refundError}</Notice>
          <div className="dialog-actions">
            <button className="button secondary" type="button" disabled={busy} onClick={() => setConfirming(false)}>Hủy</button>
            <button className="button danger" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Xác nhận hoàn tiền'}</button>
          </div>
        </form>
      ) : (
        <div className="dialog-body">
          {error ? <>
            <Notice>{error}</Notice>
            <button className="button secondary" type="button" onClick={() => setRevision((value) => value + 1)}>Thử lại</button>
          </> : !detail ? <Loading>Đang tải chi tiết đơn…</Loading> : <>
            <dl className="order-detail-meta">
              <div><dt>Thời gian</dt><dd>{formatDate(detail.createdAt)}</dd></div>
              <div><dt>Thu ngân</dt><dd>{detail.cashier.fullName}</dd></div>
              <div><dt>Phương thức</dt><dd>{paymentNames[detail.payment?.paymentMethod] || '—'}</dd></div>
              <div><dt>Trạng thái</dt><dd><span className={'status-label ' + detail.status.toLowerCase()}>{statusNames[detail.status]}</span></dd></div>
            </dl>
            <div className="table-scroll order-detail-items">
              <table className="data-table" aria-label="Các món trong đơn">
                <thead><tr><th>Sản phẩm</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                  {detail.items.length === 0 && <tr><td colSpan="4">Đơn hàng này chưa có dòng sản phẩm.</td></tr>}
                  {detail.items.map((item, index) => <tr key={item.productId + '-' + index}>
                    <td>{item.productName}</td><td>{item.quantity}</td>
                    <td>{formatMoney(item.unitPrice)}</td><td>{formatMoney(item.lineTotal)}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
            <dl className="summary order-detail-summary">
              <div><dt>Tạm tính</dt><dd>{formatMoney(detail.subtotal)}</dd></div>
              <div><dt>Giảm giá</dt><dd>{formatMoney(detail.discountAmount)}</dd></div>
              <div><dt>Thuế VAT (8%)</dt><dd>{formatMoney(detail.taxAmount)}</dd></div>
              <div className="total"><dt>Tổng tiền</dt><dd>{formatMoney(detail.totalAmount)}</dd></div>
            </dl>
            {isAdmin && detail.status === 'PAID' && <div className="dialog-actions">
              <button className="button secondary" type="button" onClick={() => { setRefundError(''); setConfirming(true) }}>
                <RotateCcw size={16} />Hoàn tiền (Refund)
              </button>
            </div>}
          </>}
        </div>
      )}
    </Modal>
  )
}
