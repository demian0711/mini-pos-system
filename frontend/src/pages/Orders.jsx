import { useEffect, useState } from 'react'
import { Banknote, History, ReceiptText, RotateCcw } from 'lucide-react'
import { api, apiError } from '../api'
import { Loading, Notice } from '../components/ui'
import OrderDetailsModal from '../components/OrderDetailsModal'
import { formatDate, formatMoney, paymentNames, statusNames } from '../format'

const statusFilters = ['PAID', 'REFUNDED']

function OrderStats({ stats, error, onRetry }) {
  if (error) {
    return <div className="order-stats-error">
      <Notice>{error}</Notice>
      <button className="button secondary small" type="button" onClick={onRetry}>Tải lại thống kê</button>
    </div>
  }
  const cards = [
    { label: 'Tổng số đơn hôm nay', value: stats?.ordersToday, icon: ReceiptText, tone: 'blue', note: 'Giờ Việt Nam' },
    { label: 'Tổng doanh thu', value: stats ? formatMoney(stats.paidRevenue) : null, icon: Banknote, tone: 'green', note: 'Toàn thời gian · Đơn đã thanh toán' },
    { label: 'Tổng đơn đã hoàn tiền', value: stats?.refundedOrders, icon: RotateCcw, tone: 'amber', note: 'Toàn thời gian' },
  ]
  return <dl className="order-stats" aria-label="Thống kê đơn hàng" aria-busy={!stats}>
    {cards.map(({ label, value, icon: Icon, tone, note }) => <div key={label} className="order-stat">
      <span className={'order-stat-icon ' + tone} aria-hidden="true"><Icon size={20} /></span>
      <div><dt>{label}</dt><dd>{value ?? '—'}</dd><span className="order-stat-note">{note}</span></div>
    </div>)}
  </dl>
}

export default function Orders({ isAdmin }) {
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [stats, setStats] = useState(null)
  const [statsError, setStatsError] = useState('')
  const [statsRevision, setStatsRevision] = useState(0)
  const [selected, setSelected] = useState(null)
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

  useEffect(() => {
    const controller = new AbortController()
    setStatsError('')
    api.get('/orders/stats', { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setStats(data)
      }).catch((failure) => {
        if (!controller.signal.aborted) setStatsError(apiError(failure))
      })
    return () => controller.abort()
  }, [statsRevision])

  function applyRefund(order) {
    setRows((current) => current.flatMap((row) => {
      if (row.id !== order.id) return [row]
      if (status && status !== order.status) return []
      return [{ ...row, status: order.status, paymentStatus: order.payment?.paymentStatus }]
    }))
    setStatsRevision((value) => value + 1)
    setMessage('Đã hoàn tiền và hoàn lại tồn kho.')
    setSelected(null)
  }

  return <>
    <div className="page-heading">
      <div><h1>Lịch sử đơn hàng</h1><p>Tra cứu hóa đơn và trạng thái thanh toán.</p></div>
    </div>
    <OrderStats stats={stats} error={statsError} onRetry={() => setStatsRevision((value) => value + 1)} />
    {message && <div className="success-message" role="status">{message}</div>}
    <section className="table-panel">
      <div className="table-toolbar">
        <label>Trạng thái<select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả</option>
          {statusFilters.map((value) => <option key={value} value={value}>{statusNames[value]}</option>)}
        </select></label>
        <label>Phương thức<select value={method} onChange={(event) => setMethod(event.target.value)}>
          <option value="">Tất cả</option>
          {Object.entries(paymentNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </div>
      {loading ? <Loading /> : error ? (
        <div className="p-5">
          <Notice>{error}</Notice>
          <button className="button secondary mt-3" type="button" onClick={() => setRevision((value) => value + 1)}>Thử lại</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state"><History size={27} />Không có hóa đơn phù hợp.</div>
      ) : (
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Thu ngân</th><th>Phương thức</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="order-row" onClick={() => setSelected(row)}>
            <td><button type="button" className="order-code" aria-label={'Xem chi tiết đơn ' + row.orderCode}>{row.orderCode}</button></td>
            <td>{formatDate(row.createdAt)}</td>
            <td>{row.cashierUsername}</td>
            <td>{paymentNames[row.paymentMethod] || '—'}</td>
            <td><strong>{formatMoney(row.totalAmount)}</strong></td>
            <td><span className={'status-label ' + row.status.toLowerCase()}>{statusNames[row.status]}</span></td>
          </tr>)}</tbody>
        </table></div>
      )}
    </section>
    {selected && <OrderDetailsModal key={selected.id} order={selected} isAdmin={isAdmin}
      onClose={() => setSelected(null)} onRefund={applyRefund} />}
  </>
}
