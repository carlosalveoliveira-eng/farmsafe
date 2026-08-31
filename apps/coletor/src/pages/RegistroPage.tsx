import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, MapPin } from 'lucide-react'
import {
  db,
  type CochoLocal,
  type InsumoLocal,
  type StatusCocho,
} from '../database/db'

type RegistroPageProps = {
  codigoQr: string
  onVoltar: () => void
  onFinalizado: () => void
}

const statusCochoOptions: Array<{
  value: StatusCocho
  label: string
}> = [
  { value: 'vazio', label: 'Vazio' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Médio' },
  { value: 'cheio', label: 'Cheio' },
]

function converterNumero(valor: string) {
  const normalizado = valor.replace(',', '.').trim()

  if (!normalizado) return null

  const numero = Number(normalizado)

  if (Number.isNaN(numero)) return null

  return numero
}

export function RegistroPage({
  codigoQr,
  onVoltar,
  onFinalizado,
}: RegistroPageProps) {
  const codigoQrNormalizado = codigoQr.trim()
  const [cocho, setCocho] = useState<CochoLocal | null>(null)
  const [insumos, setInsumos] = useState<InsumoLocal[]>([])
  const [insumoId, setInsumoId] = useState('')

  const [quantidade, setQuantidade] = useState('')
  const [statusCocho, setStatusCocho] =
    useState<StatusCocho>('nao_informado')
  const [leituraCocho, setLeituraCocho] = useState('')
  const [observacao, setObservacao] = useState('')

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [gpsStatus, setGpsStatus] = useState('Buscando localização...')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true

    async function carregarDadosLocais() {
      setCarregando(true)

      const [cochoEncontrado, listaInsumos] = await Promise.all([
        db.cochos.where('codigo_qr').equals(codigoQrNormalizado).first(),
        db.insumos.orderBy('nome').toArray(),
      ])

      if (!ativo) return

      setCocho(cochoEncontrado ?? null)
      setInsumos(listaInsumos)

      if (listaInsumos.length === 1) {
        setInsumoId(listaInsumos[0].id)
      }

      setCarregando(false)
    }

    carregarDadosLocais()

    return () => {
      ativo = false
    }
  }, [codigoQr, codigoQrNormalizado])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('GPS não disponível neste dispositivo.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setGpsAccuracy(position.coords.accuracy ?? null)
        setGpsStatus('Localização capturada.')
      },
      () => {
        setGpsStatus('Não foi possível capturar a localização.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    )
  }, [])

  async function salvarRegistro() {
    if (salvando) return

    if (!cocho) {
      alert(
        'Cocho não encontrado nos dados offline. Volte à tela inicial e baixe os dados do coletor.'
      )
      return
    }

    const insumo = insumos.find((item) => item.id === insumoId)

    if (!insumo) {
      alert('Selecione o insumo abastecido.')
      return
    }

    const quantidadeKg = converterNumero(quantidade)

    if (!quantidadeKg || quantidadeKg <= 0) {
      alert('Informe uma quantidade maior que zero.')
      return
    }

    if (quantidadeKg > 100000) {
      alert('Quantidade muito alta. Confira o valor informado.')
      return
    }

    const leituraKg = converterNumero(leituraCocho)

    if (leituraCocho.trim() && (leituraKg === null || leituraKg < 0)) {
      alert('A leitura do cocho precisa ser um número válido.')
      return
    }

    try {
      setSalvando(true)

      await db.abastecimentos.add({
        client_uuid: crypto.randomUUID(),

        codigo_qr: codigoQrNormalizado,
        cocho_id: cocho.id,
        cocho_nome: cocho.nome,

        retiro_id: cocho.retiro_id ?? null,
        retiro_nome: cocho.retiro_nome ?? null,

        lote_id: cocho.lote_id ?? null,
        lote_nome: cocho.lote_nome ?? null,

        insumo_id: insumo.id,
        insumo_nome: insumo.nome,

        tipo_abastecimento: 'coletor',
        quantidade_kg: quantidadeKg,

        status_cocho: statusCocho,
        leitura_cocho: leituraKg,

        observacao: observacao.trim() || null,

        latitude,
        longitude,
        gps_accuracy: gpsAccuracy,

        registrado_em: new Date().toISOString(),
        sincronizado: false,
        status_sync: 'pendente',
        erro_sync: null,
        tentativas_sync: 0,
      })

      alert('Registro salvo no aparelho.')
      onFinalizado()
    } finally {
      setSalvando(false)
    }
  }

  const podeSalvar =
    !carregando && Boolean(cocho) && insumos.length > 0 && Boolean(insumoId)

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-6">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoltar}
            className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          <div>
            <h1 className="text-2xl font-bold">Confirmar abastecimento</h1>
            <p className="text-slate-400 text-sm">Registro do cocho</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-sm text-slate-400">Cocho</p>

          {carregando ? (
            <p className="font-semibold mt-1">Carregando...</p>
          ) : cocho ? (
            <>
              <p className="text-xl font-bold mt-1">{cocho.nome}</p>

              <p className="text-sm text-slate-400 mt-1">
                {cocho.retiro_nome ?? 'Sem retiro'} ·{' '}
                {cocho.lote_nome ?? 'Sem lote'}
              </p>

              <p className="text-xs text-slate-500 mt-2 font-mono">
                QR: {codigoQrNormalizado}
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold mt-1 text-red-300">
                Cocho não encontrado
              </p>

              <p className="text-sm text-slate-400 mt-2">
                Baixe os dados do coletor na tela inicial antes de registrar.
              </p>
            </>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Insumo abastecido</span>

            <select
              value={insumoId}
              onChange={(e) => setInsumoId(e.target.value)}
              className="h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none"
            >
              <option value="">Selecione o insumo</option>

              {insumos.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nome}
                </option>
              ))}
            </select>
          </label>

          {insumos.length === 0 && (
            <p className="text-sm text-yellow-200 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3">
              Nenhum insumo disponível offline. Volte e baixe os dados do
              coletor.
            </p>
          )}

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Quantidade abastecida kg</span>

            <input
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              inputMode="decimal"
              placeholder="Ex: 25"
              className="h-14 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none text-lg font-semibold"
            />
          </label>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div>
            <p className="text-sm text-slate-400 mb-3">Estado do cocho</p>

            <div className="grid grid-cols-2 gap-3">
              {statusCochoOptions.map((opcao) => (
                <button
                  key={opcao.value}
                  type="button"
                  onClick={() => setStatusCocho(opcao.value)}
                  className={`h-12 rounded-xl border font-semibold active:scale-[0.98] ${
                    statusCocho === opcao.value
                      ? 'bg-green-600 border-green-500 text-white'
                      : 'bg-slate-950 border-slate-700 text-slate-300'
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">
              Leitura estimada do cocho kg
            </span>

            <input
              value={leituraCocho}
              onChange={(e) => setLeituraCocho(e.target.value)}
              inputMode="decimal"
              placeholder="Opcional"
              className="h-12 rounded-xl bg-slate-950 border border-slate-700 px-4 outline-none"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm text-slate-400">Observação opcional</span>

            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: cocho quebrado, sal molhado, acesso ruim..."
              className="min-h-24 rounded-xl bg-slate-950 border border-slate-700 p-4 outline-none resize-none"
            />
          </label>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-green-400 mt-1" />

          <div>
            <p className="text-sm text-slate-400">GPS</p>
            <p className="font-medium">{gpsStatus}</p>

            {latitude && longitude && (
              <p className="text-xs text-slate-500 mt-1">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
                {gpsAccuracy ? ` · precisão ${Math.round(gpsAccuracy)} m` : ''}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={salvarRegistro}
          disabled={!podeSalvar || salvando}
          className="h-16 rounded-2xl bg-green-600 font-bold text-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:bg-slate-800 disabled:text-slate-500"
        >
          <CheckCircle2 className="w-6 h-6" />
          {salvando ? 'Salvando...' : 'Salvar no aparelho'}
        </button>
      </div>
    </main>
  )
}
