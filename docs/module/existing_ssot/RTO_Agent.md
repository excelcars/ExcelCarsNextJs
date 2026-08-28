# SSOT - Existing RTO Agent Functionality
## Status: Implementation-backed submodule documentation

**Parent module:** `Admin/RTO_Agent_Management`  
**Legacy project:** `C:\KhizarShaikh\Project\ExcelCars` (ASP.NET MVC / Entity Framework)  
**Important scope decision:** RTO Agent is not a separate master-data CRUD module in the legacy system. Agent information is embedded in each `RTO_Agent` transaction.

## 1. Purpose

The RTO Agent functionality records the third-party person handling the vehicle registration-transfer work. It captures the agent's name and contact details, reuses previous RTO agent values through autocomplete, displays those values in RTO results/reports, and makes them available to shared communication functionality.

It does not provide a separate screen to create, edit, delete, or maintain a unique RTO agent master record.

## 2. Source Evidence

- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Admin\RTO_Agent_Management_View.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\AdminController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\RTO_Agent_Management\RTO_Agent_Management.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Home\DashBoard.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\DashBoard\DashBoard_Management.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\SMS_Email_Send_MSG\SMS_Email_Sent_MSG_Model.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\NotificationManagement\Notification.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Controllers\ConfigurationController.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Configuration\NotificationManagement.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\ApModel\Model\Common\CommonFor_Model_Color_Variant.cs`
- `C:\KhizarShaikh\Project\ExcelCars\ExcelCars\Views\Report\Stock_Tracking_Details_Report.cshtml`
- `C:\KhizarShaikh\Project\ExcelCars\db\ExcelCars_merged.sql`

## 3. Agent Data Ownership

The logical agent columns are stored on the RTO main record:

| Logical field | EF/model property | Database column in legacy model |
|---|---|---|
| Agent name | `Agent_Name` | `RTO_Agent.Agent_Name` |
| Agent mobile | `Agent_Mobile_no` | `RTO_Agent.Agent_Mobile_no` |
| Agent email | `Agent_Email_ID` | `RTO_Agent.Agent_Email_ID` |

The supplied database snapshot also contains `FK_Partner_ID`, but the RTO page/model reviewed does not bind or use it for agent selection. No `RTO_Agent_Master` or dedicated RTO-agent identity table is used by this module. The same real-world agent can therefore be duplicated across multiple RTO rows with different spelling/contact values.

## 4. UI Behavior

The RTO form contains:

- **Agent Name**: text input, model binding `objRTOAgent.Agent_Name`, class `req`; marked `*#` in the label
- **Agent Mobile No**: text input, binding `objRTOAgent.Agent_Mobile_no`, class `req num`, maximum length 13; marked `*`
- **Agent Email**: text input, binding `objRTOAgent.Agent_Email_ID`, class `email`; optional in the markup

The page does not display a separate agent ID hidden field. The autocomplete response includes an RTO row ID (`RTO_ID`), but the page uses it only as metadata in the suggestion object; it does not bind that ID into the RTO save model or create a foreign-key relationship.

## 5. Agent Autocomplete

### 5.1 Request path

Typing in Agent Name invokes:

```text
GET /Admin/AutoComplete_RTOAgent_Details?term=<typed text>
```

The controller creates `RTO_Agent_ViewModel`, calls `Auto_RTO_Agent_Details(term)`, and returns JSON with `AllowGet`.

### 5.2 Query behavior

`Auto_RTO_Agent_Details` queries the `RTO_Agent` table:

```text
Agent_Name.StartsWith(term)
```

It returns each matching RTO row's:

- `RTO_Agent_Main_ID` as `RTO_ID`
- `Agent_Name` as `RTO_Agent_Name`
- `Agent_Mobile_no` as `RTO_Agent_Mobile`
- `Agent_Email_ID` as `RTO_Agent_Email`

There is no `Distinct`, ordering, active/inactive filter, master lookup, or search by mobile/email in this RTO-specific autocomplete method. Duplicate suggestions can therefore occur when multiple RTO rows contain the same agent name.

### 5.3 Selection behavior

The page maps the JSON fields to a jQuery UI suggestion. Selecting a suggestion fills:

- Agent Name
- Agent Mobile No
- Agent Email

If the selection is invalid or cleared, the page clears all three visible agent fields. The selected RTO row ID is not retained as an agent relationship.

## 6. Manual Entry And New Values

Autocomplete suggestions are not a whitelist. The page allows the user to type an agent name that is not returned by autocomplete. The client validates presence, numeric format for the mobile field, and optional email syntax, but it does not check that the agent exists in prior RTO data.

On Save, the typed values are written directly into the new or updated `RTO_Agent` row. They are not inserted into a separate agent master table and do not automatically create a reusable canonical agent record. The new values may appear in later autocomplete suggestions because later autocomplete queries read all RTO rows.

## 7. Main RTO Save/Update Behavior

`Save_Update_RTOAgent` receives the nested `RTO_Agent_ViewModel` and calls the RTO model's duplicate-registration check before saving. Agent fields are not used in duplicate detection.

During `Insert_Update_RTO_Agent`:

- on create (`RTO_Agent_Main_ID == 0`), `Agent_Name`, `Agent_Mobile_no`, and `Agent_Email_ID` are written to the new main RTO row
- on update, the same three fields overwrite the existing RTO row values
- `Updated_Dt` and `Updated_By` are refreshed on every save
- `Created_Dt` and `Created_By` are set only for a new row
- the agent fields are not separately normalized, deduplicated, or linked to an agent master

The main save transaction also writes customer, vehicle, payment, and follow-up data. Agent data itself does not create payment or follow-up rows independently; those child rows are created because the parent RTO transaction is saved.

## 8. Agent Search Behavior

The RTO search uses `Agent_Name` as one of its filters:

```text
blank Agent_Name OR RTO_Agent.Agent_Name == posted Agent_Name
```

Therefore:

- Agent Name search is exact-match, subject to database collation
- partial agent-name text is not a search match, even though autocomplete uses prefix matching
- Agent Mobile No and Agent Email are not RTO search filters
- when Agent Name is blank, it does not restrict the search
- when combined with other search fields, it works with AND logic

## 9. Agent Listing And Reporting

The RTO result grid displays Agent Name, Agent Mobile, and Agent Email in the Agent column. These values come directly from the RTO main row. Edit uses hidden row values to repopulate the three fields.

The RTO export includes Agent Name, Agent Mobile No, and Agent Email ID. The stock-tracking report also reads RTO agent name/mobile/email for its RTO details section. The dashboard's RTO pending-payment and pending-transfer/RC sections display agent name and mobile, but not email.

## 10. Dashboard And Operational Consumers

The dashboard reads agent information from RTO rows in two RTO-related widgets:

- **Pending Car Transfer/Pending RC:** selects RTO rows where transfer status is Pending OR RC status is Pending; displays agent name and mobile and links the registration number to RTO search.
- **Pending Payment:** selects RTO rows where `Amt_Paid < Transfer_Charges`; displays agent name and mobile with the RTO balance and follow-up date.

These are consumers of the denormalized RTO row. They do not resolve a separate agent entity.

## 11. Shared SMS/Email And Notification Integrations

The shared SMS/email module includes `RTO Agent` as a receiver type. It queries the same `RTO_Agent` table:

- receiver-name suggestions use agent name prefix matching
- receiver-mobile suggestions use agent mobile prefix matching
- receiver-email suggestions use agent email prefix matching
- contact search filters name, mobile, and email with `Contains` conditions combined using AND, orders by agent name, and returns distinct contact combinations

The RTO Management screen itself has no SMS, email, or notification button. The related Configuration → Notification Management screen has a separate Agent tab.

### 11.1 Notification Management Agent tab

The tab contains Agent Name, Mobile No., Search, Reset, a dynamically populated result table, message type, message text, and a Sent button. Agent Search sends a synchronous POST request to `/Configuration/SearchAgentData` using the typed agent name. The response table is rebuilt with a checkbox, agent name, and mobile number for each result. Selected rows are posted using `SelectedDealer[...]` fields, even though the tab is for agents.

`SearchAgentData` is not RTO-only. It concatenates:

- RTO agents where `RTO_Agent.Agent_Name == AgentName` unless the name is blank
- Insurance agents where `Insurance_Main.Agent_Name == AgentName` unless blank
- Loan agents where `Loan_Management.Bank_Person_Name == AgentName` unless blank

The name search is exact, not prefix-based, and blank name returns rows from all three sources. Results are not deduplicated in this method. The name autocomplete used before Search is different: `Autocomplete_Agent_Name` returns a distinct union of RTO, Insurance, and Loan agent/person names using prefix matching. After selecting a name, `Agent_Mobile_No` returns a distinct union of matching RTO/Insurance/Loan mobile numbers based on the selected name prefix.

The Agent tab's Sent action calls `/Configuration/SentSms_to_Dealer` with the agent form. The method loops over checked selected rows and prefixes the mobile with `91`, but the actual `Sent_Notification_To_customer` call is commented out and `isFlag` is never set true in the surviving code. Consequently, this path does not visibly dispatch the SMS through the reviewed implementation and normally returns the error result rather than a successful send. Message-template handling can still return a warning when an `OTHER` message type already exists.

The notification controller and configuration controller have controller-level `SessionExpireFilter`; the Notification Management page itself is protected by `Notification_Management`, while the agent JSON helper actions shown above do not have their own visible authorization attribute.

## 12. Validation And Constraints

Client-side Save validation:

- Agent Name is required because it has class `req`.
- Agent Mobile is required and cannot be blank or parse to numeric zero because it has `req num`.
- Agent Email is optional, but if nonblank it must pass the shared email-format check.
- The mobile field has a 13-character HTML maximum; the JavaScript numeric-key restrictions come from the shared validation script.

Server-side behavior:

- no agent-specific validation attribute or master-record existence check is visible
- no uniqueness rule exists for agent name, mobile, or email
- no normalization/trim/case standardization is performed before save
- search and autocomplete use different semantics: exact name search versus prefix name autocomplete

Database behavior:

- agent columns are nullable in the supplied RTO table definition
- agent values are stored as text on each RTO row
- no agent foreign key or unique constraint is visible

## 13. Edge Cases And Existing-System Drift

- A manually entered new agent value is saved only on the RTO row; it becomes an autocomplete candidate later because autocomplete reads RTO history.
- Selecting an autocomplete suggestion does not establish a stable agent ID relationship.
- Repeated RTO transactions can create duplicate autocomplete suggestions for the same name.
- The same agent name can have different mobile/email values in different RTO rows.
- Editing one RTO record changes only that row's agent snapshot, not other RTO rows.
- Clearing an autocomplete suggestion clears contact fields, but direct typing can still submit arbitrary values if Save validation passes.
- Search by agent name requires the exact stored text and does not search mobile or email.
- Dashboard/report outputs can show different contact details for what users consider the same agent because the data is row-level.
- Shared communication searches may return distinct contact combinations that are not unique agents.
- Configuration Notification Management searches across RTO, Insurance, and Loan agents; it is not an RTO-only agent directory.
- Notification agent-name autocomplete uses a distinct union and prefix matching, while notification Agent Search uses exact matching and does not deduplicate the combined result.
- The reviewed notification send path prefixes selected mobile numbers with `91`, but the actual SMS send call is commented out and the success flag is never set.
- The Inventory-to-RTO link passes an inventory ID, but the RTO open action ignores it; this does not provide agent prefill.

## 14. Faithful Rewrite Rules

Unless an approved change introduces a real agent master, a rewrite should preserve:

- agent data as fields on the RTO transaction
- autocomplete sourced from prior RTO rows
- prefix autocomplete and exact-name RTO search as separate behaviors
- manual entry of values absent from autocomplete
- no agent ID foreign-key binding from the autocomplete selection
- row-level update semantics
- agent values in RTO listing, export, dashboard, stock report, and shared communication consumers

If a normalized agent master is introduced, it is a functional/data-model change and must explicitly define migration, duplicate merging, historical snapshot behavior, and how existing free-text values map to master agents.

## 15. Test Checklist

- Agent Name, mobile, and email render on the RTO form.
- Agent Name and mobile are blocked when blank during main Save.
- Zero mobile is blocked by client validation.
- Optional valid/invalid email behavior is correct.
- Prefix autocomplete returns prior RTO agent rows and contact values.
- Duplicate names can produce duplicate suggestions, matching legacy behavior.
- A manually typed non-suggestion agent saves to `RTO_Agent`.
- Manual agent values do not create a master-table row.
- Editing one RTO changes only that row's agent fields.
- RTO search by agent name is exact and combines with other filters using AND.
- Agent mobile/email do not affect RTO search.
- Listing/export/dashboard/report outputs use the saved row-level values.
- Shared SMS/email RTO-agent lookup remains separate from the RTO page.
- Notification Management agent autocomplete/search combines RTO, Insurance, and Loan sources with the documented prefix/exact-match differences.
- Notification agent selection posts checked rows and preserves the existing `/Configuration/SentSms_to_Dealer` behavior, including the non-dispatch/commented-send condition.

## 16. SSOT Rule

This file is the SSOT for existing RTO-agent behavior. In the legacy system, an RTO agent is a denormalized contact snapshot stored on each RTO transaction, not a standalone master entity. Any implementation that introduces agent identity, uniqueness, foreign keys, or centralized agent CRUD is a documented business/data-model change.
