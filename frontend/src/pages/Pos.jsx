import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Barcode, Coffee, Cookie, Grid2X2, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from 'lucide-react'
import { api, apiError } from '../api'
import { Loading, Notice, ProductArt } from '../components/ui'
import PaymentModal from '../components/PaymentModal'
import ReceiptModal from '../components/ReceiptModal'
import { formatMoney, money, parseMoney, searchKey, toCents } from '../format'

const categoryIcons = { 'Đồ uống': Coffee, 'Đồ ăn nhẹ': Cookie, 'Vật dụng': Package }

export default function Pos() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [cartError, setCartError] = useState('')
  const [scanError, setScanError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [cart, setCart] = useState([])
  const [discountInput, setDiscountInput] = useState('')
  const [paying, setPaying] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const loadProducts = useCallback(async (signal) => {
    setLoading(true)
    setLoadError('')
    try {
      const { data } = await api.get('/products', { signal })
      setProducts([...data].sort((left, right) => left.sku.localeCompare(right.sku, 'vi', { numeric: true })))
    } catch (error) {
      if (!signal?.aborted) setLoadError(apiError(error))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadProducts(controller.signal)
    return () => controller.abort()
  }, [loadProducts])

  const categories = [...new Set(products.map((product) => product.category))].sort((a, b) => a.localeCompare(b, 'vi'))
  const term = searchKey(query)
  const displayed = products.filter((product) =>
    (!category || product.category === category) &&
      (!term || searchKey(product.name).includes(term) || searchKey(product.sku).includes(term)))
  const subtotal = cart.reduce((total, line) => total + toCents(line.product.price) * line.quantity, 0)
  const count = cart.reduce((total, line) => total + line.quantity, 0)
  const discount = discountInput === '' ? 0 : parseMoney(discountInput)
  const discountInvalid = discount === null || discount > subtotal
  const taxable = Math.max(0, subtotal - (discount ?? 0))
  const vat = Math.round(taxable * 8 / 100)
  const total = taxable + vat

  function changeQuantity(product, delta) {
    const current = cart.find((line) => line.product.id === product.id)?.quantity ?? 0
    const quantity = current + delta
    const liveProduct = products.find((item) => item.id === product.id)
    const available = liveProduct?.stockQuantity ?? 0
    if (delta > 0 && quantity > available) {
      setCartError('Không đủ tồn kho cho ' + product.name + '. Hiện còn ' + available + '.')
      return false
    }
    setCartError('')
    if (quantity <= 0) setCart(cart.filter((line) => line.product.id !== product.id))
    else if (current === 0) setCart([...cart, { product, quantity }])
    else setCart(cart.map((line) => line.product.id === product.id ? { ...line, quantity } : line))
    return true
  }

  function scan(event) {
    event.preventDefault()
    if (!query.trim()) return
    const product = products.find((item) => item.sku.toUpperCase() === query.trim().toUpperCase())
    if (!product) {
      setScanError('Không có sản phẩm khớp chính xác mã SKU này.')
      return
    }
    if (changeQuantity(product, 1)) {
      setQuery('')
      setScanError('')
    }
  }

  function newOrder() {
    setReceipt(null)
    setCart([])
    setDiscountInput('')
    setCartError('')
    loadProducts()
  }

  return (
    <>
      <div className="page-heading">
        <div><h1>Bán hàng tại quầy</h1><p>Chọn sản phẩm hoặc quét mã SKU để bắt đầu.</p></div>
      </div>
      <div className="pos-layout">
        <section className="catalog min-w-0" aria-label="Danh mục sản phẩm">
          <div className="catalog-tools">
            <form className="search-form" role="search" onSubmit={scan}>
              <Search size={20} />
              <input aria-label="Tìm sản phẩm" placeholder="Tìm theo tên hoặc mã SKU..." value={query}
                onChange={(event) => { setQuery(event.target.value); setScanError('') }} />
              <span className="scanner-hint"><Barcode size={18} /><kbd>Enter</kbd></span>
            </form>
            <Notice>{scanError}</Notice>
            <div className="category-list" aria-label="Lọc danh mục">
              <button className={!category ? 'category active' : 'category'} type="button" aria-pressed={!category} onClick={() => setCategory('')}><Grid2X2 size={16} />Tất cả</button>
              {categories.map((item) => {
                const Icon = categoryIcons[item] || Package
                return <button key={item} className={category === item ? 'category active' : 'category'} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}><Icon size={16} />{item}</button>
              })}
            </div>
          </div>
          <div className="catalog-heading"><h2>Sản phẩm</h2><span>{loading ? '' : displayed.length + ' sản phẩm'}</span></div>
          {loading ? <Loading /> : loadError ? <><Notice>{loadError}</Notice><button type="button" className="button secondary mt-3" onClick={() => loadProducts()}>Thử lại</button></> : displayed.length === 0 ? (
            <div className="empty-state catalog-empty"><Package size={28} />Không tìm thấy sản phẩm.</div>
          ) : (
            <div className="product-grid">
              {displayed.map((product) => {
                const soldOut = product.stockQuantity === 0
                return <button type="button" key={product.id} className="product-card" disabled={soldOut}
                  aria-label={'Thêm ' + product.name + ' vào giỏ'} onClick={() => changeQuantity(product, 1)}>
                  <div className="card-photo">
                    <ProductArt product={product} />
                    <span className={soldOut ? 'stock sold-out' : 'stock'}><span />{soldOut ? 'Hết hàng' : 'Còn ' + product.stockQuantity}</span>
                  </div>
                  <div className="card-info"><span className="sku">{product.sku}</span><h3>{product.name}</h3>
                    <div className="card-bottom"><strong>{formatMoney(product.price)}</strong><span className="card-plus"><Plus size={17} strokeWidth={2.4} /></span></div>
                  </div>
                </button>
              })}
            </div>
          )}
        </section>
        <aside id="pos-cart" className="cart-panel" aria-label="Giỏ hàng hiện tại">
          <header className="cart-header"><span className="cart-header-icon"><ShoppingCart size={22} /></span><div><h2>Giỏ hàng</h2><p>{count} sản phẩm</p></div></header>
          <div className="cart-content">
            <Notice>{cartError}</Notice>
            {cart.length === 0 ? <div className="cart-empty"><span><ShoppingCart size={30} strokeWidth={1.6} /></span><strong>Giỏ hàng đang trống</strong><p>Chọn sản phẩm để thêm vào giỏ.</p></div> : (
              <ul className="cart-items">
                {cart.map(({ product, quantity }) => <li key={product.id}>
                  <ProductArt product={product} />
                  <div className="cart-item-text"><strong>{product.name}</strong><span>{formatMoney(product.price)}</span>
                    <div className="quantity-stepper">
                      <button type="button" aria-label={'Giảm số lượng ' + product.name} onClick={() => changeQuantity(product, -1)}><Minus size={14} /></button>
                      <span>{quantity}</span>
                      <button type="button" aria-label={'Tăng số lượng ' + product.name} onClick={() => changeQuantity(product, 1)}><Plus size={14} /></button>
                    </div>
                  </div>
                  <div className="cart-item-end"><strong>{money(toCents(product.price) * quantity)}</strong>
                    <button type="button" className="icon-button" aria-label={'Xóa ' + product.name} onClick={() => changeQuantity(product, -quantity)}><Trash2 size={16} /></button>
                  </div>
                </li>)}
              </ul>
            )}
          </div>
          <div className="cart-footer">
            <label htmlFor="discount">Giảm giá</label>
            <div className="amount-field"><input id="discount" inputMode="decimal" placeholder="0" value={discountInput}
              onChange={(event) => setDiscountInput(event.target.value.replace(',', '.'))} aria-invalid={discountInvalid} aria-describedby={discountInvalid ? 'discount-error' : undefined} /><span>VNĐ</span></div>
            {discountInvalid && <p id="discount-error" className="field-error">Nhập số tiền giảm giá từ 0 đến tạm tính.</p>}
            <dl className="summary">
              <div><dt>Tạm tính</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Thuế VAT (8%)</dt><dd>{money(vat)}</dd></div>
              <div className="total"><dt>Tổng thanh toán</dt><dd>{money(total)}</dd></div>
            </dl>
            <button type="button" className="button primary checkout-button" disabled={!cart.length || discountInvalid || !Number.isSafeInteger(total)} onClick={() => setPaying(true)}>
              Thanh toán <ArrowRight size={19} />
            </button>
          </div>
        </aside>
      </div>
      {count > 0 && <a href="#pos-cart" className="button primary cart-jump">
        <ShoppingCart size={17} /> Xem giỏ hàng ({count}) <strong>{money(total)}</strong>
      </a>}
      {paying && <PaymentModal cart={cart} discount={discount} total={total} onClose={() => setPaying(false)}
        onPaid={(data) => { setPaying(false); setReceipt(data) }} />}
      {receipt && <ReceiptModal receipt={receipt} onNewOrder={newOrder} />}
    </>
  )
}
