import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

export default function WatchlistForm({ form, setForm, onSubmit, onCancel, submitLabel = 'Agregar' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Input
        placeholder="Símbolo (ej: SPY, QQQ)"
        value={form.asset_symbol}
        onChange={e => setForm({ ...form, asset_symbol: e.target.value.toUpperCase() })}
      />
      <Select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}>
        <option value="etf">ETF</option>
        <option value="stock">Stock</option>
        <option value="crypto">Crypto</option>
      </Select>
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={onSubmit} style={{ flex: 1, padding: '12px' }}>{submitLabel}</Button>
        {onCancel && (
          <Button onClick={onCancel} variant="ghost" style={{ flex: 1, padding: '12px' }}>Cancelar</Button>
        )}
      </div>
    </div>
  )
}
