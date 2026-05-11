import { useState } from 'react'

const SECTIONS = [
  {
    id: 'sync',
    icon: '📥',
    title: 'Sincronizar',
    content: [
      {
        subtitle: '¿Qué necesitás?',
        text: 'Un archivo CSV exportado desde Interactive Brokers llamado "Activity Statement". Este archivo contiene tus posiciones actuales y el historial de operaciones.',
      },
      {
        subtitle: 'Cómo exportarlo',
        steps: [
          'Iniciá sesión en portal.interactivebrokers.com',
          'Andá a Performance & Reports → Statements',
          'Seleccioná "Custom Date Range" como tipo',
          'Elegí el rango (máximo 1 año por archivo)',
          'Formato CSV → Run → Descargar',
          'Si tenés más de 1 año de historial, repetí para cada año y subí todos juntos',
        ],
      },
      {
        subtitle: '¿Con qué frecuencia sincronizar?',
        text: 'Una vez por mes es suficiente. Los precios se actualizan automáticamente todos los días — solo necesitás sincronizar cuando cambian tus posiciones.',
      },
    ],
  },
  {
    id: 'charts',
    icon: '📊',
    title: 'Gráficas',
    content: [
      {
        subtitle: 'Resumen',
        items: [
          { name: 'P&L Total no realizado', desc: 'Cuánto ganaste o perdiste desde que compraste. Se llama "no realizado" porque todavía no vendiste.' },
          { name: 'Ganadoras vs perdedoras', desc: 'Cuántas posiciones están en verde y cuántas en rojo, y qué porcentaje del portfolio representan.' },
          { name: 'P&L por activo', desc: 'Barras ordenadas de mayor a menor ganancia.' },
        ],
      },
      {
        subtitle: 'Distribución',
        items: [
          { name: 'Por activo', desc: 'Qué porcentaje del portfolio representa cada posición.' },
          { name: 'Por tipo', desc: 'Cómo se divide entre stocks, ETFs y crypto.' },
          { name: 'Por sector', desc: 'Exposición por industria — tecnología, salud, energía, etc.' },
        ],
      },
      {
        subtitle: 'Performance',
        items: [
          { name: 'Retorno vs benchmark', desc: 'Compara tu portfolio contra SPY, QQQ o BTC. Ambas líneas arrancan en 100.' },
          { name: 'Valor total aproximado', desc: 'Evolución del valor usando tus posiciones actuales aplicadas a precios históricos.' },
          { name: 'Valor real del portfolio', desc: 'Calcula el valor exacto usando las posiciones reales que tenías en cada momento.' },
          { name: 'Rendimiento vs SPY por activo', desc: 'Qué activos le ganaron al mercado y cuáles quedaron por debajo.' },
        ],
      },
      {
        subtitle: 'Riesgo',
        items: [
          { name: 'Índice de concentración', desc: 'Mide el riesgo de tener demasiado peso en pocas posiciones.' },
          { name: 'Correlación con SPY', desc: 'Qué tan parecido se mueve cada activo al S&P 500.' },
        ],
      },
      {
        subtitle: 'Compras',
        items: [
          { name: 'Capital desplegado', desc: 'Cuánto invertiste por mes, trimestre o año.' },
          { name: 'Historial por activo', desc: 'Precio histórico con marcadores en tus fechas de compra y línea de precio promedio.' },
        ],
      },
      {
        subtitle: '💡 Tip',
        text: 'Cada gráfica tiene un ícono ? que al tocarlo te explica qué muestra y cómo se calcula.',
      },
    ],
  },
  {
    id: 'analysis',
    icon: '🤖',
    title: 'Análisis IA',
    content: [
      {
        subtitle: '¿Qué hace?',
        text: 'Claude Opus analiza tu portfolio completo y te da un diagnóstico específico a tu situación, no consejos genéricos.',
      },
      {
        subtitle: 'Qué incluye',
        items: [
          { name: 'Concentración', desc: 'Identifica posiciones con peso excesivo y explica el riesgo concreto.' },
          { name: 'Diversificación', desc: 'Evalúa sectores presentes y nombra exactamente qué exposición te falta.' },
          { name: 'Posiciones bajo agua', desc: 'Para cada posición con P&L negativo: PROMEDIA, ESPERA o EVITA.' },
          { name: 'Uso del cash', desc: 'Recomendación específica sobre dónde desplegar el efectivo disponible.' },
          { name: 'Lo que está funcionando', desc: 'Las mejores posiciones y por qué funcionaron.' },
          { name: 'Oportunidades perdidas', desc: 'Qué exposición te falta que encaja con tu estrategia.' },
          { name: 'Acciones prioritarias', desc: '3 acciones concretas ordenadas por urgencia.' },
        ],
      },
      {
        subtitle: '¿Con qué frecuencia?',
        text: 'Una vez por mes después de sincronizar, o cuando el mercado tiene movimientos importantes.',
      },
    ],
  },
  {
    id: 'advisor',
    icon: '💬',
    title: 'Asesor',
    content: [
      {
        subtitle: '¿Qué es?',
        text: 'Un chat con Claude Opus que conoce tu portfolio completo. Respondé cualquier pregunta sobre inversiones con contexto de tu situación específica.',
      },
      {
        subtitle: 'Ejemplos de preguntas',
        items: [
          { name: '¿Cómo usar el cash disponible?', desc: 'Te dice en qué posición específica tiene más sentido poner el efectivo ahora.' },
          { name: '¿Qué pasa si el mercado cae un 30%?', desc: 'Analiza el impacto en tu portfolio actual.' },
          { name: '¿Estoy demasiado concentrado?', desc: 'Evalúa tu distribución real y te dice si hay que ajustar.' },
          { name: '¿Cuándo rebalancear?', desc: 'Basado en tus posiciones actuales, criterios concretos para decidir.' },
        ],
      },
      {
        subtitle: 'Cómo acceder',
        text: 'Desde la tab Asesor podés empezar una conversación. También podés ir directo al Asesor después de generar un análisis del portfolio.',
      },
      {
        subtitle: '⚠️ Importante',
        text: 'El Asesor no guarda el historial entre sesiones. Cada vez que abrís la app, la conversación empieza de cero. Siempre tiene acceso a tus posiciones actuales.',
      },
    ],
  },
]

export default function PortfolioTutorial({ onClose }) {
  const [activeSection, setActiveSection] = useState('sync')
  const section = SECTIONS.find(s => s.id === activeSection)

  return (
    <div
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: '480px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Tutorial de Portfolio</h3>
          <button
            onClick={onClose}
            style={{ background: 'var(--bg-tertiary)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '16px' }}
          >
            ✕
          </button>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '16px 20px', overflowX: 'auto', flexShrink: 0 }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                background: activeSection === s.id ? 'var(--accent)' : 'var(--bg-secondary)',
                color: activeSection === s.id ? '#fff' : 'var(--text-tertiary)',
                border: 'none', borderRadius: '20px', padding: '6px 14px',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {s.icon} {s.title}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {section.content.map((block, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              {block.subtitle && (
                <p style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  {block.subtitle}
                </p>
              )}
              {block.text && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {block.text}
                </p>
              )}
              {block.steps && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {block.steps.map((step, j) => (
                    <div key={j} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', minWidth: '16px', marginTop: '2px' }}>{j + 1}.</span>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{step}</p>
                    </div>
                  ))}
                </div>
              )}
              {block.items && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '10px 12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>{item.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>{item.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          {activeSection !== SECTIONS[SECTIONS.length - 1].id ? (
            <button
              onClick={() => {
                const currentIndex = SECTIONS.findIndex(s => s.id === activeSection)
                setActiveSection(SECTIONS[currentIndex + 1].id)
              }}
              style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer' }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{ width: '100%', background: 'var(--accent)', border: 'none', borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#fff', cursor: 'pointer' }}
            >
              ¡Entendido, empezar! →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
