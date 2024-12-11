import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseProps } from '../@types/common';
import {Feedback, PutFeedbackRequest } from '../@types/conversation';
import Button from './Button';
import ModalDialog from './ModalDialog';
import Select from './Select';
import Textarea from './Textarea';

type Props = BaseProps & {
  isOpen: boolean;
  thumbsUp: boolean;
  feedback?: Feedback;
  onSubmit: (feedback: PutFeedbackRequest) => void;
  onClose: () => void;
};

const DialogFeedback: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const categoryOptions = t('feedbackDialog.categories', {
    returnObjects: true,
  });
  const [category, setCategory] = useState<string>(
    props.feedback?.category || categoryOptions[0].value
  );
  const [comment, setComment] = useState<string>(props.feedback?.comment || '');

  const handleSubmit = () => {
    props.onSubmit({ thumbs_up: props.thumbsUp, category: props.thumbsUp ? null : category, comment });
  };

  return (
    <ModalDialog title={t('feedbackDialog.title')} {...props}>
      <div className="flex flex-col gap-2">
        <div>{t('feedbackDialog.content')}</div>

        {!props.thumbsUp && (
          <Select
            label={t('feedbackDialog.categoryLabel')}
            value={category}
            options={categoryOptions}
            onChange={(val) => {
              setCategory(val);
            }}
          />
        )}
        
        <Textarea
          label={t('feedbackDialog.commentLabel')}
          value={comment}
          placeholder={t('feedbackDialog.commentPlaceholder')}
          rows={5}
          onChange={(val) => {
            setComment(val);
          }}
        />

        <div className="mt-2 flex justify-end gap-2">
          <Button onClick={props.onClose} className="p-2" outlined>
            {t('button.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('button.ok')}</Button>
        </div>
      </div>
    </ModalDialog>
  );
};

export default DialogFeedback;
