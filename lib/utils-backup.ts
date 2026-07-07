export function slugifyCliente(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60)
}

export function formatarPeriodoArquivo(inicio: string, fim: string): string {
  return `${inicio}_${fim}`
}

export function formatarDataPtBr(data: string): string {
  const d = new Date(data + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return data
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatarDataHoraPtBr(dataIso: string): string {
  const d = new Date(dataIso)
  if (Number.isNaN(d.getTime())) return dataIso
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function nomeArquivoBackup(clienteNome: string, inicio: string, fim: string): string {
  return `backup-${slugifyCliente(clienteNome)}-${formatarPeriodoArquivo(inicio, fim)}.pdf`
}
