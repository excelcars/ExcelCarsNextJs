export type ListRow = {
  feedbackId: number;
  customerName: string | null;
  customerMob: string | null;
  customerEmail: string | null;
  carMakeLegacy: string | null;
  carModelLegacy: string | null;
  carVariantLegacy: string | null;
  carRegistrationNo: string | null;
  answer_1: string | null;
  answer_2: string | null;
  answer_4: string | null;
  submittedAt: Date | string | null;
};
export type Detail = ListRow & {
  customerId: number | null;
  customerDob: Date | string | null;
  customerAnniversaryDt: Date | string | null;
  carYear: number | null;
  fkVariantId: number | null;
  answer_3: string | null;
  answer_5: string | null;
  comments: string | null;
};
