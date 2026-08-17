# SSOT - configuration-masters Module
## Status: Draft

**Module:** `configuration-masters`  
**Project:** ExcelCars  
**Depends On:** `module/ssot/05_SSOT_home-auth-session.md`

## 1. Purpose
This module owns the configuration and master-data screens used to maintain access, parties, templates, and outbound communication setup data for the application.

It owns:
- user access management
- dealer master maintenance
- customer master maintenance
- feedback management
- SMS/email send workflow
- notification management and message-template selection helpers
- attachment upload/delete for outbound email screens, including physical file persistence under `Fileupload/Email_Attachment`

It does not own:
- login/session bootstrap
- inventory/inquiry/loan/insurance/RTO/follow-up transactions
- report-only views

Primary controller:
- `ExcelCars/Controllers/ConfigurationController.cs`

Primary supporting model namespaces:
- `ApModel/Model/UserAccessManagement`
- `ApModel/Model/Dealer_Management`
- `ApModel/Model/Customer`
- `ApModel/Model/Feedback_Management`
- `ApModel/Model/SMS_Email_Send_MSG`
- `ApModel/Model/NotificationManagement`
- `ApModel/Model/Common`

## 2. Locked v1 Scope
- configuration landing menu is exposed through `Configuration_Manu()`
- user access management supports:
  - open
  - save/update
  - search
  - delete
  - edit
- dealer management supports:
  - open
  - save/update
  - search
  - delete
  - name/mobile autocomplete
  - export
- customer management supports:
  - open
  - save/update
  - search
  - delete
  - name/mobile/company autocomplete
  - export
- feedback management supports:
  - open
  - registration autocomplete
  - save/update
  - search
  - delete
  - export
- SMS/email module supports:
  - open
  - receiver name/mobile/email autocomplete
  - message subject/body autocomplete
  - receiver search
  - send SMS/email
  - email-attachment upload
- notification management supports:
  - open
  - customer/dealer/agent autocomplete
  - message template lookup
  - customer/dealer/agent mobile lookups
  - JSON-based SMS send handlers
  - JSON-based customer/dealer/agent search handlers
  - message template update view return

Primary views directly owned:
- `Configuration_Menu`
- `UserAccessManagement`
- `Dealer_Management`
- `Customer_Management_View`
- `Feedback_Management`
- `SMS_Email_Send_Msg`
- `NotificationManagement`

## 3. Data Ownership
This module coordinates several master and communications-oriented records.

Primary entity groups:
- user access / role-assignment records
- dealer records
- customer records
- feedback records
- message type and message body lookup records
- SMS/email send recipient and attachment records
- notification recipient search result sets

File-system assets owned by this module:
- email attachments under `Fileupload/Email_Attachment`

Common reference datasets:
- customer, dealer, agent autocomplete values
- message subject/body templates
- registration-number-based feedback lookups

## 4. Interface Contracts
Configuration menu:
- `Configuration_Manu()`

User access contracts:
- `UserAccessManagement()`
- `SaveUserAccess(viewModel)`
- `SearchUserAccess(viewModel)`
- `DeleteUserAccess(viewModel)`
- `EditUserAccess(viewModel)`

Dealer contracts:
- `Dealer_Management()`
- `Save_Update_Dealer(objVM)`
- `Search_Dealer(objVM)`
- `Delete_Dealer(objVM)`
- `Autocomplete_Dealer_Name(term)`
- `Autocomplete_Dealer_Mobile(term)`
- `ExportToExcel_Dealer_Details(objVM)`

Customer contracts:
- `CustomerManagement()`
- `Save_Update_Customer(objVM)`
- `Search_Customer(objVM)`
- `ExportToExcel_Customer_Details(objVM)`
- `Autocomplete_Customer_Name_CustomerMaster(term)`
- `Autocomplete_Customer_Mobile(term)`
- `Delete_Customer(objVM)`
- `Autocomplete_Company_Name_CustomerMaster(term)`

Feedback contracts:
- `Feedback_Management()`
- `Autocomplete_Car_Registration(id)`
- `Save_Update_FeedBack(objVM)`
- `Search_Feedback(objVM)`
- `ExportToExcel_Feedback_Details(objVM)`
- `Delete_Feedback(objVM)`

SMS/email contracts:
- `SMS_Email_Send_Message()`
- `Autocomplete_Receiver_Name(term, Receivertype)`
- `Autocomplete_Receiver_Mobile(term, Receivertype)`
- `Autocomplete_Receiver_Email(term, Receivertype)`
- `Autocomplete_Message_Sub_Body(Msg_Type, term)`
- `Search_Receiver_Info(objvm)`
- `Send_SMS_Email_To_Receivers(objvm)`
- `UploadFiles_Email()`
- `deleteDoc_Email(FileName)`

Notification contracts:
- `NotificationManagement()`
- `Autocomplete_Customer_Name(term)`
- `Autocomplete_Dealer_Name_Master(term)`
- `Autocomplete_Agent_Name(term)`
- `GetMessage(MessageType)`
- `Customer_Mobile_No(Customer)`
- `Dealer_Mobile_No(Dealer)`
- `Agent_Mobile_No(Agent)`
- `SentSms_to_Customer(viewModel)`
- `SentSms_to_Dealer(viewModel)`
- `SearchCustomerData(customername)`
- `SearchDealerData(DealerName)`
- `SearchAgentData(AgentName)`
- `UpdateMessageTemplate(viewModel)`

Shared file-helper contracts used by configuration screens:
- `UploadFiles(FormName)`
- `deleteDoc(FileName, FolderName)`

## 5. Business Rules
- all major page actions expect a live `Session["SessionInfo"]`
- duplicate prevention exists for multiple master screens before inserts
- create/update/delete outcomes are surfaced through `TempData["msg"]` and `TempData["msgType"]`
- export actions rerun searches and then flatten records into Excel helper payloads
- file upload names are prefixed numerically using current database max values plus a temp counter
- notification send methods currently return JSON status strings like `Success`, `Warning`, or `Error`
- `SentSms_to_Customer` and `SentSms_to_Dealer` can never return `Success` in the current codebase: the actual send calls (`Sent_Notification_To_customer`, `Sent_Notification_On_PhoneNo`) are commented out inside these methods, so `isFlag` is never set to `true`; every call resolves to `Error` (or `Warning` when a duplicate message type is detected). This is not a partial/best-effort stub — outbound SMS send is fully disabled for these two entry points
- `NotificationManagement()` exists as a controller/view surface, but the shared navigation currently comments out the direct "Notification Management" menu link while still exposing the "Send SMS Email" entry under `Notification_Management`

## 6. Integration And Side Effects
- depends on shared autocomplete/reference helper `CommonFor_Model_Color_Variant`
- depends on `Utility.GetExcel(...)` for master exports
- depends on model-layer email/SMS helpers for outbound communication
- writes files to `~/Fileupload/Email_Attachment`
- logs exceptions via `Exceptioncatch.create(ex)`

## 7. Audit Requirements
Observed audit-related behavior:
- exception paths are logged centrally
- model-layer methods likely own created/updated metadata on master records

Missing but implied audit needs:
- message send attempts and delivery results are not clearly persisted at controller level
- attachment upload/delete history is not explicitly audited here
- message template edits are not visibly versioned in the controller layer

## 8. Tests Required
- user access search/save/delete/edit round trip works
- dealer duplicate checks block repeated inserts
- customer autocomplete endpoints return master data quickly and correctly
- feedback registration lookup populates the expected screen state
- SMS/email receiver search returns target records by receiver type
- attachment upload stores files in the correct folder
- notification message lookup returns the configured template/body
- customer/dealer/agent notification JSON flows return the correct alert type for success/error/warning paths
