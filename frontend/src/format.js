const currency = new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 2,
})
const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
})

export const formatMoney = (value) => currency.format(value)
export const formatDate = (value) => value ? dateTime.format(new Date(value)) : '—'
export const toCents = (value) => Math.round(Number(value) * 100)
export const fromCents = (value) => value / 100
export const money = (cents) => formatMoney(fromCents(cents))

export function parseMoney(value) {
  if (!/^\d+(\.\d{0,2})?$/.test(String(value))) return null
  const cents = toCents(value)
  return Number.isSafeInteger(cents) ? cents : null
}

export function searchKey(value) {
  return String(value).trim().toLocaleLowerCase('vi').normalize('NFD')
    .replace(/\p{M}/gu, '').replaceAll('đ', 'd')
}

export const paymentNames = { CASH: 'Tiền mặt', QR: 'VietQR', CARD: 'Thẻ' }
export const statusNames = { PAID: 'Đã thanh toán', CANCELLED: 'Đã hủy', REFUNDED: 'Đã hoàn tiền' }
