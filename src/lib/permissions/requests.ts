import type { Permission } from './catalogue';

type PermissionRequirement = Permission | readonly Permission[];
type Rule = readonly [method: string, path: RegExp, permission: PermissionRequirement];
// Exact operations only: viewing or editing never grants create/delete rights.
const rules: readonly Rule[] = [
  ['GET', /^\/customers\/markups$/, 'CustomerPricing.View'],
  ['GET', /^\/customers\/markups\/export$/, 'CustomerPricing.Export'],
  ['GET', /^\/customers\/export$/, ['Customers.Export', 'Reports.Export']],
  ['GET', /^\/products\/export$/, ['Products.Export', 'Reports.Export']],
  ['GET', /^\/staff\/export$/, 'Reports.Export'],
  ['GET', /^\/ledger\/export$/, ['Reports.Export', 'Ledger.Export']],
  ['GET', /^\/customers\/[^\/]+\/ledger\/export$/, ['Ledger.Export', 'Reports.Export']],
  ['GET', /^\/reports\/(treks|collections|products)\/export$/, 'Reports.Export'],
  ['GET', /^\/fleet\/vehicles\/stock-overview$/, 'VehicleStock.View'],
  ['GET', /^\/fleet\/devices\/[^\/]+\/position\/history$/, 'Tracking.ViewHistory'],
  ['GET', /^\/invoices$/, 'Invoices.View'],
  ['GET', /^\/invoices\/export$/, 'Invoices.Export'],
  ['GET', /^\/organisation\/markups\/export$/, 'RegionalPricing.Export'],
  ['GET', /^\/returns$/, 'TrekReturns.View'],
  ['GET', /^\/returns\/pending-count$/, 'TrekReturns.View'],
  ['GET', /^\/customers\/[^\/]+\/markups$/, 'CustomerPricing.View'],
  ['GET', /^\/invoices\/[^\/]+$/, 'Invoices.ViewDetails'],
  ['GET', /^\/invoices\/[^\/]+\/returns$/, 'TrekReturns.View'],
  ['GET', /^\/organisation\/regions\/[^\/]+\/markups$/, 'RegionalPricing.View'],
  ['GET', /^\/payments\/[^\/]+\/receipt$/, 'Receipts.View'],
  ['GET', /^\/treks\/[^\/]+\/price-diff$/, ['TrekPricing.ViewDiff', 'TrekPricing.Sync']],
  ['GET', /^\/treks\/[^\/]+\/report\/pdf$/, 'Reports.Export'],
  ['GET', /^\/treks\/[^\/]+\/returns$/, 'TrekReturns.View'],
  ['GET', /^\/treks\/[^\/]+\/stock-loads$/, 'TrekStock.View'],
  ['GET', /^\/treks\/[^\/]+\/stock-loads\/check$/, 'TrekStock.View'],
  ['GET', /^\/treks\/[^\/]+\/stock-snapshot$/, 'TrekStock.View'],
  ['GET', /^\/treks\/[^\/]+\/stock-snapshot\/pdf$/, 'TrekStock.View'],
  ['GET', /^\/vehicles\/[^\/]+\/stock$/, 'VehicleStock.View'],
  ['GET', /^\/vehicles\/[^\/]+\/stock\/export$/, 'VehicleStock.Export'],
  ['GET', /^\/vehicles\/[^\/]+\/stock\/ledger$/, 'VehicleStock.ViewLedger'],
  ['GET', /^\/vehicles\/[^\/]+\/stock\/ledger\/export$/, 'VehicleStock.Export'],
  ['GET', /^\/vehicles\/[^\/]+\/stock\/summary$/, 'VehicleStock.View'],
  ['POST', /^\/invoices\/[^\/]+\/payments$/, 'Payments.Record'],
  ['POST', /^\/returns\/[^\/]+\/approve$/, 'TrekReturns.Approve'],
  ['POST', /^\/returns\/[^\/]+\/reject$/, 'TrekReturns.Reject'],
  ['POST', /^\/treks\/[^\/]+\/stock-loads$/, 'TrekStock.Manage'],
  ['POST', /^\/treks\/[^\/]+\/stock-loads\/check$/, 'TrekStock.View'],
  ['POST', /^\/vehicles\/[^\/]+\/stock\/load$/, 'VehicleStock.Load'],
  ['POST', /^\/vehicles\/[^\/]+\/stock\/remove$/, 'VehicleStock.Remove'],
  ['POST', /^\/vehicles\/[^\/]+\/stock\/reset$/, 'VehicleStock.Reset'],
  ['PUT', /^\/customers\/[^\/]+\/markups$/, 'CustomerPricing.Manage'],
  ['PUT', /^\/organisation\/regions\/[^\/]+\/markups$/, 'RegionalPricing.Manage'],
  ['DELETE', /^\/customers\/[^\/]+\/markups\/[^\/]+$/, 'CustomerPricing.Manage'],
  ['DELETE', /^\/organisation\/regions\/[^\/]+\/markups\/[^\/]+$/, 'RegionalPricing.Manage'],
  ['DELETE', /^\/treks\/[^\/]+\/stock-loads\/[^\/]+$/, 'TrekStock.Manage'],
  ['GET', /^\/treks\/[^\/]+\/stops\/[^\/]+\/invoice$/, 'Invoices.ViewDetails'],
  ['GET', /^\/vehicles\/[^\/]+\/stock\/[^\/]+$/, 'VehicleStock.View'],
  ['POST', /^\/invitations$/, 'Users.Invite'],
  ['POST', /^\/invitations\/[^/]+\/resend$/, 'Users.ResendInvitation'],
  ['POST', /^\/users\/[^/]+\/roles$/, 'Users.AssignRoles'],
  ['DELETE', /^\/users\/[^/]+\/roles\/[^/]+$/, 'Users.RemoveRoles'],
  ['POST', /^\/users\/[^/]+\/activate$/, 'Users.Activate'],
  ['POST', /^\/users\/[^/]+\/suspend$/, 'Users.Suspend'],
  ['POST', /^\/users\/[^/]+\/revoke-sessions$/, 'Users.RevokeSessions'],
  ['POST', /^\/users\/[^/]+\/reset-password$/, 'Users.ResetPassword'],
  ['PATCH|PUT', /^\/users\/[^/]+$/, 'Users.Edit'],
  ['POST', /^\/staff$/, 'Staff.Create'],
  ['PATCH|PUT', /^\/staff\/[^/]+$/, 'Staff.Edit'],
  ['PATCH', /^\/staff\/[^/]+\/status$/, 'Staff.ChangeStatus'],
  ['POST', /^\/staff\/[^/]+\/grant-access$/, 'Staff.GrantAccess'],
  ['POST', /^\/staff\/[^/]+\/photo$/, 'Staff.UploadPhoto'],
  ['POST', /^\/roles$/, 'Roles.Create'],
  ['PUT', /^\/roles\/[^/]+\/permissions$/, 'Roles.ManagePermissions'],
  ['PATCH|PUT', /^\/roles\/[^/]+$/, 'Roles.Edit'],
  ['DELETE', /^\/roles\/[^/]+$/, 'Roles.Delete'],
  ['POST', /^\/organisation\/regions$/, 'Regions.Create'],
  ['PUT|PATCH', /^\/organisation\/regions\/[^/]+$/, 'Regions.Edit'],
  ['POST', /^\/organisation\/districts$/, 'Districts.Create'],
  ['PUT|PATCH', /^\/organisation\/districts\/[^/]+$/, 'Districts.Edit'],
  ['POST', /^\/organisation\/branches$/, 'Branches.Create'],
  ['PUT|PATCH', /^\/organisation\/branches\/[^/]+$/, 'Branches.Edit'],
  ['PATCH', /^\/organisation\/branches\/[^/]+\/(toggle-)?status$/, 'Branches.ChangeStatus'],
  ['POST', /^\/products$/, 'Products.Create'],
  ['PUT|PATCH', /^\/products\/[^/]+$/, 'Products.Edit'],
  ['PATCH', /^\/products\/[^/]+\/packaging-unit$/, 'Products.Edit'],
  ['PATCH', /^\/products\/[^/]+\/status$/, 'Products.ChangeStatus'],
  ['POST', /^\/products\/import$/, 'Products.Import'],
  ['POST', /^\/units$/, 'Units.Create'],
  ['PUT|PATCH', /^\/units\/[^/]+$/, 'Units.Edit'],
  ['PATCH', /^\/units\/[^/]+\/status$/, 'Units.ChangeStatus'],
  ['POST', /^\/customers\/import$/, 'Customers.Register'],
  ['POST', /^\/customers$/, 'Customers.Register'],
  ['PUT|PATCH', /^\/customers\/[^/]+$/, 'Customers.Edit'],
  ['POST', /^\/customers\/[^/]+\/approve$/, 'Customers.Approve'],
  ['POST', /^\/customers\/[^/]+\/id-document$/, 'CustomerKyc.Manage'],
  ['POST', /^\/customers\/[^/]+\/id-card\/(front|back)$/, 'CustomerKyc.Manage'],
  ['POST', /^\/customers\/[^/]+\/people\/[^/]+\/portrait$/, ['CustomerPhotos.Upload', 'CustomerPhotos.Replace']],
  ['POST', /^\/customers\/[^/]+\/premises-photo$/, ['CustomerPhotos.Upload', 'CustomerPhotos.Replace']],
  ['POST', /^\/customers\/[^/]+\/locations$/, 'CustomerLocations.Add'],
  ['PATCH|PUT', /^\/customers\/[^/]+\/locations\/[^/]+$/, 'CustomerLocations.Edit'],
  ['DELETE', /^\/customers\/[^/]+\/locations\/[^/]+$/, 'CustomerLocations.Delete'],
  ['POST', /^\/customers\/[^/]+\/locations\/[^/]+\/set-primary$/, 'CustomerLocations.SetPrimary'],
  ['POST', /^\/customers\/[^/]+\/ledger$/, 'Ledger.CreateEntry'],
  ['PATCH|PUT', /^\/customers\/[^/]+\/ledger\/[^/]+$/, 'Ledger.EditEntry'],
  ['DELETE', /^\/customers\/[^/]+\/ledger\/[^/]+$/, 'Ledger.DeleteEntry'],
  ['POST', /^\/treks$/, 'Treks.Create'],
  ['PATCH|PUT', /^\/treks\/[^/]+$/, 'Treks.Edit'],
  ['DELETE', /^\/treks\/[^/]+$/, 'Treks.Delete'],
  ['POST', /^\/treks\/[^/]+\/stops$/, 'TrekStops.Add'],
  ['PATCH|PUT', /^\/treks\/[^/]+\/stops\/[^/]+$/, 'TrekStops.Edit'],
  ['DELETE', /^\/treks\/[^/]+\/stops\/[^/]+$/, 'TrekStops.Delete'],
  ['PATCH', /^\/treks\/[^/]+\/stops\/[^/]+\/products\/[^/]+\/price$/, 'TrekProducts.OverridePrice'],
  ['POST', /^\/treks\/[^/]+\/sync-prices$/, 'TrekPricing.Sync'],
  ['POST', /^\/treks\/[^/]+\/stops\/[^/]+\/returns$/, 'TrekReturns.Record'],
  ['DELETE', /^\/treks\/[^/]+\/stops\/[^/]+\/returns\/[^/]+$/, 'TrekReturns.Delete'],
  ['POST', /^\/treks\/[^/]+\/send-email$/, 'Treks.SendEmail'],
  ['POST', /^\/treks\/[^/]+\/generate-link$/, 'Treks.GenerateDriverLink'],
  ['GET', /^\/treks\/[^/]+\/sheet\/pdf$/, 'Treks.DownloadSheet'],
  ['POST', /^\/fleet\/vehicles$/, 'Vehicles.Create'],
  ['PUT|PATCH', /^\/fleet\/vehicles\/[^/]+$/, 'Vehicles.Edit'],
  ['PATCH', /^\/fleet\/vehicles\/[^/]+\/status$/, 'Vehicles.ChangeStatus'],
  ['POST', /^\/fleet\/vehicles\/[^/]+\/assign-staff$/, 'Vehicles.AssignStaff'],
  ['POST', /^\/fleet\/vehicles\/[^/]+\/unassign-staff$/, 'Vehicles.UnassignStaff'],
  ['POST', /^\/fleet\/devices\/sync$/, 'TrackingDevices.Sync'],
  ['POST', /^\/fleet\/devices$/, 'TrackingDevices.Create'],
  ['PUT|PATCH', /^\/fleet\/devices\/[^/]+$/, 'TrackingDevices.Edit'],
  ['DELETE', /^\/fleet\/devices\/[^/]+$/, 'TrackingDevices.Delete'],
  ['POST', /^\/fleet\/drivers\/sync$/, 'FleetDrivers.Sync'],
  ['POST', /^\/fleet\/drivers$/, 'FleetDrivers.Register'],
  ['DELETE', /^\/fleet\/drivers\/[^/]+$/, 'FleetDrivers.Remove'],
  ['POST', /^\/fleet\/traccar-users\/sync$/, 'TraccarUsers.Sync'],
  ['POST', /^\/fleet\/traccar-users$/, 'TraccarUsers.Create'],
  ['PUT|PATCH', /^\/fleet\/traccar-users\/[^/]+$/, 'TraccarUsers.Edit'],
  ['DELETE', /^\/fleet\/traccar-users\/[^/]+$/, 'TraccarUsers.Delete'],
];

function parseBody(data: unknown): Record<string, unknown> | undefined {
  if (typeof data === 'string') {
    try { return JSON.parse(data); } catch { return undefined; }
  }
  return data && typeof data === 'object' ? data as Record<string, unknown> : undefined;
}

export function requestAcceptedPermissions(method: string, url: string, data?: unknown): readonly Permission[] | undefined {
  const path = url.split('?')[0].replace(/^\/?api\/v1/, '').replace(/\/$/, '');
  if (/^\/treks\/driver(\/|$)/.test(path)) return undefined;
  const verb = method.toUpperCase();
  if (verb === 'PATCH' && /^\/treks\/[^/]+\/status$/.test(path)) {
    const status = parseBody(data)?.status;
    if (status === 'InProgress') return ['Treks.Start'];
    if (status === 'Completed') return ['Treks.Complete'];
    if (status === 'Cancelled') return ['Treks.Cancel'];
    return ['Treks.ChangeStatus'];
  }
  const matched = rules.find(([methods, pattern]) => methods.split('|').includes(verb) && pattern.test(path))?.[2];
  if (!matched) return undefined;
  return typeof matched === 'string' ? [matched] : matched;
}

export function requestPermission(method: string, url: string, data?: unknown): Permission | undefined {
  const accepted = requestAcceptedPermissions(method, url, data);
  return accepted?.length === 1 ? accepted[0] : undefined;
}

/** Extra privileges for operations embedded in another form's submission. */
export function additionalRequestPermissions(method: string, url: string, data?: unknown): Permission[] {
  const path = url.split('?')[0].replace(/^\/?api\/v1/, '').replace(/\/$/, '');
  const body = parseBody(data);
  if (method.toUpperCase() === 'POST' && path === '/staff' && body?.grantAppAccess) return ['Staff.GrantAccess'];
  if (method.toUpperCase() === 'POST' && path === '/customers' && body?.openingBalance) return ['Ledger.CreateEntry'];
  if (['PATCH', 'PUT'].includes(method.toUpperCase()) && /^\/customers\/[^/]+$/.test(path)) {
    return [
      ...(body?.representative ? ['CustomerRepresentatives.Edit' as const] : []),
      ...(body?.location ? ['CustomerLocations.Edit' as const] : []),
    ];
  }
  return [];
}
