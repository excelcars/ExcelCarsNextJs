"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Car,
  Loader2,
  X,
} from "lucide-react";
import {
  ActionAlert,
  Btn,
  ConfirmDialog,
  Input,
  LoadingOverlay,
  Modal,
  Textarea,
} from "@/components/ui";
import { CustomerPicker } from "@/components/CustomerPicker";
import {
  createFeedback,
  deleteFeedback,
  getFeedbackForAction,
  searchFeedbackVehicles,
  sendFeedbackInvitation,
  updateFeedback,
  type FeedbackFormInput,
} from "./actions";
import type { ListRow, Detail } from "./types";
import { FeedbackHeader, FeedbackFilters, FeedbackList, FeedbackPagination, FeedbackDetails } from "./FeedbackUI";
import { FeedbackContactFields, FeedbackVehicleFields, FeedbackQuestions } from "./FeedbackFormFields";

type Customer = {
  custId: number;
  custName: string;
  custMobile: string | null;
  custEmail: string | null;
};
type Vehicle = {
  inventoryId: number;
  customerId: number | null;
  registrationNo: string | null;
  sku: string | null;
  year: number | null;
  fkVariantId: number | null;
  carVariantMaster: {
    variant: string | null;
    carMakeMaster: { make: string | null } | null;
    carModelMaster: { model: string | null } | null;
  } | null;
};

const clean = (value: string | null | undefined) =>
  !value || ["null", "na", "n/a"].includes(value.trim().toLowerCase())
    ? ""
    : value;
const isoDate = (value: Date | string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";
const displayDate = (value: Date | string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "—";
const vehicleLabel = (vehicle: Vehicle) =>
  `${vehicle.registrationNo ?? vehicle.sku ?? "—"} — ${[clean(vehicle.carVariantMaster?.carMakeMaster?.make), clean(vehicle.carVariantMaster?.carModelMaster?.model), clean(vehicle.carVariantMaster?.variant)].filter(Boolean).join(" ") || "Vehicle details unavailable"}`;
const emptyForm = (): FeedbackFormInput => ({
  customerId: null,
  customerName: "",
  customerMob: "",
  customerEmail: "",
  customerDob: "",
  customerAnniversaryDt: "",
  carMakeLegacy: "",
  carModelLegacy: "",
  carVariantLegacy: "",
  carYear: null,
  carRegistrationNo: "",
  fkVariantId: null,
  answer_1: "Neutral",
  answer_2: "Fair",
  answer_3: "Neutral",
  answer_4: "Not Sure",
  answer_5: "About the Same",
  comments: "",
});

function validateFeedbackForm(form: FeedbackFormInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.customerName.trim()) errors.customerName = "Customer name is required.";
  else if (form.customerName.trim().length > 150) errors.customerName = "Name cannot exceed 150 characters.";
  if (!/^\d{10}$/.test(form.customerMob.trim())) errors.customerMob = "Customer mobile must be exactly 10 digits.";
  if (!form.customerEmail.trim()) errors.customerEmail = "Customer email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customerEmail.trim())) errors.customerEmail = "Enter a valid email address.";
  if (form.carYear !== null && (!Number.isInteger(form.carYear) || form.carYear < 1886 || form.carYear > new Date().getFullYear() + 1)) errors.carYear = "Enter a valid vehicle year.";
  const today = new Date().toISOString().slice(0, 10);
  if (form.customerDob && form.customerDob > today) errors.customerDob = "Date of birth cannot be in the future.";
  if (form.customerAnniversaryDt && form.customerAnniversaryDt > today) errors.customerAnniversaryDt = "Anniversary date cannot be in the future.";
  return errors;
}

function downloadCsv(rows: Detail[]) {
  const quote = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headings = [
    "ID",
    "Customer Name",
    "Mobile",
    "Email",
    "DOB",
    "Anniversary",
    "Make",
    "Model",
    "Variant",
    "Year",
    "Registration",
    "Answer 1",
    "Answer 2",
    "Answer 3",
    "Answer 4",
    "Answer 5",
    "Comments",
  ];
  const lines = [
    headings.map(quote).join(","),
    ...rows.map((row) =>
      [
        row.feedbackId,
        row.customerName,
        row.customerMob,
        row.customerEmail,
        displayDate(row.customerDob),
        displayDate(row.customerAnniversaryDt),
        row.carMakeLegacy,
        row.carModelLegacy,
        row.carVariantLegacy,
        row.carYear,
        row.carRegistrationNo,
        row.answer_1,
        row.answer_2,
        row.answer_3,
        row.answer_4,
        row.answer_5,
        row.comments,
      ]
        .map(quote)
        .join(","),
    ),
  ];
  const url = URL.createObjectURL(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function FeedbackClient({
  initialData,
  total,
  page,
  pageCount,
  pageSize,
  sort,
  dir,
  search,
}: {
  initialData: ListRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  sort: string;
  dir: string;
  search: string;
}) {
  const router = useRouter();
  const requestId = useRef(0);
  const [data, setData] = useState(initialData);
  const [searchInput, setSearchInput] = useState(search);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [view, setView] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [form, setForm] = useState<FeedbackFormInput>(emptyForm());
  const [initialForm, setInitialForm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleQuery, setVehicleQuery] = useState("");
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteAlert, setDeleteAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState("");
  const [sendError, setSendError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isExporting, startExport] = useTransition();
  const [isNavigating, startNavigation] = useTransition();
  const dirty = !!modal && JSON.stringify(form) !== initialForm;

  useEffect(() => {
    setData(initialData);
    setSearchInput(search);
  }, [initialData, search]);
  useEffect(() => {
    if (!vehicleOpen) return;
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      const rows = await searchFeedbackVehicles(
        vehicleQuery,
        selectedCustomer?.custId ?? null,
      );
      if (id === requestId.current) setVehicles(rows);
    }, 250);
    return () => clearTimeout(timer);
  }, [vehicleOpen, vehicleQuery, selectedCustomer]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const navigate = (changes: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const values = { search, page, pageSize, sort, dir, ...changes };
    Object.entries(values).forEach(([key, value]) => {
      if (
        value !== undefined &&
        value !== "" &&
        !(key === "page" && Number(value) === 1) &&
        !(key === "pageSize" && Number(value) === 10) &&
        !(key === "sort" && value === "feedbackId") &&
        !(key === "dir" && value === "desc")
      )
        params.set(key, String(value));
    });
    startNavigation(() =>
      router.push(`/config/feedback${params.size ? `?${params}` : ""}`),
    );
  };
  const setField = <K extends keyof FeedbackFormInput>(
    key: K,
    value: FeedbackFormInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  const resetVehicle = () => {
    setSelectedVehicle(null);
    setVehicleQuery("");
    setVehicleOpen(false);
    setVehicles([]);
  };
  const closeForm = () => {
    if (dirty) setDiscardOpen(true);
    else forceCloseForm();
  };
  const forceCloseForm = () => {
    setModal(null);
    setDiscardOpen(false);
    setError("");
    setFieldErrors({});
    setEditId(null);
    resetVehicle();
  };
  const openAdd = () => {
    const value = emptyForm();
    setForm(value);
    setInitialForm(JSON.stringify(value));
    setSelectedCustomer(null);
    resetVehicle();
    setEditId(null);
    setError("");
    setFieldErrors({});
    setModal("add");
  };
  const loadDetail = async (id: number, mode: "view" | "edit") => {
    const idToken = ++requestId.current;
    setLoadingDetail(true);
    setActionError("");
    const detail = await getFeedbackForAction(id);
    if (idToken !== requestId.current) return;
    setLoadingDetail(false);
    if (!detail) {
      setActionError(
        "Feedback record was not found or you are not authorized.",
      );
      return;
    }
    if (mode === "view") {
      setView(detail);
      return;
    }
    const value: FeedbackFormInput = {
      customerId: detail.customerId,
      customerName: detail.customerName ?? "",
      customerMob: detail.customerMob ?? "",
      customerEmail: detail.customerEmail ?? "",
      customerDob: isoDate(detail.customerDob),
      customerAnniversaryDt: isoDate(detail.customerAnniversaryDt),
      carMakeLegacy: clean(detail.carMakeLegacy),
      carModelLegacy: clean(detail.carModelLegacy),
      carVariantLegacy: clean(detail.carVariantLegacy),
      carYear: detail.carYear,
      carRegistrationNo: detail.carRegistrationNo ?? "",
      fkVariantId: detail.fkVariantId,
      answer_1: detail.answer_1 ?? "Neutral",
      answer_2: detail.answer_2 ?? "Fair",
      answer_3: detail.answer_3 ?? "Neutral",
      answer_4: detail.answer_4 ?? "Not Sure",
      answer_5: detail.answer_5 ?? "About the Same",
      comments: detail.comments ?? "",
    };
    setForm(value);
    setInitialForm(JSON.stringify(value));
    setSelectedCustomer(
      detail.customerId
        ? {
            custId: detail.customerId,
            custName: detail.customerName ?? "",
            custMobile: detail.customerMob,
            custEmail: detail.customerEmail,
          }
        : null,
    );
    setEditId(id);
    setFieldErrors({});
    setModal("edit");
  };
  const onCustomerChange = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    if (
      selectedVehicle &&
      customer &&
      selectedVehicle.customerId !== customer.custId
    ) {
      resetVehicle();
      setForm((current) => ({
        ...current,
        fkVariantId: null,
        carMakeLegacy: "",
        carModelLegacy: "",
        carVariantLegacy: "",
        carYear: null,
        carRegistrationNo: "",
      }));
    }
    setForm((current) => ({
      ...current,
      customerId: customer?.custId ?? null,
      customerName: customer?.custName ?? current.customerName,
      customerMob: customer?.custMobile ?? current.customerMob,
      customerEmail: customer?.custEmail ?? current.customerEmail,
    }));
  };
  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setVehicleOpen(false);
    setForm((current) => ({
      ...current,
      fkVariantId: vehicle.fkVariantId,
      carMakeLegacy: clean(vehicle.carVariantMaster?.carMakeMaster?.make),
      carModelLegacy: clean(vehicle.carVariantMaster?.carModelMaster?.model),
      carVariantLegacy: clean(vehicle.carVariantMaster?.variant),
      carYear: vehicle.year,
      carRegistrationNo: vehicle.registrationNo ?? "",
    }));
  };
  const removeVehicle = () => {
    resetVehicle();
    setForm((current) => ({
      ...current,
      fkVariantId: null,
      carMakeLegacy: "",
      carModelLegacy: "",
      carVariantLegacy: "",
      carYear: null,
      carRegistrationNo: "",
    }));
  };
  const save = () => {
    setError("");
    const nextErrors = validateFeedbackForm(form);
    if (Object.keys(nextErrors).length) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    startTransition(async () => {
      const result = editId
        ? await updateFeedback(editId, form)
        : await createFeedback(form);
      if (!result.success) {
        const message = result.error ?? "Could not save feedback.";
        setError(message);
        setSaveFeedback({ type: 'error', message });
        return;
      }
      setSaveFeedback({ type: 'success', message: `Feedback ${editId ? 'updated' : 'created'} successfully.` });
      forceCloseForm();
      router.refresh();
    });
  };
  const remove = () => {
    if (!deleteId) return;
    setActionError("");
    startTransition(async () => {
      const result = await deleteFeedback(deleteId);
      if (!result.success) {
        const message = result.error ?? "Could not delete feedback.";
        setActionError(message);
        setDeleteAlert({ type: "error", message });
        setDeleteId(null);
        return;
      }
      setData((current) =>
        current.filter((row) => row.feedbackId !== deleteId),
      );
      setDeleteAlert({
        type: "success",
        message: "Feedback record deleted successfully.",
      });
      setDeleteId(null);
      router.refresh();
    });
  };
  const exportRows = () =>
    startExport(async () => {
      setActionError("");
      try {
        const response = await fetch(
          `/api/feedback/export${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        );
        const rows = await response.json();
        if (!response.ok || !Array.isArray(rows))
          throw new Error(rows?.error ?? "Export failed.");
        downloadCsv(rows);
      } catch (caught) {
        setActionError(
          caught instanceof Error ? caught.message : "Export failed.",
        );
      }
    });

  const sendInvitation = () => {
    if (!selectedCustomer || !selectedVehicle) {
      setSendError("Select a customer and their purchased vehicle.");
      return;
    }
    setSendError("");
    startTransition(async () => {
      const result = await sendFeedbackInvitation(
        selectedCustomer.custId,
        selectedVehicle.inventoryId,
      );
      if (!result.success) {
        setSendError(result.error ?? "Could not send feedback invitation.");
        return;
      }
      setSendError(
        result.message ?? "Feedback invitation sent by email and WhatsApp.",
      );
      resetVehicle();
      setSelectedCustomer(null);
    });
  };
  return (
    <div className="relative min-w-0 [&_button]:min-h-11 [&_button]:min-w-11">
      <LoadingOverlay show={isNavigating} label="Loading feedback..." subtle />
      <FeedbackHeader total={total} exporting={isExporting} pending={isNavigating} onExport={exportRows} onAdd={openAdd} onSend={() => { setSendError(""); setSelectedCustomer(null); resetVehicle(); setSendOpen(true); }} />
      <FeedbackFilters search={searchInput} hasSearch={!!search} pageSize={pageSize} sort={sort} dir={dir} pending={isNavigating} onSearch={setSearchInput} onSubmit={() => navigate({ search: searchInput.trim(), page: 1 })} onClear={() => navigate({ search: "", page: 1 })} onSort={(nextSort, nextDir) => navigate({ sort: nextSort, dir: nextDir, page: 1 })} onPageSize={value => navigate({ pageSize: value, page: 1 })} />
      {actionError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}
      <FeedbackList rows={data} onView={id => loadDetail(id, "view")} onEdit={id => loadDetail(id, "edit")} onDelete={setDeleteId} />
      <FeedbackPagination total={total} page={page} pageCount={pageCount} pending={isNavigating} onPage={value => navigate({ page: value })} />
      <Modal
        title={modal === "edit" ? "Edit Feedback" : "Add Feedback"}
        open={!!modal}
        onClose={closeForm}
        width="max-w-3xl"
      >
        <div className="min-w-0 space-y-4 [overflow-wrap:anywhere] [&_input:not([type=radio])]:min-h-11 [&_input:not([type=radio])]:min-w-0 [&_input:not([type=radio])]:max-w-full [&_input:not([type=radio])]:text-base sm:[&_input:not([type=radio])]:text-sm [&_textarea]:min-w-0 [&_textarea]:text-base sm:[&_textarea]:text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer (optional link)
            </label>
            <CustomerPicker
              value={selectedCustomer}
              onChange={onCustomerChange}
              allowCreate={false}
            />
          </div>
          <FeedbackContactFields form={form} fieldErrors={fieldErrors} setField={setField} />
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Vehicle (optional)
            </label>
            {selectedVehicle ? (
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-md border p-2 text-sm">
                <span>
                  <Car className="mr-2 inline w-4" />
                  {vehicleLabel(selectedVehicle)}
                </span>
                <button type="button" aria-label="Unlink vehicle" className="flex shrink-0 items-center justify-center" onClick={removeVehicle}>
                  <X className="w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  placeholder="Search stock..."
                  value={vehicleQuery}
                  onFocus={() => setVehicleOpen(true)}
                  onChange={(event) => {
                    setVehicleQuery(event.target.value);
                    setVehicleOpen(true);
                  }}
                />
                {vehicleOpen && (
                  <div className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white shadow">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle.inventoryId}
                        onClick={() => selectVehicle(vehicle)}
                        className="block min-h-11 w-full whitespace-normal [overflow-wrap:anywhere] border-b px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {vehicleLabel(vehicle)}
                      </button>
                    ))}
                    {!vehicles.length && (
                      <div className="p-3 text-sm text-gray-500">
                        No matching vehicles
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <FeedbackVehicleFields form={form} fieldErrors={fieldErrors} setField={setField} />
          <FeedbackQuestions form={form} setField={setField} />
          <Textarea
            label="Comments"
            maxLength={1000}
            value={form.comments}
            onChange={(event) => setField("comments", event.target.value)}
          />
          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:flex sm:justify-end [&_button]:justify-center">
            <Btn variant="outline" onClick={closeForm}>
              Cancel
            </Btn>
            <Btn onClick={save} disabled={isPending}>
              {isPending ? "Saving..." : "Save Feedback"}
            </Btn>
          </div>
        </div>
      </Modal>
      <Modal
        title={view ? `Feedback #${view.feedbackId}` : "Feedback"}
        open={!!view || loadingDetail}
        onClose={() => {
          if (!loadingDetail) setView(null);
        }}
      >
        {loadingDetail ? (
          <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-5 animate-spin" />
            Loading feedback...
          </div>
        ) : (
          view && (
            <FeedbackDetails view={view} />
          )
        )}
      </Modal>
      <Modal
        title="Send Feedback"
        open={sendOpen}
        onClose={() => setSendOpen(false)}
      >
        <div className="min-w-0 space-y-4 [overflow-wrap:anywhere] [&_input:not([type=radio])]:min-h-11 [&_input:not([type=radio])]:min-w-0 [&_input:not([type=radio])]:max-w-full [&_input:not([type=radio])]:text-base sm:[&_input:not([type=radio])]:text-sm [&_textarea]:min-w-0 [&_textarea]:text-base sm:[&_textarea]:text-sm">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Customer
            </label>
            <CustomerPicker
              value={selectedCustomer}
              onChange={onCustomerChange}
              allowCreate={false}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Purchased vehicle
            </label>
            <Input
              placeholder="Search registration, make, model..."
              value={vehicleQuery}
              onFocus={() => setVehicleOpen(true)}
              onChange={(event) => {
                setVehicleQuery(event.target.value);
                setVehicleOpen(true);
              }}
            />
            {vehicleOpen && (
              <div className="mt-1 max-h-48 overflow-auto rounded border bg-white">
                {vehicles.map((vehicle) => (
                  <button
                    key={vehicle.inventoryId}
                    onClick={() => selectVehicle(vehicle)}
                    className="block min-h-11 w-full whitespace-normal [overflow-wrap:anywhere] border-b p-2 text-left text-sm"
                  >
                    {vehicleLabel(vehicle)}
                  </button>
                ))}
                {!vehicles.length && (
                  <div className="p-2 text-sm text-gray-500">
                    No matching purchases
                  </div>
                )}
              </div>
            )}
            {selectedVehicle && (
              <div className="mt-2 rounded border p-2 text-sm">
                {vehicleLabel(selectedVehicle)}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600">
            A one-time survey link valid for 7 days will be sent by email and
            WhatsApp using the global template. Older pending links for this
            purchase will stop working.
          </p>
          {sendError && (
            <div
              className={`rounded border p-3 text-sm ${sendError.includes("sent by") ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
            >
              {sendError}
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:flex sm:justify-end [&_button]:justify-center">
            <Btn variant="outline" onClick={() => setSendOpen(false)}>
              Close
            </Btn>
            <Btn onClick={sendInvitation} disabled={isPending}>
              {isPending ? "Sending..." : "Send Feedback"}
            </Btn>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => !isPending && setDeleteId(null)}
        onConfirm={remove}
        closeOnConfirm={false}
        confirmDisabled={isPending}
        cancelDisabled={isPending}
        message="Delete this feedback record? This cannot be undone."
      />
    <ActionAlert result={saveFeedback} onClose={() => setSaveFeedback(null)} successTitle="Feedback saved" errorTitle="Feedback not saved" />
      <ActionAlert
        result={deleteAlert}
        onClose={() => setDeleteAlert(null)}
        successTitle="Feedback deleted"
        errorTitle="Feedback not deleted"
      />
      <ConfirmDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        onConfirm={forceCloseForm}
        title="Discard changes?"
        confirmLabel="Discard"
        message="You have unsaved feedback changes. Discard them?"
      />
    </div>
  );
}
