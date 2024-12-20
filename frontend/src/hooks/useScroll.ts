import { useEffect, useState } from 'react';

const useScroll = () => {
  const [disabled, setDisabled] = useState(false);

  useEffect(() => {
    const elem = document.getElementById('messages');
    if (!elem) {
      return;
    }
    const listener = () => {
      if (elem.scrollTop + elem.clientHeight === elem.scrollHeight) {
        setDisabled(false);
      } else {
        setDisabled(true);
      }
    };
    elem.addEventListener('scroll', listener);

    return () => {
      elem.removeEventListener('scroll', listener);
    };
  }, []);

  return {
    scrollToTop: () => {
      document.getElementById('messages')?.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
    scrollToBottom: () => {
      if (!disabled) {
        document.getElementById('messages')?.scrollTo({
          top: document.getElementById('messages')?.scrollHeight,
          behavior: 'instant',
        });
      }
    },
  };
};

export default useScroll;
