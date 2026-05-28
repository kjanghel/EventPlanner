import { useRef, useState } from 'react'
import {
  getReceiptSignedUrl,
  removeReceiptFile,
  setTransactionReceipt,
  uploadReceipt,
} from '../../lib/queries'
import { compressImage } from '../../lib/images'

interface Props {
  eventId: string
  transactionId: string
  receiptPath: string | null
  onChange: (path: string | null) => void
}

export function TransactionReceiptActions({
  eventId,
  transactionId,
  receiptPath,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const triggerPick = () => inputRef.current?.click()

  const handleView = async () => {
    if (!receiptPath) return
    try {
      const url = await getReceiptSignedUrl(receiptPath)
      window.open(url, '_blank', 'noopener')
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not open receipt')
    }
  }

  const handleFile = async (file: File) => {
    setErr(null)
    setBusy(true)
    try {
      const blob = await compressImage(file)
      // If there's already a receipt, remove the old file first.
      if (receiptPath) {
        try {
          await removeReceiptFile(receiptPath)
        } catch {
          // Non-fatal: orphans get cleaned manually if this fails.
        }
      }
      const newPath = await uploadReceipt(eventId, transactionId, blob)
      await setTransactionReceipt(transactionId, newPath)
      onChange(newPath)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async () => {
    if (!receiptPath) return
    if (!confirm('Remove this receipt?')) return
    setErr(null)
    setBusy(true)
    try {
      await setTransactionReceipt(transactionId, null)
      try {
        await removeReceiptFile(receiptPath)
      } catch {
        // Non-fatal: storage may have already been cleaned.
      }
      onChange(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not remove')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
          e.target.value = '' // reset so picking the same file twice re-fires
        }}
      />

      <div className="flex items-center gap-2 text-xs">
        {receiptPath ? (
          <>
            <button
              type="button"
              onClick={handleView}
              disabled={busy}
              className="text-slate-700 underline disabled:opacity-50"
            >
              Receipt
            </button>
            <button
              type="button"
              onClick={triggerPick}
              disabled={busy}
              className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
            >
              {busy ? '…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={triggerPick}
            disabled={busy}
            className="text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            {busy ? 'Uploading…' : '+ Receipt'}
          </button>
        )}
      </div>
      {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
    </>
  )
}
