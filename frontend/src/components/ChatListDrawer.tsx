import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isMobile } from 'react-device-detect';
import { useTranslation } from 'react-i18next';
import {
  PiChat,
  PiCheck,
  PiCircleNotch,
  PiCompass,
  PiEnvelopeBold,
  PiGlobe,
  PiPencilLine,
  PiRobot,
  PiShareNetwork,
  PiTrash,
  PiX
} from 'react-icons/pi';
import { useLocation, useParams } from 'react-router-dom';
import { BotListItem } from '../@types/bot';
import { BaseProps } from '../@types/common';
import { ConversationMeta } from '../@types/conversation';
import useChat from '../hooks/useChat';
import useDrawer from '../hooks/useDrawer';
import { usePageLabel } from '../routes';
import ButtonIcon from './ButtonIcon';
import DrawerItem from './DrawerItem';
import ExpandableDrawerGroup from './ExpandableDrawerGroup';
import LazyOutputText from './LazyOutputText';
import Menu from './Menu';

type Props = BaseProps & {
  isAdmin: boolean;
  isAllowFeedback: boolean;
  conversations?: ConversationMeta[];
  starredBots?: BotListItem[];
  recentlyUsedUnsterredBots?: BotListItem[];
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>;
  onSignOut: () => void;
  onDeleteConversation: (conversation: ConversationMeta) => void;
  onClearConversations: () => void;
  onSelectLanguage: () => void;
};

type ItemProps = BaseProps & {
  label: string;
  conversationId: string;
  generatedTitle?: boolean;
  updateTitle: (conversationId: string, title: string) => Promise<void>;
  onClick: () => void;
  onDelete: () => void;
};

const Item: React.FC<ItemProps> = (props) => {
  const { pathname } = useLocation();
  const { conversationId: pathParam, userId } = useParams();
  const { conversationId } = useChat(userId);
  const [tempLabel, setTempLabel] = useState('');
  const [editing, setEditing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const active = useMemo<boolean>(() => {
    return (
      pathParam === props.conversationId ||
      ((pathname === '/' || pathname.startsWith('/bot/')) &&
        conversationId == props.conversationId)
    );
  }, [conversationId, pathParam, pathname, props.conversationId]);

  const onClickEdit = useCallback(() => {
    setEditing(true);
    setTempLabel(props.label);
  }, [props.label]);

  const onClickUpdate = useCallback(() => {
    props.updateTitle(props.conversationId, tempLabel).then(() => {
      setEditing(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tempLabel, props.conversationId, props.updateTitle]);

  const onClickDelete = useCallback(() => {
    props.onDelete();
  }, [props]);

  useLayoutEffect(() => {
    if (editing) {
      inputRef.current?.focus();
    }
  }, [editing]);

  useLayoutEffect(() => {
    if (editing) {
      const listener = (e: DocumentEventMap['keypress']) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          setTempLabel((newLabel) => {
            props.updateTitle(props.conversationId, newLabel).then(() => {
              setEditing(false);
            });
            return newLabel;
          });
        }
      };
      inputRef.current?.addEventListener('keypress', listener);

      inputRef.current?.focus();

      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        inputRef.current?.removeEventListener('keypress', listener);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  return (
    <DrawerItem
      isActive={active}
      isBlur={!editing}
      to={`/${props.conversationId}`}
      onClick={props.onClick}
      icon={<PiChat />}
      labelComponent={
        <>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              className="w-full bg-transparent"
              value={tempLabel}
              onChange={(e) => {
                setTempLabel(e.target.value);
              }}
            />
          ) : (
            <>
              {props.generatedTitle ? (
                <LazyOutputText text={props.label} />
              ) : (
                <>{props.label}</>
              )}
            </>
          )}
        </>
      }
      actionComponent={
        <>
          {active && !editing && (
            <>
              <ButtonIcon className="text-base" onClick={onClickEdit}>
                <PiPencilLine />
              </ButtonIcon>

              <ButtonIcon className="text-base" onClick={onClickDelete}>
                <PiTrash />
              </ButtonIcon>
            </>
          )}
          {editing && (
            <>
              <ButtonIcon className="text-base" onClick={onClickUpdate}>
                <PiCheck />
              </ButtonIcon>

              <ButtonIcon
                className="text-base"
                onClick={() => {
                  setEditing(false);
                }}>
                <PiX />
              </ButtonIcon>
            </>
          )}
        </>
      }
    />
  );
};

const ChatListDrawer: React.FC<Props> = (props) => {
  const { t } = useTranslation();
  const { getPageLabel } = usePageLabel();
  const { opened, switchOpen } = useDrawer();
  const { conversations, starredBots, recentlyUsedUnsterredBots } = props;

  const [prevConversations, setPrevConversations] =
    useState<typeof conversations>();
  const [generateTitleIndex, setGenerateTitleIndex] = useState(-1);

  const { botId, userId } = useParams();
  const { newChat, conversationId } = useChat(userId);

  useEffect(() => {
    setPrevConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!conversations || !prevConversations) {
      return;
    }
    if (conversations.length > prevConversations?.length) {
      setGenerateTitleIndex(
        conversations?.findIndex(
          (c) =>
            (prevConversations?.findIndex((pc) => c.id === pc.id) ?? -1) < 0
        ) ?? -1
      );
    }
  }, [conversations, prevConversations]);

  const onClickNewBotChat = useCallback(
    () => {
      newChat();
      closeSamllDrawer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const smallDrawer = useRef<HTMLDivElement>(null);

  const closeSamllDrawer = useCallback(() => {
    if (smallDrawer.current?.classList.contains('visible')) {
      switchOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const onResize = () => {
      if (isMobile) {
        return;
      }

      if (!smallDrawer.current?.checkVisibility() && opened) {
        switchOpen();
      }
    };
    onResize();

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  return (
    <>
      <div className="relative h-full overflow-y-auto bg-aws-squid-ink scrollbar-thin scrollbar-track-white scrollbar-thumb-aws-squid-ink/30 ">
        <nav
          className={`lg:visible lg:w-64 ${
            opened ? 'visible w-64' : 'invisible w-0'
          } text-sm  text-white transition-width`}>
          <div className="absolute top-0 w-full overflow-y-auto overflow-x-hidden pb-12">
            <DrawerItem
              isActive={false}
              icon={<PiCompass />}
              to="/bot/explore"
              labelComponent={getPageLabel('/bot/explore')}
              onClick={closeSamllDrawer}
            />
            {props.isAllowFeedback && (
              <DrawerItem
                isActive={false}
                to={`/feedback`}
                icon={<PiEnvelopeBold />}
                labelComponent={'Feedback'}
              />
            )}
            {props.isAdmin && (
              <ExpandableDrawerGroup
                label={t('app.adminConsoles')}
                className="border-t pt-1">
                <DrawerItem
                  isActive={false}
                  icon={<PiShareNetwork />}
                  to="/admin/shared-bot-analytics"
                  labelComponent={getPageLabel('/admin/shared-bot-analytics')}
                  onClick={closeSamllDrawer}
                />
                <DrawerItem
                  isActive={false}
                  icon={<PiGlobe />}
                  to="/admin/api-management"
                  labelComponent={getPageLabel('/admin/api-management')}
                  onClick={closeSamllDrawer}
                />
              </ExpandableDrawerGroup>
            )}

            <ExpandableDrawerGroup
              label={t('app.starredBots')}
              className="border-t pt-1">
              {starredBots?.map((bot) => (
                <DrawerItem
                  key={bot.id}
                  isActive={botId === bot.id && !conversationId}
                  to={`/bot/${bot.id}`}
                  icon={<PiRobot />}
                  labelComponent={bot.title}
                  onClick={onClickNewBotChat}
                />
              ))}
            </ExpandableDrawerGroup>

            <ExpandableDrawerGroup
              label={t('app.recentlyUsedBots')}
              className="border-t pt-1">
              {recentlyUsedUnsterredBots
                ?.slice(0, 3)
                .map((bot) => (
                  <DrawerItem
                    key={bot.id}
                    isActive={false}
                    to={`/bot/${bot.id}`}
                    icon={<PiRobot />}
                    labelComponent={bot.title}
                    onClick={onClickNewBotChat}
                  />
                ))}
            </ExpandableDrawerGroup>
            <ExpandableDrawerGroup
              label={t('app.conversationHistory')}
              className="border-t pt-1">
              {conversations === undefined && (
                <div className="flex animate-spin items-center justify-center p-4">
                  <PiCircleNotch size={24} />
                </div>
              )}
              {conversations?.map((conversation, idx) => (
                <Item
                  key={idx}
                  className="grow"
                  label={conversation.title}
                  conversationId={conversation.id}
                  generatedTitle={idx === generateTitleIndex}
                  updateTitle={props.updateConversationTitle}
                  onClick={closeSamllDrawer}
                  onDelete={() => props.onDeleteConversation(conversation)}
                />
              ))}
            </ExpandableDrawerGroup>
          </div>

          <div
            className={`${
              opened ? 'w-64' : 'w-0'
            } fixed bottom-0 flex h-12 items-center justify-start border-t bg-aws-squid-ink transition-width lg:w-64`}>
            <Menu
              onSignOut={props.onSignOut}
              onSelectLanguage={props.onSelectLanguage}
              onClearConversations={props.onClearConversations}
            />
          </div>
        </nav>
      </div>

      <div
        ref={smallDrawer}
        className={`lg:hidden ${opened ? 'visible' : 'hidden'}`}>
        <ButtonIcon
          className="fixed left-64 top-0 z-50 text-white"
          onClick={switchOpen}>
          <PiX />
        </ButtonIcon>
        <div
          className="fixed z-40 h-dvh w-screen bg-dark-gray/90"
          onClick={switchOpen}></div>
      </div>
    </>
  );
};

export default ChatListDrawer;
