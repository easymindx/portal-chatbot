import React, { useMemo } from 'react';
import { PiArrowSquareOutFill, PiThumbsDownFill, PiThumbsUpFill } from 'react-icons/pi';
import { twMerge } from 'tailwind-merge';
import { FeedbackMessage } from '../@types/conversation';
import ExpandableDrawerGroup from '../components/ExpandableDrawerGroup';
import useFeedback from '../hooks/useFeedback';

type Props = {
  className?: string;
};

const FeedbackPage: React.FC<Props> = ({ className }) => {
  const { feedbacks } = useFeedback();
  const [positiveFeedbacks, negativeFeedbacks] = useMemo(() => {
    if (!feedbacks) {
      return [[], []];
    }
    const positive: FeedbackMessage[] = [];
    const negative:FeedbackMessage[] = [];
    feedbacks.forEach((f) => {
      if (f.feedback.thumbsUp) {
        positive.push(f);
      } else {
        negative.push(f);
      }
    });
    return [positive, negative];
  }, [feedbacks]);

  const renderFeedbackList = (feedback: FeedbackMessage[], isPositive: boolean) => (
    <div className={twMerge('p-4 border rounded-md', isPositive ? 'bg-green-50' : 'bg-red-50')}>
      <h3 className="text-xl font-bold mb-4 flex items-center">
        {isPositive ? (
          <PiThumbsUpFill className="text-green-600 mr-2" />
        ) : (
          <PiThumbsDownFill className="text-red-600 mr-2" />
        )}
        {isPositive ? 'Positive Feedback' : 'Negative Feedback'}
      </h3>
      {feedback.length > 0 ? (
        <ExpandableDrawerGroup
          isDefaultShow={false}
          label={"Feedback responses"}
          className="py-2"
        >
          <ul className="space-y-4 my-2 px-5">
            {feedback.map((item) => (
              <li 
                key={item.conversationId + item.messageId}
                className="border-b pb-2 flex flex-col gap-2"
              >
                {/* Top Row: User email and link */}
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">
                    User: {item.user.email || 'N/A'}
                  </span>
                  <a
                    href={`/chat/${item.conversationId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 flex items-center"
                  >
                    Open Chat <PiArrowSquareOutFill className="ml-1" />
                  </a>
                </div>
                {/* Feedback comment */}
                <div className="text-gray-600 text-sm">
                  {item.feedback.comment ? (
                    <p>{item.feedback.comment}</p>
                  ) : (
                    <p className="italic text-gray-400">No comment provided</p>
                  )}
                </div>
                {/* Date */}
                <div className="text-xs text-gray-500">
                  Date: {new Date(item.createTime).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        </ExpandableDrawerGroup>
      ) : (
        <p className="text-sm text-gray-500">No feedback available</p>
      )}
    </div>
  );

  return (
    <div className={twMerge(className, 'grid grid-cols-1 gap-4 p-6 lg:grid-cols-2}')}>
      {renderFeedbackList(positiveFeedbacks, true)}
      {renderFeedbackList(negativeFeedbacks, false)}
    </div>
  );
};

export default FeedbackPage;