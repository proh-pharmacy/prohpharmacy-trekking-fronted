# ProH Pharmacy Trekking Operations

## User Manual — Version 0.1.0 Beta

**Audience:** administrators, branch managers, trekking coordinators, sales staff, and drivers.

This manual explains the main workflows in the ProH Pharmacy Trekking Operations application. Version 0.1.0 is a beta release. Some screens, labels, and workflows may continue to improve.

## 1. Getting started

### Administrator and office users

1. Open the application in a supported browser.
2. Sign in with your email address and password.
3. Use the sidebar to open the area you need.
4. Sign out from the user menu when you finish.

### Drivers

1. Open the driver login page while connected to the internet.
2. Select **Trekking**, enter the trek code and required details, then continue.
3. Install the page as a PWA when prompted if your device supports it.
4. Open the assigned trek and allow the application to finish its first data sync before leaving network coverage.

The driver application can continue working with previously downloaded trek data while offline. The first login, workspace switching, and photo uploads require an internet connection.

## 2. Portal navigation

The office portal contains the following areas, depending on your permissions:

- **Dashboard** — operational totals, collections, outstanding balances, and activity summaries.
- **Customers** — register, edit, search, and review customer accounts.
- **Customer pins** — view customer locations on a map.
- **Products** — manage products, units, prices, and catalog information.
- **Trekking** — create treks, plan stops, assign staff and vehicles, and monitor progress.
- **Fleet** — manage vehicles, tracking devices, and staff assignments.
- **Live tracking** — view current vehicle positions and route history.
- **Reports and ledger** — review customer balances and export reports.
- **Staff and roles** — manage staff accounts, application access, roles, and permissions.

If an item is not visible, your account may not have the permission required for that area.

## 3. Customers

### Register a customer

1. Open **Customers** and choose **Add customer**.
2. Complete the business information and representative sections.
3. In **Location**, select the region and then the matching district. Add an address or landmark where available.
4. Capture the location manually or use the device GPS. GPS is optional when address details are available.
5. In **Attachments**, add the premises photo and representative photo if available.
6. Save the customer.

### Edit a customer

Open a customer and choose **Edit**. Update only the information that has changed, then save. The customer list refreshes after a successful update.

### Manage customer locations

The customer modal shows the **PRIMARY LOCATION** first. Use **View additional locations** to see other locations. You can:

- Add an additional location in another region or district.
- Edit an existing location.
- Promote a location to primary.
- Delete a location after confirming the action.

Each location has its own region, district, address, GPS values, accuracy, and verification details.

### Photos

Photos are uploaded online. The file must be JPEG, PNG, or WebP and no larger than 5 MB. After selecting a photo, use the preview to inspect or replace it before saving.

## 4. Create and manage a trek

### Create a trek

1. Open **Trekking** and choose **Add trek**.
2. Select the trekking region, scheduled date, driver, sales staff, and vehicle.
3. Add stops in the required order.
4. For each stop, select a customer and add planned products, units, quantities, and prices.
5. Save the trek. A new trek is created as **Draft**.

Vehicles can be selected from all regions because a vehicle may operate outside its home region. Use the vehicle region filter when you need to narrow the list.

### Trek statuses

- **Draft** — planning can still be changed and the trek can be deleted.
- **Scheduled** — planned and ready to start.
- **In Progress** — the driver can record deliveries, sales, and returns. Adding or deleting stops is disabled.
- **Completed** — the trek is closed and no further stop actions can be recorded.
- **Cancelled** — the trek is closed.

Starting a trek sends the trek sheet and driver link to the assigned driver and sales staff automatically. The email is sent as part of starting the trek; it does not require a separate action.

### Stops and products

Use the stop editor to change the customer, reorder stops, add products, or remove planned products while the trek is still editable. Product summaries remain visible when a stop accordion is closed; selecting a product summary opens that stop.

## 5. Driver operations

### Workspaces and treks

The driver’s trek list contains **Regional treks** and **Assigned treks**. Select a trek to make it the current workspace. Workspace switching requires an active internet connection.

The current workspace is shown in the header. The driver profile menu shows the current region and options such as remembering the session or logging out.

### Record a planned delivery

1. Open the current trek and expand a stop.
2. Choose **Record** for the product.
3. Enter delivered packaging quantity first, followed by basic quantity where applicable.
4. Select a payment method and enter the amount paid when required.
5. Review the calculated total and balance while entering values.
6. Save the delivery.

The delivered total is calculated from the delivered quantities and the snapshotted product prices. A zero total cannot be submitted.

### Record an unplanned sale

Use **Unplanned sale** when a product was sold at a stop but was not part of the original plan. Select the product, enter quantities, payment details, and review the live total and balance before saving. A sale with a zero total cannot be submitted.

### Record a return

1. Open the **Returns** tab.
2. Choose **Record return**.
3. Select the product and enter the returned quantities.
4. Select a refund method.
5. Review the calculated refund amount.
6. Save the return.

The refund method is required, and a zero or negative refund cannot be submitted. Unsynced returns can be cancelled from the pending item list.

### Pending changes

The driver header shows pending offline actions as a notification count. Open it to review queued registrations, customer updates, locations, deliveries, sales, and returns. Unsynced items can be cancelled where supported. A sync spinner appears while synchronization is running.

Choose **Sync now** when connected. If an item fails, open its details, correct the problem, and sync again. Keep the application open until the sync finishes.

## 6. Offline operation and synchronization

The driver application stores the data needed for the current trek locally. These actions can be prepared offline:

- Registering a customer.
- Updating customer details.
- Adding, editing, or updating customer locations.
- Recording planned deliveries.
- Recording unplanned sales.
- Recording product returns.
- Capturing GPS data for supported customer and location actions.

An internet connection is required for:

- First login and initial data download.
- Switching the current workspace.
- Uploading premises and representative photos.
- Sending or retrieving server data immediately.

On reconnect, queued actions are uploaded in order. The application keeps a local sync timestamp for normal delta synchronization. Use **Force sync** when you need to request a full refresh rather than relying on the last sync timestamp.

Do not clear browser or PWA storage while there are pending actions. Clearing storage can remove unsynced work from the device.

## 7. Live fleet tracking

Open **Live tracking** from the portal to monitor vehicles on a light map.

- Filter the fleet by **Moving**, **Idle**, **Stopped**, or **Offline**.
- Select a vehicle to view its region, display name, current status, speed, ignition, battery, last update, and address.
- Use **Ping live position** to request a current position.
- Use **Draw route trail** to view historical movement for a selected date.
- Route history uses the vehicle’s backend device identity, so a vehicle must be correctly linked to its tracking device.

The map receives live updates while the connection is active and reconnects automatically after a disconnect.

## 8. Fleet and tracking devices

Fleet users can create and edit vehicles, update operational status, link tracking devices, and assign staff. For Teltonika FMB920 devices, confirm that the device IMEI and backend tracking identity are correct before expecting live positions.

Use the vehicle display name and region to identify vehicles in the tracking list. A vehicle may be assigned to a trek outside its home region.

## 9. Ledger and reports

Use the ledger screens to review customer entries, payments, balances, and outstanding amounts. When exporting a ledger report, the balance filter **Customers with outstanding balances only** limits the export to customers with an amount still due.

Use the date picker to choose the report period, then export the report from the action menu.

## 10. Permissions and access

The application controls access at three levels:

1. **Sidebar visibility** — unavailable areas are hidden from navigation.
2. **Route access** — a page that requires a missing permission shows an access-denied screen.
3. **Action visibility** — buttons and controls such as Add, Edit, Delete, Start, Export, and Sync are shown only when permitted.

Your administrator can assign roles or individual permissions. If you need access to a missing function, contact the administrator rather than sharing another user’s login.

## 11. Troubleshooting

### The driver page is blank or shows no data

Reconnect to the internet, reopen the PWA, and run **Sync now**. The first use of a device requires an online login and seed download.

### A queued action remains pending

Open the pending notification to view the action. Confirm that the device is online, correct any missing or invalid data, and run **Sync now** again. Do not clear site data before resolving the queue.

### A photo upload fails

Confirm the file is JPEG, PNG, or WebP, is no larger than 5 MB, and that the device is online. Retry the upload after the connection is stable.

### A vehicle has no live position

Confirm the vehicle is linked to the correct tracking device, the device is powered, and the tracking service is connected. Refresh the page and try **Ping live position**.

### A page or button is missing

The account may not have the required permission, or the action may be unavailable for the current trek status. Contact an administrator if the access is expected.

## 12. Beta release notes

Version **0.1.0 Beta** includes:

- Portal and driver authentication flows.
- PWA support and offline driver workflows.
- Customer registration, editing, photos, and multiple locations.
- Trek planning, stops, products, deliveries, unplanned sales, and returns.
- Pending action notifications and synchronization controls.
- Regional and assigned trek views with workspace switching.
- Fleet management and live vehicle tracking.
- Ledger summaries and report exports.
- Permission-aware navigation, routes, and actions.

For support, record the page, trek number, customer or vehicle involved, the action attempted, and whether the device was online or offline.
