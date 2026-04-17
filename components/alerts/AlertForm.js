import Input from '../ui/Input'
import Select from '../ui/Select'
import Button from '../ui/Button'

const CONDITIONS = {
  drop_day: 'Cae % en un día',
  drop_week: 'Cae % en una semana',
  rise_day: 'Sube % en un día',
  rise_week: 'Sube % en una semana',
  min_14d: 'Mínimo 14 días',
  min_30d: 'Mínimo 30 días',
  min_60d: 'Mínimo 60 días',
  min_90d: 'Mínimo 90 días',
  min_180d: 'Mínimo 180 días',
}

const MIN_CONDITIONS = ['min_14d', 'min_30d', 'min_60d', 'min_90d', 'min_180d']

export { CONDITIONS, MIN_CONDITIONS }

export default function AlertForm({ form, setForm, onSubmit, onCancel, submitLabel = 'Crear alerta' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <Input
        placeholder="Símbolo (ej: AAPL, BTC)"
        value={form.asset_symbol}
        onChange={e => setForm({ ...form, asset_symbol: e.target.value.toUpperCase() })}
      />
      <Select value={form.asset_type} onChange={e => setForm({ ...form, asset_type: e.target.value })}>
        <option value="stock">Stock</option>
        <option value="etf">ETF</option>
        <option value="crypto">Crypto</option>
      </Select>
      <Select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })}>
        {Object.entries(CONDITIONS).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </Select>
      {!MIN_CONDITIONS.includes(form.condition) && (
        <Input
          type="number"
          placeholder="Porcentaje (ej: 5)"
          value={form.threshold_percent}
          onChange={e => setForm({ ...form, threshold_percent: e.target.value })}
        />
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button onClick={onSubmit} style={{ flex: 1, padding: '12px' }}>{submitLabel}</Button>
        {onCancel && (
          <Button onClick={onCancel} variant="ghost" style={{ flex: 1, padding: '12px' }}>Cancelar</Button>
        )}
      </div>
    </div>
  )
}
