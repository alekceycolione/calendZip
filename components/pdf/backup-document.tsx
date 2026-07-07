import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { formatarDataPtBr, formatarDataHoraPtBr } from '@/lib/utils-backup'

type Entrada = {
  id: string
  numero: number
  data_post: string
  plataforma: string | null
  pilar: string | null
  tema: string | null
  objetivo: string | null
  formato: string | null
  gancho: string | null
  legenda: string | null
  cta: string | null
  compliance: string | null
  status: string
  imagens: string[] | null
  created_at: string
  updated_at: string
}

type Alteracao = {
  id: string
  entrada_id: string
  diff: Record<string, { de: unknown; para: unknown }>
  criado_em: string
  usuarios: { nome: string; email: string } | null
}

export type BackupDocumentProps = {
  clienteNome: string
  calendarioTitulo: string
  periodoInicio: string
  periodoFim: string
  geradoEm: string
  geradoPor: string
  entradas: Entrada[]
  alteracoes: Alteracao[]
}

const COLORS = {
  text: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  primary: '#1f2937',
  accent: '#2563eb',
  light: '#f9fafb',
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: COLORS.text,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  coverTitle: { fontSize: 28, fontWeight: 700, marginBottom: 8 },
  coverSubtitle: { fontSize: 14, color: COLORS.muted, marginBottom: 32 },
  coverRow: { flexDirection: 'row', marginBottom: 8 },
  coverLabel: { width: 110, color: COLORS.muted },
  coverValue: { flex: 1, color: COLORS.text, fontWeight: 500 },
  coverStatsBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: COLORS.light,
    border: `1pt solid ${COLORS.border}`,
    borderRadius: 4,
  },
  coverStatValue: { fontSize: 24, fontWeight: 700, color: COLORS.primary },
  coverStatLabel: { fontSize: 9, color: COLORS.muted, marginTop: 2 },
  coverStatsRow: { flexDirection: 'row', gap: 32, marginTop: 8 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
    color: COLORS.primary,
    borderBottom: `1pt solid ${COLORS.border}`,
    paddingBottom: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.light,
    borderBottom: `1pt solid ${COLORS.border}`,
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `0.5pt solid ${COLORS.border}`,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  thNumero: { width: 30 },
  thData: { width: 70 },
  thPlataforma: { width: 70 },
  thPilar: { width: 90 },
  thTema: { flex: 1 },
  thStatus: { width: 70 },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    borderBottom: `1pt solid ${COLORS.border}`,
    paddingBottom: 10,
  },
  postTitle: { fontSize: 14, fontWeight: 700, color: COLORS.primary, flex: 1, marginRight: 8 },
  postNumero: { fontSize: 18, fontWeight: 700, color: COLORS.accent },
  fieldRow: { flexDirection: 'row', marginBottom: 6 },
  fieldLabel: { width: 90, color: COLORS.muted, fontSize: 9 },
  fieldValue: { flex: 1, fontSize: 10 },
  fieldBlock: { marginBottom: 10 },
  fieldBlockLabel: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldBlockValue: { fontSize: 10, color: COLORS.text },
  fieldBlockBox: {
    backgroundColor: COLORS.light,
    padding: 6,
    borderRadius: 2,
    border: `0.5pt solid ${COLORS.border}`,
  },
  histTitle: { fontSize: 11, fontWeight: 700, marginTop: 14, marginBottom: 6, color: COLORS.primary },
  histItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottom: `0.5pt solid ${COLORS.border}`,
    fontSize: 9,
  },
  histData: { width: 110, color: COLORS.muted },
  histUsuario: { width: 110, color: COLORS.text },
  histCampos: { flex: 1, color: COLORS.text },
  imagemItem: { fontSize: 8, color: COLORS.muted, fontFamily: 'Courier', marginBottom: 1 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.muted,
    borderTop: `0.5pt solid ${COLORS.border}`,
    paddingTop: 6,
  },
  pageNumber: { fontSize: 8, color: COLORS.muted },
})

function Footer({ texto }: { texto: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>{texto}</Text>
      <Text
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  )
}

function statusLabel(status: string): string {
  return { planejado: 'Planejado', alterado: 'Alterado', publicado: 'Publicado' }[status] || status
}

function camposAlterados(diff: Record<string, { de: unknown; para: unknown }>): string {
  return Object.keys(diff).join(', ') || '-'
}

export function BackupDocument(props: BackupDocumentProps) {
  const { clienteNome, calendarioTitulo, periodoInicio, periodoFim, geradoEm, geradoPor, entradas, alteracoes } = props

  const alteracoesPorEntrada = new Map<string, Alteracao[]>()
  for (const a of alteracoes) {
    const lista = alteracoesPorEntrada.get(a.entrada_id) ?? []
    lista.push(a)
    alteracoesPorEntrada.set(a.entrada_id, lista)
  }

  const footerTexto = `calendZip · Backup · ${clienteNome} · ${formatarDataPtBr(periodoInicio)} → ${formatarDataPtBr(periodoFim)}`

  return (
    <Document
      title={`Backup ${clienteNome} ${periodoInicio}_${periodoFim}`}
      author="calendZip"
      subject={`Backup de ${clienteNome} no período ${periodoInicio} a ${periodoFim}`}
    >
      {/* Capa */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.coverTitle}>Backup de Conteúdo</Text>
        <Text style={styles.coverSubtitle}>calendZip · arquivo de auditoria pesquisável</Text>

        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Cliente</Text>
          <Text style={styles.coverValue}>{clienteNome}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Calendário</Text>
          <Text style={styles.coverValue}>{calendarioTitulo}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Período</Text>
          <Text style={styles.coverValue}>
            {formatarDataPtBr(periodoInicio)} até {formatarDataPtBr(periodoFim)}
          </Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Gerado em</Text>
          <Text style={styles.coverValue}>{formatarDataHoraPtBr(geradoEm)}</Text>
        </View>
        <View style={styles.coverRow}>
          <Text style={styles.coverLabel}>Gerado por</Text>
          <Text style={styles.coverValue}>{geradoPor}</Text>
        </View>

        <View style={styles.coverStatsBox}>
          <Text style={styles.fieldBlockLabel}>Resumo do backup</Text>
          <View style={styles.coverStatsRow}>
            <View>
              <Text style={styles.coverStatValue}>{entradas.length}</Text>
              <Text style={styles.coverStatLabel}>postagens</Text>
            </View>
            <View>
              <Text style={styles.coverStatValue}>{alteracoes.length}</Text>
              <Text style={styles.coverStatLabel}>alterações</Text>
            </View>
            <View>
              <Text style={styles.coverStatValue}>
                {entradas.reduce((acc, e) => acc + (e.imagens?.length || 0), 0)}
              </Text>
              <Text style={styles.coverStatLabel}>imagens referenciadas</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 24 }}>
          <Text style={styles.fieldBlockLabel}>Aviso</Text>
          <Text style={{ fontSize: 9, color: COLORS.muted, marginTop: 4, lineHeight: 1.5 }}>
            Este PDF é um snapshot do conteúdo do calendário no momento da geração. Os dados originais
            foram removidos do banco de dados principal. Use Ctrl/Cmd+F para pesquisar no texto.
          </Text>
        </View>

        <Footer texto={footerTexto} />
      </Page>

      {/* Sumário */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Sumário · {entradas.length} postagens</Text>

        <View style={styles.tableHeader}>
          <Text style={styles.thNumero}>#</Text>
          <Text style={styles.thData}>Data</Text>
          <Text style={styles.thPlataforma}>Plataforma</Text>
          <Text style={styles.thPilar}>Pilar</Text>
          <Text style={styles.thTema}>Tema</Text>
          <Text style={styles.thStatus}>Status</Text>
        </View>

        {entradas.map((e) => (
          <View key={e.id} style={styles.tableRow} wrap={false}>
            <Text style={styles.thNumero}>{e.numero}</Text>
            <Text style={styles.thData}>{formatarDataPtBr(e.data_post)}</Text>
            <Text style={styles.thPlataforma}>{e.plataforma || '-'}</Text>
            <Text style={styles.thPilar}>{e.pilar || '-'}</Text>
            <Text style={styles.thTema}>{e.tema || '-'}</Text>
            <Text style={styles.thStatus}>{statusLabel(e.status)}</Text>
          </View>
        ))}

        {entradas.length === 0 && (
          <Text style={{ textAlign: 'center', color: COLORS.muted, marginTop: 20 }}>
            Nenhuma postagem no período selecionado.
          </Text>
        )}

        <Footer texto={footerTexto} />
      </Page>

      {/* Detalhe por postagem */}
      {entradas.map((e) => {
        const hist = alteracoesPorEntrada.get(e.id) || []
        return (
          <Page key={e.id} size="A4" style={styles.page} wrap>
            <View style={styles.postHeader}>
              <Text style={styles.postTitle}>
                {e.tema || `(Sem tema)`}
              </Text>
              <Text style={styles.postNumero}>#{e.numero}</Text>
            </View>

            <View style={styles.coverRow}>
              <Text style={styles.fieldLabel}>Data</Text>
              <Text style={styles.fieldValue}>{formatarDataPtBr(e.data_post)}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.fieldLabel}>Plataforma</Text>
              <Text style={styles.fieldValue}>{e.plataforma || '-'}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.fieldLabel}>Pilar</Text>
              <Text style={styles.fieldValue}>{e.pilar || '-'}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.fieldLabel}>Status</Text>
              <Text style={styles.fieldValue}>{statusLabel(e.status)}</Text>
            </View>
            <View style={styles.coverRow}>
              <Text style={styles.fieldLabel}>Formato</Text>
              <Text style={styles.fieldValue}>{e.formato || '-'}</Text>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldBlockLabel}>Objetivo</Text>
              <View style={styles.fieldBlockBox}>
                <Text style={styles.fieldBlockValue}>{e.objetivo || '-'}</Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldBlockLabel}>Gancho</Text>
              <View style={styles.fieldBlockBox}>
                <Text style={styles.fieldBlockValue}>{e.gancho || '-'}</Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldBlockLabel}>Legenda completa</Text>
              <View style={styles.fieldBlockBox}>
                <Text style={styles.fieldBlockValue}>{e.legenda || '-'}</Text>
              </View>
            </View>

            <View style={styles.fieldBlock}>
              <Text style={styles.fieldBlockLabel}>CTA</Text>
              <View style={styles.fieldBlockBox}>
                <Text style={styles.fieldBlockValue}>{e.cta || '-'}</Text>
              </View>
            </View>

            {e.compliance && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldBlockLabel}>Compliance</Text>
                <View style={styles.fieldBlockBox}>
                  <Text style={styles.fieldBlockValue}>{e.compliance}</Text>
                </View>
              </View>
            )}

            {e.imagens && e.imagens.length > 0 && (
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldBlockLabel}>Imagens ({e.imagens.length})</Text>
                {e.imagens.map((url, idx) => (
                  <Text key={idx} style={styles.imagemItem}>
                    {url}
                  </Text>
                ))}
              </View>
            )}

            <Text style={styles.histTitle}>Histórico ({hist.length})</Text>
            {hist.length === 0 ? (
              <Text style={{ fontSize: 9, color: COLORS.muted }}>Nenhuma alteração registrada.</Text>
            ) : (
              hist.map((a) => (
                <View key={a.id} style={styles.histItem} wrap={false}>
                  <Text style={styles.histData}>{formatarDataHoraPtBr(a.criado_em)}</Text>
                  <Text style={styles.histUsuario}>{a.usuarios?.nome || '-'}</Text>
                  <Text style={styles.histCampos}>{camposAlterados(a.diff)}</Text>
                </View>
              ))
            )}

            <Footer texto={footerTexto} />
          </Page>
        )
      })}
    </Document>
  )
}
