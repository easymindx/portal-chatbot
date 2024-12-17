import useHttp from './useHttp';
import { PutFeedbackRequest, Feedback, FeedbackMessage } from '../@types/conversation';
import { mutate, MutatorCallback } from 'swr';

const useFeedbackApi = () => {
  const http = useHttp();

  return {
    putFeedback: (
      conversationId: string,
      messageId: string,
      req: PutFeedbackRequest
    ) => {
      return http.put<Feedback, PutFeedbackRequest>(
        `/conversation/${conversationId}/${messageId}/feedback`,
        req
      );
    },
    getFeedbacks: () => {
      return http.get<FeedbackMessage[]>('conversation/feedback', {
        keepPreviousData: true,
      });
    },
    mutateFeedbacks: (
      feedbacks?:
        | FeedbackMessage[]
        | Promise<FeedbackMessage[]>
        | MutatorCallback<FeedbackMessage[]>,
      options?: Parameters<typeof mutate>[2]
    ) => {
      return mutate('feedbacks', feedbacks, options);
    },
  };
};

export default useFeedbackApi;
