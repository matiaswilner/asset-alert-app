import { useState } from 'react'
import Card from '../ui/Card'

const INSTRUCTIONS = [
  'Iniciá sesión en portal.interactivebrokers.com',
  'Andá a Performance & Reports → Statements',
  'Seleccioná "Custom Date Range" como tipo',
  'Elegí el rango de fechas (máximo 1 año por archivo)',
  'Seleccioná formato CSV y hacé clic en Run',
  'Si tenés más de 1 año de historial, repetí para cada año',
]

export default function PortfolioUploader({ syncing, syncResult, onSync }) {
  const [showInstructions, setShowInstructions] = useState(true)

  async function handleFiles(e) {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const text = await file.text()
      await onSync(text)
    }
    e.target.value = ''
  }

  return (
    <Card style={{ marginBottom: '16px', border: '1px solid var(--border-accent)' }}>
      {syncResult && (
        <div style={{
          background: syncResult.success ? 'var(--positive-dim)' : 'var(--negative-dim)',
          border: `1px solid ${syncResult.success ? 'var(--positive)' : 'var(--negative)'}`,
          borderRadius: '10px',
          padding: '10px 14px',
          marginBottom: '16px',
        }}>
          <p style={{ fontSize: '13px', color: syncResult.success ? 'var(--positive)' : 'var(--negative)' }}>
            {syncResult.success
              ? `✅ ${syncResult.positions} posiciones sincronizadas — Total: $${parseFloat(syncResult.totalValue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `❌ ${syncResult.error}`}
          </p>
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', marginBottom: showInstructions ? '12px' : '0' }}
          onClick={() => setShowInstructions(!showInstructions)}
        >
          <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)' }}>
            📋 Cómo exportar desde Interactive Brokers
          </p>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{showInstructions ? '▲' : '▼'}</span>
        </div>
        {showInstructions && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {INSTRUCTIONS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', minWidth: '18px' }}>{i + 1}.</span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          border: '2px dashed var(--border)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          cursor: syncing ? 'default' : 'pointer',
          background: 'var(--bg-secondary)',
          opacity: syncing ? 0.7 : 1,
        }}
        onClick={() => !syncing && document.getElementById('csv-upload').click()}
      >
        <p style={{ fontSize: '24px', marginBottom: '8px' }}>📄</p>
        <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
          {syncing ? 'Procesando...' : 'Tocá para seleccionar el archivo CSV'}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          Podés subir múltiples archivos (uno por año)
        </p>
        <input
          id="csv-upload"
          type="file"
          accept=".csv"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
          disabled={syncing}
        />
      </div>
    </Card>
  )
}
