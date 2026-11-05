"use client";

import { Input } from '@/components/ui';
import type { FeedbackFormInput } from './actions';
import { QUESTIONS } from './constants';

type FieldProps = {
  form: FeedbackFormInput;
  fieldErrors: Record<string, string>;
  setField: <K extends keyof FeedbackFormInput>(key: K, value: FeedbackFormInput[K]) => void;
};

export function FeedbackContactFields({ form, fieldErrors, setField }: FieldProps) {
  return (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_input]:text-base sm:[&_input]:text-sm">
            <Input
              label="Customer Name *"
              aria-label="Customer Name *"
              maxLength={150}
              value={form.customerName}
              onChange={(event) => setField("customerName", event.target.value)}
              error={!!fieldErrors.customerName}
              errorMessage={fieldErrors.customerName}
            />
            <Input
              label="Customer Mobile *"
              aria-label="Customer Mobile *"
              inputMode="numeric"
              maxLength={10}
              value={form.customerMob}
              onChange={(event) =>
                setField("customerMob", event.target.value.replace(/\D/g, ""))
              }
              error={!!fieldErrors.customerMob}
              errorMessage={fieldErrors.customerMob}
            />
            <Input
              label="Customer Email *"
              aria-label="Customer Email *"
              type="email"
              maxLength={254}
              value={form.customerEmail}
              onChange={(event) =>
                setField("customerEmail", event.target.value)
              }
              error={!!fieldErrors.customerEmail}
              errorMessage={fieldErrors.customerEmail}
            />
            <Input
              label="Date of Birth"
              aria-label="Date of Birth"
              type="date"
              value={form.customerDob}
              onChange={(event) => setField("customerDob", event.target.value)}
              error={!!fieldErrors.customerDob}
              errorMessage={fieldErrors.customerDob}
            />
            <Input
              label="Anniversary Date"
              aria-label="Anniversary Date"
              type="date"
              value={form.customerAnniversaryDt}
              onChange={(event) =>
                setField("customerAnniversaryDt", event.target.value)
              }
              error={!!fieldErrors.customerAnniversaryDt}
              errorMessage={fieldErrors.customerAnniversaryDt}
            />
          </div>
  );
}

export function FeedbackVehicleFields({ form, fieldErrors, setField }: FieldProps) {
  return (
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 [&>*]:min-w-0 [&_input]:min-h-11 [&_input]:min-w-0 [&_input]:max-w-full [&_input]:text-base sm:[&_input]:text-sm">
            <Input
              label="Car Make"
              aria-label="Car Make"
              value={form.carMakeLegacy}
              onChange={(event) =>
                setField("carMakeLegacy", event.target.value)
              }
            />
            <Input
              label="Car Model"
              aria-label="Car Model"
              value={form.carModelLegacy}
              onChange={(event) =>
                setField("carModelLegacy", event.target.value)
              }
            />
            <Input
              label="Car Variant"
              aria-label="Car Variant"
              value={form.carVariantLegacy}
              onChange={(event) =>
                setField("carVariantLegacy", event.target.value)
              }
            />
            <Input
              label="Car Year"
              aria-label="Car Year"
              type="number"
              min="1886"
              max={new Date().getFullYear() + 1}
              value={form.carYear ?? ""}
              onChange={(event) =>
                setField(
                  "carYear",
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              error={!!fieldErrors.carYear}
              errorMessage={fieldErrors.carYear}
            />
            <Input
              label="Registration Number"
              aria-label="Registration Number"
              value={form.carRegistrationNo}
              onChange={(event) =>
                setField("carRegistrationNo", event.target.value)
              }
            />
          </div>
  );
}

export function FeedbackQuestions({ form, setField }: Pick<FieldProps, 'form' | 'setField'>) {
  return <div className="min-w-0 space-y-4">
    {QUESTIONS.map((question, index) => <fieldset key={question.key} className="min-w-0 rounded-lg border border-gray-200 p-3">
      <legend className="max-w-full px-1 text-sm font-medium text-gray-800">{index + 1}. {question.text}</legend>
      <div className="grid min-w-0 gap-2 sm:grid-cols-3">
        {question.options.map(option => <label key={option} className="flex min-h-11 min-w-0 cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 has-[:checked]:border-[#1B2A6B] has-[:checked]:bg-blue-50 focus-within:ring-2 focus-within:ring-[#1B2A6B]">
          <input type="radio" name={question.key} value={option} checked={form[question.key] === option} onChange={() => setField(question.key, option)} className="h-5 w-5 shrink-0 accent-[#1B2A6B]" />
          <span className="min-w-0 break-words">{option}</span>
        </label>)}
      </div>
    </fieldset>)}
  </div>;
}
