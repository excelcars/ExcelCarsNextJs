# Staging (UAT) database inventory

Captured: 2026-10-23T05:42:49.994Z (UTC), Friday, 23 October 2026 at 11:12:49 am IST.

Source: .env.staging.local DATABASE_URL (credentials omitted).

Scope: public schema metadata, extension inventory, and selected PostgreSQL settings. Captured in a repeatable-read, read-only transaction. No application records were read or changed. Row estimates are PostgreSQL statistics, not exact counts. Sequence definitions are compared; sequence current values are intentionally omitted. Roles, grants, other schemas, Neon compute configuration, and Vercel deployment settings are outside this catalog snapshot.

## Counts

| Object | Count |
| --- | --- |
| tables | 62 |
| columns | 711 |
| indexes | 171 |
| constraints | 206 |
| sequences | 57 |
| enums | 0 |
| views | 0 |
| triggers | 0 |
| routines | 36 |
| policies | 0 |
| extensions | 2 |
| migrations | 32 |
| settings | 9 |

## Tables and storage estimates

| Table | Kind | Estimated rows | Total bytes (including indexes) | RLS | Forced RLS |
| --- | --- | --- | --- | --- | --- |
| _prisma_migrations | r | -1 | 32768 | false | false |
| access_function | r | 22 | 32768 | false | false |
| access_function_role | r | 106 | 57344 | false | false |
| add_employee | r | 2 | 32768 | false | false |
| car_make_master | r | 227 | 65536 | false | false |
| car_model_master | r | 607 | 131072 | false | false |
| car_variant_master | r | 2331 | 393216 | false | false |
| check_list_doc_main | r | -1 | 65536 | false | false |
| checklist_doc_details | r | 68 | 90112 | false | false |
| customer | r | 54974 | 7806976 | false | false |
| customer_feedback | r | 67 | 106496 | false | false |
| dealer_master | r | 143 | 65536 | false | false |
| dsa_management | r | -1 | 40960 | false | false |
| email_attachment | r | 15 | 49152 | false | false |
| email_delivery_log | r | -1 | 65536 | false | false |
| exception_logging | r | -1 | 16384 | false | false |
| feedback_invitation | r | -1 | 65536 | false | false |
| followup_inquiry | r | 509700 | 105603072 | false | false |
| forgot_password | r | -1 | 16384 | false | false |
| indian_states_master | r | 36 | 49152 | false | false |
| inquiry | r | 53518 | 39706624 | false | false |
| inquiry_activity_log | r | 113 | 163840 | false | false |
| inquiry_car_details | r | 70273 | 11452416 | false | false |
| inquiry_email_history | r | -1 | 81920 | false | false |
| inquiry_inventory_email_log | r | -1 | 65536 | false | false |
| inquiry_inventory_links | r | -1 | 81920 | false | false |
| inquiry_location_master | r | -1 | 81920 | false | false |
| inquiry_no_inventory_notification_log | r | 26 | 65536 | false | false |
| inquiry_portal_assignments | r | -1 | 32768 | false | false |
| inquiry_source_master | r | 35 | 81920 | false | false |
| insurance_followup_details | r | 51 | 49152 | false | false |
| insurance_main | r | 36 | 131072 | false | false |
| insurance_payment_details | r | 52 | 49152 | false | false |
| insurance_reminder_attempt | r | -1 | 49152 | false | false |
| insurance_reminder_delivery | r | 21 | 139264 | false | false |
| inventory_documents | r | -1 | 49152 | false | false |
| inventory_management | r | 89 | 147456 | false | false |
| inventory_photos | r | 727 | 262144 | false | false |
| inventory_sku_counters | r | -1 | 32768 | false | false |
| inventory_videos | r | -1 | 65536 | false | false |
| legacy_inquiry_source_mapping | r | 177 | 106496 | false | false |
| loan_followup_details | r | -1 | 49152 | false | false |
| loan_management | r | -1 | 65536 | false | false |
| loan_payment_details | r | -1 | 49152 | false | false |
| message_attachment_upload | r | -1 | 32768 | false | false |
| message_template | r | 13 | 32768 | false | false |
| partner_master | r | 7 | 32768 | false | false |
| partner_webhook_leads | r | -1 | 40960 | false | false |
| partner_webhook_payloads | r | -1 | 40960 | false | false |
| role_access_audit | r | -1 | 81920 | false | false |
| role_master | r | 4 | 32768 | false | false |
| rto_agent | r | 40 | 131072 | false | false |
| rto_followup_details | r | 65 | 49152 | false | false |
| rto_payment_details | r | 55 | 49152 | false | false |
| system_default | r | 6 | 32768 | false | false |
| user_notifications | r | 242 | 196608 | false | false |
| user_table | r | 7 | 81920 | false | false |
| vehicle_email_link_interactions | r | -1 | 65536 | false | false |
| vehicle_email_link_visits | r | 52 | 81920 | false | false |
| vehicle_email_links | r | 56 | 147456 | false | false |
| whatsapp_delivery_log | r | -1 | 81920 | false | false |
| whatsapp_message_draft | r | -1 | 16384 | false | false |

## Complete column, index, and constraint inventory

### _prisma_migrations

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | id | character varying(36) | NO | — | NEVER / NO |
| 2 | checksum | character varying(64) | NO | — | NEVER / NO |
| 3 | finished_at | timestamp with time zone | YES | — | NEVER / NO |
| 4 | migration_name | character varying(255) | NO | — | NEVER / NO |
| 5 | logs | text | YES | — | NEVER / NO |
| 6 | rolled_back_at | timestamp with time zone | YES | — | NEVER / NO |
| 7 | started_at | timestamp with time zone | NO | now() | NEVER / NO |
| 8 | applied_steps_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |

Indexes:

- _prisma_migrations_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX _prisma_migrations_pkey ON public._prisma_migrations USING btree (id);
```

Constraints:

- _prisma_migrations_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (id)
```

### access_function

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | access_function_id | integer [precision 32, scale 0] | NO | nextval('access_function_access_function_id_seq'::regclass) | NEVER / NO |
| 2 | access_function_name | text | YES | — | NEVER / NO |
| 3 | role_id_legacy | text | YES | — | NEVER / NO |
| 4 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 5 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 7 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16391_pk_access_function; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16391_pk_access_function ON public.access_function USING btree (access_function_id);
```

Constraints:

- fk_access_function_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_access_function_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16391_pk_access_function; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (access_function_id)
```

### access_function_role

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | access_function_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 2 | role_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |

Indexes:

- idx_16397_pk_access_function_role; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16397_pk_access_function_role ON public.access_function_role USING btree (access_function_id, role_id);
```

Constraints:

- fk_afr_function; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (access_function_id) REFERENCES access_function(access_function_id)
```

- fk_afr_role; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (role_id) REFERENCES role_master(role_id)
```

- idx_16397_pk_access_function_role; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (access_function_id, role_id)
```

### add_employee

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | emp_id | integer [precision 32, scale 0] | NO | nextval('add_employee_emp_id_seq'::regclass) | NEVER / NO |
| 2 | emp_first_name | text | YES | — | NEVER / NO |
| 3 | emp_last_name | text | YES | — | NEVER / NO |
| 4 | emp_gender | text | YES | — | NEVER / NO |
| 5 | emp_address | text | YES | — | NEVER / NO |
| 6 | emp_city | text | YES | — | NEVER / NO |
| 7 | emp_state_legacy | text | YES | — | NEVER / NO |
| 8 | emp_pincode | text | YES | — | NEVER / NO |
| 9 | emp_mobile_no | text | YES | — | NEVER / NO |
| 10 | emp_phone_no | text | YES | — | NEVER / NO |
| 11 | emp_email_id | text | YES | — | NEVER / NO |
| 12 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 13 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 14 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 15 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 16 | fk_state_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16401_pk_add_employee; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16401_pk_add_employee ON public.add_employee USING btree (emp_id);
```

Constraints:

- fk_add_employee_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_add_employee_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_addemployee_state; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_state_id) REFERENCES indian_states_master(state_id)
```

- idx_16401_pk_add_employee; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (emp_id)
```

### car_make_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | pk_make_id | integer [precision 32, scale 0] | NO | nextval('car_make_master_pk_make_id_seq'::regclass) | NEVER / NO |
| 2 | make | text | YES | — | NEVER / NO |
| 3 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 4 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 5 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16408_pk_make; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16408_pk_make ON public.car_make_master USING btree (pk_make_id);
```

Constraints:

- fk_car_make_master_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_car_make_master_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16408_pk_make; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (pk_make_id)
```

### car_model_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | pk_model_id | integer [precision 32, scale 0] | NO | nextval('car_model_master_pk_model_id_seq'::regclass) | NEVER / NO |
| 2 | fk_make_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | model | text | YES | — | NEVER / NO |
| 4 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 5 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 6 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16415_ix_car_model_master_fk_make_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16415_ix_car_model_master_fk_make_id ON public.car_model_master USING btree (fk_make_id);
```

- idx_16415_pk_car_model_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16415_pk_car_model_master ON public.car_model_master USING btree (pk_model_id);
```

Constraints:

- fk_car_model_master_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_car_model_master_fk_make_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_make_id) REFERENCES car_make_master(pk_make_id)
```

- fk_car_model_master_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16415_pk_car_model_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (pk_model_id)
```

### car_variant_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | pk_variant_id | integer [precision 32, scale 0] | NO | nextval('car_variant_master_pk_variant_id_seq'::regclass) | NEVER / NO |
| 2 | fk_make_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | fk_model_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 4 | variant | text | YES | — | NEVER / NO |
| 5 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 7 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16422_ix_car_variant_master_fk_make_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16422_ix_car_variant_master_fk_make_id ON public.car_variant_master USING btree (fk_make_id);
```

- idx_16422_ix_car_variant_master_fk_model_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16422_ix_car_variant_master_fk_model_id ON public.car_variant_master USING btree (fk_model_id);
```

- idx_16422_pk_car_variant_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16422_pk_car_variant_master ON public.car_variant_master USING btree (pk_variant_id);
```

Constraints:

- fk_car_variant_master_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_car_variant_master_fk_make_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_make_id) REFERENCES car_make_master(pk_make_id)
```

- fk_car_variant_master_fk_model_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_model_id) REFERENCES car_model_master(pk_model_id)
```

- fk_car_variant_master_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16422_pk_car_variant_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (pk_variant_id)
```

### check_list_doc_main

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | document_id | integer [precision 32, scale 0] | NO | nextval('check_list_doc_main_document_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | make | text | YES | — | NEVER / NO |
| 4 | model | text | YES | — | NEVER / NO |
| 5 | variant | text | YES | — | NEVER / NO |
| 6 | colour | text | YES | — | NEVER / NO |
| 7 | registration_no | text | YES | — | NEVER / NO |
| 8 | year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 9 | fuel_type | text | YES | — | NEVER / NO |
| 10 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 11 | customer_name_legacy | text | YES | — | NEVER / NO |
| 12 | customer_mobile_legacy | text | YES | — | NEVER / NO |
| 13 | customer_email_legacy | text | YES | — | NEVER / NO |
| 14 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 15 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 16 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 17 | updated_date | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16429_ix_check_list_doc_main_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16429_ix_check_list_doc_main_customer_id ON public.check_list_doc_main USING btree (customer_id);
```

- idx_16429_ix_check_list_doc_main_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16429_ix_check_list_doc_main_inventory_id ON public.check_list_doc_main USING btree (inventory_id);
```

- idx_16429_pk_check_list_documents; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16429_pk_check_list_documents ON public.check_list_doc_main USING btree (document_id);
```

Constraints:

- fk_check_list_doc_main_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_check_list_doc_main_inventory_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- idx_16429_pk_check_list_documents; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (document_id)
```

### checklist_doc_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | checklist_details_id | integer [precision 32, scale 0] | NO | nextval('checklist_doc_details_checklist_details_id_seq'::regclass) | NEVER / NO |
| 2 | fk_document_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | document_name | text | YES | — | NEVER / NO |
| 4 | applicable | text | YES | — | NEVER / NO |
| 5 | received | text | YES | — | NEVER / NO |
| 6 | original_copy | text | YES | — | NEVER / NO |
| 7 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 9 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16436_ix_checklist_doc_details_fk_document_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16436_ix_checklist_doc_details_fk_document_id ON public.checklist_doc_details USING btree (fk_document_id);
```

- idx_16436_pk_checklist_doc_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16436_pk_checklist_doc_details ON public.checklist_doc_details USING btree (checklist_details_id);
```

Constraints:

- fk_checklist_doc_details_fk_document_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_document_id) REFERENCES check_list_doc_main(document_id)
```

- idx_16436_pk_checklist_doc_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (checklist_details_id)
```

### customer

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | cust_id | integer [precision 32, scale 0] | NO | nextval('customer_cust_id_seq'::regclass) | NEVER / NO |
| 2 | type | text | YES | — | NEVER / NO |
| 3 | cust_name | text | NO | — | NEVER / NO |
| 4 | cust_address | text | YES | — | NEVER / NO |
| 5 | cust_mobile | text | YES | — | NEVER / NO |
| 6 | mobile_2 | text | YES | — | NEVER / NO |
| 7 | cust_email | text | YES | — | NEVER / NO |
| 8 | cust_dob | timestamp with time zone | YES | — | NEVER / NO |
| 9 | cust_anniversary_dt | timestamp with time zone | YES | — | NEVER / NO |
| 10 | comments | text | YES | — | NEVER / NO |
| 11 | company_name | text | YES | — | NEVER / NO |
| 12 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 13 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 14 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 15 | updated_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 16 | fk_state_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16443_pk_customer; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16443_pk_customer ON public.customer USING btree (cust_id);
```

Constraints:

- fk_customer_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_customer_state; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_state_id) REFERENCES indian_states_master(state_id)
```

- fk_customer_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16443_pk_customer; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (cust_id)
```

### customer_feedback

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | feedback_id | integer [precision 32, scale 0] | NO | nextval('customer_feedback_feedback_id_seq'::regclass) | NEVER / NO |
| 2 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | customer_name | text | YES | — | NEVER / NO |
| 4 | customer_mob | text | YES | — | NEVER / NO |
| 5 | customer_email | text | YES | — | NEVER / NO |
| 6 | customer_dob | timestamp with time zone | YES | — | NEVER / NO |
| 7 | customer_anniversary_dt | timestamp with time zone | YES | — | NEVER / NO |
| 8 | car_make_legacy | text | YES | — | NEVER / NO |
| 9 | car_model_legacy | text | YES | — | NEVER / NO |
| 10 | car_variant_legacy | text | YES | — | NEVER / NO |
| 11 | car_year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | car_registration_no | text | YES | — | NEVER / NO |
| 13 | answer_1 | text | YES | — | NEVER / NO |
| 14 | answer_2 | text | YES | — | NEVER / NO |
| 15 | answer_3 | text | YES | — | NEVER / NO |
| 16 | answer_4 | text | YES | — | NEVER / NO |
| 17 | answer_5 | text | YES | — | NEVER / NO |
| 18 | comments | text | YES | — | NEVER / NO |
| 19 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 20 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 21 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 22 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 23 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 24 | submitted_at | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16450_ix_customer_feedback_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16450_ix_customer_feedback_customer_id ON public.customer_feedback USING btree (customer_id);
```

- idx_16450_ix_customer_feedback_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16450_ix_customer_feedback_variant ON public.customer_feedback USING btree (fk_variant_id);
```

- idx_16450_pk_customer_feedback; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16450_pk_customer_feedback ON public.customer_feedback USING btree (feedback_id);
```

Constraints:

- fk_customer_feedback_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_customer_feedback_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_customer_feedback_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_customer_feedback_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16450_pk_customer_feedback; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (feedback_id)
```

### dealer_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | dealer_id | integer [precision 32, scale 0] | NO | nextval('dealer_master_dealer_id_seq'::regclass) | NEVER / NO |
| 2 | dealer_name | text | YES | — | NEVER / NO |
| 3 | dealer_mobile_no | text | YES | — | NEVER / NO |
| 4 | dealer_mobile_no_2 | text | YES | — | NEVER / NO |
| 5 | dealer_email | text | YES | — | NEVER / NO |
| 6 | dealer_address | text | YES | — | NEVER / NO |
| 7 | dealer_company_name | text | YES | — | NEVER / NO |
| 8 | dealer_website | text | YES | — | NEVER / NO |
| 9 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 11 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | updated_date | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16457_pk_dealer_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16457_pk_dealer_master ON public.dealer_master USING btree (dealer_id);
```

Constraints:

- fk_dealer_master_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_dealer_master_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16457_pk_dealer_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (dealer_id)
```

### dsa_management

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | dsa_main_id | integer [precision 32, scale 0] | NO | nextval('dsa_management_dsa_main_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | dsa_agent_name | text | YES | — | NEVER / NO |
| 4 | dsa_agent_mobile_no | text | YES | — | NEVER / NO |
| 5 | dsa_agent_email | text | YES | — | NEVER / NO |
| 6 | dsa_entry_date | timestamp with time zone | YES | — | NEVER / NO |
| 7 | dsa_bank_name | text | YES | — | NEVER / NO |
| 8 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 9 | customer_name_legacy | text | YES | — | NEVER / NO |
| 10 | car_model_legacy | text | YES | — | NEVER / NO |
| 11 | car_registration_no | text | YES | — | NEVER / NO |
| 12 | loan_amount | numeric | YES | — | NEVER / NO |
| 13 | percentage_of_payout | numeric | YES | — | NEVER / NO |
| 14 | payout_amount | numeric | YES | — | NEVER / NO |
| 15 | payment_status | text | YES | — | NEVER / NO |
| 16 | amount_paid | numeric | YES | — | NEVER / NO |
| 17 | remark | text | YES | — | NEVER / NO |
| 18 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 19 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 20 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 21 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 22 | fk_partner_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 23 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16464_ix_dsa_management_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16464_ix_dsa_management_customer_id ON public.dsa_management USING btree (customer_id);
```

- idx_16464_ix_dsa_management_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16464_ix_dsa_management_inventory_id ON public.dsa_management USING btree (inventory_id);
```

- idx_16464_pk_dsa_management; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16464_pk_dsa_management ON public.dsa_management USING btree (dsa_main_id);
```

- ix_dsa_management_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_dsa_management_variant ON public.dsa_management USING btree (fk_variant_id);
```

Constraints:

- fk_dsa_management_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_dsa_management_inventory_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- fk_dsa_management_partner; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_partner_id) REFERENCES partner_master(partner_id)
```

- fk_dsa_management_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16464_pk_dsa_management; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (dsa_main_id)
```

### email_attachment

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | attachment_id | integer [precision 32, scale 0] | NO | nextval('email_attachment_attachment_id_seq'::regclass) | NEVER / NO |
| 2 | fk_type_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | path | text | YES | — | NEVER / NO |
| 4 | message | text | YES | — | NEVER / NO |

Indexes:

- idx_16471_ix_email_attachment_type; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16471_ix_email_attachment_type ON public.email_attachment USING btree (fk_type_id);
```

- idx_16471_pk_email_attachment; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16471_pk_email_attachment ON public.email_attachment USING btree (attachment_id);
```

Constraints:

- fk_email_attachment_type; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_type_id) REFERENCES message_template(type_id)
```

- idx_16471_pk_email_attachment; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (attachment_id)
```

### email_delivery_log

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | delivery_log_id | integer [precision 32, scale 0] | NO | nextval('email_delivery_log_delivery_log_id_seq'::regclass) | NEVER / NO |
| 2 | template_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | recipient_email | text | NO | — | NEVER / NO |
| 4 | status | text | NO | — | NEVER / NO |
| 5 | error_message | text | YES | — | NEVER / NO |
| 6 | attachment_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 7 | attempted_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 8 | attempted_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 9 | retry_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 10 | next_retry_at | timestamp with time zone | YES | — | NEVER / NO |
| 11 | email_subject | text | NO | — | NEVER / NO |
| 12 | email_html | text | NO | — | NEVER / NO |
| 13 | attachment_json | text | YES | — | NEVER / NO |

Indexes:

- email_delivery_log_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX email_delivery_log_pkey ON public.email_delivery_log USING btree (delivery_log_id);
```

- ix_email_delivery_log_template_attempted; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_email_delivery_log_template_attempted ON public.email_delivery_log USING btree (template_id, attempted_at);
```

- ix_email_delivery_log_user_attempted; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_email_delivery_log_user_attempted ON public.email_delivery_log USING btree (attempted_by, attempted_at);
```

Constraints:

- email_delivery_log_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (delivery_log_id)
```

- fk_email_delivery_log_template; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (template_id) REFERENCES message_template(type_id) ON DELETE CASCADE
```

- fk_email_delivery_log_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (attempted_by) REFERENCES user_table(user_id)
```

### exception_logging

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | loggins_id | integer [precision 32, scale 0] | NO | nextval('exception_logging_loggins_id_seq'::regclass) | NEVER / NO |
| 2 | session_id | text | NO | — | NEVER / NO |
| 3 | user_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | user_name | text | YES | — | NEVER / NO |
| 5 | url | text | YES | — | NEVER / NO |
| 6 | code | text | YES | — | NEVER / NO |
| 7 | message | text | YES | — | NEVER / NO |
| 8 | error | text | YES | — | NEVER / NO |
| 9 | datetime | timestamp with time zone | YES | — | NEVER / NO |
| 10 | source | text | YES | — | NEVER / NO |
| 11 | ipaddress | text | YES | — | NEVER / NO |
| 12 | create_dt | timestamp with time zone | NO | — | NEVER / NO |
| 13 | created_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 14 | update_dt | timestamp with time zone | NO | — | NEVER / NO |
| 15 | update_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |

Indexes:

- idx_16478_pk_loggin; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16478_pk_loggin ON public.exception_logging USING btree (loggins_id);
```

Constraints:

- idx_16478_pk_loggin; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (loggins_id)
```

### feedback_invitation

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | feedback_invitation_id | integer [precision 32, scale 0] | NO | nextval('feedback_invitation_feedback_invitation_id_seq'::regclass) | NEVER / NO |
| 2 | customer_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | recipient_email | text | NO | — | NEVER / NO |
| 5 | token_hash | text | NO | — | NEVER / NO |
| 6 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 7 | expires_at | timestamp with time zone | NO | — | NEVER / NO |
| 8 | submitted_at | timestamp with time zone | YES | — | NEVER / NO |
| 9 | invalidated_at | timestamp with time zone | YES | — | NEVER / NO |
| 10 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- feedback_invitation_customer_id_inventory_id_idx; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX feedback_invitation_customer_id_inventory_id_idx ON public.feedback_invitation USING btree (customer_id, inventory_id);
```

- feedback_invitation_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX feedback_invitation_pkey ON public.feedback_invitation USING btree (feedback_invitation_id);
```

- feedback_invitation_token_hash_key; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX feedback_invitation_token_hash_key ON public.feedback_invitation USING btree (token_hash);
```

Constraints:

- feedback_invitation_customer_id_fkey; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id) ON UPDATE CASCADE
```

- feedback_invitation_inventory_id_fkey; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id) ON UPDATE CASCADE
```

- feedback_invitation_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (feedback_invitation_id)
```

### followup_inquiry

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | pk_followup_id | integer [precision 32, scale 0] | NO | nextval('followup_inquiry_pk_followup_id_seq'::regclass) | NEVER / NO |
| 2 | fk_inquiry_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 4 | followup_status | text | YES | — | NEVER / NO |
| 5 | followup_sub_status | text | YES | — | NEVER / NO |
| 6 | comments | text | YES | — | NEVER / NO |
| 7 | followup_classification | text | YES | — | NEVER / NO |
| 8 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 9 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 11 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | contact_outcome | text | YES | — | NEVER / NO |

Indexes:

- idx_16485_pk_followup_inquiry; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16485_pk_followup_inquiry ON public.followup_inquiry USING btree (pk_followup_id);
```

- ix_followup_inquiry_inquiry; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_followup_inquiry_inquiry ON public.followup_inquiry USING btree (fk_inquiry_id);
```

Constraints:

- ck_followup_classification; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((followup_classification = ANY (ARRAY['Cold'::text, 'Warm'::text, 'Hot'::text])) OR (followup_classification IS NULL)))
```

- ck_followup_status; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((followup_status = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])) OR (followup_status IS NULL)))
```

- fk_followup_inquiry_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_followup_inquiry_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_inquiry_id) REFERENCES inquiry(inquiry_id)
```

- fk_followup_inquiry_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16485_pk_followup_inquiry; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (pk_followup_id)
```

### forgot_password

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | forgot_password_id | integer [precision 32, scale 0] | NO | nextval('forgot_password_forgot_password_id_seq'::regclass) | NEVER / NO |
| 2 | verification_code | text | YES | — | NEVER / NO |
| 3 | email_address | text | YES | — | NEVER / NO |
| 4 | active_fl | boolean | YES | — | NEVER / NO |
| 5 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 7 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16492_pk_forgot_password; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16492_pk_forgot_password ON public.forgot_password USING btree (forgot_password_id);
```

Constraints:

- idx_16492_pk_forgot_password; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (forgot_password_id)
```

### indian_states_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | statename | text | NO | — | NEVER / NO |
| 2 | state_id | integer [precision 32, scale 0] | NO | nextval('indian_states_master_state_id_seq'::regclass) | NEVER / NO |

Indexes:

- idx_16499_pk_indian_states_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16499_pk_indian_states_master ON public.indian_states_master USING btree (state_id);
```

- idx_16499_uq_indian_states_master_name; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16499_uq_indian_states_master_name ON public.indian_states_master USING btree (statename);
```

Constraints:

- idx_16499_pk_indian_states_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (state_id)
```

### inquiry

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_id | integer [precision 32, scale 0] | NO | nextval('inquiry_inquiry_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_no | text | YES | — | NEVER / NO |
| 3 | date_of_inquiry | timestamp with time zone | YES | — | NEVER / NO |
| 4 | website | text | YES | — | NEVER / NO |
| 5 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | customer_name_legacy | text | YES | — | NEVER / NO |
| 7 | mobileno | text | YES | — | NEVER / NO |
| 8 | email | text | YES | — | NEVER / NO |
| 9 | budget_of_customer | numeric | YES | — | NEVER / NO |
| 10 | visited_date_of_customer | timestamp with time zone | YES | — | NEVER / NO |
| 11 | classification | text | YES | — | NEVER / NO |
| 12 | status | text | YES | — | NEVER / NO |
| 13 | sub_status | text | YES | — | NEVER / NO |
| 14 | follow_up_date | timestamp with time zone | YES | — | NEVER / NO |
| 15 | remark | text | YES | — | NEVER / NO |
| 16 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 17 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 18 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 19 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 20 | source_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 21 | source_detail | text | YES | — | NEVER / NO |
| 22 | assigned_to | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 23 | location | text | YES | — | NEVER / NO |
| 24 | location_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16506_ix_inquiry_assigned_to; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16506_ix_inquiry_assigned_to ON public.inquiry USING btree (assigned_to);
```

- idx_16506_ix_inquiry_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16506_ix_inquiry_customer_id ON public.inquiry USING btree (customer_id);
```

- idx_16506_pk_inquiry; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16506_pk_inquiry ON public.inquiry USING btree (inquiry_id);
```

- idx_16506_uq_inquiry_inquiry_no; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16506_uq_inquiry_inquiry_no ON public.inquiry USING btree (inquiry_no) WHERE (inquiry_no IS NOT NULL);
```

- idx_inquiry_date_of_inquiry; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_date_of_inquiry ON public.inquiry USING btree (date_of_inquiry);
```

- idx_inquiry_location_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_location_id ON public.inquiry USING btree (location_id);
```

- idx_inquiry_source_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_source_id ON public.inquiry USING btree (source_id);
```

- idx_inquiry_status_followup_date; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_status_followup_date ON public.inquiry USING btree (status, follow_up_date);
```

Constraints:

- ck_inquiry_classification; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((classification = ANY (ARRAY['Warm'::text, 'Hot'::text, 'Cold'::text])) OR (classification IS NULL)))
```

- ck_inquiry_status; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((status = ANY (ARRAY['Open'::text, 'FollowUp'::text, 'Closed'::text])) OR (status IS NULL)))
```

- fk_inquiry_assigned_to_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (assigned_to) REFERENCES user_table(user_id)
```

- fk_inquiry_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_inquiry_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_inquiry_location_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (location_id) REFERENCES inquiry_location_master(location_id) ON DELETE SET NULL
```

- fk_inquiry_source_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (source_id) REFERENCES inquiry_source_master(source_id)
```

- fk_inquiry_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16506_pk_inquiry; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_id)
```

### inquiry_activity_log

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_activity_log_id | integer [precision 32, scale 0] | NO | nextval('inquiry_activity_log_inquiry_activity_log_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | event_type | text | NO | — | NEVER / NO |
| 4 | event_label | text | YES | — | NEVER / NO |
| 5 | event_detail | text | YES | — | NEVER / NO |
| 6 | actor_user_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | actor_user_name | text | YES | — | NEVER / NO |
| 8 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 9 | followup_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | inquiry_car_details_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 11 | created_at | timestamp with time zone | NO | now() | NEVER / NO |

Indexes:

- inquiry_activity_log_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inquiry_activity_log_pkey ON public.inquiry_activity_log USING btree (inquiry_activity_log_id);
```

- ix_inquiry_activity_log_actor_user_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_activity_log_actor_user_id ON public.inquiry_activity_log USING btree (actor_user_id, created_at);
```

- ix_inquiry_activity_log_event_type; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_activity_log_event_type ON public.inquiry_activity_log USING btree (event_type);
```

- ix_inquiry_activity_log_followup_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_activity_log_followup_id ON public.inquiry_activity_log USING btree (followup_id);
```

- ix_inquiry_activity_log_inquiry_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_activity_log_inquiry_id ON public.inquiry_activity_log USING btree (inquiry_id, created_at);
```

- ix_inquiry_activity_log_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_activity_log_inventory_id ON public.inquiry_activity_log USING btree (inventory_id);
```

Constraints:

- inquiry_activity_log_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_activity_log_id)
```

### inquiry_car_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_car_details_id | integer [precision 32, scale 0] | NO | nextval('inquiry_car_details_inquiry_car_details_id_seq'::regclass) | NEVER / NO |
| 2 | fk_inquiry_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | make_legacy | text | YES | — | NEVER / NO |
| 4 | model_legacy | text | YES | — | NEVER / NO |
| 5 | variant_legacy | text | YES | — | NEVER / NO |
| 6 | sub_variant | text | YES | — | NEVER / NO |
| 7 | year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 9 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 11 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 13 | no_of_owners | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16513_ix_inquiry_car_details_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16513_ix_inquiry_car_details_variant ON public.inquiry_car_details USING btree (fk_variant_id);
```

- idx_16513_pk_inquiry_car_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16513_pk_inquiry_car_details ON public.inquiry_car_details USING btree (inquiry_car_details_id);
```

- ix_inquiry_car_details_inquiry; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_car_details_inquiry ON public.inquiry_car_details USING btree (fk_inquiry_id);
```

Constraints:

- fk_inquiry_car_details_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_inquiry_car_details_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_inquiry_id) REFERENCES inquiry(inquiry_id)
```

- fk_inquiry_car_details_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_inquiry_car_details_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16513_pk_inquiry_car_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_car_details_id)
```

### inquiry_email_history

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_email_history_id | integer [precision 32, scale 0] | NO | nextval('inquiry_email_history_inquiry_email_history_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 4 | email_type | text | NO | — | NEVER / NO |
| 5 | recipient_email | text | NO | — | NEVER / NO |
| 6 | recipient_name | text | YES | — | NEVER / NO |
| 7 | email_subject | text | NO | — | NEVER / NO |
| 8 | delivery_status | text | NO | — | NEVER / NO |
| 9 | error_message | text | YES | — | NEVER / NO |
| 10 | sent_at | timestamp with time zone | YES | — | NEVER / NO |
| 11 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 12 | attempted_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_inquiry_email_history_attempted_by_created_at; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_email_history_attempted_by_created_at ON public.inquiry_email_history USING btree (attempted_by, created_at);
```

- idx_inquiry_email_history_inquiry_created_at; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_email_history_inquiry_created_at ON public.inquiry_email_history USING btree (inquiry_id, created_at);
```

- idx_inquiry_email_history_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_email_history_inventory_id ON public.inquiry_email_history USING btree (inventory_id);
```

- idx_inquiry_email_history_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_inquiry_email_history_pk ON public.inquiry_email_history USING btree (inquiry_email_history_id);
```

Constraints:

- fk_inquiry_email_history_attempted_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (attempted_by) REFERENCES user_table(user_id)
```

- fk_inquiry_email_history_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE CASCADE
```

- fk_inquiry_email_history_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- idx_inquiry_email_history_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_email_history_id)
```

### inquiry_inventory_email_log

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_inventory_email_log_id | integer [precision 32, scale 0] | NO | nextval('inquiry_inventory_email_log_inquiry_inventory_email_log_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | recipient_email | text | NO | — | NEVER / NO |
| 5 | status | text | NO | — | NEVER / NO |
| 6 | error_message | text | YES | — | NEVER / NO |
| 7 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 8 | attempted_at | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- inquiry_inventory_email_log_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inquiry_inventory_email_log_pkey ON public.inquiry_inventory_email_log USING btree (inquiry_inventory_email_log_id);
```

- ix_inquiry_inventory_email_log_inquiry_created; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_inventory_email_log_inquiry_created ON public.inquiry_inventory_email_log USING btree (inquiry_id, created_at);
```

- uq_inquiry_inventory_email_log_inquiry_inventory; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_inventory_email_log_inquiry_inventory ON public.inquiry_inventory_email_log USING btree (inquiry_id, inventory_id);
```

Constraints:

- fk_inquiry_inventory_email_log_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE CASCADE
```

- fk_inquiry_inventory_email_log_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- inquiry_inventory_email_log_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_inventory_email_log_id)
```

### inquiry_inventory_links

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_inventory_link_id | integer [precision 32, scale 0] | NO | nextval('inquiry_inventory_links_inquiry_inventory_link_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | link_type | text | NO | — | NEVER / NO |
| 5 | is_active | boolean | NO | true | NEVER / NO |
| 6 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 7 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 9 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_inquiry_inventory_links_inquiry_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_inventory_links_inquiry_id ON public.inquiry_inventory_links USING btree (inquiry_id);
```

- idx_inquiry_inventory_links_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_inventory_links_inventory_id ON public.inquiry_inventory_links USING btree (inventory_id);
```

- idx_inquiry_inventory_links_lookup; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_inventory_links_lookup ON public.inquiry_inventory_links USING btree (inquiry_id, inventory_id, link_type);
```

- idx_inquiry_inventory_links_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_inquiry_inventory_links_pk ON public.inquiry_inventory_links USING btree (inquiry_inventory_link_id);
```

Constraints:

- fk_inquiry_inventory_links_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_inquiry_inventory_links_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE CASCADE
```

- fk_inquiry_inventory_links_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- fk_inquiry_inventory_links_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_inquiry_inventory_links_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_inventory_link_id)
```

### inquiry_location_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | location_id | integer [precision 32, scale 0] | NO | nextval('inquiry_location_master_location_id_seq'::regclass) | NEVER / NO |
| 2 | display_name | text | NO | — | NEVER / NO |
| 3 | region | text | NO | — | NEVER / NO |
| 4 | is_active | boolean | NO | true | NEVER / NO |
| 5 | reporting_sort | integer [precision 32, scale 0] | NO | 999 | NEVER / NO |
| 6 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 7 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- idx_inquiry_location_master_active_sort; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_location_master_active_sort ON public.inquiry_location_master USING btree (is_active, reporting_sort);
```

- idx_inquiry_location_master_region; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_location_master_region ON public.inquiry_location_master USING btree (region);
```

- inquiry_location_master_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inquiry_location_master_pkey ON public.inquiry_location_master USING btree (location_id);
```

- uq_inquiry_location_master_display_name; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_location_master_display_name ON public.inquiry_location_master USING btree (display_name);
```

Constraints:

- inquiry_location_master_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (location_id)
```

### inquiry_no_inventory_notification_log

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_no_inventory_notification_log_id | integer [precision 32, scale 0] | NO | nextval('inquiry_no_inventory_notifica_inquiry_no_inventory_notifica_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | channel | text | NO | — | NEVER / NO |
| 4 | recipient | text | NO | — | NEVER / NO |
| 5 | template_name | text | YES | — | NEVER / NO |
| 6 | status | text | NO | — | NEVER / NO |
| 7 | error_message | text | YES | — | NEVER / NO |
| 8 | provider_message_id | text | YES | — | NEVER / NO |
| 9 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 10 | attempted_at | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- inquiry_no_inventory_notification_log_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inquiry_no_inventory_notification_log_pkey ON public.inquiry_no_inventory_notification_log USING btree (inquiry_no_inventory_notification_log_id);
```

- ix_inquiry_no_inventory_notification_log_inquiry_created; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inquiry_no_inventory_notification_log_inquiry_created ON public.inquiry_no_inventory_notification_log USING btree (inquiry_id, created_at);
```

- uq_inquiry_no_inventory_notification_log_inquiry_channel; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_no_inventory_notification_log_inquiry_channel ON public.inquiry_no_inventory_notification_log USING btree (inquiry_id, channel);
```

Constraints:

- fk_inquiry_no_inventory_notification_log_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE CASCADE
```

- inquiry_no_inventory_notification_log_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_no_inventory_notification_log_id)
```

### inquiry_portal_assignments

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inquiry_portal_assignment_id | integer [precision 32, scale 0] | NO | nextval('inquiry_portal_assignments_inquiry_portal_assignment_id_seq'::regclass) | NEVER / NO |
| 2 | source_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | assigned_to_user_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | is_active | boolean | NO | true | NEVER / NO |
| 5 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 6 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 8 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_inquiry_portal_assignment_active; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_portal_assignment_active ON public.inquiry_portal_assignments USING btree (is_active);
```

- idx_inquiry_portal_assignment_assignee; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_portal_assignment_assignee ON public.inquiry_portal_assignments USING btree (assigned_to_user_id);
```

- inquiry_portal_assignments_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inquiry_portal_assignments_pkey ON public.inquiry_portal_assignments USING btree (inquiry_portal_assignment_id);
```

- uq_inquiry_portal_assignment_source; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_portal_assignment_source ON public.inquiry_portal_assignments USING btree (source_id);
```

Constraints:

- fk_inquiry_portal_assignment_assignee; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (assigned_to_user_id) REFERENCES user_table(user_id)
```

- fk_inquiry_portal_assignment_created_by; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_inquiry_portal_assignment_source; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (source_id) REFERENCES inquiry_source_master(source_id) ON DELETE CASCADE
```

- fk_inquiry_portal_assignment_updated_by; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- inquiry_portal_assignments_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inquiry_portal_assignment_id)
```

### inquiry_source_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | source_id | integer [precision 32, scale 0] | NO | nextval('inquiry_source_master_source_id_seq'::regclass) | NEVER / NO |
| 2 | code | text | NO | — | NEVER / NO |
| 3 | display_name | text | NO | — | NEVER / NO |
| 4 | category | text | NO | — | NEVER / NO |
| 5 | requires_detail | boolean | NO | false | NEVER / NO |
| 6 | is_active | boolean | NO | true | NEVER / NO |
| 7 | reporting_sort | integer [precision 32, scale 0] | NO | 999 | NEVER / NO |
| 8 | created_at | timestamp with time zone | NO | now() | NEVER / NO |
| 9 | updated_at | timestamp with time zone | NO | now() | NEVER / NO |

Indexes:

- idx_inquiry_source_master_active_sort; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_inquiry_source_master_active_sort ON public.inquiry_source_master USING btree (is_active, reporting_sort);
```

- pk_inquiry_source_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX pk_inquiry_source_master ON public.inquiry_source_master USING btree (source_id);
```

- uq_inquiry_source_master_code; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_source_master_code ON public.inquiry_source_master USING btree (code);
```

- uq_inquiry_source_master_display_name; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_inquiry_source_master_display_name ON public.inquiry_source_master USING btree (display_name);
```

Constraints:

- pk_inquiry_source_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (source_id)
```

- uq_inquiry_source_master_code; type=u; validated=true; deferrable=false; initially deferred=false.

```sql
UNIQUE (code)
```

- uq_inquiry_source_master_display_name; type=u; validated=true; deferrable=false; initially deferred=false.

```sql
UNIQUE (display_name)
```

### insurance_followup_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | insurance_followup_id | integer [precision 32, scale 0] | NO | nextval('insurance_followup_details_insurance_followup_id_seq'::regclass) | NEVER / NO |
| 2 | fk_insurance_main_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 4 | remark | text | YES | — | NEVER / NO |
| 5 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 7 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16520_ix_insurance_followup_details_fk_insurance_main_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16520_ix_insurance_followup_details_fk_insurance_main_id ON public.insurance_followup_details USING btree (fk_insurance_main_id);
```

- idx_16520_pk_insurance_followup_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16520_pk_insurance_followup_details ON public.insurance_followup_details USING btree (insurance_followup_id);
```

Constraints:

- fk_insurance_followup_details_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_insurance_followup_details_fk_insurance_main_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_insurance_main_id) REFERENCES insurance_main(insurance_main_id)
```

- fk_insurance_followup_details_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16520_pk_insurance_followup_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (insurance_followup_id)
```

### insurance_main

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | insurance_main_id | integer [precision 32, scale 0] | NO | nextval('insurance_main_insurance_main_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | agent_name_legacy | text | YES | — | NEVER / NO |
| 4 | agent_mobile_no_legacy | text | YES | — | NEVER / NO |
| 5 | agent_email_id_legacy | text | YES | — | NEVER / NO |
| 6 | entry_date | timestamp with time zone | YES | — | NEVER / NO |
| 7 | renewal_date | timestamp with time zone | YES | — | NEVER / NO |
| 8 | expiry_date | timestamp with time zone | YES | — | NEVER / NO |
| 9 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | customer_name_legacy | text | YES | — | NEVER / NO |
| 11 | customer_mobile_legacy | text | YES | — | NEVER / NO |
| 12 | customer_email_legacy | text | YES | — | NEVER / NO |
| 13 | car_type | text | YES | — | NEVER / NO |
| 14 | car_make_legacy | text | YES | — | NEVER / NO |
| 15 | car_model_legacy | text | YES | — | NEVER / NO |
| 16 | car_variant_legacy | text | YES | — | NEVER / NO |
| 17 | car_year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 18 | car_registration_no | text | YES | — | NEVER / NO |
| 19 | insurance_premium | numeric | YES | — | NEVER / NO |
| 20 | o_d_premium | numeric | YES | — | NEVER / NO |
| 21 | payout_percentage_od_premium | numeric | YES | — | NEVER / NO |
| 22 | payout_amount | numeric | YES | — | NEVER / NO |
| 23 | total_amount_received | numeric | YES | — | NEVER / NO |
| 24 | payout_payment_status | text | YES | — | NEVER / NO |
| 25 | policy_status | text | YES | — | NEVER / NO |
| 26 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 27 | remark | text | YES | — | NEVER / NO |
| 28 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 29 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 30 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 31 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 32 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 33 | fk_partner_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16527_ix_insurance_main_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16527_ix_insurance_main_customer_id ON public.insurance_main USING btree (customer_id);
```

- idx_16527_ix_insurance_main_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16527_ix_insurance_main_inventory_id ON public.insurance_main USING btree (inventory_id);
```

- idx_16527_ix_insurance_main_partner; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16527_ix_insurance_main_partner ON public.insurance_main USING btree (fk_partner_id);
```

- idx_16527_ix_insurance_main_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16527_ix_insurance_main_variant ON public.insurance_main USING btree (fk_variant_id);
```

- idx_16527_pk_insurance_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16527_pk_insurance_details ON public.insurance_main USING btree (insurance_main_id);
```

Constraints:

- ck_insmain_payoutstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((payout_payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text])) OR (payout_payment_status IS NULL)))
```

- ck_insmain_policystatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((policy_status = ANY (ARRAY['Pending'::text, 'Received'::text])) OR (policy_status IS NULL)))
```

- fk_insurance_main_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_insurance_main_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_insurance_main_inventory_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- fk_insurance_main_partner; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_partner_id) REFERENCES partner_master(partner_id)
```

- fk_insurance_main_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_insurance_main_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16527_pk_insurance_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (insurance_main_id)
```

### insurance_payment_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | insurance_payment_id | integer [precision 32, scale 0] | NO | nextval('insurance_payment_details_insurance_payment_id_seq'::regclass) | NEVER / NO |
| 2 | fk_insurance_main_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | amount_received | numeric | YES | — | NEVER / NO |
| 4 | payout_amount | numeric | YES | — | NEVER / NO |
| 5 | payout_payment_status | text | YES | — | NEVER / NO |
| 6 | policy_status | text | YES | — | NEVER / NO |
| 7 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 9 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16534_ix_insurance_payment_details_fk_insurance_main_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16534_ix_insurance_payment_details_fk_insurance_main_id ON public.insurance_payment_details USING btree (fk_insurance_main_id);
```

- idx_16534_pk_insurance_payment_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16534_pk_insurance_payment_details ON public.insurance_payment_details USING btree (insurance_payment_id);
```

Constraints:

- ck_inspay_payoutstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((payout_payment_status = ANY (ARRAY['Pending'::text, 'Paid'::text])) OR (payout_payment_status IS NULL)))
```

- ck_inspay_policystatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((policy_status = ANY (ARRAY['Pending'::text, 'Received'::text])) OR (policy_status IS NULL)))
```

- fk_insurance_payment_details_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_insurance_payment_details_fk_insurance_main_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_insurance_main_id) REFERENCES insurance_main(insurance_main_id)
```

- fk_insurance_payment_details_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16534_pk_insurance_payment_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (insurance_payment_id)
```

### insurance_reminder_attempt

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | insurance_reminder_attempt_id | integer [precision 32, scale 0] | NO | nextval('insurance_reminder_attempt_insurance_reminder_attempt_id_seq'::regclass) | NEVER / NO |
| 2 | insurance_reminder_delivery_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | attempt_number | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | status | text | NO | — | NEVER / NO |
| 5 | error_message | text | YES | — | NEVER / NO |
| 6 | provider_message_id | text | YES | — | NEVER / NO |
| 7 | attempted_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- insurance_reminder_attempt_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX insurance_reminder_attempt_pkey ON public.insurance_reminder_attempt USING btree (insurance_reminder_attempt_id);
```

- ix_insurance_reminder_attempt_delivery_attempted; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_insurance_reminder_attempt_delivery_attempted ON public.insurance_reminder_attempt USING btree (insurance_reminder_delivery_id, attempted_at);
```

Constraints:

- fk_insurance_reminder_attempt_delivery; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (insurance_reminder_delivery_id) REFERENCES insurance_reminder_delivery(insurance_reminder_delivery_id) ON DELETE CASCADE
```

- insurance_reminder_attempt_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (insurance_reminder_attempt_id)
```

### insurance_reminder_delivery

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | insurance_reminder_delivery_id | integer [precision 32, scale 0] | NO | nextval('insurance_reminder_delivery_insurance_reminder_delivery_id_seq'::regclass) | NEVER / NO |
| 2 | insurance_main_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | recipient_type | text | NO | — | NEVER / NO |
| 4 | recipient_name | text | YES | — | NEVER / NO |
| 5 | recipient_key | text | NO | — | NEVER / NO |
| 6 | channel | text | NO | — | NEVER / NO |
| 7 | days_before_expiry | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 8 | status | text | NO | — | NEVER / NO |
| 9 | recipient_address | text | NO | — | NEVER / NO |
| 10 | email_subject | text | YES | — | NEVER / NO |
| 11 | email_html | text | YES | — | NEVER / NO |
| 12 | whatsapp_message | text | YES | — | NEVER / NO |
| 13 | error_message | text | YES | — | NEVER / NO |
| 14 | provider_message_id | text | YES | — | NEVER / NO |
| 15 | retry_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 16 | next_retry_at | timestamp with time zone | YES | — | NEVER / NO |
| 17 | attempted_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 18 | scheduled_expiry_date | timestamp with time zone | NO | — | NEVER / NO |

Indexes:

- insurance_reminder_delivery_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX insurance_reminder_delivery_pkey ON public.insurance_reminder_delivery USING btree (insurance_reminder_delivery_id);
```

- ix_insurance_reminder_delivery_insurance_attempted; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_insurance_reminder_delivery_insurance_attempted ON public.insurance_reminder_delivery USING btree (insurance_main_id, attempted_at);
```

- ix_insurance_reminder_delivery_status_attempted; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_insurance_reminder_delivery_status_attempted ON public.insurance_reminder_delivery USING btree (status, attempted_at);
```

- uq_insurance_reminder_delivery_schedule; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_insurance_reminder_delivery_schedule ON public.insurance_reminder_delivery USING btree (insurance_main_id, recipient_key, channel, scheduled_expiry_date, days_before_expiry);
```

Constraints:

- fk_insurance_reminder_delivery_insurance; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (insurance_main_id) REFERENCES insurance_main(insurance_main_id) ON DELETE CASCADE
```

- insurance_reminder_delivery_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (insurance_reminder_delivery_id)
```

### inventory_documents

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inventory_document_id | integer [precision 32, scale 0] | NO | nextval('inventory_documents_inventory_document_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | document_type | text | YES | — | NEVER / NO |
| 4 | original_name | text | NO | — | NEVER / NO |
| 5 | storage_path | text | NO | — | NEVER / NO |
| 6 | content_type | text | NO | — | NEVER / NO |
| 7 | size_bytes | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 8 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- inventory_documents_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inventory_documents_pkey ON public.inventory_documents USING btree (inventory_document_id);
```

- ix_inventory_documents_inventory; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inventory_documents_inventory ON public.inventory_documents USING btree (inventory_id, created_at);
```

Constraints:

- fk_inventory_documents_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id) ON DELETE CASCADE
```

- inventory_documents_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inventory_document_id)
```

### inventory_management

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inventory_id | integer [precision 32, scale 0] | NO | nextval('inventory_management_inventory_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_number | text | YES | — | NEVER / NO |
| 3 | make_legacy | text | YES | — | NEVER / NO |
| 4 | model_legacy | text | YES | — | NEVER / NO |
| 5 | variant_legacy | text | YES | — | NEVER / NO |
| 6 | colour | text | YES | — | NEVER / NO |
| 7 | sku | text | YES | — | NEVER / NO |
| 8 | year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 9 | month | text | YES | — | NEVER / NO |
| 10 | fuel_type | text | YES | — | NEVER / NO |
| 11 | no_of_owners | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | tax | text | YES | — | NEVER / NO |
| 13 | is_car_registered | boolean | YES | — | NEVER / NO |
| 14 | registration_no | text | YES | — | NEVER / NO |
| 15 | kms_driven | numeric | YES | — | NEVER / NO |
| 16 | insurance_type | text | YES | — | NEVER / NO |
| 17 | price | numeric | YES | — | NEVER / NO |
| 18 | other_remarks | text | YES | — | NEVER / NO |
| 19 | status | text | YES | — | NEVER / NO |
| 20 | owned_type | text | YES | — | NEVER / NO |
| 21 | owned_by | text | YES | — | NEVER / NO |
| 22 | mobile_no_owned_by | text | YES | — | NEVER / NO |
| 23 | email_id_owned_by | text | YES | — | NEVER / NO |
| 24 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 25 | customer_name | text | YES | — | NEVER / NO |
| 26 | internal_comments | text | YES | — | NEVER / NO |
| 27 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 28 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 29 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 30 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 31 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16541_ix_inventory_management_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16541_ix_inventory_management_customer_id ON public.inventory_management USING btree (customer_id);
```

- idx_16541_ix_inventory_management_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16541_ix_inventory_management_variant ON public.inventory_management USING btree (fk_variant_id);
```

- idx_16541_pk_inventory_management; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16541_pk_inventory_management ON public.inventory_management USING btree (inventory_id);
```

- idx_16541_uq_inventory_management_inventory_number; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16541_uq_inventory_management_inventory_number ON public.inventory_management USING btree (inventory_number);
```

- idx_inventory_management_registration_normalized_uq; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_inventory_management_registration_normalized_uq ON public.inventory_management USING btree (regexp_replace(upper(registration_no), '[[:space:]]+'::text, ''::text, 'g'::text)) WHERE ((registration_no IS NOT NULL) AND ((upper(regexp_replace(registration_no, '[[:space:]]+'::text, ''::text, 'g'::text)) ~ '^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$'::text) OR (upper(regexp_replace(registration_no, '[[:space:]]+'::text, ''::text, 'g'::text)) ~ '^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$'::text)));
```

Constraints:

- ck_inventory_status; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((status = ANY (ARRAY['In Stock'::text, 'Not Available'::text, 'Loan Process'::text, 'Booked'::text, 'Sold'::text])) OR (status IS NULL)))
```

- ck_inventory_tax; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((tax = ANY (ARRAY['Individual'::text, 'Corporate'::text])) OR (tax IS NULL)))
```

- fk_inventory_management_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_inventory_management_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_inventory_management_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_inventory_management_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16541_pk_inventory_management; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inventory_id)
```

### inventory_photos

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | document_id | integer [precision 32, scale 0] | NO | nextval('inventory_photos_document_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_number_legacy | text | YES | — | NEVER / NO |
| 3 | path | text | YES | — | NEVER / NO |
| 4 | fk_inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16548_ix_inventory_photos_inventory; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16548_ix_inventory_photos_inventory ON public.inventory_photos USING btree (fk_inventory_id);
```

- idx_16548_pk_inventory_photos; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16548_pk_inventory_photos ON public.inventory_photos USING btree (document_id);
```

Constraints:

- fk_inventory_photos_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_inventory_id) REFERENCES inventory_management(inventory_id)
```

- idx_16548_pk_inventory_photos; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (document_id)
```

### inventory_sku_counters

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | make_key | text | NO | — | NEVER / NO |
| 2 | model_key | text | NO | — | NEVER / NO |
| 3 | colour_key | text | NO | — | NEVER / NO |
| 4 | last_value | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 5 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- idx_inventory_sku_counters_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_inventory_sku_counters_pk ON public.inventory_sku_counters USING btree (make_key, model_key, colour_key);
```

Constraints:

- idx_inventory_sku_counters_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (make_key, model_key, colour_key)
```

### inventory_videos

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | inventory_video_id | integer [precision 32, scale 0] | NO | nextval('inventory_videos_inventory_video_id_seq'::regclass) | NEVER / NO |
| 2 | fk_inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | source_type | text | NO | — | NEVER / NO |
| 4 | youtube_url | text | YES | — | NEVER / NO |
| 5 | youtube_video_id | text | YES | — | NEVER / NO |
| 6 | storage_path | text | YES | — | NEVER / NO |
| 7 | file_name | text | YES | — | NEVER / NO |
| 8 | is_featured | boolean | NO | false | NEVER / NO |
| 9 | sort_order | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 10 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- inventory_videos_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX inventory_videos_pkey ON public.inventory_videos USING btree (inventory_video_id);
```

- ix_inventory_videos_featured; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inventory_videos_featured ON public.inventory_videos USING btree (fk_inventory_id, is_featured);
```

- ix_inventory_videos_inventory; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_inventory_videos_inventory ON public.inventory_videos USING btree (fk_inventory_id);
```

Constraints:

- fk_inventory_videos_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_inventory_id) REFERENCES inventory_management(inventory_id) ON DELETE CASCADE
```

- inventory_videos_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (inventory_video_id)
```

- inventory_videos_source_type_check; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK ((source_type = ANY (ARRAY['YOUTUBE'::text, 'UPLOAD'::text])))
```

### legacy_inquiry_source_mapping

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | legacy_inquiry_source_mapping_id | integer [precision 32, scale 0] | NO | nextval('legacy_inquiry_source_mapping_legacy_inquiry_source_mapping_seq'::regclass) | NEVER / NO |
| 2 | legacy_source | text | NO | — | NEVER / NO |
| 3 | normalized_source | text | NO | — | NEVER / NO |
| 4 | source_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 5 | mapping_status | text | NO | 'approved'::text | NEVER / NO |
| 6 | review_note | text | YES | — | NEVER / NO |
| 7 | created_at | timestamp with time zone | NO | now() | NEVER / NO |
| 8 | updated_at | timestamp with time zone | NO | now() | NEVER / NO |

Indexes:

- idx_legacy_inquiry_source_mapping_source_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_legacy_inquiry_source_mapping_source_id ON public.legacy_inquiry_source_mapping USING btree (source_id);
```

- pk_legacy_inquiry_source_mapping; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX pk_legacy_inquiry_source_mapping ON public.legacy_inquiry_source_mapping USING btree (legacy_inquiry_source_mapping_id);
```

- uq_legacy_inquiry_source_mapping_normalized; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_legacy_inquiry_source_mapping_normalized ON public.legacy_inquiry_source_mapping USING btree (normalized_source);
```

Constraints:

- fk_legacy_inquiry_source_mapping_source; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (source_id) REFERENCES inquiry_source_master(source_id)
```

- pk_legacy_inquiry_source_mapping; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (legacy_inquiry_source_mapping_id)
```

- uq_legacy_inquiry_source_mapping_normalized; type=u; validated=true; deferrable=false; initially deferred=false.

```sql
UNIQUE (normalized_source)
```

### loan_followup_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | loan_followup_id | integer [precision 32, scale 0] | NO | nextval('loan_followup_details_loan_followup_id_seq'::regclass) | NEVER / NO |
| 2 | fk_loan_management_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 4 | remark | text | YES | — | NEVER / NO |
| 5 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 6 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 8 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16555_ix_loan_followup_details_fk_loan_management_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16555_ix_loan_followup_details_fk_loan_management_id ON public.loan_followup_details USING btree (fk_loan_management_id);
```

- idx_16555_pk_loan_followup_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16555_pk_loan_followup_details ON public.loan_followup_details USING btree (loan_followup_id);
```

Constraints:

- fk_loan_followup_details_fk_loan_management_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_loan_management_id) REFERENCES loan_management(loan_management_id)
```

- idx_16555_pk_loan_followup_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (loan_followup_id)
```

### loan_management

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | loan_management_id | integer [precision 32, scale 0] | NO | nextval('loan_management_loan_management_id_seq'::regclass) | NEVER / NO |
| 2 | entry_date | timestamp with time zone | YES | — | NEVER / NO |
| 3 | bank_name | text | YES | — | NEVER / NO |
| 4 | bank_person_name | text | YES | — | NEVER / NO |
| 5 | bank_person_mobile_no | text | YES | — | NEVER / NO |
| 6 | bank_person_email_id | text | YES | — | NEVER / NO |
| 7 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | customer_name_legacy | text | YES | — | NEVER / NO |
| 9 | customer_mobile_legacy | text | YES | — | NEVER / NO |
| 10 | customer_email_legacy | text | YES | — | NEVER / NO |
| 11 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | registration_no | text | YES | — | NEVER / NO |
| 13 | car_type | text | YES | — | NEVER / NO |
| 14 | car_make | text | YES | — | NEVER / NO |
| 15 | car_model | text | YES | — | NEVER / NO |
| 16 | car_variant | text | YES | — | NEVER / NO |
| 17 | car_year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 18 | loan_amount | numeric | YES | — | NEVER / NO |
| 19 | percentage_payout_amount | numeric | YES | — | NEVER / NO |
| 20 | payout_amount | numeric | YES | — | NEVER / NO |
| 21 | total_amount_received | numeric | YES | — | NEVER / NO |
| 22 | payment_status | text | YES | — | NEVER / NO |
| 23 | payment_date | timestamp with time zone | YES | — | NEVER / NO |
| 24 | remarks | text | YES | — | NEVER / NO |
| 25 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 26 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 27 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 28 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 29 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 30 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 31 | fk_partner_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16562_ix_loan_management_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16562_ix_loan_management_customer_id ON public.loan_management USING btree (customer_id);
```

- idx_16562_ix_loan_management_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16562_ix_loan_management_inventory_id ON public.loan_management USING btree (inventory_id);
```

- idx_16562_pk_financial_management; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16562_pk_financial_management ON public.loan_management USING btree (loan_management_id);
```

Constraints:

- fk_loan_management_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_loan_management_inventory_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- fk_loan_management_partner; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_partner_id) REFERENCES partner_master(partner_id)
```

- fk_loan_management_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16562_pk_financial_management; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (loan_management_id)
```

### loan_payment_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | loan_payment_id | integer [precision 32, scale 0] | NO | nextval('loan_payment_details_loan_payment_id_seq'::regclass) | NEVER / NO |
| 2 | fk_loan_management_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | loan_amount | numeric | YES | — | NEVER / NO |
| 4 | payout_amount | numeric | YES | — | NEVER / NO |
| 5 | amount_paid | numeric | YES | — | NEVER / NO |
| 6 | bank_name | text | YES | — | NEVER / NO |
| 7 | payment_date | timestamp with time zone | YES | — | NEVER / NO |
| 8 | payment_status | text | YES | — | NEVER / NO |
| 9 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 10 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 11 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 12 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16569_ix_loan_payment_details_fk_loan_management_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16569_ix_loan_payment_details_fk_loan_management_id ON public.loan_payment_details USING btree (fk_loan_management_id);
```

- idx_16569_pk_loan_payment_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16569_pk_loan_payment_details ON public.loan_payment_details USING btree (loan_payment_id);
```

Constraints:

- fk_loan_payment_details_fk_loan_management_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_loan_management_id) REFERENCES loan_management(loan_management_id)
```

- idx_16569_pk_loan_payment_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (loan_payment_id)
```

### message_attachment_upload

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | upload_id | uuid | NO | — | NEVER / NO |
| 2 | template_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | stored_path | text | NO | — | NEVER / NO |
| 4 | original_name | text | NO | — | NEVER / NO |
| 5 | mime_type | text | NO | — | NEVER / NO |
| 6 | byte_size | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 7 | scope | text | NO | — | NEVER / NO |
| 8 | created_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 9 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- ix_message_attachment_upload_template; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_message_attachment_upload_template ON public.message_attachment_upload USING btree (template_id);
```

- ix_message_attachment_upload_user_scope; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_message_attachment_upload_user_scope ON public.message_attachment_upload USING btree (created_by, scope);
```

- message_attachment_upload_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX message_attachment_upload_pkey ON public.message_attachment_upload USING btree (upload_id);
```

Constraints:

- fk_message_attachment_upload_template; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (template_id) REFERENCES message_template(type_id) ON DELETE CASCADE
```

- fk_message_attachment_upload_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- message_attachment_upload_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (upload_id)
```

### message_template

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | type_id | integer [precision 32, scale 0] | NO | nextval('message_template_type_id_seq'::regclass) | NEVER / NO |
| 2 | message_type | text | YES | — | NEVER / NO |
| 3 | message_subject | text | YES | — | NEVER / NO |
| 4 | message_body | text | YES | — | NEVER / NO |
| 5 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 6 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 8 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16576_pk_message_template; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16576_pk_message_template ON public.message_template USING btree (type_id);
```

Constraints:

- fk_message_template_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_message_template_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16576_pk_message_template; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (type_id)
```

### partner_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | partner_id | integer [precision 32, scale 0] | NO | nextval('partner_master_partner_id_seq'::regclass) | NEVER / NO |
| 2 | partner_type | text | NO | — | NEVER / NO |
| 3 | name | text | NO | — | NEVER / NO |
| 4 | mobile | text | YES | — | NEVER / NO |
| 5 | email | text | YES | — | NEVER / NO |

Indexes:

- idx_16583_pk__partner___93b7f6d5beabac5c; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16583_pk__partner___93b7f6d5beabac5c ON public.partner_master USING btree (partner_id);
```

Constraints:

- idx_16583_pk__partner___93b7f6d5beabac5c; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (partner_id)
```

### partner_webhook_leads

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | partner_webhook_lead_id | integer [precision 32, scale 0] | NO | nextval('partner_webhook_leads_partner_webhook_lead_id_seq'::regclass) | NEVER / NO |
| 2 | partner | text | NO | — | NEVER / NO |
| 3 | external_lead_id | text | NO | — | NEVER / NO |
| 4 | source_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 5 | inquiry_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- idx_partner_webhook_lead_source; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_partner_webhook_lead_source ON public.partner_webhook_leads USING btree (source_id);
```

- partner_webhook_leads_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX partner_webhook_leads_pkey ON public.partner_webhook_leads USING btree (partner_webhook_lead_id);
```

- uq_partner_webhook_lead_inquiry; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_partner_webhook_lead_inquiry ON public.partner_webhook_leads USING btree (inquiry_id);
```

- uq_partner_webhook_lead_partner_external; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_partner_webhook_lead_partner_external ON public.partner_webhook_leads USING btree (partner, external_lead_id);
```

Constraints:

- partner_webhook_leads_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (partner_webhook_lead_id)
```

### partner_webhook_payloads

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | partner_webhook_payload_id | integer [precision 32, scale 0] | NO | nextval('partner_webhook_payloads_partner_webhook_payload_id_seq'::regclass) | NEVER / NO |
| 2 | partner | text | NO | — | NEVER / NO |
| 3 | external_lead_id | text | YES | — | NEVER / NO |
| 4 | raw_payload | jsonb | NO | — | NEVER / NO |
| 5 | received_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 6 | inquiry_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_partner_webhook_payload_inquiry; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_partner_webhook_payload_inquiry ON public.partner_webhook_payloads USING btree (inquiry_id);
```

- idx_partner_webhook_payload_partner_external; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_partner_webhook_payload_partner_external ON public.partner_webhook_payloads USING btree (partner, external_lead_id);
```

- idx_partner_webhook_payload_received_at; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_partner_webhook_payload_received_at ON public.partner_webhook_payloads USING btree (received_at);
```

- partner_webhook_payloads_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX partner_webhook_payloads_pkey ON public.partner_webhook_payloads USING btree (partner_webhook_payload_id);
```

Constraints:

- partner_webhook_payloads_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (partner_webhook_payload_id)
```

### role_access_audit

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | role_access_audit_id | integer [precision 32, scale 0] | NO | nextval('role_access_audit_role_access_audit_id_seq'::regclass) | NEVER / NO |
| 2 | role_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | role_name_snapshot | text | YES | — | NEVER / NO |
| 4 | changed_by_user_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 5 | changed_by_user_name | text | YES | — | NEVER / NO |
| 6 | changed_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 7 | added_function_names_csv | text | YES | — | NEVER / NO |
| 8 | removed_function_names_csv | text | YES | — | NEVER / NO |
| 9 | before_function_names_csv | text | YES | — | NEVER / NO |
| 10 | after_function_names_csv | text | YES | — | NEVER / NO |

Indexes:

- ix_role_access_audit_changed_at; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_role_access_audit_changed_at ON public.role_access_audit USING btree (changed_at);
```

- ix_role_access_audit_changed_by_user_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_role_access_audit_changed_by_user_id ON public.role_access_audit USING btree (changed_by_user_id);
```

- ix_role_access_audit_role_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_role_access_audit_role_id ON public.role_access_audit USING btree (role_id);
```

- pk_role_access_audit; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX pk_role_access_audit ON public.role_access_audit USING btree (role_access_audit_id);
```

Constraints:

- pk_role_access_audit; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (role_access_audit_id)
```

### role_master

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | role_id | integer [precision 32, scale 0] | NO | nextval('role_master_role_id_seq'::regclass) | NEVER / NO |
| 2 | role_name | text | YES | — | NEVER / NO |
| 3 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 4 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 5 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 6 | updated_date | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- idx_16590_pk_role_master; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16590_pk_role_master ON public.role_master USING btree (role_id);
```

Constraints:

- fk_role_master_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_role_master_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16590_pk_role_master; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (role_id)
```

### rto_agent

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | rto_agent_main_id | integer [precision 32, scale 0] | NO | nextval('rto_agent_rto_agent_main_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | agent_name_legacy | text | YES | — | NEVER / NO |
| 4 | agent_mobile_no_legacy | text | YES | — | NEVER / NO |
| 5 | agent_email_id_legacy | text | YES | — | NEVER / NO |
| 6 | date_of_entry | timestamp with time zone | YES | — | NEVER / NO |
| 7 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | customer_name_legacy | text | YES | — | NEVER / NO |
| 9 | customer_mob_legacy | text | YES | — | NEVER / NO |
| 10 | customer_email_legacy | text | YES | — | NEVER / NO |
| 11 | car_type | text | YES | — | NEVER / NO |
| 12 | car_make_legacy | text | YES | — | NEVER / NO |
| 13 | car_model_legacy | text | YES | — | NEVER / NO |
| 14 | car_variant_legacy | text | YES | — | NEVER / NO |
| 15 | car_registration_no | text | YES | — | NEVER / NO |
| 16 | car_year | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 17 | transfer_charges | numeric | YES | — | NEVER / NO |
| 18 | amt_paid | numeric | YES | — | NEVER / NO |
| 19 | payment_status | text | YES | — | NEVER / NO |
| 20 | payment_date | timestamp with time zone | YES | — | NEVER / NO |
| 21 | rc_status | text | YES | — | NEVER / NO |
| 22 | transfer_status | text | YES | — | NEVER / NO |
| 23 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 24 | remark | text | YES | — | NEVER / NO |
| 25 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 26 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 27 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 28 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 29 | fk_variant_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 30 | fk_partner_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16597_ix_rto_agent_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16597_ix_rto_agent_customer_id ON public.rto_agent USING btree (customer_id);
```

- idx_16597_ix_rto_agent_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16597_ix_rto_agent_inventory_id ON public.rto_agent USING btree (inventory_id);
```

- idx_16597_ix_rto_agent_partner; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16597_ix_rto_agent_partner ON public.rto_agent USING btree (fk_partner_id);
```

- idx_16597_ix_rto_agent_variant; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16597_ix_rto_agent_variant ON public.rto_agent USING btree (fk_variant_id);
```

- idx_16597_pk_rto_agent; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16597_pk_rto_agent ON public.rto_agent USING btree (rto_agent_main_id);
```

Constraints:

- ck_rtoagent_paymentstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((payment_status = ANY (ARRAY['Pending'::text, 'Partially Paid'::text, 'Fully Paid'::text])) OR (payment_status IS NULL)))
```

- ck_rtoagent_rcstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((rc_status = ANY (ARRAY['Pending'::text, 'Received'::text])) OR (rc_status IS NULL)))
```

- ck_rtoagent_transferstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((transfer_status = ANY (ARRAY['Pending'::text, 'Done'::text])) OR (transfer_status IS NULL)))
```

- fk_rto_agent_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_rto_agent_customer_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_rto_agent_inventory_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- fk_rto_agent_partner; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_partner_id) REFERENCES partner_master(partner_id)
```

- fk_rto_agent_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- fk_rto_agent_variant; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_variant_id) REFERENCES car_variant_master(pk_variant_id)
```

- idx_16597_pk_rto_agent; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (rto_agent_main_id)
```

### rto_followup_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | rto_followup_id | integer [precision 32, scale 0] | NO | nextval('rto_followup_details_rto_followup_id_seq'::regclass) | NEVER / NO |
| 2 | fk_rto_agent_main_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | followup_date | timestamp with time zone | YES | — | NEVER / NO |
| 4 | remark | text | YES | — | NEVER / NO |
| 5 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 6 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 7 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 8 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16604_ix_rto_followup_details_fk_rto_agent_main_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16604_ix_rto_followup_details_fk_rto_agent_main_id ON public.rto_followup_details USING btree (fk_rto_agent_main_id);
```

- idx_16604_pk_rto_followup_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16604_pk_rto_followup_details ON public.rto_followup_details USING btree (rto_followup_id);
```

Constraints:

- fk_rto_followup_details_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_rto_followup_details_fk_rto_agent_main_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_rto_agent_main_id) REFERENCES rto_agent(rto_agent_main_id)
```

- fk_rto_followup_details_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16604_pk_rto_followup_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (rto_followup_id)
```

### rto_payment_details

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | rto_payment_id | integer [precision 32, scale 0] | NO | nextval('rto_payment_details_rto_payment_id_seq'::regclass) | NEVER / NO |
| 2 | fk_rto_agent_main_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 3 | transfer_charges | numeric | YES | — | NEVER / NO |
| 4 | amount_paid | numeric | YES | — | NEVER / NO |
| 5 | payment_status | text | YES | — | NEVER / NO |
| 6 | payment_date | timestamp with time zone | YES | — | NEVER / NO |
| 7 | transfer_status | text | YES | — | NEVER / NO |
| 8 | rc_status | text | YES | — | NEVER / NO |
| 9 | created_dt | timestamp with time zone | YES | — | NEVER / NO |
| 10 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 11 | updated_dt | timestamp with time zone | YES | — | NEVER / NO |
| 12 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |

Indexes:

- idx_16611_ix_rto_payment_details_fk_rto_agent_main_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16611_ix_rto_payment_details_fk_rto_agent_main_id ON public.rto_payment_details USING btree (fk_rto_agent_main_id);
```

- idx_16611_pk_rto_payment_details; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16611_pk_rto_payment_details ON public.rto_payment_details USING btree (rto_payment_id);
```

Constraints:

- ck_rtopay_paymentstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((payment_status = ANY (ARRAY['Pending'::text, 'Partially Paid'::text, 'Fully Paid'::text])) OR (payment_status IS NULL)))
```

- ck_rtopay_rcstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((rc_status = ANY (ARRAY['Pending'::text, 'Received'::text])) OR (rc_status IS NULL)))
```

- ck_rtopay_transferstatus; type=c; validated=true; deferrable=false; initially deferred=false.

```sql
CHECK (((transfer_status = ANY (ARRAY['Pending'::text, 'Done'::text])) OR (transfer_status IS NULL)))
```

- fk_rto_payment_details_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_rto_payment_details_fk_rto_agent_main_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (fk_rto_agent_main_id) REFERENCES rto_agent(rto_agent_main_id)
```

- fk_rto_payment_details_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16611_pk_rto_payment_details; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (rto_payment_id)
```

### system_default

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | system_default_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 2 | system_default_name | text | YES | — | NEVER / NO |
| 3 | value | text | YES | — | NEVER / NO |
| 4 | created_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 5 | created_dt | timestamp with time zone | NO | — | NEVER / NO |
| 6 | updated_by | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 7 | updated_dt | timestamp with time zone | NO | — | NEVER / NO |

Indexes:

- pk_system_default; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX pk_system_default ON public.system_default USING btree (system_default_id);
```

Constraints:

- fk_system_default_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_system_default_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- pk_system_default; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (system_default_id)
```

### user_notifications

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | notification_id | integer [precision 32, scale 0] | NO | nextval('user_notifications_notification_id_seq'::regclass) | NEVER / NO |
| 2 | recipient_user_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | type | text | NO | — | NEVER / NO |
| 4 | title | text | NO | — | NEVER / NO |
| 5 | body | text | YES | — | NEVER / NO |
| 6 | href | text | YES | — | NEVER / NO |
| 7 | entity_type | text | YES | — | NEVER / NO |
| 8 | entity_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 9 | dedupe_key | text | NO | — | NEVER / NO |
| 10 | read_at | timestamp with time zone | YES | — | NEVER / NO |
| 11 | archived_at | timestamp with time zone | YES | — | NEVER / NO |
| 12 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 13 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- ix_user_notifications_recipient_active; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_user_notifications_recipient_active ON public.user_notifications USING btree (recipient_user_id, archived_at, created_at DESC);
```

- ix_user_notifications_recipient_read; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_user_notifications_recipient_read ON public.user_notifications USING btree (recipient_user_id, read_at);
```

- uq_user_notifications_dedupe_key; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_user_notifications_dedupe_key ON public.user_notifications USING btree (dedupe_key);
```

- user_notifications_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX user_notifications_pkey ON public.user_notifications USING btree (notification_id);
```

Constraints:

- fk_user_notifications_recipient; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (recipient_user_id) REFERENCES user_table(user_id) ON DELETE CASCADE
```

- user_notifications_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (notification_id)
```

### user_table

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | user_id | integer [precision 32, scale 0] | NO | nextval('user_table_user_id_seq'::regclass) | NEVER / NO |
| 2 | user_name | text | YES | — | NEVER / NO |
| 3 | password_hash | text | YES | — | NEVER / NO |
| 4 | role_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 5 | role_name | text | YES | — | NEVER / NO |
| 6 | status | text | YES | — | NEVER / NO |
| 7 | emp_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 8 | display_name | text | YES | — | NEVER / NO |
| 9 | email_id | text | YES | — | NEVER / NO |
| 10 | last_login_time | timestamp with time zone | YES | — | NEVER / NO |
| 11 | last_logout_time | timestamp with time zone | YES | — | NEVER / NO |
| 12 | created_date | timestamp with time zone | YES | — | NEVER / NO |
| 13 | created_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 14 | updated_date | timestamp with time zone | YES | — | NEVER / NO |
| 15 | updated_by | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 16 | auth_version | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |

Indexes:

- idx_16623_ix_user_table_emp_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16623_ix_user_table_emp_id ON public.user_table USING btree (emp_id);
```

- idx_16623_ix_user_table_role_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_16623_ix_user_table_role_id ON public.user_table USING btree (role_id);
```

- idx_16623_pk_user_table; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_16623_pk_user_table ON public.user_table USING btree (user_id);
```

- uq_user_table_emp_id; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_user_table_emp_id ON public.user_table USING btree (emp_id);
```

Constraints:

- fk_user_table_created_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (created_by) REFERENCES user_table(user_id)
```

- fk_user_table_emp_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (emp_id) REFERENCES add_employee(emp_id)
```

- fk_user_table_role_id; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (role_id) REFERENCES role_master(role_id)
```

- fk_user_table_updated_by_user; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (updated_by) REFERENCES user_table(user_id)
```

- idx_16623_pk_user_table; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (user_id)
```

### vehicle_email_link_interactions

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | vehicle_email_link_interaction_id | integer [precision 32, scale 0] | NO | nextval('vehicle_email_link_interactio_vehicle_email_link_interactio_seq'::regclass) | NEVER / NO |
| 2 | vehicle_email_link_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | interaction_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 4 | interaction_type | text | NO | — | NEVER / NO |
| 5 | interaction_label | text | YES | — | NEVER / NO |
| 6 | user_agent | text | YES | — | NEVER / NO |
| 7 | ip_address | text | YES | — | NEVER / NO |
| 8 | referrer | text | YES | — | NEVER / NO |

Indexes:

- idx_vehicle_email_link_interactions_link_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_link_interactions_link_id ON public.vehicle_email_link_interactions USING btree (vehicle_email_link_id);
```

- idx_vehicle_email_link_interactions_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_vehicle_email_link_interactions_pk ON public.vehicle_email_link_interactions USING btree (vehicle_email_link_interaction_id);
```

- idx_vehicle_email_link_interactions_type; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_link_interactions_type ON public.vehicle_email_link_interactions USING btree (interaction_type);
```

Constraints:

- fk_vehicle_email_link_interactions_link; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (vehicle_email_link_id) REFERENCES vehicle_email_links(vehicle_email_link_id) ON DELETE CASCADE
```

- idx_vehicle_email_link_interactions_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (vehicle_email_link_interaction_id)
```

### vehicle_email_link_visits

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | vehicle_email_link_visit_id | integer [precision 32, scale 0] | NO | nextval('vehicle_email_link_visits_vehicle_email_link_visit_id_seq'::regclass) | NEVER / NO |
| 2 | vehicle_email_link_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | visited_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 4 | visit_kind | text | NO | — | NEVER / NO |
| 5 | user_agent | text | YES | — | NEVER / NO |
| 6 | ip_address | text | YES | — | NEVER / NO |
| 7 | referrer | text | YES | — | NEVER / NO |

Indexes:

- idx_vehicle_email_link_visits_link_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_link_visits_link_id ON public.vehicle_email_link_visits USING btree (vehicle_email_link_id);
```

- idx_vehicle_email_link_visits_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_vehicle_email_link_visits_pk ON public.vehicle_email_link_visits USING btree (vehicle_email_link_visit_id);
```

Constraints:

- fk_vehicle_email_link_visits_link; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (vehicle_email_link_id) REFERENCES vehicle_email_links(vehicle_email_link_id) ON DELETE CASCADE
```

- idx_vehicle_email_link_visits_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (vehicle_email_link_visit_id)
```

### vehicle_email_links

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | vehicle_email_link_id | integer [precision 32, scale 0] | NO | nextval('vehicle_email_links_vehicle_email_link_id_seq'::regclass) | NEVER / NO |
| 2 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | customer_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 4 | recipient_email | text | NO | — | NEVER / NO |
| 5 | recipient_name | text | YES | — | NEVER / NO |
| 6 | token_hash | text | NO | — | NEVER / NO |
| 7 | email_sent_at | timestamp with time zone | YES | — | NEVER / NO |
| 8 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 9 | expires_at | timestamp with time zone | YES | — | NEVER / NO |
| 10 | first_requested_at | timestamp with time zone | YES | — | NEVER / NO |
| 11 | first_human_view_at | timestamp with time zone | YES | — | NEVER / NO |
| 12 | last_requested_at | timestamp with time zone | YES | — | NEVER / NO |
| 13 | request_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 14 | human_view_count | integer [precision 32, scale 0] | NO | 0 | NEVER / NO |
| 15 | is_active | boolean | NO | true | NEVER / NO |
| 16 | inquiry_id | integer [precision 32, scale 0] | YES | — | NEVER / NO |
| 17 | channel | text | NO | 'Email'::text | NEVER / NO |

Indexes:

- idx_vehicle_email_links_customer_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_links_customer_id ON public.vehicle_email_links USING btree (customer_id);
```

- idx_vehicle_email_links_inquiry_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_links_inquiry_id ON public.vehicle_email_links USING btree (inquiry_id);
```

- idx_vehicle_email_links_inventory_id; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_links_inventory_id ON public.vehicle_email_links USING btree (inventory_id);
```

- idx_vehicle_email_links_pk; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_vehicle_email_links_pk ON public.vehicle_email_links USING btree (vehicle_email_link_id);
```

- idx_vehicle_email_links_recipient_email; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX idx_vehicle_email_links_recipient_email ON public.vehicle_email_links USING btree (recipient_email);
```

- idx_vehicle_email_links_token_hash_uq; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX idx_vehicle_email_links_token_hash_uq ON public.vehicle_email_links USING btree (token_hash);
```

Constraints:

- fk_vehicle_email_links_customer; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (customer_id) REFERENCES customer(cust_id)
```

- fk_vehicle_email_links_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE SET NULL
```

- fk_vehicle_email_links_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- idx_vehicle_email_links_pk; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (vehicle_email_link_id)
```

### whatsapp_delivery_log

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | whatsapp_delivery_log_id | integer [precision 32, scale 0] | NO | nextval('whatsapp_delivery_log_whatsapp_delivery_log_id_seq'::regclass) | NEVER / NO |
| 2 | inquiry_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 3 | inventory_id | integer [precision 32, scale 0] | NO | — | NEVER / NO |
| 4 | recipient_mobile | text | NO | — | NEVER / NO |
| 5 | recipient_name | text | YES | — | NEVER / NO |
| 6 | template_name | text | NO | — | NEVER / NO |
| 7 | template_language | text | NO | — | NEVER / NO |
| 8 | vehicle_name | text | NO | — | NEVER / NO |
| 9 | button_url_suffix | text | YES | — | NEVER / NO |
| 10 | provider_message_id | text | YES | — | NEVER / NO |
| 11 | status | text | NO | — | NEVER / NO |
| 12 | error_message | text | YES | — | NEVER / NO |
| 13 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 14 | attempted_at | timestamp with time zone | YES | — | NEVER / NO |

Indexes:

- ix_whatsapp_delivery_log_inquiry_created; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_whatsapp_delivery_log_inquiry_created ON public.whatsapp_delivery_log USING btree (inquiry_id, created_at);
```

- ix_whatsapp_delivery_log_status_created; method=btree; unique=false; primary=false; valid=true; ready=true.

```sql
CREATE INDEX ix_whatsapp_delivery_log_status_created ON public.whatsapp_delivery_log USING btree (status, created_at);
```

- uq_whatsapp_delivery_log_inquiry_inventory; method=btree; unique=true; primary=false; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX uq_whatsapp_delivery_log_inquiry_inventory ON public.whatsapp_delivery_log USING btree (inquiry_id, inventory_id);
```

- whatsapp_delivery_log_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX whatsapp_delivery_log_pkey ON public.whatsapp_delivery_log USING btree (whatsapp_delivery_log_id);
```

Constraints:

- fk_whatsapp_delivery_log_inquiry; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inquiry_id) REFERENCES inquiry(inquiry_id) ON DELETE CASCADE
```

- fk_whatsapp_delivery_log_inventory; type=f; validated=true; deferrable=false; initially deferred=false.

```sql
FOREIGN KEY (inventory_id) REFERENCES inventory_management(inventory_id)
```

- whatsapp_delivery_log_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (whatsapp_delivery_log_id)
```

### whatsapp_message_draft

| Position | Column | Type | Nullable | Default | Generated / identity |
| --- | --- | --- | --- | --- | --- |
| 1 | whatsapp_message_draft_id | integer [precision 32, scale 0] | NO | nextval('whatsapp_message_draft_whatsapp_message_draft_id_seq'::regclass) | NEVER / NO |
| 2 | title | text | NO | — | NEVER / NO |
| 3 | message | text | NO | — | NEVER / NO |
| 4 | created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |
| 5 | updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP | NEVER / NO |

Indexes:

- whatsapp_message_draft_pkey; method=btree; unique=true; primary=true; valid=true; ready=true.

```sql
CREATE UNIQUE INDEX whatsapp_message_draft_pkey ON public.whatsapp_message_draft USING btree (whatsapp_message_draft_id);
```

Constraints:

- whatsapp_message_draft_pkey; type=p; validated=true; deferrable=false; initially deferred=false.

```sql
PRIMARY KEY (whatsapp_message_draft_id)
```

## Sequence definitions

| Name | Type | Start | Min | Max | Increment | Cycle | Cache |
| --- | --- | --- | --- | --- | --- | --- | --- |
| access_function_access_function_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| add_employee_emp_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| car_make_master_pk_make_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| car_model_master_pk_model_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| car_variant_master_pk_variant_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| check_list_doc_main_document_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| checklist_doc_details_checklist_details_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| customer_cust_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| customer_feedback_feedback_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| dealer_master_dealer_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| dsa_management_dsa_main_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| email_attachment_attachment_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| email_delivery_log_delivery_log_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| exception_logging_loggins_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| feedback_invitation_feedback_invitation_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| followup_inquiry_pk_followup_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| forgot_password_forgot_password_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| indian_states_master_state_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| inquiry_activity_log_inquiry_activity_log_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_car_details_inquiry_car_details_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| inquiry_email_history_inquiry_email_history_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_inquiry_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| inquiry_inventory_email_log_inquiry_inventory_email_log_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_inventory_links_inquiry_inventory_link_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_location_master_location_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_no_inventory_notifica_inquiry_no_inventory_notifica_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_portal_assignments_inquiry_portal_assignment_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inquiry_source_master_source_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| insurance_followup_details_insurance_followup_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| insurance_main_insurance_main_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| insurance_payment_details_insurance_payment_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| insurance_reminder_attempt_insurance_reminder_attempt_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| insurance_reminder_delivery_insurance_reminder_delivery_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inventory_documents_inventory_document_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| inventory_management_inventory_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| inventory_photos_document_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| inventory_videos_inventory_video_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| legacy_inquiry_source_mapping_legacy_inquiry_source_mapping_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| loan_followup_details_loan_followup_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| loan_management_loan_management_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| loan_payment_details_loan_payment_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| message_template_type_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| partner_master_partner_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| partner_webhook_leads_partner_webhook_lead_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| partner_webhook_payloads_partner_webhook_payload_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| role_access_audit_role_access_audit_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| role_master_role_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| rto_agent_rto_agent_main_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| rto_followup_details_rto_followup_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| rto_payment_details_rto_payment_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| user_notifications_notification_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| user_table_user_id_seq | bigint | 1 | 1 | 9223372036854775807 | 1 | false | 1 |
| vehicle_email_link_interactio_vehicle_email_link_interactio_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| vehicle_email_link_visits_vehicle_email_link_visit_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| vehicle_email_links_vehicle_email_link_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| whatsapp_delivery_log_whatsapp_delivery_log_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |
| whatsapp_message_draft_whatsapp_message_draft_id_seq | integer | 1 | 1 | 2147483647 | 1 | false | 1 |

## Routine definition fingerprints

Definition hashes compare complete PostgreSQL function/procedure definitions without printing bodies.

| Name | Identity arguments | Kind | Security definer | MD5 of definition |
| --- | --- | --- | --- | --- |
| armor | bytea | f | false | f6d2959639d44048e31b0b9a869efa66 |
| armor | bytea, text[], text[] | f | false | 1bce182b530c0933287cdf307667e70f |
| crypt | text, text | f | false | 0939715a0bd721d85d420be1aee841c7 |
| dearmor | text | f | false | d7729372e3d9336abc8d7741203a42e4 |
| decrypt | bytea, bytea, text | f | false | d7d544993f5eb2f2442a40bc9649abdf |
| decrypt_iv | bytea, bytea, bytea, text | f | false | e16d9883f8115f21498926b02d6d68f2 |
| digest | bytea, text | f | false | f95b6d7c3e7b772aaa79cd847eca825b |
| digest | text, text | f | false | 6b75958a35b3317d784bfa9f6b4f44b5 |
| encrypt | bytea, bytea, text | f | false | 2db5595d113688d14c7a081025de55ee |
| encrypt_iv | bytea, bytea, bytea, text | f | false | 607102fa4c3c8e98c9a2eea7bc631546 |
| gen_random_bytes | integer | f | false | 767c42f6188fd5c462c3e27384858565 |
| gen_random_uuid |  | f | false | ff30e0a6015ca70d7bb1a880f09a11bf |
| gen_salt | text | f | false | 75059627384e3cc1164aa5bfeeb91fce |
| gen_salt | text, integer | f | false | 33498c853264afae81c9eef1e42637dd |
| hmac | bytea, bytea, text | f | false | 255f76d34f69f526e821c43c1924e758 |
| hmac | text, text, text | f | false | 1fa6ecfa0fbb980310ed74909d1315cd |
| pgp_armor_headers | text, OUT key text, OUT value text | f | false | e8e0141fd364a9f4f2bb77cddefc1375 |
| pgp_key_id | bytea | f | false | 65a7e7e64c0e9357f3d9ef90684fc901 |
| pgp_pub_decrypt | bytea, bytea | f | false | 8405a5854d6a196497505558a08836d6 |
| pgp_pub_decrypt | bytea, bytea, text | f | false | f75b5fe07aa0b9878dd0c4b740b4b7c0 |
| pgp_pub_decrypt | bytea, bytea, text, text | f | false | 19e39f76f9c02c23f186c03708a697b6 |
| pgp_pub_decrypt_bytea | bytea, bytea | f | false | 67dc9e8d117eaceb2ecb2b9ecd4a84bd |
| pgp_pub_decrypt_bytea | bytea, bytea, text | f | false | b454111dbd336c971f5f943d034522ee |
| pgp_pub_decrypt_bytea | bytea, bytea, text, text | f | false | 6bfe210845fb03480bd1c6ba0a23c8ab |
| pgp_pub_encrypt | text, bytea | f | false | 35b1cfe47cb1c41981ca0cc47d180ff1 |
| pgp_pub_encrypt | text, bytea, text | f | false | 69c8935398e493c55f1a4416f5e19634 |
| pgp_pub_encrypt_bytea | bytea, bytea | f | false | 4652e16255901f99b425e1591ac4067b |
| pgp_pub_encrypt_bytea | bytea, bytea, text | f | false | a9e9a634c9e5b0043e6545b31bc61abc |
| pgp_sym_decrypt | bytea, text | f | false | 964df44396e5184c4edd079067e0b616 |
| pgp_sym_decrypt | bytea, text, text | f | false | 03a9646c8b0a1df4e03651a942f28462 |
| pgp_sym_decrypt_bytea | bytea, text | f | false | 85bf7797885fc606a004da1491be44d4 |
| pgp_sym_decrypt_bytea | bytea, text, text | f | false | 7efaa9f9cd67e698d2c1746a6b1869da |
| pgp_sym_encrypt | text, text | f | false | 9de92e2e6e5911ada3edb52d67cce15a |
| pgp_sym_encrypt | text, text, text | f | false | 780e212e582eccd1b836f953192aad99 |
| pgp_sym_encrypt_bytea | bytea, text | f | false | 4e6c92a8b7d749d0848233de20e747d9 |
| pgp_sym_encrypt_bytea | bytea, text, text | f | false | 6ebf4ffeeb75d708ea16cd9cc2628cca |

## Extensions

| Extension | Version | Schema |
| --- | --- | --- |
| pgcrypto | 1.3 | public |
| plpgsql | 1.0 | pg_catalog |

## Selected PostgreSQL settings

| Setting | Value | Unit |
| --- | --- | --- |
| TimeZone | GMT | — |
| default_transaction_isolation | read committed | — |
| idle_in_transaction_session_timeout | 300000 | ms |
| lock_timeout | 0 | ms |
| max_connections | 901 | — |
| server_version | 17.11 (11592b3) | — |
| shared_buffers | 29440 | 8kB |
| statement_timeout | 0 | ms |
| work_mem | 4096 | kB |

## Recorded migrations

| Migration | Finished | Rolled back | Applied steps | Checksum |
| --- | --- | --- | --- | --- |
| 20260826000000_init | true | false | 0 | 13c3615cc38992ead6e5d814d82304f1573eafa076e1b1c4b2e5b9c0d4829cfc |
| 20260827140000_allow_partial_paid_rto | true | false | 0 | 85c76e0cb7a476e65efc12467804adcd08762e315e22609d2fb021df2341aabe |
| 20260828113000_add_inquiry_assigned_to | true | false | 0 | 2705e07f9721000e9ecbc7f8edc4eafa879e924c16345f1512d2dc2c83fafeac |
| 20260828160000_add_message_attachment_uploads | true | false | 0 | e5a3ecebb3e00ca029bdf74ab2d60d97594cd30c4c19ccf8abc655fd3f01464e |
| 20260828170000_add_customer_feedback_submitted_at | true | false | 0 | d6712f4ec47c408c989a24cb0ce3b28e6af5fa76f9364f67cd0a4f309e912f85 |
| 20260828180000_add_email_delivery_logs | true | false | 0 | f3c9966e6dbaf7e0556a7eecb9b78d7a996385768952007cb1d35e5ec4350f1a |
| 20260828190000_add_email_delivery_retry_fields | true | false | 0 | c326493e72cc0119ca15c3916040615976968e90d487ad75ac0df3035036e71c |
| 20260831120000_add_auth_version | true | false | 0 | fc44758e8b80a11663144ab1e262c7283bc9e476874a24361bf91b15bc486107 |
| 20260831130000_add_inquiry_whatsapp_delivery_logs | true | false | 0 | bb9b7dd69df4f56ec4a31ad2bd992f8ada0427a0ccb79458ff423ff35e92e0e5 |
| 20260831140000_add_inquiry_inventory_email_logs | true | false | 0 | d3861aaea05b1f39ae91da6304c4489da27337dbfcd894bbe9174145f4547417 |
| 20260831150000_add_inquiry_no_inventory_notification_logs | true | false | 0 | 9fabcf10cd508b570a804bfcc6a63c806c029ea2a234e0822d2fd86409ec95a9 |
| 20260901000000_reconcile_manual_schema_changes | true | false | 0 | baf550df3a19c06e421fe7eea55c73ccfabe9be5cfafd036a5ff5e8fff6badbb |
| 20260901090000_add_whatsapp_message_drafts | true | false | 0 | d38b50d6cce66c183a48360eef999c7dd6a49970c9d8c184456251e16a6de00f |
| 20260902000000_add_inventory_registration_unique | true | false | 0 | ee7eda2df79775db5177bc7fb231a51f8543b98734095cc86cd604b8683773f5 |
| 20260902120000_add_inventory_identity_counters | true | false | 0 | e1d64ce0eb2c9f5e2eb902acf00e8a70f279cf6c6b2f6f151079377c9b473ad5 |
| 20260903060000_allow_open_followup_status | true | false | 0 | 39566667d302c8dc99d1a90f3ff67a84ecd3c77d7ffe2ace3bbdacdd63402d51 |
| 20260909090000_add_inventory_videos | true | false | 0 | 8ffef6085b791566072c9771fa0770b06657b568993306a666c42519771127ca |
| 20260910000000_add_insurance_registration_unique | true | false | 0 | fd3863e13fa1c843cecf221f0ee26b517f5c65994f498b9be738a2eff443c260 |
| 20260911000000_add_insurance_reminders | true | false | 0 | ed9504384cbe393d2895ae6d0dd93d01fa20729e33385bf7282adb758f8dddd4 |
| 20260916113000_add_inquiry_location | true | false | 0 | 21efcbe42e2ef8e60e7eb7232d5636bf254957512849270b1dca20dc4b2f6693 |
| 20260921123000_harden_inventory_registration_and_sync_link | true | false | 0 | ef14c9357546f47e02a5af586c54913be1ed9ba94347c50c20e500686e77d9de |
| 20260924090000_add_inquiry_car_owner_count | true | false | 0 | 9d1907af1d9f25a93f9448cd0a10929aaf2451874652e4d018f3f899717bab01 |
| 20260928090000_add_inventory_documents | true | false | 0 | 0a55e388a770ed1ad34e3ab876030f09512c8ff13750808c65f57f204fcee75e |
| 20260928110000_add_inquiry_location_master | true | false | 0 | 97a425e72020bec1370ba6fd72e4eebcc08c99a851f361e0864a7b8660a36ab8 |
| 20261008150000_add_inquiry_portal_assignments | true | false | 0 | 0613152ca37420ada03de6300a8afb896ab6b14875c8ce7ec05c3874ef698651 |
| 20261008160000_add_partner_webhook_lead_idempotency | true | false | 0 | 190f022f1f6b6b58e823aa642813213448996876d8a81c2995a5f44be295efc6 |
| 20261009120000_allow_short_inventory_registration_repeats | true | false | 0 | ceb56fd1c18f84d0b63f89522163fafeb0c9e5d8068ca2de8a0d60a3cfc93312 |
| 20261015103000_only_full_inventory_registrations_unique | true | false | 0 | 0e7314abb567e35c0faa2dcb8d19774c1db41a32ed33672968426c96085f0e50 |
| 20261016113000_add_partner_webhook_raw_payloads | true | false | 0 | 5f47001b797053a89b99357e96938373aa1f603f4898219785830689839398be |
| 20261016120000_add_user_notifications | true | false | 0 | e936f116b7a79bbfeb642ead8c1c1e5cb5225c8064ec6bfd563148cc6e666304 |
| 20261019120000_make_insurance_reminders_expiry_specific | true | false | 0 | 599b00d8ccc7e757116ce07ecff20cea97644e1099f88fe35dd4532823c7a7fe |
| 20261022130000_add_inquiry_dashboard_indexes | true | false | 1 | 4f60dfe65d3755f7ee41c85b36a53d0c59b311dc1ea95862876853c6a5938ca7 |

## Additional objects

| Object | Count |
| --- | --- |
| enums | 0 |
| views | 0 |
| triggers | 0 |
| policies | 0 |

