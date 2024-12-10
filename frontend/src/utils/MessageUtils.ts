import { DisplayMessageContent, MessageMap, RelatedDocument, UsedChunk } from '../@types/conversation';

export const convertMessageMapToArray = (
  messageMap: MessageMap,
  currentMessageId: string
): DisplayMessageContent[] => {
  if (Object.keys(messageMap).length === 0) {
    return [];
  }

  const messageArray: DisplayMessageContent[] = [];
  let key: string | null = currentMessageId;
  let messageContent: MessageMap[string] = messageMap[key];

  if (messageContent) {
    while (messageContent.children.length > 0) {
      key = messageContent.children[0];
      messageContent = messageMap[key];
    }

    while (key) {
      messageContent = messageMap[key];
      if (!messageContent) {
        messageArray[0].parent = null;
        break;
      }

      if (
        messageArray.some((a) => {
          return a.id === key || a.children.includes(key ?? '');
        })
      ) {
        messageArray[0].parent = null;
        break;
      }

      messageArray.unshift({
        id: key,
        model: messageContent.model,
        role: messageContent.role,
        content: messageContent.content,
        parent: messageContent.parent,
        children: messageContent.children,
        sibling: [],
        feedback: messageContent.feedback,
        usedChunks: messageContent.usedChunks,
        thinkingLog: messageContent.thinkingLog,
      });

      key = messageContent.parent;
    }

  } else {
    key = Object.keys(messageMap).filter(
      (k) => messageMap[k].parent === null
    )[0];

    while (key) {
      messageContent = messageMap[key];
      if (!messageContent) {
        messageArray[messageArray.length - 1].children = [];
        break;
      }

      if (
        messageArray.some((a) => {
          return a.id === key;
        })
      ) {
        messageArray[messageArray.length - 1].children = [];
        break;
      }

      messageArray.push({
        id: key,
        model: messageContent.model,
        role: messageContent.role,
        content: messageContent.content,
        parent: messageContent.parent,
        children: messageContent.children,
        sibling: [],
        feedback: messageContent.feedback,
        usedChunks: messageContent.usedChunks,
        thinkingLog: messageContent.thinkingLog,
      });
      key = messageContent.children[0];
    }
  }

  messageArray[0].sibling = [messageArray[0].id];
  messageArray.forEach((m, idx) => {
    if (m.children.length > 0) {
      messageArray[idx + 1].sibling = [...m.children];
    }
  });

  if (messageArray[0].id === 'system') {
    messageArray.shift();
  }

  return messageArray;
};

export const convertUsedChunkToRelatedDocument = (usedChunk: UsedChunk): RelatedDocument => {
  switch(usedChunk.contentType) {
    case 's3': {
      return {
        content: {
          text: usedChunk.content,
        },
        sourceId: usedChunk.rank.toString(),
        sourceName: decodeURIComponent(usedChunk.source.split('?')[0].split('/').pop() ?? ''),
        sourceLink: usedChunk.source,
      };
    }
    default: {
      return {
        content: {
          text: usedChunk.content,
        },
        sourceId: usedChunk.rank.toString(),
        sourceLink: usedChunk.source,
      };
    }
  }
};
