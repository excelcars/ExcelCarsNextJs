# SSOT - admin-operations Module
## Status: Draft

**Module:** `admin-operations`  
**Project:** ExcelCars  
**Depends On:** `module/ssot/05_SSOT_home-auth-session.md`, `module/ssot/05_SSOT_configuration-masters.md`

## 1. Purpose
This module owns the transactional operational workflows used by staff after login. It is the largest business module in the application and combines inventory, inquiry, follow-up, finance-adjacent, document, and outbound sharing flows.

It owns:
- inventory management
- inventory photo upload/delete and inventory email sharing
- inventory photo upload/delete helper endpoints and physical file persistence under `Fileupload/Inventory_Car_Photo`
- checklist/document tracking for vehicles
- inquiry capture, search, edit, delete, and inventory matching
- loan management and partial payment capture
- insurance management and partial payment capture
- RTO agent management and partial payment capture
- follow-up management and dashboard drill-through
- DSA management
- cross-module autocomplete helpers used by operational screens
- export-to-Excel actions for most operational screens

It does not own:
- login/session bootstrap
- user access master maintenance
- dealer/customer/feedback master maintenance
- reporting-only read models

Primary controller:
- `ExcelCars/Controllers/AdminController.cs`

Primary supporting model namespaces:
- `ApModel/Model/Inventory_Management`
- `ApModel/Model/CheckList_Document`
- `ApModel/Model/Inquiry`
- `ApModel/Model/Loan_Management`
- `ApModel/Model/Insurance_Management`
- `ApModel/Model/RTO_Agent_Management`
- `ApModel/Model/Followup_Management`
- `ApModel/Model/DSA_Management`
- `ApModel/Model/Common`

## 2. Locked v1 Scope
- all actions in this controller assume `Session["SessionInfo"]` exists
- most page actions are decorated with `[AuthorizeFilter(DatabaseFunctionname = "...")]`
- several JSON/autocomplete helper endpoints (e.g. `AutoCompleteModel`, `AutoComplete_Get_DSA_Details`, and other `AutoComplete*` helpers listed in Section 4) carry no per-action `[AuthorizeFilter]` at all; they are only covered by the class-level `[SessionExpireFilter]`, meaning any authenticated session (regardless of function-level access rights) can call them
- inventory flow supports:
  - open screen
  - save/update
  - duplicate registration check
  - search/delete
  - SKU generation
  - Excel export
  - dealer/customer lookup
  - photo upload/list/delete
  - dealer/customer email send
  - inquiry update from inventory screen
- checklist document flow supports:
  - open screen
  - registration autocomplete
  - save/update
  - search
  - detail fetch
  - delete
  - Excel export
- inquiry flow supports:
  - open screen
  - search
  - create/update
  - delete
  - export
  - car detail lookup
  - make/model/variant dependent lists
  - previous inquiry check
  - customer-targeted inventory email
- loan flow supports:
  - open screen
  - save/update
  - bank autocomplete
  - search/delete
  - partial payment
  - registration-based drill-in
  - export
- insurance flow supports:
  - open screen
  - save/update
  - agent autocomplete
  - search/detail/delete
  - partial payment
  - registration-based drill-in
  - export
- RTO flow supports:
  - open screen
  - save/update
  - agent autocomplete
  - search/delete
  - partial payment
  - registration-based drill-in
  - export
- follow-up flow supports:
  - open screen
  - search all follow-ups
  - update inquiry follow-up
  - fetch car/follow-up details by inquiry
  - dashboard drill-through
  - edit inquiry from follow-up context
  - export
- DSA flow supports:
  - open screen
  - save/update
  - autocomplete
  - **note: the DSA Management menu entry is commented out in `Views/Shared/Menu.cshtml` (same defect as Notification Management under Configuration) — the screen and controller actions work, but are only reachable via a direct URL, not through navigation**

Primary views directly owned:
- `Inventory_Management_View`
- `CheckList_Document_View`
- `InquiryManagement`
- `Loan_Management_View`
- `Insurance_Management`
- `RTO_Agent_Management_View`
- `Follow_Up_Management`
- `DSA_Management_View`

## 3. Data Ownership
This module spans multiple transactional tables via the `ApModel` classes. The controller itself does not define schema, but it is the orchestration boundary for these records:

Primary entity groups:
- inventory and inventory photos
- customer linkage on inventory
- inquiry main records and inquiry-car details
- checklist documents
- loan main/payment detail records
- insurance main/payment/follow-up records
- RTO main/payment records
- follow-up history records
- DSA master/transaction records

Observed generated artifacts and files:
- inventory image files under `Fileupload/Inventory_Car_Photo`
- email attachments and document files routed through model/helper utilities
- Excel export files generated through `Utility.GetExcel(...)`

Cross-module reference data used heavily:
- make/model/variant/color/fuel lookup sets
- dealer and customer autocomplete datasets
- registration-number based lookups

## 4. Interface Contracts
Shared helper endpoints:
- `AutoCompleteModel(term)`
- `AutoCompleteMake(term)`
- `Autocomplete_CustName_Inquiry(term)`
- `AutoCompleteVariant(term)`
- `AutoCompleteColour(term)`
- `AutoCompleteFuel_Type(term)`
- `AutoComplete_Owner_Type(term)`
- `AutoComplete_Owner_Name(term)`
- `AutoComplete_Owner_Mob(term)`
- `AutoComplete_Registration_NO(term)`
- `AutoCompleteRef_Website(term)`

Inventory contracts:
- `Inventory_Management()`
- `Save_Update_Inventory(objVM, UploadPhoto)`
- `Search_Inventory(objVM)`
- `Delete_Inventory(objVM)`
- `Get_SKU_Code(Make, Model, colour)`
- `ExportToExcel_Inventory_Details(objVM)`
- `AutoComplete_Get_Dealer_Details(term)`
- `AutoComplete_Get_Customer_Details(term)`
- `Search_Inquiry_View(Make, Model, Variant)`
- `UploadFiles_Inventory(InventoryNO)`
- `deleteDoc_Inventory(FileName)`
- `Get_Inventory_Photos(InventoryNo)`
- `Get_Dealer_For_Email(term)`
- `Send_Email_Inventory_Dealer(objVM)`
- `Update_Inquiry(...)`
- `Get_Customer_For_Email(...)`
- `Send_Email_Inventory_Customer(objVM)`

Checklist contracts:
- `CheckList_Document()`
- `AutoCompleteRegistration_NO(term)`
- `Save_Update_CheckList_Document(objVM)`
- `Search_Checklist_Doc(objVM)`
- `Get_Doc_Details(docid)`
- `Delete_DocumentChecklist(objVM)`
- `ExportToExcel_CheckList_Document_Details(objVM)`

Inquiry contracts:
- `InquiryManagement()`
- `SearchInquiry(viewModel)`
- `InsertUpdateInquiry(viewModel)`
- `DeleteInquiry(viewModel)`
- `Search_Inventory_View(Make, Model, Variant, Year)`
- `ExportToExcel_Inquiry_Details(objVM)`
- `Get_Car_Inquiry_Details(inquiryid)`
- `Get_Car_ModelList(MakeID)`
- `Get_Car_VariantList(MakeID, ModelID)`
- `Search_Inquired_Car_Details_for_Selected_Customer(CustomerName)`
- `Send_Email_Inventory_Customer_From_Inquiry(objVM)`
- `AutoComplete_Get_Customer_Details_FromInquiry(term)`
- `Check_Previous_Inquiry(MobileNo)`

Loan contracts:
- `Loan_Management()`
- `Save_Update_Loan(objVM)`
- `AutoComplete_Get_Loan_Bank_Details(term)`
- `Search_Loan_Management(objVM)`
- `Delete_LoanMangement(objVM)`
- `Save_Update_Partial_Payment(objVM)`
- `ExportToExcel_Loan_Details(objVM)`
- `Search_Loan_Management_By_Registration_No(car_registration_no)`

Insurance contracts:
- `Insurance_Management()`
- `Save_Update_Insurance(objVM)`
- `AutoComplete_InsuranceAgent_Details(term)`
- `Search_Insurance(objVM)`
- `Search_Insurance_Details(ID)`
- `Save_Update_Partial_Payment_Insurance(objVM)`
- `ExportToExcel_Insurance_Details(objVM)`
- `Delete_InsuranceMangement(objVM)`
- `Search_Insurance_By_Registration_No(car_registration_no)`

RTO contracts:
- `RTO_Agent_Management()`
- `Save_Update_RTOAgent(objVM)`
- `AutoComplete_RTOAgent_Details(term)`
- `Search_RTO(objVM)`
- `Save_Update_Partial_Payment_RTO(objVM)`
- `ExportToExcel_RTO_Details(objVM)`
- `Delete_RTOMangement(objVM)`
- `Search_RTO_By_Registration_No(car_registration_no)`

Follow-up contracts:
- `Follow_Up_Management()`
- `Search_All_Followup(objvm)`
- `Insert_Update_Followup(objvm)`
- `Get_Car_Details(inquiryid)`
- `Get_Followup_Details(inquiryid)`
- `Get_Followup_From_Dashboard(condition, Type_of_Count)`
- `Edit_Edit_Search_Inquiry_From_Followup(InquiryId)`
- `ExportToExcel_Followup_Details(objvm)`

DSA contracts:
- `DSA_Management()`
- `Save_Update_DSA(objVM)`
- `AutoComplete_Get_DSA_Details(term)`

Shared file-helper contracts used by operational screens:
- `UploadFiles(orderno, FormName)`
- `deleteDoc(FileName, FolderName)`

## 5. Business Rules
- every operational screen gates on `Session["SessionInfo"]`; missing session redirects to `Home/Logout`
- duplicate checks are performed before insert for several modules, especially inventory, dealer-linked lookups, and DSA/loan-style masters
- controller success/failure messaging is standardized through `TempData["msg"]` and `TempData["msgType"]`
- most save flows use the same pattern:
  - call model insert/update
  - inspect `Is_Save_Success`
  - log `error` when present
  - return success, warning, or error status to the same view
- many modules support search-by-registration-number drill-in as a primary workflow anchor
- export actions generally rerun the same search method and then project anonymous objects into `Utility.GetExcel(...)`
- file uploads are saved into physical web folders with generated numeric prefixes derived from current table maxima plus `TempData["ImageCount"]`
- operational emails are triggered directly from model methods rather than a separate messaging service boundary
- checklist save rejects registration numbers that are not sold or not present in the system before duplicate-check logic runs
- first-time inquiry creation can auto-send matching inventory email content through `Send_Email_of_Inventory_Customer_For_First_Save()`

## 6. Integration And Side Effects
- direct dependency on transactional model classes in `ApModel`
- direct dependency on `CommonFor_Model_Color_Variant` for many autocomplete/reference datasets
- direct dependency on physical server storage for uploaded files
- direct dependency on `Utility.GetExcel(...)` for exports
- direct dependency on model-layer email send methods for dealer/customer communication
- exception side effects route through `Exceptioncatch.create(ex)`

## 7. Audit Requirements
Observed audit-related behavior:
- exception paths are logged through `Exceptioncatch.create`
- record create/update/delete timestamps and user IDs are often handled inside model classes rather than the controller

Missing but implied audit needs:
- file upload/delete operations are not visibly audited at controller level
- email send outcomes are surfaced to UI but not visibly stored as durable message logs at controller level
- authorization denials are not explicitly recorded here
- calls to the un-authorized-filtered autocomplete/JSON helper endpoints (see Section 2) are not recorded, and no function-level access check gates them

## 8. Tests Required
- sessionless request to each protected page redirects out correctly
- duplicate inventory registration is blocked
- successful inventory create sets success message and new ID
- inventory photo upload stores files under the expected folder
- checklist save/search/delete round trip works
- inquiry create/update/delete and prior-inquiry check work together
- loan, insurance, and RTO partial payment flows update balances correctly
- follow-up update changes latest inquiry follow-up state
- dashboard follow-up drill-through returns filtered follow-up data
- all export actions produce non-empty Excel output when search returns rows
