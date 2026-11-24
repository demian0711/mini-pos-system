import { ArrowRight, Printer, ReceiptText } from 'lucide-react'
import { formatDate, formatMoney, paymentNames, statusNames } from '../format'
import { Modal } from './ui'

export default function ReceiptModal({ receipt, onNewOrder, onClose }) {
  const { payment } = receipt
  return (
    <Modal title="Hóa đơn" onClose={onClose} className="receipt-dialog">
      <div className="dialog-body">
        <article className="receipt-paper" id="receipt-print" aria-label="Hóa đơn in">
          <div className="receipt-brand"><ReceiptText size={24} /><strong>MINI POS</strong><span>HÓA ĐƠN BÁN HÀNG</span></div>
          <dl className="receipt-details">
            <div><dt>Mã đơn</dt><dd>{receipt.orderCode}</dd></div>
            <div><dt>Thời gian</dt><dd>{formatDate(receipt.createdAt)}</dd></div>
            <div><dt>Thu ngân</dt><dd>{receipt.cashier.fullName}</dd></div>
            <div><dt>Trạng thái</dt><dd>{statusNames[receipt.status]}</dd></div>
          </dl>
          <table className="receipt-table">
            <thead><tr><th>Sản phẩm</th><th>SL</th><th>Thành tiền</th></tr></thead>
            <tbody>{receipt.items.map((item, index) => <tr key={item.productId + '-' + index}><td>{item.productName}<small>{formatMoney(item.unitPrice)}</small></td><td>{item.quantity}</td><td>{formatMoney(item.lineTotal)}</td></tr>)}</tbody>
          </table>
          <dl className="receipt-calculation">
            <div><dt>Tạm tính</dt><dd>{formatMoney(receipt.subtotal)}</dd></div>
            <div><dt>Giảm giá</dt><dd>{formatMoney(receipt.discountAmount)}</dd></div>
            <div><dt>Thuế VAT (8%)</dt><dd>{formatMoney(receipt.taxAmount)}</dd></div>
            <div className="receipt-grand"><dt>TỔNG CỘNG</dt><dd>{formatMoney(receipt.totalAmount)}</dd></div>
            <div><dt>Phương thức</dt><dd>{paymentNames[payment.paymentMethod]}</dd></div>
            <div><dt>Tiền nhận</dt><dd>{formatMoney(payment.amountPaid)}</dd></div>
            <div><dt>Tiền thối</dt><dd>{formatMoney(payment.changeAmount)}</dd></div>
          </dl>
        </article>
        <div className="receipt-actions">
          <button type="button" className="button secondary" onClick={() => window.print()}><Printer size={18} />In hóa đơn</button>
          {onNewOrder && <button type="button" className="button primary" onClick={onNewOrder}>Đơn hàng mới <ArrowRight size={17} /></button>}
        </div>
      </div>
    </Modal>
  )
}
