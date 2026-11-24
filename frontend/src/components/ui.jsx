import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Box, Coffee, LoaderCircle, ReceiptText, X } from 'lucide-react'

export function Brand() {
  return <span className="brand"><span className="brand-mark"><ReceiptText size={22} strokeWidth={2.35} /></span><span>Mini<span className="brand-accent">POS</span></span></span>
}

export function Notice({ children }) {
  if (!children) return null
  return <div className="notice" role="alert"><AlertCircle size={17} /> <span>{children}</span></div>
}

export function Loading({ children = 'Đang tải…' }) {
  return <div className="empty-state" role="status"><LoaderCircle className="animate-spin" size={24} />{children}</div>
}

export function Modal({ title, description, children, onClose, locked = false, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return (
    <dialog ref={ref} className={'dialog ' + className} aria-labelledby="dialog-title"
      onCancel={(event) => { event.preventDefault(); if (!locked) onClose?.() }}>
      <div className="dialog-heading">
        <div><h2 id="dialog-title">{title}</h2>{description && <p>{description}</p>}</div>
        {onClose && <button type="button" className="icon-button" aria-label="Đóng" disabled={locked} onClick={onClose}><X size={21} /></button>}
      </div>
      {children}
    </dialog>
  )
}

const sampleSkus = Array.from({ length: 15 }, (_, index) => 'SP' + String(index + 1).padStart(3, '0'))

export function ProductArt({ product }) {
  const [brokenImage, setBrokenImage] = useState(null)
  const index = sampleSkus.indexOf(product.sku)
  const Icon = product.category === 'Đồ uống' ? Coffee : Box
  return (
    <span className="product-art" aria-hidden="true">
      {product.imageUrl && brokenImage !== product.imageUrl ? (
        <img src={product.imageUrl} alt="" loading="lazy" onError={() => setBrokenImage(product.imageUrl)} />
      ) : index >= 0 ? (
        <span className="product-sprite" style={{ backgroundPosition: (index % 5) * 25 + '% ' + Math.floor(index / 5) * 50 + '%' }} />
      ) : <Icon size={40} strokeWidth={1.35} />}
    </span>
  )
}
