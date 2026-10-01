# SSOT - Exception Logging Report (Legacy)

## Status: Legacy ASP.NET MVC behavior captured from source

**Module:** `Report/ExceptionLogging`  
**Project:** `ExcelCars` legacy ASP.NET MVC  
**Primary route:** `GET /Report/ExceptionLogging`  
**Source of truth:**
- `ExcelCars/Controllers/ReportController.cs`
- `ExcelCars/Views/Report/ExceptionLogging.cshtml`
- `ExcelCars/ViewModel/ExceptionLoggingReportViewModel.cs`
- `ApModel/Model/Exception_Logging/ExceptionLogging.cs`
- `ApModel/Model/Exception/Exceptioncatch.cs`
- `ExcelCars/Views/Shared/Menu.cshtml`
- `ExcelCars/Views/Report/Reports_Menu_View.cshtml`
- `ExcelCars/App_Start/AuthorizeFilter.cs`

## 1. Purpose and scope

This is a read-only diagnostic report over the `Exception_Logging` table. It lets a user select one calendar date and, optionally, the logged user, then displays matching application-exception records. The report neither creates, edits, acknowledges, deletes, exports, nor drills into exception records.

Exception rows are generally written elsewhere in the legacy application by `Exceptioncatch.create(Exception)`. That helper records request URL and IP address, session/user context (or a `tempuser` fallback), exception source/message/error information, and audit timestamps. The report is only a reader of those persisted rows.

## 2. Entry points and authorization

The shared Reports dropdown exposes **Exception Logging Report** only if the session function list contains `System_Exception_Report`; the Reports landing page exposes **System Exception Report** with the same condition. Both navigate to `/Report/ExceptionLogging`.

| Action | Invocation | Behavior |
| --- | --- | --- |
| `ExceptionLogging` | GET; also the Reset form post | Instantiates a fresh view model, loads the user dropdown, defaults the date to `DateTime.Now`, and renders an empty result list. It does not query logs. |
| `GetExceptionInfo` | POST from Search | Runs the exception query using the posted date and optional user, adds the standard no-record warning for an empty list, and re-renders the same view. |

Both actions carry `[AuthorizeFilter(DatabaseFunctionname = "System_Exception_Report")]`. However, the only code in `AuthorizeFilter` that consults `DatabaseFunctionname` and `SessionInfo.AppFunctionList` is commented out. Its active override only redirects an authorization failure to `Home/UnotherisedPage`; effective enforcement therefore falls back to the base MVC authorization behavior rather than the declared database-function permission. `GetExceptionInfo` additionally checks `Session["SessionInfo"]`, but if it is absent it still returns the view with the posted model rather than redirecting. The initial action has no explicit session check.

## 3. Initial state, inputs, and form workflow

The view-model constructor creates `ExceptionLogin`, whose constructor assigns `LoginDate = DateTime.Now`; loads `UsernameList`; and starts `ResultSet` empty. The initial screen therefore shows today in the text field, the user selector, Search, and Reset, but no table.

| Visible control | Posted field | Behavior |
| --- | --- | --- |
| Login Date | `ExceptionLogin.LoginDate` | Required-marked text input, rendered as `dd-MM-yyyy`. BeatPicker displays/selects it with slash separators and includes Today/Clear modules. Its configured disabling rule prevents dates before 1 Jan 1753. There is no server-side model validation or visible client validation. |
| UserName | `ExceptionLogin.UserId` | Dropdown headed `SELECT`. An empty selected value binds to the integer default (`0`) under normal MVC binding, which means all users. |
| Search | n/a | JavaScript changes the shared form action to `/Report/GetExceptionInfo`, then submits the complete form as POST. |
| Reset | n/a | JavaScript changes the action to `/Report/ExceptionLogging`, then submits. The action ignores posted values by creating a new model, restoring today and clearing results. |

The labels mark both fields mandatory and the page explains `* = mandatory, # = searchable field`, but neither control has a `#` marker and the source contains no search validation, date-required validation, date parsing recovery, or user-required validation. The form has no export, sort, pagination, row action, text search, or date-range control.

## 4. User selector data

`GetUserName()` queries every `User_Table` record and projects only `User_Name` and `User_ID`. It applies no status filter, role filter, current-user restriction, or explicit ordering. The selected option is preserved after a posted search when its id equals the model's `UserId`.

## 5. Query, data ownership, and date semantics

`GetExceptionInfo(ExceptionLogging exceptionLogging)` creates a new Entity Framework context and queries `Exception_Logging`. It:

1. computes `beforedate = LoginDate.AddDays(-1) + 23:59:59`;
2. computes `afterdate = LoginDate.AddDays(1) + 00:00:00`;
3. filters `Exception_Logging.DateTime >= beforedate && DateTime <= afterdate`;
4. adds `login.User_ID == UserId` only when `UserId != 0`;
5. orders records by `Create_Dt` descending; and
6. projects Code, Error, Message, Source, URL, User_Name, and DateTime into one `ExceptionResult` per persisted exception row.

This is not a clean “selected calendar day” predicate. If the posted `LoginDate` is midnight (the expected date-only picker value), it includes from **23:59:59 on the prior day through 00:00:00 on the following day**, inclusive. If model binding preserves a time component, both boundaries retain it after the `AddDays` operations. The one-second/endpoint behavior is an executable legacy quirk, not an inferred product rule.

The query does not join `User_Table`; displayed user data is the denormalized `Exception_Logging.User_Name` stored when the exception was written. Its sort key is `Create_Dt`, while its displayed date is `DateTime`. It has no page limit, no total count, and no explicit null handling; `Convert.ToDateTime(item.DateTime)` can fail for a null database value.

## 6. Table contract

The table is rendered only when `ResultSet.Count > 0`. It numbers rows starting at one and shows these eight columns, in order:

| Column | Data |
| --- | --- |
| Sr. No. | View-generated one-based sequence |
| User Name | stored `User_Name` |
| Login Date | stored `DateTime`, rendered using default Razor `DateTime` formatting |
| URL | stored request URL |
| Code | stored exception source/code |
| Message | stored exception message |
| Error | stored stack trace or inner-exception string |
| Source | stored target-site string |

Although its id is `tablesorter-demo`, this view does not initialize a sorting plugin or provide clickable sort controls. Long error/message/URL values are output directly without truncation, and there is no details view. `Session_ID`, `User_ID`, `IPAddress`, audit ids, and audit timestamps are stored on the underlying row but are not rendered.

## 7. Exception-write behavior relevant to this report

`Exceptioncatch.create` is the legacy helper used by many catch blocks. On invocation it creates `Exception_Logging` and stores:

- request `RawUrl`, `UserHostAddress`, and ASP.NET session id;
- authenticated session user id/name and creator/updater ids, or id `99999999` and name `tempuser` if `SessionInfo` is unavailable;
- `ex.TargetSite.ToString()` as `Source`, `ex.Source` as `Code`, `ex.Message` as `Message`;
- `ex.InnerException.ToString()` as `Error` when present, otherwise `ex.StackTrace.ToString()`; and
- `DateTime`, `Create_Dt`, and `Update_Dt` as current server time, followed by `SaveChanges()`.

The report exposes only a subset of that data. It does not itself call this helper and its search action has no try/catch, so query/binding/database exceptions are not captured by this report action through `Exceptioncatch.create`.

## 8. Error and edge behavior

- An empty successful search sets `TempData["msg"]` to `Messages.Record_Not_found` and message type Warning; the shared layout is responsible for showing it.
- Search has no catch block. Binding, conversion, and database failures follow the normal MVC error path.
- GET and Reset show no no-record notice because they do not query.
- Empty/malformed date and user values are left to MVC model binding; the source does not establish a reliable validation response.
- No `User_Table` rows produces a selector containing only `SELECT`.
- There is no server-side authorization implementation tied to the attribute's declared `System_Exception_Report` value because that logic is commented out.

## 9. Legacy invariants for a compatible replacement

A parity implementation must consciously decide whether to preserve or replace:

- the `System_Exception_Report` entitlement and menu visibility;
- a blank initial state followed by explicit Search;
- the all-user selector from every legacy user record;
- the precise, anomalous selected-date query window and `Create_Dt DESC` order;
- filtering by stored exception `User_ID` while displaying stored `User_Name`; and
- visibility of URL, Error, and Source along with the other report fields.

## 10. Tests required

- report navigation visibility and direct-route authorization behavior for the legacy entitlement;
- initial load and Reset have today selected and no query results;
- Search sends the selected date/user and an unselected user returns all users;
- query boundary tests capture the prior-day `23:59:59` through next-day endpoint behavior;
- sort is by `Create_Dt DESC`, not displayed `DateTime`;
- all eight table columns map to the documented stored fields;
- no-result warning is raised;
- null `DateTime`, malformed posted values, and database failures have an intentional replacement behavior; and
- exception-writer field capture/fallback behavior is retained or explicitly superseded.

## 11. SSOT rule

This document records executable legacy behavior, including authorization and date-window defects. It is not a recommendation to retain those defects. Deliberate differences belong in the Next.js SSOT and `exception_improvement.md` until approved.
