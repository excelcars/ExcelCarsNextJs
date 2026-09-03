-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."access_function" (
    "access_function_id" SERIAL NOT NULL,
    "access_function_name" TEXT,
    "role_id_legacy" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16391_pk_access_function" PRIMARY KEY ("access_function_id")
);

-- CreateTable
CREATE TABLE "public"."access_function_role" (
    "access_function_id" INTEGER NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "idx_16397_pk_access_function_role" PRIMARY KEY ("access_function_id","role_id")
);

-- CreateTable
CREATE TABLE "public"."add_employee" (
    "emp_id" SERIAL NOT NULL,
    "emp_first_name" TEXT,
    "emp_last_name" TEXT,
    "emp_gender" TEXT,
    "emp_address" TEXT,
    "emp_city" TEXT,
    "emp_state_legacy" TEXT,
    "emp_pincode" TEXT,
    "emp_mobile_no" TEXT,
    "emp_phone_no" TEXT,
    "emp_email_id" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_state_id" INTEGER,

    CONSTRAINT "idx_16401_pk_add_employee" PRIMARY KEY ("emp_id")
);

-- CreateTable
CREATE TABLE "public"."car_make_master" (
    "pk_make_id" SERIAL NOT NULL,
    "make" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16408_pk_make" PRIMARY KEY ("pk_make_id")
);

-- CreateTable
CREATE TABLE "public"."car_model_master" (
    "pk_model_id" SERIAL NOT NULL,
    "fk_make_id" INTEGER,
    "model" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16415_pk_car_model_master" PRIMARY KEY ("pk_model_id")
);

-- CreateTable
CREATE TABLE "public"."car_variant_master" (
    "pk_variant_id" SERIAL NOT NULL,
    "fk_make_id" INTEGER,
    "fk_model_id" INTEGER,
    "variant" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16422_pk_car_variant_master" PRIMARY KEY ("pk_variant_id")
);

-- CreateTable
CREATE TABLE "public"."check_list_doc_main" (
    "document_id" SERIAL NOT NULL,
    "inventory_id" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "variant" TEXT,
    "colour" TEXT,
    "registration_no" TEXT,
    "year" INTEGER,
    "fuel_type" TEXT,
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "customer_mobile_legacy" TEXT,
    "customer_email_legacy" TEXT,
    "created_by" INTEGER,
    "created_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16429_pk_check_list_documents" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "public"."checklist_doc_details" (
    "checklist_details_id" SERIAL NOT NULL,
    "fk_document_id" INTEGER,
    "document_name" TEXT,
    "applicable" TEXT,
    "received" TEXT,
    "original_copy" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16436_pk_checklist_doc_details" PRIMARY KEY ("checklist_details_id")
);

-- CreateTable
CREATE TABLE "public"."customer" (
    "cust_id" SERIAL NOT NULL,
    "type" TEXT,
    "cust_name" TEXT NOT NULL,
    "cust_address" TEXT,
    "cust_mobile" TEXT,
    "mobile_2" TEXT,
    "cust_email" TEXT,
    "cust_dob" TIMESTAMPTZ(6),
    "cust_anniversary_dt" TIMESTAMPTZ(6),
    "comments" TEXT,
    "company_name" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER NOT NULL,
    "fk_state_id" INTEGER,

    CONSTRAINT "idx_16443_pk_customer" PRIMARY KEY ("cust_id")
);

-- CreateTable
CREATE TABLE "public"."customer_feedback" (
    "feedback_id" SERIAL NOT NULL,
    "customer_id" INTEGER,
    "customer_name" TEXT,
    "customer_mob" TEXT,
    "customer_email" TEXT,
    "customer_dob" TIMESTAMPTZ(6),
    "customer_anniversary_dt" TIMESTAMPTZ(6),
    "car_make_legacy" TEXT,
    "car_model_legacy" TEXT,
    "car_variant_legacy" TEXT,
    "car_year" INTEGER,
    "car_registration_no" TEXT,
    "answer_1" TEXT,
    "answer_2" TEXT,
    "answer_3" TEXT,
    "answer_4" TEXT,
    "answer_5" TEXT,
    "comments" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,

    CONSTRAINT "idx_16450_pk_customer_feedback" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "public"."dealer_master" (
    "dealer_id" SERIAL NOT NULL,
    "dealer_name" TEXT,
    "dealer_mobile_no" TEXT,
    "dealer_mobile_no_2" TEXT,
    "dealer_email" TEXT,
    "dealer_address" TEXT,
    "dealer_company_name" TEXT,
    "dealer_website" TEXT,
    "created_by" INTEGER,
    "created_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16457_pk_dealer_master" PRIMARY KEY ("dealer_id")
);

-- CreateTable
CREATE TABLE "public"."dsa_management" (
    "dsa_main_id" SERIAL NOT NULL,
    "inventory_id" INTEGER,
    "dsa_agent_name" TEXT,
    "dsa_agent_mobile_no" TEXT,
    "dsa_agent_email" TEXT,
    "dsa_entry_date" TIMESTAMPTZ(6),
    "dsa_bank_name" TEXT,
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "car_model_legacy" TEXT,
    "car_registration_no" TEXT,
    "loan_amount" DECIMAL,
    "percentage_of_payout" DECIMAL,
    "payout_amount" DECIMAL,
    "payment_status" TEXT,
    "amount_paid" DECIMAL,
    "remark" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_partner_id" INTEGER,
    "fk_variant_id" INTEGER,

    CONSTRAINT "idx_16464_pk_dsa_management" PRIMARY KEY ("dsa_main_id")
);

-- CreateTable
CREATE TABLE "public"."email_attachment" (
    "attachment_id" SERIAL NOT NULL,
    "fk_type_id" INTEGER,
    "path" TEXT,
    "message" TEXT,

    CONSTRAINT "idx_16471_pk_email_attachment" PRIMARY KEY ("attachment_id")
);

-- CreateTable
CREATE TABLE "public"."exception_logging" (
    "loggins_id" SERIAL NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_name" TEXT,
    "url" TEXT,
    "code" TEXT,
    "message" TEXT,
    "error" TEXT,
    "datetime" TIMESTAMPTZ(6),
    "source" TEXT,
    "ipaddress" TEXT,
    "create_dt" TIMESTAMPTZ(6) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "update_dt" TIMESTAMPTZ(6) NOT NULL,
    "update_by" INTEGER NOT NULL,

    CONSTRAINT "idx_16478_pk_loggin" PRIMARY KEY ("loggins_id")
);

-- CreateTable
CREATE TABLE "public"."feedback_invitation" (
    "feedback_invitation_id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "submitted_at" TIMESTAMPTZ(6),
    "invalidated_at" TIMESTAMPTZ(6),
    "created_by" INTEGER,

    CONSTRAINT "feedback_invitation_pkey" PRIMARY KEY ("feedback_invitation_id")
);

-- CreateTable
CREATE TABLE "public"."followup_inquiry" (
    "pk_followup_id" SERIAL NOT NULL,
    "fk_inquiry_id" INTEGER,
    "followup_date" TIMESTAMPTZ(6),
    "followup_status" TEXT,
    "followup_sub_status" TEXT,
    "comments" TEXT,
    "followup_classification" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16485_pk_followup_inquiry" PRIMARY KEY ("pk_followup_id")
);

-- CreateTable
CREATE TABLE "public"."forgot_password" (
    "forgot_password_id" SERIAL NOT NULL,
    "verification_code" TEXT,
    "email_address" TEXT,
    "active_fl" BOOLEAN,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16492_pk_forgot_password" PRIMARY KEY ("forgot_password_id")
);

-- CreateTable
CREATE TABLE "public"."indian_states_master" (
    "statename" TEXT NOT NULL,
    "state_id" SERIAL NOT NULL,

    CONSTRAINT "idx_16499_pk_indian_states_master" PRIMARY KEY ("state_id")
);

-- CreateTable
CREATE TABLE "public"."inquiry" (
    "inquiry_id" SERIAL NOT NULL,
    "inquiry_no" TEXT,
    "date_of_inquiry" TIMESTAMPTZ(6),
    "website" TEXT,
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "mobileno" TEXT,
    "email" TEXT,
    "budget_of_customer" DECIMAL,
    "visited_date_of_customer" TIMESTAMPTZ(6),
    "classification" TEXT,
    "status" TEXT,
    "sub_status" TEXT,
    "follow_up_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16506_pk_inquiry" PRIMARY KEY ("inquiry_id")
);

-- CreateTable
CREATE TABLE "public"."inquiry_car_details" (
    "inquiry_car_details_id" SERIAL NOT NULL,
    "fk_inquiry_id" INTEGER,
    "make_legacy" TEXT,
    "model_legacy" TEXT,
    "variant_legacy" TEXT,
    "sub_variant" TEXT,
    "year" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,

    CONSTRAINT "idx_16513_pk_inquiry_car_details" PRIMARY KEY ("inquiry_car_details_id")
);

-- CreateTable
CREATE TABLE "public"."inquiry_inventory_links" (
    "inquiry_inventory_link_id" SERIAL NOT NULL,
    "inquiry_id" INTEGER NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "link_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" INTEGER,

    CONSTRAINT "idx_inquiry_inventory_links_pk" PRIMARY KEY ("inquiry_inventory_link_id")
);

-- CreateTable
CREATE TABLE "public"."insurance_followup_details" (
    "insurance_followup_id" SERIAL NOT NULL,
    "fk_insurance_main_id" INTEGER,
    "followup_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16520_pk_insurance_followup_details" PRIMARY KEY ("insurance_followup_id")
);

-- CreateTable
CREATE TABLE "public"."insurance_main" (
    "insurance_main_id" SERIAL NOT NULL,
    "inventory_id" INTEGER,
    "agent_name_legacy" TEXT,
    "agent_mobile_no_legacy" TEXT,
    "agent_email_id_legacy" TEXT,
    "entry_date" TIMESTAMPTZ(6),
    "renewal_date" TIMESTAMPTZ(6),
    "expiry_date" TIMESTAMPTZ(6),
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "customer_mobile_legacy" TEXT,
    "customer_email_legacy" TEXT,
    "car_type" TEXT,
    "car_make_legacy" TEXT,
    "car_model_legacy" TEXT,
    "car_variant_legacy" TEXT,
    "car_year" INTEGER,
    "car_registration_no" TEXT,
    "insurance_premium" DECIMAL,
    "o_d_premium" DECIMAL,
    "payout_percentage_od_premium" DECIMAL,
    "payout_amount" DECIMAL,
    "total_amount_received" DECIMAL,
    "payout_payment_status" TEXT,
    "policy_status" TEXT,
    "followup_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,
    "fk_partner_id" INTEGER,

    CONSTRAINT "idx_16527_pk_insurance_details" PRIMARY KEY ("insurance_main_id")
);

-- CreateTable
CREATE TABLE "public"."insurance_payment_details" (
    "insurance_payment_id" SERIAL NOT NULL,
    "fk_insurance_main_id" INTEGER,
    "amount_received" DECIMAL,
    "payout_amount" DECIMAL,
    "payout_payment_status" TEXT,
    "policy_status" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16534_pk_insurance_payment_details" PRIMARY KEY ("insurance_payment_id")
);

-- CreateTable
CREATE TABLE "public"."inventory_management" (
    "inventory_id" SERIAL NOT NULL,
    "inventory_number" TEXT,
    "make_legacy" TEXT,
    "model_legacy" TEXT,
    "variant_legacy" TEXT,
    "colour" TEXT,
    "sku" TEXT,
    "year" INTEGER,
    "month" TEXT,
    "fuel_type" TEXT,
    "no_of_owners" INTEGER,
    "tax" TEXT,
    "is_car_registered" BOOLEAN,
    "registration_no" TEXT,
    "kms_driven" DECIMAL,
    "insurance_type" TEXT,
    "price" DECIMAL,
    "other_remarks" TEXT,
    "status" TEXT,
    "owned_type" TEXT,
    "owned_by" TEXT,
    "mobile_no_owned_by" TEXT,
    "email_id_owned_by" TEXT,
    "customer_id" INTEGER,
    "customer_name" TEXT,
    "internal_comments" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,

    CONSTRAINT "idx_16541_pk_inventory_management" PRIMARY KEY ("inventory_id")
);

-- CreateTable
CREATE TABLE "public"."inventory_photos" (
    "document_id" SERIAL NOT NULL,
    "inventory_number_legacy" TEXT,
    "path" TEXT,
    "fk_inventory_id" INTEGER,

    CONSTRAINT "idx_16548_pk_inventory_photos" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "public"."loan_followup_details" (
    "loan_followup_id" SERIAL NOT NULL,
    "fk_loan_management_id" INTEGER,
    "followup_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16555_pk_loan_followup_details" PRIMARY KEY ("loan_followup_id")
);

-- CreateTable
CREATE TABLE "public"."loan_management" (
    "loan_management_id" SERIAL NOT NULL,
    "entry_date" TIMESTAMPTZ(6),
    "bank_name" TEXT,
    "bank_person_name" TEXT,
    "bank_person_mobile_no" TEXT,
    "bank_person_email_id" TEXT,
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "customer_mobile_legacy" TEXT,
    "customer_email_legacy" TEXT,
    "inventory_id" INTEGER,
    "registration_no" TEXT,
    "car_type" TEXT,
    "car_make" TEXT,
    "car_model" TEXT,
    "car_variant" TEXT,
    "car_year" INTEGER,
    "loan_amount" DECIMAL,
    "percentage_payout_amount" DECIMAL,
    "payout_amount" DECIMAL,
    "total_amount_received" DECIMAL,
    "payment_status" TEXT,
    "payment_date" TIMESTAMPTZ(6),
    "remarks" TEXT,
    "followup_date" TIMESTAMPTZ(6),
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,
    "fk_partner_id" INTEGER,

    CONSTRAINT "idx_16562_pk_financial_management" PRIMARY KEY ("loan_management_id")
);

-- CreateTable
CREATE TABLE "public"."loan_payment_details" (
    "loan_payment_id" SERIAL NOT NULL,
    "fk_loan_management_id" INTEGER,
    "loan_amount" DECIMAL,
    "payout_amount" DECIMAL,
    "amount_paid" DECIMAL,
    "bank_name" TEXT,
    "payment_date" TIMESTAMPTZ(6),
    "payment_status" TEXT,
    "created_by" INTEGER,
    "created_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16569_pk_loan_payment_details" PRIMARY KEY ("loan_payment_id")
);

-- CreateTable
CREATE TABLE "public"."message_template" (
    "type_id" SERIAL NOT NULL,
    "message_type" TEXT,
    "message_subject" TEXT,
    "message_body" TEXT,
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16576_pk_message_template" PRIMARY KEY ("type_id")
);

-- CreateTable
CREATE TABLE "public"."partner_master" (
    "partner_id" SERIAL NOT NULL,
    "partner_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "email" TEXT,

    CONSTRAINT "idx_16583_pk__partner___93b7f6d5beabac5c" PRIMARY KEY ("partner_id")
);

-- CreateTable
CREATE TABLE "public"."role_access_audit" (
    "role_access_audit_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "role_name_snapshot" TEXT,
    "changed_by_user_id" INTEGER NOT NULL,
    "changed_by_user_name" TEXT,
    "changed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "added_function_names_csv" TEXT,
    "removed_function_names_csv" TEXT,
    "before_function_names_csv" TEXT,
    "after_function_names_csv" TEXT,

    CONSTRAINT "pk_role_access_audit" PRIMARY KEY ("role_access_audit_id")
);

-- CreateTable
CREATE TABLE "public"."role_master" (
    "role_id" SERIAL NOT NULL,
    "role_name" TEXT,
    "created_by" INTEGER,
    "created_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),

    CONSTRAINT "idx_16590_pk_role_master" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "public"."rto_agent" (
    "rto_agent_main_id" SERIAL NOT NULL,
    "inventory_id" INTEGER,
    "agent_name_legacy" TEXT,
    "agent_mobile_no_legacy" TEXT,
    "agent_email_id_legacy" TEXT,
    "date_of_entry" TIMESTAMPTZ(6),
    "customer_id" INTEGER,
    "customer_name_legacy" TEXT,
    "customer_mob_legacy" TEXT,
    "customer_email_legacy" TEXT,
    "car_type" TEXT,
    "car_make_legacy" TEXT,
    "car_model_legacy" TEXT,
    "car_variant_legacy" TEXT,
    "car_registration_no" TEXT,
    "car_year" INTEGER,
    "transfer_charges" DECIMAL,
    "amt_paid" DECIMAL,
    "payment_status" TEXT,
    "payment_date" TIMESTAMPTZ(6),
    "rc_status" TEXT,
    "transfer_status" TEXT,
    "followup_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,
    "fk_variant_id" INTEGER,
    "fk_partner_id" INTEGER,

    CONSTRAINT "idx_16597_pk_rto_agent" PRIMARY KEY ("rto_agent_main_id")
);

-- CreateTable
CREATE TABLE "public"."rto_followup_details" (
    "rto_followup_id" SERIAL NOT NULL,
    "fk_rto_agent_main_id" INTEGER,
    "followup_date" TIMESTAMPTZ(6),
    "remark" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16604_pk_rto_followup_details" PRIMARY KEY ("rto_followup_id")
);

-- CreateTable
CREATE TABLE "public"."rto_payment_details" (
    "rto_payment_id" SERIAL NOT NULL,
    "fk_rto_agent_main_id" INTEGER,
    "transfer_charges" DECIMAL,
    "amount_paid" DECIMAL,
    "payment_status" TEXT,
    "payment_date" TIMESTAMPTZ(6),
    "transfer_status" TEXT,
    "rc_status" TEXT,
    "created_dt" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_dt" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16611_pk_rto_payment_details" PRIMARY KEY ("rto_payment_id")
);

-- CreateTable
CREATE TABLE "public"."system_default" (
    "system_default_id" INTEGER NOT NULL,
    "system_default_name" TEXT,
    "value" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_dt" TIMESTAMPTZ(6) NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "updated_dt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pk_system_default" PRIMARY KEY ("system_default_id")
);

-- CreateTable
CREATE TABLE "public"."user_table" (
    "user_id" SERIAL NOT NULL,
    "user_name" TEXT,
    "password_hash" TEXT,
    "role_id" INTEGER,
    "role_name" TEXT,
    "status" TEXT,
    "emp_id" INTEGER,
    "display_name" TEXT,
    "email_id" TEXT,
    "last_login_time" TIMESTAMPTZ(6),
    "last_logout_time" TIMESTAMPTZ(6),
    "created_date" TIMESTAMPTZ(6),
    "created_by" INTEGER,
    "updated_date" TIMESTAMPTZ(6),
    "updated_by" INTEGER,

    CONSTRAINT "idx_16623_pk_user_table" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_email_link_interactions" (
    "vehicle_email_link_interaction_id" SERIAL NOT NULL,
    "vehicle_email_link_id" INTEGER NOT NULL,
    "interaction_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "interaction_type" TEXT NOT NULL,
    "interaction_label" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "referrer" TEXT,

    CONSTRAINT "idx_vehicle_email_link_interactions_pk" PRIMARY KEY ("vehicle_email_link_interaction_id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_email_link_visits" (
    "vehicle_email_link_visit_id" SERIAL NOT NULL,
    "vehicle_email_link_id" INTEGER NOT NULL,
    "visited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "visit_kind" TEXT NOT NULL,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "referrer" TEXT,

    CONSTRAINT "idx_vehicle_email_link_visits_pk" PRIMARY KEY ("vehicle_email_link_visit_id")
);

-- CreateTable
CREATE TABLE "public"."vehicle_email_links" (
    "vehicle_email_link_id" SERIAL NOT NULL,
    "inventory_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "recipient_email" TEXT NOT NULL,
    "recipient_name" TEXT,
    "token_hash" TEXT NOT NULL,
    "email_sent_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "first_requested_at" TIMESTAMPTZ(6),
    "first_human_view_at" TIMESTAMPTZ(6),
    "last_requested_at" TIMESTAMPTZ(6),
    "request_count" INTEGER NOT NULL DEFAULT 0,
    "human_view_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "idx_vehicle_email_links_pk" PRIMARY KEY ("vehicle_email_link_id")
);

-- CreateIndex
CREATE INDEX "idx_16415_ix_car_model_master_fk_make_id" ON "public"."car_model_master"("fk_make_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16422_ix_car_variant_master_fk_make_id" ON "public"."car_variant_master"("fk_make_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16422_ix_car_variant_master_fk_model_id" ON "public"."car_variant_master"("fk_model_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16429_ix_check_list_doc_main_customer_id" ON "public"."check_list_doc_main"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16429_ix_check_list_doc_main_inventory_id" ON "public"."check_list_doc_main"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16436_ix_checklist_doc_details_fk_document_id" ON "public"."checklist_doc_details"("fk_document_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16450_ix_customer_feedback_customer_id" ON "public"."customer_feedback"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16450_ix_customer_feedback_variant" ON "public"."customer_feedback"("fk_variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16464_ix_dsa_management_customer_id" ON "public"."dsa_management"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16464_ix_dsa_management_inventory_id" ON "public"."dsa_management"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "ix_dsa_management_variant" ON "public"."dsa_management"("fk_variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16471_ix_email_attachment_type" ON "public"."email_attachment"("fk_type_id" ASC);

-- CreateIndex
CREATE INDEX "feedback_invitation_customer_id_inventory_id_idx" ON "public"."feedback_invitation"("customer_id" ASC, "inventory_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "feedback_invitation_token_hash_key" ON "public"."feedback_invitation"("token_hash" ASC);

-- CreateIndex
CREATE INDEX "ix_followup_inquiry_inquiry" ON "public"."followup_inquiry"("fk_inquiry_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_16499_uq_indian_states_master_name" ON "public"."indian_states_master"("statename" ASC);

-- CreateIndex
CREATE INDEX "idx_16506_ix_inquiry_customer_id" ON "public"."inquiry"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16513_ix_inquiry_car_details_variant" ON "public"."inquiry_car_details"("fk_variant_id" ASC);

-- CreateIndex
CREATE INDEX "ix_inquiry_car_details_inquiry" ON "public"."inquiry_car_details"("fk_inquiry_id" ASC);

-- CreateIndex
CREATE INDEX "idx_inquiry_inventory_links_inquiry_id" ON "public"."inquiry_inventory_links"("inquiry_id" ASC);

-- CreateIndex
CREATE INDEX "idx_inquiry_inventory_links_inventory_id" ON "public"."inquiry_inventory_links"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_inquiry_inventory_links_lookup" ON "public"."inquiry_inventory_links"("inquiry_id" ASC, "inventory_id" ASC, "link_type" ASC);

-- CreateIndex
CREATE INDEX "idx_16520_ix_insurance_followup_details_fk_insurance_main_id" ON "public"."insurance_followup_details"("fk_insurance_main_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16527_ix_insurance_main_customer_id" ON "public"."insurance_main"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16527_ix_insurance_main_inventory_id" ON "public"."insurance_main"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16527_ix_insurance_main_partner" ON "public"."insurance_main"("fk_partner_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16527_ix_insurance_main_variant" ON "public"."insurance_main"("fk_variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16534_ix_insurance_payment_details_fk_insurance_main_id" ON "public"."insurance_payment_details"("fk_insurance_main_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16541_ix_inventory_management_customer_id" ON "public"."inventory_management"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16541_ix_inventory_management_variant" ON "public"."inventory_management"("fk_variant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_16541_uq_inventory_management_inventory_number" ON "public"."inventory_management"("inventory_number" ASC);

-- CreateIndex
CREATE INDEX "idx_16548_ix_inventory_photos_inventory" ON "public"."inventory_photos"("fk_inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16555_ix_loan_followup_details_fk_loan_management_id" ON "public"."loan_followup_details"("fk_loan_management_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16562_ix_loan_management_customer_id" ON "public"."loan_management"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16562_ix_loan_management_inventory_id" ON "public"."loan_management"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16569_ix_loan_payment_details_fk_loan_management_id" ON "public"."loan_payment_details"("fk_loan_management_id" ASC);

-- CreateIndex
CREATE INDEX "ix_role_access_audit_changed_at" ON "public"."role_access_audit"("changed_at" ASC);

-- CreateIndex
CREATE INDEX "ix_role_access_audit_changed_by_user_id" ON "public"."role_access_audit"("changed_by_user_id" ASC);

-- CreateIndex
CREATE INDEX "ix_role_access_audit_role_id" ON "public"."role_access_audit"("role_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16597_ix_rto_agent_customer_id" ON "public"."rto_agent"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16597_ix_rto_agent_inventory_id" ON "public"."rto_agent"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16597_ix_rto_agent_partner" ON "public"."rto_agent"("fk_partner_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16597_ix_rto_agent_variant" ON "public"."rto_agent"("fk_variant_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16604_ix_rto_followup_details_fk_rto_agent_main_id" ON "public"."rto_followup_details"("fk_rto_agent_main_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16611_ix_rto_payment_details_fk_rto_agent_main_id" ON "public"."rto_payment_details"("fk_rto_agent_main_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16623_ix_user_table_emp_id" ON "public"."user_table"("emp_id" ASC);

-- CreateIndex
CREATE INDEX "idx_16623_ix_user_table_role_id" ON "public"."user_table"("role_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_link_interactions_link_id" ON "public"."vehicle_email_link_interactions"("vehicle_email_link_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_link_interactions_type" ON "public"."vehicle_email_link_interactions"("interaction_type" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_link_visits_link_id" ON "public"."vehicle_email_link_visits"("vehicle_email_link_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_links_customer_id" ON "public"."vehicle_email_links"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_links_inventory_id" ON "public"."vehicle_email_links"("inventory_id" ASC);

-- CreateIndex
CREATE INDEX "idx_vehicle_email_links_recipient_email" ON "public"."vehicle_email_links"("recipient_email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idx_vehicle_email_links_token_hash_uq" ON "public"."vehicle_email_links"("token_hash" ASC);

-- AddForeignKey
ALTER TABLE "public"."access_function" ADD CONSTRAINT "fk_access_function_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."access_function" ADD CONSTRAINT "fk_access_function_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."access_function_role" ADD CONSTRAINT "fk_afr_function" FOREIGN KEY ("access_function_id") REFERENCES "public"."access_function"("access_function_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."access_function_role" ADD CONSTRAINT "fk_afr_role" FOREIGN KEY ("role_id") REFERENCES "public"."role_master"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."add_employee" ADD CONSTRAINT "fk_add_employee_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."add_employee" ADD CONSTRAINT "fk_add_employee_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."add_employee" ADD CONSTRAINT "fk_addemployee_state" FOREIGN KEY ("fk_state_id") REFERENCES "public"."indian_states_master"("state_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_make_master" ADD CONSTRAINT "fk_car_make_master_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_make_master" ADD CONSTRAINT "fk_car_make_master_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_model_master" ADD CONSTRAINT "fk_car_model_master_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_model_master" ADD CONSTRAINT "fk_car_model_master_fk_make_id" FOREIGN KEY ("fk_make_id") REFERENCES "public"."car_make_master"("pk_make_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_model_master" ADD CONSTRAINT "fk_car_model_master_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_variant_master" ADD CONSTRAINT "fk_car_variant_master_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_variant_master" ADD CONSTRAINT "fk_car_variant_master_fk_make_id" FOREIGN KEY ("fk_make_id") REFERENCES "public"."car_make_master"("pk_make_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_variant_master" ADD CONSTRAINT "fk_car_variant_master_fk_model_id" FOREIGN KEY ("fk_model_id") REFERENCES "public"."car_model_master"("pk_model_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."car_variant_master" ADD CONSTRAINT "fk_car_variant_master_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."check_list_doc_main" ADD CONSTRAINT "fk_check_list_doc_main_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."check_list_doc_main" ADD CONSTRAINT "fk_check_list_doc_main_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."checklist_doc_details" ADD CONSTRAINT "fk_checklist_doc_details_fk_document_id" FOREIGN KEY ("fk_document_id") REFERENCES "public"."check_list_doc_main"("document_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer" ADD CONSTRAINT "fk_customer_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer" ADD CONSTRAINT "fk_customer_state" FOREIGN KEY ("fk_state_id") REFERENCES "public"."indian_states_master"("state_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer" ADD CONSTRAINT "fk_customer_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_feedback" ADD CONSTRAINT "fk_customer_feedback_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_feedback" ADD CONSTRAINT "fk_customer_feedback_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_feedback" ADD CONSTRAINT "fk_customer_feedback_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."customer_feedback" ADD CONSTRAINT "fk_customer_feedback_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dealer_master" ADD CONSTRAINT "fk_dealer_master_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dealer_master" ADD CONSTRAINT "fk_dealer_master_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dsa_management" ADD CONSTRAINT "fk_dsa_management_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dsa_management" ADD CONSTRAINT "fk_dsa_management_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dsa_management" ADD CONSTRAINT "fk_dsa_management_partner" FOREIGN KEY ("fk_partner_id") REFERENCES "public"."partner_master"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."dsa_management" ADD CONSTRAINT "fk_dsa_management_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."email_attachment" ADD CONSTRAINT "fk_email_attachment_type" FOREIGN KEY ("fk_type_id") REFERENCES "public"."message_template"("type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."feedback_invitation" ADD CONSTRAINT "feedback_invitation_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feedback_invitation" ADD CONSTRAINT "feedback_invitation_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."followup_inquiry" ADD CONSTRAINT "fk_followup_inquiry_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."followup_inquiry" ADD CONSTRAINT "fk_followup_inquiry_inquiry" FOREIGN KEY ("fk_inquiry_id") REFERENCES "public"."inquiry"("inquiry_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."followup_inquiry" ADD CONSTRAINT "fk_followup_inquiry_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry" ADD CONSTRAINT "fk_inquiry_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry" ADD CONSTRAINT "fk_inquiry_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry" ADD CONSTRAINT "fk_inquiry_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_car_details" ADD CONSTRAINT "fk_inquiry_car_details_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_car_details" ADD CONSTRAINT "fk_inquiry_car_details_inquiry" FOREIGN KEY ("fk_inquiry_id") REFERENCES "public"."inquiry"("inquiry_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_car_details" ADD CONSTRAINT "fk_inquiry_car_details_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_car_details" ADD CONSTRAINT "fk_inquiry_car_details_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_inventory_links" ADD CONSTRAINT "fk_inquiry_inventory_links_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_inventory_links" ADD CONSTRAINT "fk_inquiry_inventory_links_inquiry" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiry"("inquiry_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_inventory_links" ADD CONSTRAINT "fk_inquiry_inventory_links_inventory" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inquiry_inventory_links" ADD CONSTRAINT "fk_inquiry_inventory_links_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_followup_details" ADD CONSTRAINT "fk_insurance_followup_details_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_followup_details" ADD CONSTRAINT "fk_insurance_followup_details_fk_insurance_main_id" FOREIGN KEY ("fk_insurance_main_id") REFERENCES "public"."insurance_main"("insurance_main_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_followup_details" ADD CONSTRAINT "fk_insurance_followup_details_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_partner" FOREIGN KEY ("fk_partner_id") REFERENCES "public"."partner_master"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_main" ADD CONSTRAINT "fk_insurance_main_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_payment_details" ADD CONSTRAINT "fk_insurance_payment_details_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_payment_details" ADD CONSTRAINT "fk_insurance_payment_details_fk_insurance_main_id" FOREIGN KEY ("fk_insurance_main_id") REFERENCES "public"."insurance_main"("insurance_main_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."insurance_payment_details" ADD CONSTRAINT "fk_insurance_payment_details_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory_management" ADD CONSTRAINT "fk_inventory_management_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory_management" ADD CONSTRAINT "fk_inventory_management_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory_management" ADD CONSTRAINT "fk_inventory_management_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory_management" ADD CONSTRAINT "fk_inventory_management_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."inventory_photos" ADD CONSTRAINT "fk_inventory_photos_inventory" FOREIGN KEY ("fk_inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_followup_details" ADD CONSTRAINT "fk_loan_followup_details_fk_loan_management_id" FOREIGN KEY ("fk_loan_management_id") REFERENCES "public"."loan_management"("loan_management_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_management" ADD CONSTRAINT "fk_loan_management_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_management" ADD CONSTRAINT "fk_loan_management_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_management" ADD CONSTRAINT "fk_loan_management_partner" FOREIGN KEY ("fk_partner_id") REFERENCES "public"."partner_master"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_management" ADD CONSTRAINT "fk_loan_management_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."loan_payment_details" ADD CONSTRAINT "fk_loan_payment_details_fk_loan_management_id" FOREIGN KEY ("fk_loan_management_id") REFERENCES "public"."loan_management"("loan_management_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."message_template" ADD CONSTRAINT "fk_message_template_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."message_template" ADD CONSTRAINT "fk_message_template_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_master" ADD CONSTRAINT "fk_role_master_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."role_master" ADD CONSTRAINT "fk_role_master_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_inventory_id" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_partner" FOREIGN KEY ("fk_partner_id") REFERENCES "public"."partner_master"("partner_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_agent" ADD CONSTRAINT "fk_rto_agent_variant" FOREIGN KEY ("fk_variant_id") REFERENCES "public"."car_variant_master"("pk_variant_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_followup_details" ADD CONSTRAINT "fk_rto_followup_details_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_followup_details" ADD CONSTRAINT "fk_rto_followup_details_fk_rto_agent_main_id" FOREIGN KEY ("fk_rto_agent_main_id") REFERENCES "public"."rto_agent"("rto_agent_main_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_followup_details" ADD CONSTRAINT "fk_rto_followup_details_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_payment_details" ADD CONSTRAINT "fk_rto_payment_details_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_payment_details" ADD CONSTRAINT "fk_rto_payment_details_fk_rto_agent_main_id" FOREIGN KEY ("fk_rto_agent_main_id") REFERENCES "public"."rto_agent"("rto_agent_main_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."rto_payment_details" ADD CONSTRAINT "fk_rto_payment_details_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."system_default" ADD CONSTRAINT "fk_system_default_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."system_default" ADD CONSTRAINT "fk_system_default_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_table" ADD CONSTRAINT "fk_user_table_created_by_user" FOREIGN KEY ("created_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_table" ADD CONSTRAINT "fk_user_table_emp_id" FOREIGN KEY ("emp_id") REFERENCES "public"."add_employee"("emp_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_table" ADD CONSTRAINT "fk_user_table_role_id" FOREIGN KEY ("role_id") REFERENCES "public"."role_master"("role_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."user_table" ADD CONSTRAINT "fk_user_table_updated_by_user" FOREIGN KEY ("updated_by") REFERENCES "public"."user_table"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicle_email_link_interactions" ADD CONSTRAINT "fk_vehicle_email_link_interactions_link" FOREIGN KEY ("vehicle_email_link_id") REFERENCES "public"."vehicle_email_links"("vehicle_email_link_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicle_email_link_visits" ADD CONSTRAINT "fk_vehicle_email_link_visits_link" FOREIGN KEY ("vehicle_email_link_id") REFERENCES "public"."vehicle_email_links"("vehicle_email_link_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicle_email_links" ADD CONSTRAINT "fk_vehicle_email_links_customer" FOREIGN KEY ("customer_id") REFERENCES "public"."customer"("cust_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."vehicle_email_links" ADD CONSTRAINT "fk_vehicle_email_links_inventory" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory_management"("inventory_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
