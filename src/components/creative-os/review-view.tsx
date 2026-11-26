import type { StoredReview } from "@/lib/creative-os/research/creative";
import {
  EDITORIAL_ISSUE_LABEL,
  REVIEW_CRITERION_LABEL,
  REVIEW_VERDICT_LABEL,
  type EDITORIAL_ISSUES,
  type REVIEW_CRITERIA,
} from "@/lib/creative-os/creative-labels";
import { cn } from "@/lib/utils";

/** A creative-director review: verdict, the biggest fix, the scored rubric, editorial notes and compliance flags. */
export function ReviewView({ review }: { review: StoredReview }) {
  const verdict = REVIEW_VERDICT_LABEL[review.verdict] ?? REVIEW_VERDICT_LABEL.needs_work;
  const average = review.criteria.length ? review.criteria.reduce((sum, item) => sum + item.score, 0) / review.criteria.length : null;
  const weakest = [...review.criteria].sort((a, b) => a.score - b.score);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn("rounded-[4px] border px-2 py-0.5 text-sm font-semibold", verdict.className)}>{verdict.label}</span>
        {average !== null ? <span className="text-sm text-muted">Average {average.toFixed(1)} of 5 across {review.criteria.length} criteria</span> : null}
      </div>
      <p className="max-w-3xl text-[15px] leading-6">{review.overall}</p>
      {review.biggest_fix ? (
        <p className="max-w-3xl rounded-[6px] border border-[#b4d6fa] bg-[#ebf3fc] px-3 py-2 text-sm">
          <strong>The change that would help most:</strong> {review.biggest_fix}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="text-xs text-faint">
            <tr className="border-b border-line">
              <th className="py-2 pr-3 font-medium">Criterion</th>
              <th className="px-3 py-2 font-medium">Score</th>
              <th className="px-3 py-2 font-medium">Why, with evidence</th>
              <th className="py-2 pl-3 font-medium">Improve it</th>
            </tr>
          </thead>
          <tbody>
            {weakest.map((item) => (
              <tr key={item.criterion} className="border-b border-line align-top last:border-0">
                <td className="py-2.5 pr-3 font-semibold">{REVIEW_CRITERION_LABEL[item.criterion as (typeof REVIEW_CRITERIA)[number]] ?? item.criterion}</td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-2" aria-label={`${item.score} of 5`}>
                    <span className="tnum font-semibold">{item.score}</span>
                    <span className="flex gap-0.5" aria-hidden>
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span
                          key={step}
                          className={cn(
                            "h-2 w-3 rounded-[2px]",
                            step <= item.score ? (item.score <= 2 ? "bg-danger" : item.score === 3 ? "bg-[#c19c00]" : "bg-[#107c10]") : "bg-line",
                          )}
                        />
                      ))}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {item.explanation}
                  {item.evidence ? <span className="mt-1 block text-xs italic text-muted">“{item.evidence}”</span> : null}
                </td>
                <td className="py-2.5 pl-3 text-muted">{item.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {review.editorial.length ? (
        <section>
          <h4 className="mb-2 text-sm font-semibold">Editorial notes ({review.editorial.length})</h4>
          <ul className="grid gap-2">
            {review.editorial.map((item, index) => (
              <li key={index} className="grid gap-0.5 rounded-[6px] border border-line px-3 py-2 text-sm">
                <span>
                  <span className="text-xs font-semibold text-[#8a4b00]">{EDITORIAL_ISSUE_LABEL[item.issue as (typeof EDITORIAL_ISSUES)[number]] ?? item.issue}:</span>{" "}
                  <span className="italic">“{item.quote}”</span>
                </span>
                <span className="text-muted">→ {item.suggestion}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h4 className="mb-2 text-sm font-semibold">Compliance</h4>
        {review.compliance.length ? (
          <ul className="grid gap-2">
            {review.compliance.map((item, index) => (
              <li key={index} className="grid gap-0.5 rounded-[6px] border border-[#f1bbbc] bg-[#fdf3f4] px-3 py-2 text-sm">
                <span className="italic">“{item.quote}”</span>
                <span>{item.risk}</span>
                <span className="text-muted">Safer: {item.safer_alternative}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No compliance risks flagged.</p>
        )}
        <p className="mt-2 text-xs text-faint">
          Strategic judgements, not predictions of how the ad will perform, and not legal or platform approval.
        </p>
      </section>
    </div>
  );
}
