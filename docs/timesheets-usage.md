# Service records and optional weekly timesheets

Sign in to the existing DeepBridge consultant portal and open **Service records**. Supplier uploads are the primary route: use your own record of services for the agreed billing period and the format that works for your business. The **Weekly form (optional)** is available when a daily hours record is useful for the agreed billing basis.

Open [Service records](https://portal.deepbridgeadvisory.com/timesheets) using your existing portal sign-in.

To upload your own record:

1. Select the project and the start and end dates of the service period.
2. Choose your PDF (up to 10 MB). Export spreadsheet or Word records to PDF first.
3. Add a service summary and invoice reference if useful, then upload the record.
4. The saved record appears in your history. Its PDF is available to you and DeepBridge administrators once its security check clears. If that check cannot complete, use **Retry security check**; a failed check does not make the file available for download.

Keep the contents factual and consistent with the agreed services and billing basis. Choosing a supplier-owned template or using this portal does not itself determine employment or supplier status.

To use the weekly form:

1. Select your assigned project and the week. Weeks run Monday to Sunday.
2. Enter the hours for each day and a short work description. **Save draft** keeps incomplete progress, including hours whose notes are still unfinished.
3. Add a description for every worked day, choose **Submit for review**, then confirm. The submitted week is locked while DeepBridge reviews it.
4. If changes are requested, open the week from your history, read the review note, make corrections and submit it again. Approved weeks remain locked.

DeepBridge administrators open a submitted week, then approve it or request changes with a review note. Consultants can see their own records; active administrators can review the records across consultants. Changes and review decisions are recorded in the audit history.

**Download CSV** exports the saved record. Save your latest edits first if you want those changes included. **Download all CSV** exports the saved history. Use **Refresh timesheets** to retrieve another person's latest review or recover from a conflict; unsaved changes are discarded only after you confirm. A failed refresh keeps your edits.

The weekly form supports one timesheet per consultant, project and week; seven daily entries; 0–24 hours per day with up to two decimal places; and notes of up to 2,000 characters per day. Submissions need a positive total. New entries and corrections require an active project assignment. Previously saved records remain available after a project assignment ends.

Verification covers input validation, sign-in and role checks, ownership, project membership, conflicting saves, approval state changes, database access isolation and audit records. The database verification script uses a transaction and rolls back its fixtures.
