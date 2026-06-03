import { getWeeklyReview, getReviewHistory } from "@/lib/data";
import { ReviewView } from "@/components/review/review-view";

// The review synthesizes live pipeline data (tasks are editable elsewhere), so
// render per request to reflect the current state.
export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const [review, history] = await Promise.all([getWeeklyReview("7d"), getReviewHistory()]);
  return <ReviewView review={review} history={history} />;
}
