type Document = { checklistDetailsId: number; documentName: string | null; applicable: string | null; received: string | null; originalCopy: string | null }

export function ChecklistDocumentsList({ documents }: { documents: Document[] }) {
  if (documents.length === 0) return <p className="rounded-lg border border-gray-200 py-6 text-center text-sm text-gray-400">No documents found.</p>
  return <>
    <div className="grid min-w-0 gap-3 md:hidden">
      {documents.map(doc => <article key={doc.checklistDetailsId} className="min-w-0 rounded-xl border border-gray-200 p-3">
        <h4 className="break-words [overflow-wrap:anywhere] text-sm font-semibold text-gray-900">{doc.documentName || '—'}</h4>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="min-w-0"><dt className="text-xs text-gray-500">Applicable</dt><dd className="mt-1 break-words font-medium text-[#1B2A6B]">{doc.applicable || '—'}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-gray-500">Received</dt><dd className={`mt-1 break-words font-medium ${doc.received === 'Yes' ? 'text-green-700' : 'text-amber-700'}`}>{doc.received || '—'}</dd></div>
          <div className="col-span-2 min-w-0"><dt className="text-xs text-gray-500">Original / Copy</dt><dd className="mt-1 break-words text-gray-800">{doc.originalCopy || '—'}</dd></div>
        </dl>
      </article>)}
    </div>
    <div className="hidden min-w-0 overflow-x-auto rounded-xl border border-gray-200 md:block">
      <table className="w-full min-w-[560px] divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50"><tr>{['Document', 'Applicable', 'Received', 'Original / Copy'].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-gray-100 bg-white">{documents.map(doc => <tr key={doc.checklistDetailsId}>
          <td className="break-words [overflow-wrap:anywhere] px-4 py-3 text-gray-800">{doc.documentName || '—'}</td>
          <td className="px-4 py-3 text-gray-600">{doc.applicable || '—'}</td>
          <td className={`px-4 py-3 font-medium ${doc.received === 'Yes' ? 'text-green-700' : 'text-amber-700'}`}>{doc.received || '—'}</td>
          <td className="px-4 py-3 text-gray-600">{doc.originalCopy || '—'}</td>
        </tr>)}</tbody>
      </table>
    </div>
  </>
}
