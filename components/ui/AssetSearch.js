import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Button from './Button'

const TYPE_LABELS = { stock: 'Stock', etf: 'ETF', crypto: 'Crypto' }
const TYPE_COLORS = { stock: 'var(--accent)', etf: 'var(--positive)', crypto: '#f59e0b' }

export default function AssetSearch({ onSelect, onCancel, placeholder = 'Buscar por nombre o símbolo...' }) {
  const [query, setQuery] = useState('')
  const [directory, setDirectory] = useState([])
  const [filtered, setFiltered] = useState([])
  const [showManual, setShowManual] = useState(false)
  const [manualSymbol, setManualSymbol] = useState('')
  const [manualType, setManualType] = useState('stock')
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)
  const [validationError, setValidationError] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    async function loadDirectory() {
      const { data } = await supabase
        .from('asset_directory')
        .select('asset_symbol, asset_name, asset_type')
        .order('asset_symbol', { ascending: true })
      setDirectory(data || [])
    }
    loadDirectory()
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setFiltered([])
      return
    }
    const q = query.toLowerCase()
    const results = directory
      .filter(a =>
        a.asset_symbol.toLowerCase().includes(q) ||
        a.asset_name.toLowerCase().includes(q)
      )
      .slice(0, 8)
    setFiltered(results)
  }, [query, directory])

  async function validateManual() {
    if (!manualSymbol) return
    setValidating(true)
    setValidationResult(null)
    setValidationError('')

    try {
      const res = await fetch('/api/validate-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: manualSymbol.toUpperCase(), assetType: manualType }),
      })
      const data = await res.json()

      if (!res.ok) {
        setValidationError(data.error || 'Símbolo no encontrado')
      } else {
        setValidationResult(data)
      }
    } catch {
      setValidationError('Error al validar el símbolo')
    }
    setValidating(false)
  }

  async function confirmManual() {
    if (!validationResult) return

    // Guardar en asset_directory para todos los usuarios
    await supabase.from('asset_directory').upsert([{
      asset_symbol: validationResult.symbol,
      asset_name: validationResult.name,
      asset_type: validationResult.assetType,
      is_curated: false,
    }], { onConflict: 'asset_symbol,asset_type' })

    onSelect({
      asset_symbol: validationResult.symbol,
      asset_name: validationResult.name,
      asset_type: validationResult.assetType,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!showManual ? (
        <>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {query.trim() && filtered.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px 0' }}>
              No encontramos "{query}" en la lista
            </p>
          )}

          {filtered.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map(asset => (
                <button
                  key={`${asset.asset_symbol}-${asset.asset_type}`}
                  onClick={() => onSelect(asset)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                      {asset.asset_symbol}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{asset.asset_name}</p>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: TYPE_COLORS[asset.asset_type],
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    padding: '4px 8px',
                  }}>
                    {TYPE_LABELS[asset.asset_type]}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowManual(true)}
            style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', fontSize: '13px', cursor: 'pointer', padding: '4px', textAlign: 'center' }}
          >
            ¿No encontrás tu activo? Ingresarlo manualmente
          </button>

          <Button onClick={onCancel} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
            Cancelar
          </Button>
        </>
      ) : (
        <>
          <button
            onClick={() => { setShowManual(false); setValidationResult(null); setValidationError('') }}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', padding: '4px', textAlign: 'left' }}
          >
            ← Volver a la búsqueda
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={manualSymbol}
              onChange={e => { setManualSymbol(e.target.value.toUpperCase()); setValidationResult(null); setValidationError('') }}
              placeholder="Símbolo (ej: DLO)"
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '15px',
                outline: 'none',
              }}
            />
            <select
              value={manualType}
              onChange={e => { setManualType(e.target.value); setValidationResult(null); setValidationError('') }}
              style={{
                padding: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                outline: 'none',
              }}
            >
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="crypto">Crypto</option>
            </select>
          </div>

          {validationError && (
            <div style={{ background: 'var(--negative-dim)', border: '1px solid var(--negative)', borderRadius: '12px', padding: '12px 16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--negative)' }}>❌ {validationError}</p>
            </div>
          )}

          {validationResult && (
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{validationResult.symbol}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{validationResult.name}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>${validationResult.price}</p>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: TYPE_COLORS[validationResult.assetType], background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '3px 8px' }}>
                    {TYPE_LABELS[validationResult.assetType]}
                  </span>
                </div>
              </div>
              <Button onClick={confirmManual} style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                ✅ Confirmar y agregar
              </Button>
            </div>
          )}

          {!validationResult && (
            <Button
              onClick={validateManual}
              disabled={validating || !manualSymbol}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              {validating ? 'Verificando...' : '🔍 Verificar símbolo'}
            </Button>
          )}

          <Button onClick={onCancel} variant="ghost" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
            Cancelar
          </Button>
        </>
      )}
    </div>
  )
}
