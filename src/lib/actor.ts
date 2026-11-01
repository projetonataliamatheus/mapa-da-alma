/**
 * Quem está fazendo a ação agora (membro logado no painel). Preenchido pelo withUser em toda rota da API;
 * o logEvent e o envio de mensagens leem daqui e registram o nome/e-mail do membro sozinhos.
 * No robô (worker) fica vazio = ação da IA/sistema.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export type Actor = { id: string; email: string; name: string };

export const actorStore = new AsyncLocalStorage<Actor>();

export function currentActor(): Actor | null {
  return actorStore.getStore() || null;
}
