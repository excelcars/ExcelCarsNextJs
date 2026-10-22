"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Eye,
  Loader2,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Btn,
  Input,
  Modal,
  Table,
  PageHeader,
  SearchBar,
  ConfirmDialog,
} from "@/components/ui";
import { FormDropdown } from "@/components/FormDropdown";
import { catalogDisplayName, catalogSelectOptions } from "@/lib/catalogNames";
import {
  createMake,
  updateMake,
  deleteMake,
  createModel,
  updateModel,
  deleteModel,
  createVariant,
  updateVariant,
  deleteVariant,
} from "./adminActions";

type Make = { pkMakeId: number; make: string | null };
type ModelSummary = {
  pkModelId: number;
  fkMakeId: number | null;
  model: string | null;
  _count: { carVariantMaster: number };
  carVariantMaster: { pkVariantId: number; variant: string | null }[];
};
type MakeSummary = Make & {
  _count: { carModelMaster: number; carVariantMaster: number };
  carModelMaster: ModelSummary[];
};
type ModelOption = {
  pkModelId: number;
  fkMakeId: number | null;
  model: string | null;
  carVariantMaster?: VariantOption[];
};
type VariantOption = {
  pkVariantId: number;
  fkMakeId: number | null;
  fkModelId: number | null;
  variant: string | null;
};
type EditTarget = {
  kind: "make" | "model" | "variant";
  id: number;
  name: string;
  makeId: number;
  modelId: number;
};

const variantBadgeStyles = [
  "border-sky-200 bg-sky-50 text-sky-700",
  "border-violet-200 bg-violet-50 text-violet-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-rose-200 bg-rose-50 text-rose-700",
  "border-cyan-200 bg-cyan-50 text-cyan-700",
];

function variantBadgeClass(id: number) {
  return variantBadgeStyles[id % variantBadgeStyles.length];
}

export function CatalogClient({
  initialData,
  total,
  page,
  pageCount,
  search,
  makes,
}: {
  initialData: MakeSummary[];
  total: number;
  page: number;
  pageCount: number;
  search: string;
  makes: Make[];
}) {
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(search);
  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [selectedMakeId, setSelectedMakeId] = useState(0);
  const [selectedModelId, setSelectedModelId] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(0);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [variants, setVariants] = useState<VariantOption[]>([]);
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newVariant, setNewVariant] = useState("");
  const [addingMake, setAddingMake] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [addingVariant, setAddingVariant] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [manager, setManager] = useState<{
    kind: "models" | "variants";
    title: string;
    makeName: string;
    makeId: number;
    readOnly?: boolean;
    loading: boolean;
    modelId?: number;
    items: (ModelOption | VariantOption)[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "make" | "model" | "variant";
    id: number;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = (nextSearch: string, nextPage: number) => {
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextPage > 1) params.set("page", String(nextPage));
    router.push(`/config/catalog${params.toString() ? `?${params}` : ""}`);
  };
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (searchInput === search) return;
    debounceRef.current = setTimeout(() => pushQuery(searchInput, 1), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);
  useEffect(() => {
    if (!selectedMakeId) {
      setModels([]);
      setVariants([]);
      return;
    }
    fetch(`/api/catalog/models?makeId=${selectedMakeId}`)
      .then((res) => res.json())
      .then((data) => setModels(Array.isArray(data) ? data : []));
  }, [selectedMakeId]);
  useEffect(() => {
    if (!selectedModelId) {
      setVariants([]);
      return;
    }
    fetch(`/api/catalog/variants?modelId=${selectedModelId}`)
      .then((res) => res.json())
      .then((data) => setVariants(Array.isArray(data) ? data : []));
  }, [selectedModelId]);

  const resetAdd = () => {
    setEditTarget(null);
    setName("");
    setSelectedMakeId(0);
    setSelectedModelId(0);
    setSelectedVariantId(0);
    setNewMake("");
    setNewModel("");
    setNewVariant("");
    setAddingMake(false);
    setAddingModel(false);
    setAddingVariant(false);
    setError("");
    setModal(true);
  };
  const openAddModel = (makeId: number) => {
    resetAdd();
    setSelectedMakeId(makeId);
    setAddingMake(false);
    setAddingModel(true);
  };
  const openAddVariant = (makeId: number, modelId: number) => {
    resetAdd();
    setSelectedMakeId(makeId);
    setSelectedModelId(modelId);
    setAddingMake(false);
    setAddingModel(false);
    setAddingVariant(true);
  };
  const openEdit = (target: EditTarget) => {
    setManager(null);
    setEditTarget(target);
    setName(target.name);
    setSelectedMakeId(target.makeId);
    setSelectedModelId(target.modelId);
    setError("");
    setModal(true);
  };
  const openEditModel = (row: ModelOption) =>
    openEdit({
      kind: "model",
      id: row.pkModelId,
      name: row.model ?? "",
      makeId: row.fkMakeId ?? 0,
      modelId: 0,
    });
  const openEditVariant = (row: VariantOption) =>
    openEdit({
      kind: "variant",
      id: row.pkVariantId,
      name: row.variant ?? "",
      makeId: row.fkMakeId ?? 0,
      modelId: row.fkModelId ?? 0,
    });

  const add = (kind: "make" | "model" | "variant") =>
    startTransition(async () => {
      const result =
        kind === "make"
          ? await createMake(newMake)
          : kind === "model"
            ? await createModel(newModel, selectedMakeId)
            : await createVariant(newVariant, selectedMakeId, selectedModelId);
      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      if (kind === "make") {
        setNewMake("");
        setAddingMake(false);
        if (result.id) setSelectedMakeId(result.id);
        setSelectedModelId(0);
      }
      if (kind === "model") {
        setNewModel("");
        setAddingModel(false);
        if (result.id) setSelectedModelId(result.id);
      }
      if (kind === "variant") {
        setNewVariant("");
        setAddingVariant(false);
        setModal(false);
      }
      router.refresh();
    });
  const save = () =>
    startTransition(async () => {
      let result;
      if (editTarget?.kind === "make")
        result = await updateMake(editTarget.id, name);
      else if (editTarget?.kind === "model")
        result = await updateModel(editTarget.id, name, selectedMakeId);
      else if (editTarget?.kind === "variant")
        result = await updateVariant(
          editTarget.id,
          name,
          selectedMakeId,
          selectedModelId,
        );
      if (!result || !result.success) {
        setError(result?.error ?? "Something went wrong.");
        return;
      }
      setModal(false);
      router.refresh();
    });
  const del = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result =
        deleteTarget.kind === "make"
          ? await deleteMake(deleteTarget.id)
          : deleteTarget.kind === "model"
            ? await deleteModel(deleteTarget.id)
            : await deleteVariant(deleteTarget.id);
      if (!result.success) {
        setDeleteError(result.error ?? "Could not delete this record.");
      } else {
        setDeleteError("");
        if (deleteTarget.kind === "make") {
          setManager(null);
        } else {
          setManager(current => {
            if (!current || (deleteTarget.kind === "model" && current.kind !== "models") || (deleteTarget.kind === "variant" && current.kind !== "variants")) return current;
            const items = current.items.filter(item => deleteTarget.kind === "model"
              ? (item as ModelOption).pkModelId !== deleteTarget.id
              : (item as VariantOption).pkVariantId !== deleteTarget.id);
            return { ...current, items };
          });
        }
      }
      setDeleteTarget(null);
      router.refresh();
    });
  };
  const editKindLabel = editTarget
    ? editTarget.kind.charAt(0).toUpperCase() + editTarget.kind.slice(1)
    : "";
  const openModels = async (make: MakeSummary, readOnly = false) => {
    const base = {
      kind: "models" as const,
      title: `${catalogDisplayName(make.make, "make", make.pkMakeId)} — Models`,
      makeName: make.make ?? "",
      makeId: make.pkMakeId,
      readOnly,
    };
    setManager({ ...base, loading: true, items: [] });
    const res = await fetch(`/api/catalog/models?makeId=${make.pkMakeId}&includeIncomplete=1`);
    const items = await res.json();
    setManager({
      ...base,
      loading: false,
      items: Array.isArray(items) ? items : [],
    });
  };
  const openVariants = async (makeId: number, model: ModelSummary) => {
    const base = {
      kind: "variants" as const,
      title: `${catalogDisplayName(model.model, "model", model.pkModelId)} — Variants`,
      makeName: makes.find(make => make.pkMakeId === makeId)?.make ?? "",
      makeId,
      modelId: model.pkModelId,
    };
    setManager({ ...base, loading: true, items: [] });
    const res = await fetch(`/api/catalog/variants?modelId=${model.pkModelId}&includeIncomplete=1`);
    const items = await res.json();
    setManager({
      ...base,
      loading: false,
      items: Array.isArray(items) ? items : [],
    });
  };
  const makeActions = (make: MakeSummary) => <button type="button" onClick={() => openModels(make)} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1B2A6B] shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow">Manage</button>;
  const addControl = (kind: "make" | "model" | "variant", enabled = true) => (
    <div className="mt-2">
      {!{ make: addingMake, model: addingModel, variant: addingVariant }[
        kind
      ] ? (
        <button
          type="button"
          onClick={() =>
            kind === "make"
              ? setAddingMake(true)
              : kind === "model"
                ? setAddingModel(true)
                : setAddingVariant(true)
          }
          disabled={!enabled}
          className="text-xs font-medium text-[#1B2A6B] disabled:text-gray-300"
        >
          + Add new {kind}
        </button>
      ) : (
        <div className="flex gap-2">
          <Input
            label=""
            placeholder={`New ${kind} name`}
            value={
              kind === "make"
                ? newMake
                : kind === "model"
                  ? newModel
                  : newVariant
            }
            onChange={(e) =>
              kind === "make"
                ? setNewMake(e.target.value)
                : kind === "model"
                  ? setNewModel(e.target.value)
                  : setNewVariant(e.target.value)
            }
          />
          <Btn size="sm" onClick={() => add(kind)} disabled={isPending}>
            Add
          </Btn>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Vehicle Masters"
        subtitle={`${total.toLocaleString("en-IN")} makes`}
        action={
          <Btn size="sm" onClick={resetAdd}>
            <Plus className="w-3.5 h-3.5" />
            Add Vehicle Master
          </Btn>
        }
      />
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex max-w-md flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Search vehicle masters</label>
          <SearchBar
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Make, model, variant..."
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">Search across make, model, and variant names.</p>
      </div>
      {deleteError && !manager ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div> : null}
      <Table
        headers={["Make", "Models & Variants", "Actions"]}
        minWidthClass="min-w-[900px] [&_th:first-child]:w-[22%] [&_th:nth-child(2)]:w-[68%] [&_th:last-child]:w-[10%]"
        empty={initialData.length === 0}
      >
        {initialData.map(row => (
          <tr key={row.pkMakeId} className="transition-colors hover:bg-indigo-50/30">
            <td className="px-4 py-4 align-top">
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 text-xs font-bold uppercase text-white shadow-sm">{(row.make ?? "?").slice(0, 1)}</span>
                <div className="min-w-0"><div className="font-semibold text-slate-800">{catalogDisplayName(row.make, "make", row.pkMakeId)}</div><div className="mt-1 text-xs text-slate-400">{row._count.carModelMaster} models · {row._count.carVariantMaster} variants</div></div>
              </div>
            </td>
            <td className="px-4 py-3 align-top">
              {row.carModelMaster.length ? <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">{row.carModelMaster.map(model => <div key={model.pkModelId} className="grid grid-cols-[minmax(132px,180px)_minmax(0,1fr)] gap-4 px-3.5 py-3 transition-colors hover:bg-slate-50"><div className="flex items-start gap-2"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400 ring-4 ring-indigo-50" /><span className="font-semibold text-slate-700">{catalogDisplayName(model.model, 'model', model.pkModelId)}</span></div><div className="flex flex-wrap content-start gap-1.5">{model.carVariantMaster.length ? model.carVariantMaster.map(variant => <span key={variant.pkVariantId} title={catalogDisplayName(variant.variant, 'variant', variant.pkVariantId)} className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none shadow-sm ${variantBadgeClass(variant.pkVariantId)}`}>{catalogDisplayName(variant.variant, 'variant', variant.pkVariantId)}</span>) : <span className="inline-flex items-center rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400">No variants yet</span>}</div></div>)}</div> : <span className="inline-flex rounded-full border border-dashed border-slate-300 bg-slate-50 px-3 py-1.5 text-sm text-slate-400">No models yet</span>}
            </td>
            <td className="px-4 py-4 align-top">{makeActions(row)}</td>
          </tr>
        ))}
      </Table>
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500">
            Page {page} of {pageCount}
          </div>
          <div className="flex gap-1.5">
            <Btn
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => pushQuery(search, page - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              onClick={() => pushQuery(search, page + 1)}
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </div>
        </div>
      )}
      <Modal
        title={editTarget ? `Edit ${editKindLabel}` : "Add Vehicle Master"}
        open={modal}
        onClose={() => setModal(false)}
      >
        <div className="space-y-4">
          {editTarget ? (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-[#1B2A6B]">Editing {editKindLabel}</div>
                <div className="mt-1 text-sm text-gray-600">
                  {editTarget.kind === "make" && "This changes the brand name used across the vehicle catalog."}
                  {editTarget.kind === "model" && "Update the model name and confirm its Make below."}
                  {editTarget.kind === "variant" && "Update the variant name and confirm its Make and Model below."}
                </div>
              </div>
              <Input
                label={`${editKindLabel} name *`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Enter ${editTarget.kind} name`}
                autoFocus
              />
              {editTarget.kind !== "make" && (
                <FormDropdown label="Make *" value={String(selectedMakeId || '')} options={catalogSelectOptions(makes, make => make.pkMakeId, make => make.make, selectedMakeId, 'make')} placeholder="Select the Make" allowClear onChange={(value) => {
                    setSelectedMakeId(Number(value));
                    setSelectedModelId(0);
                  }} />
              )}
              {editTarget.kind === "variant" && (
                <FormDropdown label="Model *" value={String(selectedModelId || '')} options={catalogSelectOptions(models, model => model.pkModelId, model => model.model, selectedModelId, 'model')} placeholder="Select the Model" allowClear onChange={value => setSelectedModelId(Number(value))} />
              )}
            </>
          ) : (
            <>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="font-semibold">Build the vehicle path in order</div>
                <div className="mt-1 text-xs text-blue-800">Select an existing Make, then Model, then Variant. If any level is missing, use the matching “Add new” link below it. Selecting an existing variant does not create a duplicate.</div>
              </div>
              <div>
                <FormDropdown label="Make" value={String(selectedMakeId || '')} options={catalogSelectOptions(makes, make => make.pkMakeId, make => make.make, selectedMakeId, 'make')} placeholder="Select existing make" allowClear onChange={(value) => {
                    setSelectedMakeId(Number(value));
                    setSelectedModelId(0);
                    setSelectedVariantId(0);
                  }} />
                {addControl("make")}
              </div>
              {selectedMakeId > 0 && (
                <div>
                  <FormDropdown label="Model" value={String(selectedModelId || '')} options={catalogSelectOptions(models, model => model.pkModelId, model => model.model, selectedModelId, 'model')} placeholder="Select existing model" allowClear onChange={value => { setSelectedModelId(Number(value)); setSelectedVariantId(0) }} />
                  {addControl("model")}
                </div>
              )}
              {selectedModelId > 0 && (
                <div>
                  <FormDropdown label="Variant" value={String(selectedVariantId || '')} options={catalogSelectOptions(variants, variant => variant.pkVariantId, variant => variant.variant, selectedVariantId, 'variant')} placeholder={variants.length ? 'Select existing variant' : 'No variants yet'} allowClear onChange={value => setSelectedVariantId(Number(value))} />
                  {addControl("variant")}
                  {selectedVariantId > 0 ? <div className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">This variant already exists in the Vehicle Master. Use <span className="font-semibold">Add new variant</span> only to create another one.</div> : null}
                </div>
              )}
            </>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Btn variant="outline" onClick={() => setModal(false)}>
              Cancel
            </Btn>
            {editTarget ? (
              <Btn onClick={save} disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Btn>
            ) : (
              <Btn variant="outline" onClick={() => setModal(false)}>
                Done
              </Btn>
            )}
          </div>
        </div>
      </Modal>
      <Modal
        title={manager?.title ?? ""}
        open={!!manager}
        onClose={() => { setManager(null); setDeleteError(""); }}
      >
        {manager && (
          <div className="space-y-3">
            {deleteError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{deleteError}</div> : null}
            {manager.kind === "models" && !manager.readOnly && <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Make</div><div className="text-sm font-semibold text-slate-800">{catalogDisplayName(manager.makeName, "make", manager.makeId)}</div></div><div className="flex gap-1"><button type="button" onClick={() => openEdit({ kind: "make", id: manager.makeId, name: manager.makeName, makeId: 0, modelId: 0 })} className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-blue-50 hover:text-[#1B2A6B]" title="Edit Make"><Pencil className="h-3.5 w-3.5" /></button><button type="button" onClick={() => setDeleteTarget({ kind: "make", id: manager.makeId, name: manager.makeName })} className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700" title="Delete Make"><Trash2 className="h-3.5 w-3.5" /></button></div></div>}
            {manager.loading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" />Loading {manager.kind}...</div>
            ) : manager.items.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                No records found
              </div>
            ) : (
              manager.items.map((item) => {
                const isModel = manager.kind === "models";
                const id = isModel
                  ? (item as ModelOption).pkModelId
                  : (item as VariantOption).pkVariantId;
                const itemName = isModel
                  ? (item as ModelOption).model
                  : (item as VariantOption).variant;
                return (
                  <div key={id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                    <div className="min-w-0"><div className="text-xs font-medium uppercase tracking-wide text-slate-400">{isModel ? 'Model' : 'Variant'}</div><div className="mt-0.5 text-sm font-semibold text-slate-800">{catalogDisplayName(itemName, isModel ? "model" : "variant", isModel ? (item as ModelOption).pkModelId : (item as VariantOption).pkVariantId)}</div>{isModel && <div className="mt-2 flex flex-wrap gap-1.5">{(item as ModelOption).carVariantMaster?.length ? (item as ModelOption).carVariantMaster!.map(variant => <span key={variant.pkVariantId} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2 pr-1 text-xs text-slate-600"><span>{catalogDisplayName(variant.variant, 'variant', variant.pkVariantId)}</span>{!manager.readOnly && <><button type="button" onClick={() => openEditVariant(variant)} className="rounded p-0.5 hover:bg-white hover:text-[#1B2A6B]" title={`Edit ${variant.variant ?? 'variant'}`}><Pencil className="h-3 w-3" /></button><button type="button" onClick={() => setDeleteTarget({ kind: 'variant', id: variant.pkVariantId, name: variant.variant ?? 'variant' })} className="rounded p-0.5 hover:bg-white hover:text-red-700" title={`Delete ${variant.variant ?? 'variant'}`}><Trash2 className="h-3 w-3" /></button></>}</span>) : <span className="text-xs text-gray-400">No variants yet</span>}</div>}</div>
                    {!manager.readOnly && <span className="flex flex-wrap justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          isModel
                            ? openEditModel(item as ModelOption)
                            : openEditVariant(item as VariantOption)
                        }
                        className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-blue-50 hover:text-[#1B2A6B]"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget({
                            kind: isModel ? "model" : "variant",
                            id,
                            name: itemName ?? "record",
                          })
                        }
                        className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      {isModel && (
                        <button
                          type="button"
                          onClick={() => {
                            const model = item as ModelOption;
                            openVariants(manager.makeId, { ...model, _count: { carVariantMaster: 0 }, carVariantMaster: [] });
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-blue-50 hover:text-[#1B2A6B]"
                          title="View or manage variants"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isModel && (
                        <button
                          type="button"
                          onClick={() => {
                            setManager(null);
                            openAddVariant(manager.makeId, id);
                          }}
                          className="rounded border border-gray-200 p-1.5 text-gray-500 hover:bg-blue-50 hover:text-[#1B2A6B]"
                          title="Add variant"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>}
                  </div>
                );
              })
            )}
            {manager.kind === "models" && !manager.readOnly && (
              <Btn
                size="sm"
                onClick={() => {
                  setManager(null);
                  openAddModel(manager.makeId);
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Model
              </Btn>
            )}
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteError(""); }}
        onConfirm={del}
        message={`Delete this ${deleteTarget?.kind ?? "record"}? This cannot be undone.`}
      />
    </div>
  );
}
