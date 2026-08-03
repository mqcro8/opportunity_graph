"use client";

import {
  OpportunityForm,
  emptyFormValues,
} from "@/components/admin/opportunity-form";

export default function NewOpportunityPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <OpportunityForm
        url="/api/admin/opportunities"
        method="POST"
        initial={emptyFormValues()}
        heading="Add opportunity"
        intro="Saves as verified. Pick tags to control exactly how it matches student profiles."
      />
    </div>
  );
}
