import assert from 'node:assert/strict';
import test from 'node:test';
import { PERMISSIONS, PERMISSION_MODULES, canChangeRoles, hasPermission } from '../src/lib/permissions/catalogue.ts';
import { requestAcceptedPermissions, requestPermission, additionalRequestPermissions } from '../src/lib/permissions/requests.ts';

test('permission picker contains the complete catalogue without obsolete manage aliases', () => {
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  assert.deepEqual(PERMISSION_MODULES.flatMap(group => group.permissions).sort(), [...PERMISSIONS].sort());
  for (const obsolete of ['Users.Manage', 'Roles.Manage', 'Staff.Manage', 'Visits.Record']) {
    assert.ok(!PERMISSIONS.includes(obsolete as never));
  }
});

test('viewing users grants no administrative operations', () => {
  for (const [verb, path, required] of [
    ['POST', '/invitations', 'Users.Invite'],
    ['POST', '/invitations/id/resend', 'Users.ResendInvitation'],
    ['POST', '/users/id/suspend', 'Users.Suspend'],
    ['POST', '/users/id/activate', 'Users.Activate'],
    ['POST', '/users/id/reset-password', 'Users.ResetPassword'],
    ['POST', '/users/id/revoke-sessions', 'Users.RevokeSessions'],
    ['POST', '/users/id/roles', 'Users.AssignRoles'],
    ['DELETE', '/users/id/roles/FieldStaff', 'Users.RemoveRoles'],
  ]) {
    const permission = requestPermission(verb, path);
    assert.equal(permission, required);
    assert.equal(hasPermission(['Users.View'], permission!), false);
    assert.equal(hasPermission([required], permission!), true);
  }
});

test('create, edit, status, delete and sync stay independent', () => {
  for (const [verb, path, required] of [
    ['POST', '/staff', 'Staff.Create'], ['PATCH', '/staff/id', 'Staff.Edit'],
    ['PATCH', '/staff/id/status', 'Staff.ChangeStatus'], ['POST', '/staff/id/grant-access', 'Staff.GrantAccess'],
    ['POST', '/staff/id/photo', 'Staff.UploadPhoto'], ['POST', '/roles', 'Roles.Create'],
    ['PUT', '/roles/id/permissions', 'Roles.ManagePermissions'],
    ['POST', '/products', 'Products.Create'], ['PUT', '/products/id', 'Products.Edit'],
    ['PATCH', '/products/id/status', 'Products.ChangeStatus'], ['POST', '/products/import', 'Products.Import'],
    ['POST', '/units', 'Units.Create'], ['PUT', '/units/id', 'Units.Edit'],
    ['POST', '/fleet/vehicles', 'Vehicles.Create'], ['POST', '/fleet/vehicles/id/assign-staff', 'Vehicles.AssignStaff'],
    ['POST', '/fleet/vehicles/id/unassign-staff', 'Vehicles.UnassignStaff'],
    ['DELETE', '/fleet/devices/id', 'TrackingDevices.Delete'], ['POST', '/fleet/devices/sync?force=true', 'TrackingDevices.Sync'],
    ['POST', '/fleet/drivers', 'FleetDrivers.Register'], ['DELETE', '/fleet/drivers/id', 'FleetDrivers.Remove'],
    ['POST', '/fleet/drivers/sync', 'FleetDrivers.Sync'], ['DELETE', '/fleet/traccar-users/id', 'TraccarUsers.Delete'],
    ['POST', '/treks/id/stops', 'TrekStops.Add'], ['DELETE', '/treks/id/stops/stop', 'TrekStops.Delete'],
    ['POST', '/treks/id/stops/stop/returns', 'TrekReturns.Record'],
    ['DELETE', '/treks/id/stops/stop/returns/return', 'TrekReturns.Delete'],
    ['POST', '/treks/id/generate-link', 'Treks.GenerateDriverLink'],
    ['POST', '/customers/id/ledger', 'Ledger.CreateEntry'],
  ]) assert.equal(requestPermission(verb, path), required, `${verb} ${path}`);
});

test('trek status changes require the specific action, not Treks.Edit', () => {
  for (const [status, required] of [['InProgress', 'Treks.Start'], ['Completed', 'Treks.Complete'], ['Cancelled', 'Treks.Cancel'], ['Scheduled', 'Treks.ChangeStatus']]) {
    assert.equal(requestPermission('patch', '/api/v1/treks/id/status', { status }), required);
  }
});

test('assign-only users cannot remove roles, including a mixed replacement', () => {
  assert.equal(canChangeRoles(['Users.AssignRoles'], ['Driver'], ['Driver', 'FieldStaff']), true);
  assert.equal(canChangeRoles(['Users.AssignRoles'], ['Driver'], ['FieldStaff']), false);
  assert.equal(canChangeRoles(['Users.RemoveRoles'], ['Driver', 'FieldStaff'], ['Driver']), true);
  assert.equal(canChangeRoles(['Users.RemoveRoles'], ['Driver'], ['Driver', 'FieldStaff']), false);
  assert.equal(canChangeRoles(['Users.View'], ['Driver'], ['Driver']), true);
  assert.equal(canChangeRoles(['Users.View'], ['Driver'], []), false);
  assert.equal(canChangeRoles(['Users.AssignRoles', 'Users.RemoveRoles'], ['Driver'], ['FieldStaff']), true);
});

test('embedded platform access and opening balances require their own grants', () => {
  assert.deepEqual(additionalRequestPermissions('POST', '/staff', { grantAppAccess: true }), ['Staff.GrantAccess']);
  assert.deepEqual(additionalRequestPermissions('POST', '/staff', { grantAppAccess: false }), []);
  assert.deepEqual(additionalRequestPermissions('POST', '/customers', { openingBalance: 50 }), ['Ledger.CreateEntry']);
  assert.deepEqual(additionalRequestPermissions('POST', '/customers', {}), []);
});

test('driver-token operations retain existing access', () => {
  for (const [verb, path] of [
    ['POST', '/treks/driver/token/record'], ['POST', '/treks/driver/token/start'],
    ['POST', '/treks/driver/token/invoices/id/payments'],
    ['GET', '/treks/driver/token/payments/id/receipt'],
    ['POST', '/treks/driver/token/stock-loads/check'],
    ['POST', '/auth/login'], ['POST', '/auth/refresh'],
  ]) assert.equal(requestPermission(verb, path), undefined, path);
  assert.equal(requestPermission('GET', '/users'), undefined);
  assert.equal(requestPermission('GET', '/roles'), undefined);
});

 test('new admin permissions distinguish viewing, mutations and export', () => {
  for (const [method, path, permission] of [
    ['POST', '/invoices/id/payments', 'Payments.Record'],
    ['GET', '/invoices/export', 'Invoices.Export'],
    ['GET', '/invoices/INV001', 'Invoices.ViewDetails'],
    ['GET', '/payments/id/receipt', 'Receipts.View'],
    ['POST', '/returns/id/approve', 'TrekReturns.Approve'],
    ['POST', '/returns/id/reject', 'TrekReturns.Reject'],
    ['POST', '/vehicles/id/stock/load', 'VehicleStock.Load'],
    ['POST', '/vehicles/id/stock/remove', 'VehicleStock.Remove'],
    ['POST', '/vehicles/id/stock/reset', 'VehicleStock.Reset'],
    ['GET', '/vehicles/id/stock/ledger', 'VehicleStock.ViewLedger'],
    ['GET', '/vehicles/id/stock/export', 'VehicleStock.Export'],
    ['GET', '/vehicles/id/stock/ledger/export', 'VehicleStock.Export'],
    ['POST', '/treks/id/stock-loads', 'TrekStock.Manage'],
    ['POST', '/treks/id/stock-loads/check', 'TrekStock.View'],
    ['PUT', '/customers/id/markups', 'CustomerPricing.Manage'],
    ['GET', '/customers/markups/export', 'CustomerPricing.Export'],
    ['DELETE', '/organisation/regions/id/markups/id', 'RegionalPricing.Manage'],
    ['GET', '/organisation/markups/export', 'RegionalPricing.Export'],
  ]) assert.equal(requestPermission(method, path), permission, path);
});

test('serialized retry bodies retain granular requirements', () => {
  assert.equal(requestPermission('PATCH', '/treks/id/status', JSON.stringify({status: 'Completed'})), 'Treks.Complete');
  assert.deepEqual(additionalRequestPermissions('POST', '/staff', JSON.stringify({grantAppAccess: true})), ['Staff.GrantAccess']);
});

test('branch toggle-status, imports, report exports, and history endpoints are protected', () => {
  for (const [method, path, permission] of [
    ['PATCH', '/organisation/branches/id/toggle-status', 'Branches.ChangeStatus'],
    ['PATCH', '/organisation/branches/id/status', 'Branches.ChangeStatus'],
    ['POST', '/customers/import', 'Customers.Register'],
    ['GET', '/treks/id/report/pdf', 'Reports.Export'],
    ['GET', '/staff/export', 'Reports.Export'],
    ['GET', '/reports/treks/export', 'Reports.Export'],
    ['GET', '/reports/collections/export', 'Reports.Export'],
    ['GET', '/reports/products/export', 'Reports.Export'],
    ['GET', '/fleet/devices/id/position/history', 'Tracking.ViewHistory'],
  ]) {
    assert.equal(requestPermission(method, path), permission, `${method} ${path}`);
  }
});

test('multi-permission endpoints accept any qualifying permission', () => {
  for (const [method, path, accepted] of [
    ['POST', '/customers/id/premises-photo', ['CustomerPhotos.Upload', 'CustomerPhotos.Replace']],
    ['POST', '/customers/id/people/person/portrait', ['CustomerPhotos.Upload', 'CustomerPhotos.Replace']],
    ['GET', '/treks/id/price-diff', ['TrekPricing.ViewDiff', 'TrekPricing.Sync']],
    ['GET', '/customers/export', ['Customers.Export', 'Reports.Export']],
    ['GET', '/products/export', ['Products.Export', 'Reports.Export']],
    ['GET', '/ledger/export', ['Reports.Export', 'Ledger.Export']],
    ['GET', '/customers/id/ledger/export', ['Ledger.Export', 'Reports.Export']],
  ] as const) {
    assert.deepEqual(requestAcceptedPermissions(method, path), accepted, `${method} ${path}`);
  }
});

test('driver-token paths and anonymous product document matching remain unblocked', () => {
  for (const [method, path] of [
    ['GET', '/treks/driver/token/report/pdf'],
    ['GET', '/treks/driver/report/pdf'],
    ['GET', '/treks/driver/token/price-diff'],
    ['POST', '/products/match-files'],
  ]) {
    assert.equal(requestAcceptedPermissions(method, path), undefined, `${method} ${path}`);
    assert.equal(requestPermission(method, path), undefined, `${method} ${path}`);
  }
});
