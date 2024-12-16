import React, { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';
import { PiThumbsUpFill, PiThumbsDownFill } from 'react-icons/pi';
import ExpandableDrawerGroup from '../components/ExpandableDrawerGroup';

const mockFeedbackData = {
  positive: [
    { id: '1', message: 'Great response!', timestamp: '2024-12-01', user: 'User1' },
    { id: '2', message: 'Helpful explanation!', timestamp: '2024-12-02', user: 'User2' },
  ],
  negative: [
    { id: '3', message: 'The response was unclear.', timestamp: '2024-12-01', user: 'User3' },
    { id: '4', message: 'Did not answer my question.', timestamp: '2024-12-02', user: 'User4' },
  ],
};

type FeedbackItem = {
  id: string;
  message: string;
  timestamp: string;
  user: string;
};

type Props = {
  className?: string;
};

const FeedbackPage: React.FC<Props> = ({ className }) => {
  const positiveFeedback = useMemo(() => mockFeedbackData.positive, []);
  const negativeFeedback = useMemo(() => mockFeedbackData.negative, []);

  const renderFeedbackList = (feedback: FeedbackItem[], isPositive: boolean) => (
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
              <li key={item.id} className="border-b pb-2">
                <p className="text-sm text-gray-600">{item.message}</p>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>User: {item.user}</span>
                  <span>Date: {new Date(item.timestamp).toLocaleDateString()}</span>
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
      {renderFeedbackList(positiveFeedback, true)}
      {renderFeedbackList(negativeFeedback, false)}
    </div>
  );
};

export default FeedbackPage;