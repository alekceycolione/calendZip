'use server'

import { criarCliente, alternarUsuario } from '@/app/actions/admin'

export async function criarClienteFormAction(formData: FormData) {
  await criarCliente(undefined, formData)
}

export async function alternarUsuarioFormAction(id: string, ativo: boolean) {
  await alternarUsuario(id, ativo)
}
