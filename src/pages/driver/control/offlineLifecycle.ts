export type OfflineActionStatus = 'pending' | 'conflict' | 'synced';

export interface OfflineActionLike {
  type: string;
  clientId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
  status: OfflineActionStatus;
  serverId?: string | null;
  personId?: string | null;
  reason?: string;
}

export interface OfflineSyncResultLike {
  clientId: string;
  type: string;
  status: 'Created' | 'AlreadySynced' | 'Conflict';
  serverId: string | null;
  personId?: string | null;
  reason?: string;
}

export interface OfflineServerStopLike {
  stopId: string;
  products?: Array<{ stopProductId: string }>;
  returns?: Array<{ returnId: string }>;
}

type DependencyMap = {
  actionType: string;
  clientField: string;
  serverField: string;
};

const DEPENDENCIES: DependencyMap[] = [
  { actionType: 'RegisterCustomer', clientField: 'customerClientId', serverField: 'customerId' },
  { actionType: 'AddCustomerLocation', clientField: 'locationClientId', serverField: 'locationId' },
  { actionType: 'AddWalkInStop', clientField: 'stopClientId', serverField: 'stopId' },
  { actionType: 'RecordReturn', clientField: 'returnClientId', serverField: 'returnId' },
];

export function successfulServerIds(
  actions: OfflineActionLike[],
  results: OfflineSyncResultLike[],
  actionType: string,
): Map<string, string> {
  const byId = new Map(results.map((result) => [result.clientId, result]));
  return new Map(actions
    .filter((action) => action.type === actionType)
    .map((action) => {
      const result = byId.get(action.clientId);
      const serverId = result
        ? result.status !== 'Conflict' ? result.serverId : null
        : action.status === 'synced' ? action.serverId : null;
      return [action.clientId, serverId] as const;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1])));
}

function reconcilePayload(
  payload: Record<string, unknown>,
  dependencyIds: Map<string, Map<string, string>>,
): Record<string, unknown> {
  let reconciled = payload;
  for (const dependency of DEPENDENCIES) {
    const clientId = String(reconciled[dependency.clientField] || '');
    const serverId = dependencyIds.get(dependency.actionType)?.get(clientId);
    if (!serverId) continue;
    if (reconciled === payload) reconciled = { ...payload };
    delete reconciled[dependency.clientField];
    reconciled[dependency.serverField] = serverId;
  }
  return reconciled;
}

/**
 * Applies one sync response to the durable queue and replaces temporary
 * relationship IDs on every dependent action, including actions that were not
 * part of this batch. This keeps later retries independent of old client IDs.
 */
export function applyOfflineSyncResults<TAction extends OfflineActionLike>(
  actions: TAction[],
  results: OfflineSyncResultLike[],
): TAction[] {
  const byId = new Map(results.map((result) => [result.clientId, result]));
  const dependencyIds = new Map(DEPENDENCIES.map((dependency) => [
    dependency.actionType,
    successfulServerIds(actions, results, dependency.actionType),
  ]));

  return actions.map((action) => {
    const result = byId.get(action.clientId);
    const payload = reconcilePayload(action.payload, dependencyIds);
    if (!result) return payload === action.payload ? action : { ...action, payload };
    return {
      ...action,
      payload,
      status: result.status === 'Conflict' ? 'conflict' : 'synced',
      serverId: result.serverId,
      ...(action.type === 'RegisterCustomer' && result.personId !== undefined
        ? { personId: result.personId }
        : {}),
      reason: result.reason,
    };
  });
}

/** Keep an optimistic stop until the server-backed trek snapshot confirms it. */
export function visibleWalkInStopActions<TAction extends OfflineActionLike>(
  actions: TAction[],
  trekId: string,
  serverStops: OfflineServerStopLike[],
): TAction[] {
  const serverStopIds = new Set(serverStops.map((stop) => stop.stopId));
  return actions.filter((action) => action.type === 'AddWalkInStop'
    && action.payload.trekId === trekId
    && (action.status !== 'synced' || !action.serverId || !serverStopIds.has(action.serverId)));
}

interface StopReference {
  stopId?: string | null;
  stopClientId?: string | null;
}

/**
 * Finds queued children for either a local or server stop. Synced children stay
 * visible until the corresponding server record appears in the trek snapshot.
 */
export function visibleActionsForStop<TAction extends OfflineActionLike>(
  actions: TAction[],
  actionType: string,
  stop: StopReference,
  confirmedServerChildIds: Iterable<string> = [],
): TAction[] {
  const confirmed = new Set(confirmedServerChildIds);
  const localStop = stop.stopClientId
    ? actions.find((action) => action.type === 'AddWalkInStop' && action.clientId === stop.stopClientId)
    : undefined;
  const resolvedStopId = stop.stopId || localStop?.serverId || null;

  return actions.filter((action) => {
    if (action.type !== actionType) return false;
    const matchesClient = Boolean(stop.stopClientId && action.payload.stopClientId === stop.stopClientId);
    const matchesServer = Boolean(resolvedStopId && action.payload.stopId === resolvedStopId);
    const referencedStop = action.payload.stopClientId
      ? actions.find((candidate) => candidate.type === 'AddWalkInStop' && candidate.clientId === action.payload.stopClientId)
      : undefined;
    const matchesReconciledParent = Boolean(resolvedStopId && referencedStop?.serverId === resolvedStopId);
    if (!matchesClient && !matchesServer && !matchesReconciledParent) return false;
    return action.status !== 'synced' || !action.serverId || !confirmed.has(action.serverId);
  });
}
