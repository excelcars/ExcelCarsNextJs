# SSOT - Admin InquiryManagement Module
## Status: Legacy .NET MVC implemented; extracted from existing codebase

**Module:** `Admin/InquiryManagement`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Source of truth for this document:** `D:\projects\ExcelCars\ExcelCars\Controllers\AdminController.cs`, `D:\projects\ExcelCars\ExcelCars\Views\Admin\InquiryManagement.cshtml`, `D:\projects\ExcelCars\ExcelCars\ViewModel\Inquiry_ViewModel.cs`, `D:\projects\ExcelCars\ApModel\Model\Inquiry\Inquiry.cs`

## 1. Purpose
This module manages customer inquiries in the legacy admin panel.

It owns:
- inquiry creation, update, deletion, and search
- inquiry-level customer capture and customer master upsert
- inquiry workflow fields including classification, status, sub-status, follow-up date, visited date, and remark
- one-to-many inquiry car-interest capture through `Inquiry_Car_Details`
- inquiry-side inventory matching for available vehicles
- inquiry-triggered customer email sending for selected/matched inventory vehicles
- inquiry export to Excel

It does not own:
- inventory master ownership
- inventory photo ownership
- follow-up management screens outside this module
- authentication/session ownership
- shared layout/navigation ownership

## 2. Locked Legacy Scope
- the page is available through `AdminController.InquiryManagement()`
- all operations require session presence and the legacy authorization filter with `DatabaseFunctionname = "Inquiry_Management"`
- the same Razor page handles create, edit, search, delete, export, inventory match, and email-send flows
- one inquiry can contain multiple vehicle-interest rows in `Inquiry.lst_Inquiry_Details`
- customer autocomplete is sourced from inquiry-linked customer records
- source website autocomplete is supported
- make/model/variant selection supports:
  - dropdown master values
  - `OTHER` fallback text entry
- inventory match search supports:
  - make
  - model
  - variant
  - year
- follow-up record creation is conditional on follow-up date presence
- first-save email behavior is best-effort after successful inquiry save when selected cars are checked and email exists

## 3. Data Ownership

Primary tables touched directly by this module:
- `Inquiries`
- `Inquiry_Car_Details`
- `Customers`
- `Followup_Inquiry`
- `Car_Make_Master`
- `Car_Model_Master`
- `Car_Variant_Master`
- `Inventory_Management` (read for matching and email payload)
- `Inventory_Photos` (read for email attachments)

Minimum `Inquiries` fields used by this module:
- `Inquiry_Id`
- `Inquiry_No`
- `Date_of_Inquiry`
- `WebSite`
- `Customer_ID`
- `Customer`
- `MobileNo`
- `Email`
- `Budget_of_Customer`
- `Visited_Date_of_Customer`
- `Classification`
- `Status`
- `Sub_Status`
- `Follow_Up_Date`
- `Remark`
- `Created_Dt`
- `Created_By`
- `Updated_Dt`
- `Updated_By`

Minimum `Inquiry_Car_Details` fields used by this module:
- `Inquiry_Car_Details_ID`
- `FK_Inquiry_Id`
- `Make`
- `Model`
- `Variant`
- `Sub_Variant`
- `Year`
- `Created_Dt`
- `Created_By`
- `Updated_Dt`
- `Updated_By`

Minimum `Customers` fields used by this module:
- `Cust_Id`
- `Type`
- `Cust_Name`
- `Cust_Mobile`
- `Cust_Email`
- `Cust_DOB`
- `Cust_Anniversary_Dt`
- `Created_Dt`
- `Created_By`
- `Updated_Dt`
- `Updated_By`

Minimum `Followup_Inquiry` fields used by this module:
- `FK_Inquiry_Id`
- `Followup_Date`
- `Followup_Status`
- `Followup_Sub_Status`
- `Comments`
- `Followup_Classification`
- `Created_Dt`
- `Created_By`
- `Updated_Dt`
- `Updated_By`

Master-data side effects caused by inquiry save:
- missing `Make_Details` values are inserted into `Car_Make_Master`
- missing `Model_Details` values are inserted into `Car_Model_Master`
- missing `Variant_Details` values are inserted into `Car_Variant_Master`

## 4. Interface Contracts

Required controller actions:
- `InquiryManagement()`
- `SearchInquiry(Inquiry_ViewModel Inquiry_ViewModel)`
- `InsertUpdateInquiry(Inquiry_ViewModel Inquiry_ViewModel)`
- `DeleteInquiry(Inquiry_ViewModel Inquiry_ViewModel)`
- `ExportToExcel_Inquiry_Details(Inquiry_ViewModel objVM)`
- `Search_Inventory_View(string Make, string Model, string Variant, string Year)`
- `Get_Car_Inquiry_Details(int inquiryid)`
- `Get_Car_ModelList(int MakeID)`
- `Get_Car_VariantList(int MakeID, int ModelID)`
- `Search_Inquired_Car_Details_for_Selected_Customer(string CustomerName)`
- `Send_Email_Inventory_Customer_From_Inquiry(Inquiry_ViewModel objVM)`
- `AutoComplete_Get_Customer_Details_FromInquiry(string term)`
- `Check_Previous_Inquiry(string MobileNo)`

Required model/service methods:
- `Inquiry.Search(Inquiry Inquiry)`
- `Inquiry.InsertUpdateInqiury()`
- `Inquiry.DeleteInquiry(int InquiryId)`
- `Inquiry.Get_Inventory_Details(string make, string model, string variant, string year)`
- `Inquiry.Get_Inquiry_Car_Details(int inquiryid)`
- `Inquiry.Get_Inquired_Car_Details_for_Selected_Customer(string customername)`
- `Inquiry.Get_CustomerDetails_From_Inquiry(string term)`
- `Inquiry.Check_if_Customer_Already_Made_Inquiry(string MobileNo)`
- `Inquiry.Send_Email_of_Inventory_Customer_For_First_Save()`
- `Inquiry.Send_Email_of_Inventory_Customer_FromInquiry()`

Required UI behaviors from the Razor page:
- load inquiry form with generated inquiry number and current date
- search inquiries from the same page
- edit an inquiry by loading hidden row values back into the form
- manage multiple car-interest rows client-side in `tbl_CarDetails`
- dynamically load model list from make
- dynamically load variant list from make/model
- search matching inventory into `tblview`
- search customer-specific inquired inventory into `tbl_SendEmail`
- select one or more inventory rows for email sending
- export current inquiry search result to Excel

## 5. Business Rules
- session is mandatory for all meaningful module operations
- authorization is enforced through the legacy `AuthorizeFilter`
- new inquiry page load constructs a fresh `Inquiry_ViewModel`, which initializes:
  - new `Inquiry`
  - classification list
  - status list
  - sub-status list
  - next inquiry number
  - make/model/variant dropdown sources
- `Sub_Status = "OTHER"` is normalized to `Other_Sub_Status` before save
- customer master upsert happens inside inquiry save:
  - lookup key is `Cust_Name + Cust_Mobile`
  - existing record is updated
  - missing record is inserted
  - saved customer id is written back into inquiry
- inquiry main record is inserted when `InquiryId == 0`, otherwise updated
- inquiry car details are fully replaced on save:
  - existing `Inquiry_Car_Details` rows for the inquiry are deleted
  - current client-posted rows are reinserted
- follow-up is written only when `Follow_Up_Date != null`
- each save with follow-up date creates a new `Followup_Inquiry` row; there is no active deduplication in the current code path
- master make/model/variant tables are extended automatically from posted inquiry car details when values do not already exist
- duplicate inquiry check for the UI is based on mobile number existing in `Inquiries`
- role-based list filtering exists in `Inquiry.Search()`:
  - when session role id is `4`, only inquiries created by the logged-in user are returned
- search filters supported in `Inquiry.Search()`:
  - customer
  - mobile number
  - status
  - make
  - model
  - variant
  - year
  - budget from
  - budget to
- make/model/variant search input from dropdown ids is translated back to master text before matching inquiry car detail rows
- inventory matching only returns vehicles where `Inventory_Management.Status != "Sold"`
- save validation in the page requires:
  - form validation to pass
  - at least one car-detail row
  - follow-up date when status is `FollowUp`

## 6. Email Integration
Two email paths exist:
- `Send_Email_of_Inventory_Customer_For_First_Save()`
- `Send_Email_of_Inventory_Customer_FromInquiry()`

First-save email behavior:
- runs only after successful insert when controller detects `id == 0`
- only considers `Inquiry.lst_Inquiry_Details` rows where `chk_car == true`
- only runs when inquiry email exists
- finds matching in-stock vehicles in `Inventory_Management` by make/model/variant
- sends vehicle details email to the inquiry customer

Manual send-from-inquiry behavior:
- uses `inv_dltList` selected from the customer inventory popup grid
- only runs when inquiry email exists
- loads selected `Inventory_Management` rows where status is `In Stock`
- attaches related `Inventory_Photos` files when present
- sends one email payload per selected vehicle

Email-side rules:
- email sending reads from inquiry/customer/inventory/photo data only
- email sending does not create `Customer` rows
- email sending does not create `Followup_Inquiry` rows
- email failures are not part of the transaction that saves the inquiry main data

## 7. Data Relationships
- one `Customer` can be linked to many `Inquiries`
- one `Inquiry` belongs to one `Customer` through `Customer_ID`
- one `Inquiry` can have many `Inquiry_Car_Details`
- one `Inquiry` can have many `Followup_Inquiry` rows over time
- one inquiry car-detail row represents one requested vehicle preference, not one concrete inventory stock unit
- inquiry inventory match is indirect:
  - inquiry car preferences are compared against `Inventory_Management`
  - no persistent inquiry-to-inventory link table is created by this module
- email sending can reference many inventory vehicles from one inquiry, but this relation is transient in the module flow

## 8. Export and Reporting
- `ExportToExcel_Inquiry_Details` exports the current inquiry search result
- exported columns include:
  - `Date_of_Inquiry`
  - `Inquiry_No`
  - `WebSite`
  - `Customer`
  - `MobileNo`
  - `Email`
  - `Model`
  - `Variant`
  - `Sub_Variant`
  - `Year`
  - `Budget_of_Customer`
  - `Visited_Date_of_Customer`
  - `Classification`
  - `Status`
  - `Sub_Status`
  - `Follow_Up_Date`
  - `Remark`

## 9. Known Legacy Constraints
- the screen mixes multiple concerns:
  - inquiry capture
  - customer upsert
  - follow-up creation
  - inventory lookup
  - inventory email dispatch
- the page is heavily dependent on inline jQuery and client-built table rows
- inquiry car details are not updated incrementally; they are delete-and-reinsert on every save
- follow-up rows are append-style and can duplicate logically similar events
- customer lookup uses name + mobile rather than a stronger canonical identity rule
- inquiry inventory relation is not normalized as a stored link
- the UI supports multiple desired vehicles per inquiry, but the inventory form in the Next.js app is vehicle-centric

## 10. Tests Required
- inquiry page requires valid session and `Inquiry_Management` authorization
- save inserts a customer when `Cust_Name + Cust_Mobile` does not already exist
- save updates an existing customer when `Cust_Name + Cust_Mobile` already exists
- save inserts inquiry main record for new inquiry
- save updates inquiry main record for existing inquiry
- save replaces prior inquiry car-detail rows with posted rows
- save inserts follow-up row when follow-up date is present
- save does not insert follow-up row when follow-up date is absent
- save enforces at least one inquiry car-detail row
- save enforces follow-up date when status is `FollowUp`
- role id `4` inquiry search is restricted to creator-owned records
- duplicate inquiry check returns true when mobile exists in `Inquiries`
- inventory match excludes sold vehicles
- first-save email attempts only for new inquiry with checked car rows and email present
- manual send-from-inquiry email attempts only for selected in-stock inventory rows
- delete inquiry removes:
  - `Inquiries` row
  - related `Inquiry_Car_Details` rows
  - related `Followup_Inquiry` rows

## 11. SSOT Rule
Any migration or rewrite of legacy `Admin/InquiryManagement` must preserve these legacy business behaviors unless an explicit replacement rule is approved:
- one inquiry can represent multiple vehicle interests
- inquiry save upserts customer data
- inquiry save can append follow-up history
- inquiry workflow and inventory email flows are coupled on the same legacy screen
- inventory matching is read-only lookup, not a persisted inquiry-to-inventory association
