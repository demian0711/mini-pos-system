import { useCallback, useEffect, useState } from 'react'
import { Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { api, apiError } from '../api'
import { Loading, Modal, Notice, ProductArt } from '../components/ui'
import { formatMoney, searchKey } from '../format'

const fields = [
  { key: 'sku', label: 'Mã SKU', maxLength: 64 },
  { key: 'name', label: 'Tên sản phẩm', maxLength: 150 },
  { key: 'category', label: 'Danh mục', maxLength: 100 },
  { key: 'price', label: 'Giá (VNĐ)', type: 'number', step: '0.01', min: '0' },
  { key: 'stockQuantity', label: 'Tồn kho', type: 'number', step: '1', min: '0', max: '2147483647' },
  { key: 'imageUrl', label: 'URL ảnh (tùy chọn)', maxLength: 2048 },
]
const empty = { sku: '', name: '', category: '', price: '', stockQuantity: '', imageUrl: '' }

export default function Products() {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [mutationError, setMutationError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (signal) => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/products', { signal })
      if (!signal?.aborted) setProducts(data)
    } catch (failure) {
      if (!signal?.aborted) setError(apiError(failure))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
    return () => controller.abort()
  }, [load])

  const term = searchKey(query)
  const filtered = products.filter((product) => [product.name, product.sku, product.category].some((value) => searchKey(value).includes(term)))

  function openEditor(product) {
    setMutationError('')
    setEditor(product ? { ...product, imageUrl: product.imageUrl || '' } : { ...empty })
  }

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setMutationError('')
    const payload = Object.fromEntries(fields.map(({ key }) => [key, editor[key]]))
    payload.price = Number(payload.price)
    payload.stockQuantity = Number(payload.stockQuantity)
    payload.imageUrl = payload.imageUrl.trim() || null
    try {
      if (editor.id) await api.put('/products/' + editor.id, payload)
      else await api.post('/products', payload)
      setEditor(null)
      load()
    } catch (failure) {
      setMutationError(apiError(failure))
    } finally {
      setBusy(false)
    }
  }

  async function remove(event) {
    event.preventDefault()
    setBusy(true)
    setMutationError('')
    try {
      await api.delete('/products/' + deleting.id)
      setDeleting(null)
      load()
    } catch (failure) {
      setMutationError(apiError(failure))
    } finally {
      setBusy(false)
    }
  }

  return <>
    <div className="page-heading"><div><h1>Quản lý sản phẩm</h1><p>Thêm, sửa và cập nhật tồn kho sản phẩm đang bán.</p></div>
      <button className="button primary" type="button" onClick={() => openEditor()}><Plus size={18} />Thêm sản phẩm</button>
    </div>
    <section className="table-panel">
      <div className="table-toolbar"><div className="search-form table-search"><Search size={19} /><input aria-label="Tìm sản phẩm" placeholder="Tìm tên, SKU hoặc danh mục..." value={query} onChange={(event) => setQuery(event.target.value)} /></div></div>
      {loading ? <Loading /> : error ? <div className="p-5"><Notice>{error}</Notice><button className="button secondary mt-3" type="button" onClick={() => load()}>Thử lại</button></div> : filtered.length === 0 ? <div className="empty-state"><Package size={27} />Không có sản phẩm phù hợp.</div> :
        <div className="table-scroll"><table className="data-table">
          <thead><tr><th>Sản phẩm</th><th>Mã SKU</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Thao tác</th></tr></thead>
          <tbody>{filtered.map((product) => <tr key={product.id}>
            <td><span className="product-table-name"><ProductArt product={product} /><strong>{product.name}</strong></span></td><td>{product.sku}</td><td>{product.category}</td>
            <td><strong>{formatMoney(product.price)}</strong></td><td>{product.stockQuantity}</td>
            <td><div className="flex gap-2">
              <button className="icon-button" type="button" aria-label={'Sửa ' + product.name} onClick={() => openEditor(product)}><Pencil size={17} /></button>
              <button className="icon-button" type="button" aria-label={'Ngừng bán ' + product.name} onClick={() => { setMutationError(''); setDeleting(product) }}><Trash2 size={17} /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
    </section>
    {editor && <Modal title={editor.id ? 'Sửa sản phẩm' : 'Thêm sản phẩm'} onClose={() => setEditor(null)} locked={busy}>
      <form className="dialog-body" onSubmit={save}>
        <div className="editor-fields">{fields.map(({ key, label, ...attributes }) =>
          <label key={key}>{label}<input {...attributes} required={key !== 'imageUrl'} disabled={busy} value={editor[key]}
            onChange={(event) => setEditor({ ...editor, [key]: event.target.value })} /></label>)}</div>
        <Notice>{mutationError}</Notice>
        <div className="dialog-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setEditor(null)}>Hủy</button>
          <button className="button primary" type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu sản phẩm'}</button></div>
      </form>
    </Modal>}
    {deleting && <Modal title="Ngừng bán sản phẩm" onClose={() => setDeleting(null)} locked={busy}>
      <form className="dialog-body" onSubmit={remove}>
        <p><strong>{deleting.name}</strong> sẽ được ẩn khỏi danh mục bán hàng.</p><Notice>{mutationError}</Notice>
        <div className="dialog-actions"><button className="button secondary" type="button" disabled={busy} onClick={() => setDeleting(null)}>Hủy</button>
          <button className="button danger" type="submit" disabled={busy}>{busy ? 'Đang xử lý…' : 'Ngừng bán'}</button></div>
      </form>
    </Modal>}
  </>
}
