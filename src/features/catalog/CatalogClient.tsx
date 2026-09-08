"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
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
    makeId: number;
    modelId?: number;
    items: (ModelOption | VariantOption)[];
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: "make" | "model" | "variant";
    id: number;
    name: string;
  } | null>(null);
  const [error, setError] = useState("");
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
  const openEditMake = (row: MakeSummary) =>
    openEdit({
      kind: "make",
      id: row.pkMakeId,
      name: row.make ?? "",
      makeId: row.pkMakeId,
      modelId: 0,
    });
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
      if (!result.success)
        setError(result.error ?? "Could not delete this record.");
      setDeleteTarget(null);
      router.refresh();
    });
  };
  const editKindLabel = editTarget
    ? editTarget.kind.charAt(0).toUpperCase() + editTarget.kind.slice(1)
    : "";
  const openModels = async (make: MakeSummary) => {
    const res = await fetch(`/api/catalog/models?makeId=${make.pkMakeId}`);
    const items = await res.json();
    setManager({
      kind: "models",
      title: `${make.make ?? "Make"} — Models`,
      makeId: make.pkMakeId,
      items: Array.isArray(items) ? items : [],
    });
  };
  const openVariants = async (makeId: number, model: ModelSummary) => {
    const res = await fetch(`/api/catalog/variants?modelId=${model.pkModelId}`);
    const items = await res.json();
    setManager({
      kind: "variants",
      title: `${model.model ?? "Model"} — Variants`,
      makeId,
      modelId: model.pkModelId,
      items: Array.isArray(items) ? items : [],
    });
  };
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
      <Table
        headers={["Make", "Model", "Variants"]}
        minWidthClass="min-w-[900px] [&_th:first-child]:w-[22%] [&_th:nth-child(2)]:w-[25%] [&_th:last-child]:w-[53%]"
        empty={initialData.length === 0}
      >
        {initialData.flatMap((row) =>
          row.carModelMaster.length
            ? row.carModelMaster.map((model, index) => (
                <tr key={model.pkModelId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1">
                      <div className="font-medium text-gray-900">{row.make ?? "—"}</div>
                      {index === 0 && <>
                        <button type="button" onClick={() => openModels(row)} aria-label={`Manage models for ${row.make ?? "make"}`} className="p-1 text-gray-400 hover:bg-blue-50 hover:text-[#1B2A6B] rounded transition" title="Manage models"><Pencil className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => setDeleteTarget({ kind: "make", id: row.pkMakeId, name: row.make ?? "make" })} aria-label={`Delete ${row.make ?? "make"}`} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition" title="Delete make"><Trash2 className="w-3.5 h-3.5" /></button>
                      </>}
                    </div>
                    {index === 0 && <div className="mt-1 text-xs text-gray-400">{row._count.carModelMaster} models · {row._count.carVariantMaster} variants</div>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openVariants(row.pkMakeId, model)} className="font-medium text-left text-gray-800 hover:text-[#1B2A6B] hover:underline">{model.model ?? "—"}</button>
                      <button type="button" onClick={() => openVariants(row.pkMakeId, model)} aria-label={`Manage variants for ${model.model ?? "model"}`} className="p-1 text-gray-400 hover:bg-blue-50 hover:text-[#1B2A6B] rounded transition" title="Manage variants"><Pencil className="w-3.5 h-3.5" /></button>
                    </div>
                    {index === row.carModelMaster.length - 1 && row._count.carModelMaster > row.carModelMaster.length && <button type="button" onClick={() => openModels(row)} className="mt-1 block text-xs font-medium text-[#1B2A6B] hover:underline">+{row._count.carModelMaster - row.carModelMaster.length} more models</button>}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {model.carVariantMaster.length ? <>
                        {model.carVariantMaster.map((variant) => <button key={variant.pkVariantId} type="button" onClick={() => openVariants(row.pkMakeId, model)} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 hover:bg-blue-50 hover:text-[#1B2A6B]">{variant.variant ?? "—"}</button>)}
                        {model._count.carVariantMaster > model.carVariantMaster.length && <button type="button" onClick={() => openVariants(row.pkMakeId, model)} className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-[#1B2A6B] hover:underline">+{model._count.carVariantMaster - model.carVariantMaster.length} more</button>}
                      </> : <span className="text-sm text-gray-400">No variants yet</span>}
                      <button type="button" onClick={() => openVariants(row.pkMakeId, model)} className="rounded px-2 py-1 text-xs font-medium text-[#1B2A6B] hover:bg-blue-50">Manage</button>
                    </div>
                  </td>
                </tr>
              ))
            : [
                <tr key={row.pkMakeId} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 align-top"><div className="flex items-center gap-1"><div className="font-medium text-gray-900">{row.make ?? "—"}</div><button type="button" onClick={() => openModels(row)} aria-label={`Manage models for ${row.make ?? "make"}`} className="p-1 text-gray-400 hover:bg-blue-50 hover:text-[#1B2A6B] rounded transition" title="Manage models"><Pencil className="w-3.5 h-3.5" /></button><button type="button" onClick={() => setDeleteTarget({ kind: "make", id: row.pkMakeId, name: row.make ?? "make" })} aria-label={`Delete ${row.make ?? "make"}`} className="p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded transition" title="Delete make"><Trash2 className="w-3.5 h-3.5" /></button></div><div className="mt-1 text-xs text-gray-400">No models yet</div></td>
                  <td className="px-4 py-3 text-sm text-gray-400">—</td>
                  <td className="px-4 py-3 text-sm text-gray-400">—</td>
                </tr>,
              ],
        )}
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
                <FormDropdown label="Make *" value={String(selectedMakeId || '')} options={makes.map(make => ({ value: String(make.pkMakeId), label: make.make ?? '—' }))} placeholder="Select the Make" allowClear onChange={(value) => {
                    setSelectedMakeId(Number(value));
                    setSelectedModelId(0);
                  }} />
              )}
              {editTarget.kind === "variant" && (
                <FormDropdown label="Model *" value={String(selectedModelId || '')} options={models.map(model => ({ value: String(model.pkModelId), label: model.model ?? '—' }))} placeholder="Select the Model" allowClear onChange={value => setSelectedModelId(Number(value))} />
              )}
            </>
          ) : (
            <>
              <div>
                <FormDropdown label="Make" value={String(selectedMakeId || '')} options={makes.map(make => ({ value: String(make.pkMakeId), label: make.make ?? '—' }))} placeholder="Select existing make" allowClear onChange={(value) => {
                    setSelectedMakeId(Number(value));
                    setSelectedModelId(0);
                  }} />
                {addControl("make")}
              </div>
              {selectedMakeId > 0 && (
                <div>
                  <FormDropdown label="Model" value={String(selectedModelId || '')} options={models.map(model => ({ value: String(model.pkModelId), label: model.model ?? '—' }))} placeholder="Select existing model" allowClear onChange={value => setSelectedModelId(Number(value))} />
                  {addControl("model")}
                </div>
              )}
              {selectedModelId > 0 && (
                <div>
                  <FormDropdown label="Variant" value="" options={variants.map(variant => ({ value: String(variant.pkVariantId), label: variant.variant ?? '—' }))} placeholder={variants.length ? 'Select existing variant' : 'No variants yet'} allowClear onChange={() => undefined} />
                  {addControl("variant")}
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
        onClose={() => setManager(null)}
      >
        {manager && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setManager(null)}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {manager.items.length === 0 ? (
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
                  <div
                    key={id}
                    className="flex items-center justify-between border-b border-gray-100 py-2"
                  >
                    <span className="text-sm font-medium text-gray-800">
                      {itemName ?? "—"}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          isModel
                            ? openEditModel(item as ModelOption)
                            : openEditVariant(item as VariantOption)
                        }
                        className="p-1.5 text-gray-400 hover:text-[#1B2A6B]"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
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
                        className="p-1.5 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isModel && (
                        <button
                          type="button"
                          onClick={() => {
                            setManager(null);
                            openAddVariant(manager.makeId, id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#1B2A6B]"
                          title="Add variant"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </span>
                  </div>
                );
              })
            )}
            {manager.kind === "models" && (
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
        onClose={() => setDeleteTarget(null)}
        onConfirm={del}
        message={`Delete this ${deleteTarget?.kind ?? "record"}? This cannot be undone.`}
      />
    </div>
  );
}
