export const QUESTIONS = [
  { key: 'answer_1', text: 'How satisfied are you with the comprehensiveness of our offer?', options: ['Satisfied', 'Neutral', 'Unsatisfied'] },
  { key: 'answer_2', text: 'How would you rate your overall experience with our service?', options: ['Very Good', 'Good', 'Fair'] },
  { key: 'answer_3', text: 'How satisfied are you with the customer support?', options: ['Satisfied', 'Neutral', 'Unsatisfied'] },
  { key: 'answer_4', text: 'Would you recommend our product / service to other people?', options: ['Definitely', 'Probably', 'Not Sure'] },
  { key: 'answer_5', text: 'Thinking of similar products/services offered by other companies, how would you compare the product/service offered by our company?', options: ['Much Better', 'Somewhat Better', 'About the Same'] },
] as const

export const FEEDBACK_PAGE_SIZES = [10, 25, 50, 100] as const
export const FEEDBACK_SORT_FIELDS = ['feedbackId', 'customerName', 'carRegistrationNo'] as const

