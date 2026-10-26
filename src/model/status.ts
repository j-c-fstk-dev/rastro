import type { Action, Witness } from './action'
import { memberSet, type Collective } from './collective'

export type Status = 'observed' | 'confirmed' | 'consolidated'

export interface StatusResult {
  status: Status
  /** One witness per person, excluding the author. */
  witnesses: Witness[]
}

/**
 * Computes an action's status from the witnesses this device knows about (docs/V1_SPEC.md §6).
 * Nobody approves anything: the status is a summary of signed, public testimony.
 *
 * - `members`: members of the action's collective. Without it, the presencial rule does not apply.
 * - `trusted`: members plus people this device follows. Without it, every witness counts.
 */
export function computeStatus(
  action: Pick<Action, 'id' | 'pubkey'>,
  allWitnesses: Witness[],
  { members, trusted }: { members?: Set<string>; trusted?: Set<string> } = {},
): StatusResult {
  const byPerson = new Map<string, Witness>()
  for (const w of allWitnesses) {
    if (w.actionId !== action.id || w.pubkey === action.pubkey) continue
    const prev = byPerson.get(w.pubkey)
    // Keep the strongest testimony per person: presencial beats remoto, then the earliest.
    if (!prev || rank(w) > rank(prev) || (rank(w) === rank(prev) && w.createdAt < prev.createdAt)) {
      byPerson.set(w.pubkey, w)
    }
  }
  const witnesses = [...byPerson.values()].sort((a, b) => a.createdAt - b.createdAt)
  const isTrusted = (w: Witness) => !trusted || trusted.has(w.pubkey)
  const trustedCount = witnesses.filter(isTrusted).length
  const memberPresencial = members
    ? witnesses.filter((w) => members.has(w.pubkey) && w.mode === 'presencial').length
    : 0

  let status: Status = 'observed'
  if (trustedCount >= 5 || memberPresencial >= 2) status = 'consolidated'
  else if (witnesses.length >= 2) status = 'confirmed'
  return { status, witnesses }
}

const rank = (w: Witness) => (w.mode === 'presencial' ? 1 : 0)

/** Status of an action, using its group's member list when it belongs to one. */
export function statusFor(action: Pick<Action, 'id' | 'pubkey' | 'collective'>, witnesses: Witness[], groups: Map<string, Collective>) {
  const group = action.collective ? groups.get(action.collective) : undefined
  if (!group) return computeStatus(action, witnesses)
  const members = memberSet(group)
  return computeStatus(action, witnesses, { members, trusted: members })
}
