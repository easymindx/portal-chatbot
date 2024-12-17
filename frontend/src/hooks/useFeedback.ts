import useFeedbackApi from './useFeedbackApi';

const useFeedback = () => {
  const feedbackApi = useFeedbackApi();

  const { data: feedbacks } = feedbackApi.getFeedbacks();
  const mutate = feedbackApi.mutateFeedbacks;

  return {
    feedbacks,
    syncFeedbacks: () => {
      return mutate(feedbacks);
    },
  };
};

export default useFeedback;
