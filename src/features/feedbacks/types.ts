export type Feedback = {
  feedbackId: number;
  userId: number;
  content: string;
  createdAt: string;
};

export type FeedbacksListResponse = {
  feedbacks: Feedback[];
  page: number;
  size: number;
  totalElements: number;
};
