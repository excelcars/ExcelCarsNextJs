import { listFeedback } from '@/features/feedback/queries'
import { FeedbackClient } from '@/features/feedback/FeedbackClient'
import { canCurrentUserAccessRoute } from '@/lib/access/accessControl'
import { redirect } from 'next/navigation'

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ search?: string; page?: string; pageSize?: string; sort?: string; dir?: string }> }) {
  if (!(await canCurrentUserAccessRoute('/config/feedback'))) redirect('/dashboard')
  const params = await searchParams
  const search = params.search ?? ''
  const feedback = await listFeedback({ search, page: Number(params.page) || 1, pageSize: Number(params.pageSize) || 10, sort: params.sort, dir: params.dir })
  return <FeedbackClient initialData={feedback.rows} total={feedback.total} page={feedback.page} pageCount={feedback.pageCount} pageSize={feedback.pageSize} sort={feedback.sort} dir={feedback.dir} search={search} />
}
