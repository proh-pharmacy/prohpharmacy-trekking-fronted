# ProH Pharmacy Trekking Operations

## User Manual — Version 0.1.0 Beta

This guide explains how to prepare the system, plan treks, and complete field operations. Follow the sections in order when setting up the application for the first time.

## How to use this guide

The application has two main areas:

- **Portal:** used by administrators, branch managers, trek coordinators, and office staff.
- **Driver app:** used by drivers and sales staff while visiting customers.

If a menu or button is not visible, your account may not have access to that task. Contact your administrator.

---

## 1. Sign in and understand your role

### Portal users

1. Open the application in your browser.
2. Select **Admin** on the sign-in screen.
3. Enter your email address and password.
4. Select **Sign in**.

### Drivers

1. Open the driver login page while connected to the internet.
2. Select **Trekking**.
3. Enter the trek details provided to you.
4. Continue to the driver workspace.

### User roles

- **Administrator:** prepares the organisation and manages access.
- **Branch manager:** manages branch work, staff, customers, and treks within the available access.
- **Trek coordinator:** prepares treks, stops, products, and assignments.
- **Sales staff:** supports sales and payment collection during a trek.
- **Driver:** visits stops and records deliveries, sales, and returns.

Sign out from the user menu when you finish using a shared device.

---

## 2. Prepare the organisation

Complete this section before adding customers or creating treks.

### Add regions

Regions organise the areas in which your branches, customers, vehicles, and treks operate.

1. Open **Organisation** and choose **Regions**.
2. Select **Add region**.
3. Enter the region name.
4. Save the region.

Use the correct spelling and avoid creating the same region twice.

### Add districts

Districts belong to regions and are used when recording customer locations.

1. Open **Districts**.
2. Select **Add district**.
3. Select the region first.
4. Enter the district name.
5. Save the district.

When a customer location is added later, only districts belonging to the selected region should be chosen.

### Add branches

1. Open **Branches** and select **Add branch**.
2. Enter the branch name and contact details.
3. Select the branch region.
4. Save the branch.

Review the branch details before continuing. Branch assignments affect staff access and reports.

---

## 3. Prepare products

Products must be available before they can be added to a trek stop.

### Add a product manually

1. Open **Products** and select **Add product**.
2. Enter the product name and required details.
3. Select or enter the basic unit, such as Tablet, Bottle, or Sachet.
4. Add the basic unit price.
5. If the product is sold in packages, add the packaging unit and packaging price.
6. Save the product.

Check names, units, and prices carefully. A wrong price changes the planned total, delivery total, sale amount, and refund amount.

### Import products

1. Prepare the import file using the required column names.
2. Open **Products** and select **Import**.
3. Upload the file.
4. Review the imported, skipped, and rejected rows.
5. Correct the source file and import again when necessary.

Common import problems include missing product names, invalid prices, duplicate products, and misspelled unit names. Do not continue until the product list and prices are correct.

### Review units and prices

Use the product list to confirm that:

- Every product has a basic unit.
- Packaging units are correct where used.
- Basic and packaging prices are accurate.
- Products that should no longer be sold are handled according to your organisation’s process.

---

## 4. Add staff and manage access

Complete staff setup before creating treks.

### Add staff

1. Open **Staff** and select **Add staff** or **Invite user**.
2. Enter the person’s name, phone number, and email address where applicable.
3. Select the branch and staff role.
4. Save or send the invitation.

Drivers and sales staff need accurate contact details because trek information may be sent to them.

### Roles and permissions

Permissions control which pages, buttons, and actions a user can access. For example, one user may be able to view staff while another can also edit staff.

Assign only the access needed for the person’s work. If a user cannot see a menu or action, ask an administrator to review their role and permissions.

### Manage staff access

Administrators can activate, suspend, or update staff access. When a person leaves the organisation or should no longer use the application, suspend their access promptly.

---

## 5. Prepare vehicles and tracking

### Add a vehicle

1. Open **Fleet** and select **Add vehicle**.
2. Enter the vehicle name and registration details.
3. Select its home region and operational status.
4. Save the vehicle.

A vehicle can later be used for a trek in another region, so its home region does not prevent assignment elsewhere.

### Add a tracking device

1. Open the vehicle’s details.
2. Add or link the tracking device.
3. Confirm that the device identity is correct.
4. Save the changes.

If the device is not correctly linked or powered, its position will not appear on the live tracking map.

### Assign staff and vehicles

Assign the driver and vehicle before starting trek planning. Confirm that the selected driver is the person who will actually perform the trek.

---

## 6. Add and maintain customers

### Register a customer

1. Open **Customers** and select **Add customer**.
2. Complete the business information.
3. Add the representative’s name, phone number, and relationship.
4. In **Location**, select the region, then select a district from that region.
5. Enter the street address and landmark or directions where available.
6. Capture GPS if appropriate. GPS is optional when address information is available.
7. Open **Attachments** and add the premises and representative photos if available.
8. Save the customer.

Review the region and district carefully. A location can belong to a different region from the organisation’s primary customer information.

### Edit a customer

Open the customer and choose **Edit**. Update the changed fields and save. The customer list refreshes after a successful update.

### Manage locations

The customer record shows the **PRIMARY LOCATION** first. Select **View additional locations** to see the other locations.

You can:

- Add an additional location.
- Edit a location.
- Make another location primary.
- Delete a location after confirming.

Each location has its own region, district, address, GPS information, and accuracy.

### Add customer photos

Photos must be JPEG, PNG, or WebP and no larger than 5 MB. Select a photo to preview it, then replace it if necessary before saving.

Photo uploads require an internet connection in the driver app.

---

## 7. Create a trek

Create a trek only after the regions, branches, products, staff, vehicles, and customers are ready.

### Create the trek

1. Open **Trekking** and select **Add trek**.
2. Select the trekking region and scheduled date.
3. Select the driver and sales staff.
4. Select the vehicle.
5. Save the trek.

The trek is first created as a **Draft**. Review it before scheduling or starting it.

### Add stops

1. Open the draft trek.
2. Select **Add stop**.
3. Choose a customer.
4. Add the products planned for that customer.
5. Enter planned quantities and prices.
6. Save the stop.

Repeat the process for each customer. Reorder stops so the driver sees them in the correct visit order.

### Review the trek

Check:

- Trek region and scheduled date.
- Driver, sales staff, and vehicle.
- Stop order.
- Customer details.
- Planned products, units, quantities, and prices.

When everything is correct, schedule the trek. Starting the trek sends the trek information and driver link to the assigned driver and sales staff.

### Trek actions

Depending on the trek status and your access, you may also be able to:

- Download the trek sheet as a PDF.
- Resend the driver link or trek email.
- Edit the trek, stops, and planned products before field work begins.
- Delete a draft or scheduled trek after confirming.

Deleting a trek permanently removes its planned stops and products. A trek that is already in progress, completed, or cancelled cannot be deleted.

### Trek statuses

- **Draft:** still being prepared.
- **Scheduled:** ready for the planned visit.
- **In Progress:** field work is taking place.
- **Completed:** field work is closed.
- **Cancelled:** the trek will not take place.

Adding or deleting stops is not available while a trek is in progress. Completed treks do not accept further stop actions.

---

## 8. Prepare the driver device for offline work

This preparation is required before a driver leaves network coverage.

### Install and prepare the PWA

1. Connect the phone to the internet.
2. Sign in to the driver app.
3. Open the assigned trek.
4. Wait until the stops and products are visible.
5. Install the app to the phone’s home screen as a PWA.
6. Open the installed app once while still online.

The PWA keeps the application available from the phone’s home screen and allows previously downloaded trek data to be used offline. If the driver only uses a normal browser tab, closing or refreshing it offline may make the application unavailable and can put unsaved work at risk.

### Actions available offline

Drivers can prepare the following work without internet:

- Register a new customer.
- Update customer information.
- Add or update a customer location.
- Record a planned delivery.
- Record an unplanned sale.
- Record a product return.
- Capture supported GPS information.

### Actions that require internet

- First login.
- Initial trek download.
- Switching to another workspace.
- Uploading premises or representative photos.
- Loading new information that is not already on the device.

### Offline safety rules

- Do not clear the browser or PWA storage while work is pending.
- Do not uninstall the PWA while actions are waiting to sync.
- Check the pending notification after every offline action.
- Reconnect before the phone battery runs out when possible.
- Keep the app open until synchronization finishes.

---

## 9. Driver trek workflow

### Open the current workspace

The driver app shows the current workspace in the header. Open the trek to see its stops and products. Regional treks and assigned treks are listed separately. Switching to another workspace requires internet.

From a stop, the driver can call the customer when a phone number is available or open the customer’s location in a map application.

### Record a planned delivery

1. Open the stop.
2. Select the product and choose **Record**.
3. Enter the packaging quantity first, then the basic quantity if applicable.
4. Select the payment method.
5. Enter the amount paid when required.
6. Review the total and balance as you type.
7. Save the delivery.

A delivery with a zero total cannot be saved. If the total is unexpected, check the product price and quantities before continuing.

### Record an unplanned sale

Use **Unplanned sale** when the customer buys a product that was not included in the planned stop.

1. Select the product.
2. Enter packaging and basic quantities.
3. Review the calculated amount and balance.
4. Select the payment method.
5. Save the sale.

A sale with a zero total cannot be saved. The sale appears as pending when it is recorded offline and becomes part of the server record after synchronization.

### Record a return

1. Open the **Returns** tab.
2. Select **Record return**.
3. Select the product and enter the returned quantities.
4. Select the refund method.
5. Review the calculated refund amount.
6. Save the return.

The refund method is required. A return with a zero or negative refund cannot be saved. An unsynced return can be cancelled from the pending actions list where the cancel option is available.

### Review pending work

The notification icon shows the number of saved actions waiting to synchronize. If the count is more than nine, it is shown as **9+**.

Open the notification to review pending customer registrations, updates, locations, deliveries, sales, and returns. Pending items show their current state and available actions.

### Synchronize

1. Reconnect the phone to the internet.
2. Open the pending notification.
3. Select **Sync now**.
4. Wait for the sync activity to finish.
5. Review any item that could not be synchronized.
6. Correct the item and try again.

Do not close the app while synchronization is running. Use **Force sync** when you need the device to refresh its stored data instead of using only the latest normal sync point.

---

## 10. Other portal tools

### Dashboard

The dashboard gives a quick view of the organisation’s activity. Use the period selector to view weekly or monthly figures, and use the branch selector when you need to focus on one branch.

Dashboard cards may include collections, outstanding balances, active treks, and customers with outstanding balances. Select a card or chart item to open the related list.

### Customer pins

Open **Customer Pins** to see customers with recorded locations on a map.

- Select a pin to view the customer name and location details.
- Use the map controls to zoom and move around.
- Open the location in Google Maps when you need directions.
- A customer with more than one location may appear more than once on the map.

### Product and delivery reports

The reports area includes:

- **Trek Performance:** review trek activity and results.
- **Collections:** review amounts collected.
- **Product Delivery:** review product quantities delivered.
- **Ledger Summary:** review customer entries and balances.

Use the available filters and date picker before exporting a report.

### Fleet and device management

Use **Fleet** to view vehicles, update vehicle details, change operational status, assign staff, and link tracking devices. Use **Traccar** to review registered tracking devices and their connection information.

### Organisation and people settings

Use **Organisation** to review regions, districts, and branches. Use **People and Roles** to invite users, edit staff details, manage roles, update access, activate or suspend users, and review a user’s access.

### Account recovery

If you cannot remember your password, select **Forgot password?** on the portal login screen and follow the instructions. Contact an administrator if your account is suspended or you cannot complete recovery.

## 11. Monitor treks and vehicles

### Monitor trek progress

Open a trek to review its stops, deliveries, unplanned sales, returns, payments, and balances. Use the stop tabs to move between customer details, products, and returns.

### Live vehicle tracking

1. Open **Live tracking**.
2. Use the status filters to view moving, idle, stopped, or offline vehicles.
3. Select a vehicle to see its latest position and details.
4. Use **Ping live position** for a current position.
5. Use **Draw route trail** to view the vehicle’s movement for a selected date.

Live tracking needs an internet connection. If a vehicle has no position, check its tracking device, power, and vehicle assignment.

---

## 12. Ledger and reports

Use the ledger to review customer entries, payments, and amounts still due.

You can also open a customer from a ledger entry to review the customer account and related activity.

### Export a ledger report

1. Open the ledger or reports area.
2. Select **Export ledger report**.
3. Choose the date range.
4. Select any required filters.
5. To see only customers who still owe money, choose **Customers with outstanding balances only**.
6. Export the report.

---

## 13. Common problems

### I cannot see a menu or button

Your account may not have access to that action, or the current record may not allow it. Ask an administrator to review your access or check the trek status.

### The driver app has no data offline

Reconnect to the internet, open the trek, and wait for its stops and products to load. Confirm that the PWA was installed and opened while online.

### A pending action does not disappear

Confirm that the phone is online, open the pending notification, and select **Sync now**. Review the item for missing or invalid information. Do not clear the app storage.

### A photo will not upload

Confirm that the phone is online, the file is JPEG, PNG, or WebP, and the file is no larger than 5 MB. Try again when the connection is stable.

### A total or refund is zero

Check that the product has the correct price and that a quantity was entered. A zero total or refund cannot be submitted.

### A vehicle is missing from live tracking

Confirm that the vehicle has a linked tracking device and that the device is powered and connected. Refresh the tracking page and try again.

### A customer or district is missing

Check the selected region, then search again. Newly created offline records may remain pending until synchronization completes.

---

## 14. Daily checklists

### Administrator

- Regions and districts are available.
- Branches are configured.
- Products and prices are current.
- Staff have the correct access.
- Vehicles and tracking devices are active.

### Trek coordinator

- The trek region and date are correct.
- Driver, sales staff, and vehicle are assigned.
- Stops are in the correct order.
- Products and quantities are correct.
- The trek is reviewed before it is started.

### Driver

- The PWA is installed.
- The trek was opened while online.
- Stops and products are visible.
- Offline actions appear in the pending notification.
- Pending work is synchronized before finishing.

## Version information

This manual applies to **ProH Pharmacy Trekking Operations version 0.1.0 Beta**.
