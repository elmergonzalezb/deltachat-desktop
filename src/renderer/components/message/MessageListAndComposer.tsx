import React, { useRef, useState, useContext } from 'react'
import { callDcMethod } from '../../ipc'

import Composer from '../composer/Composer'
import { getLogger } from '../../../shared/logger'

import MessageList from './MessageList'

import { SettingsContext, ScreenContext } from '../../contexts'

import { C } from 'deltachat-node/dist/constants'
const { DC_CHAT_ID_DEADDROP, DC_CHAT_ID_STARRED } = C

const log = getLogger('renderer/messageListAndComposer')
export default function MessageListAndComposer({ chat }: { chat: any }) {
  const [state, setState] = useState({
    //error: false,
    composerSize: 40,
  })
  const conversationRef = useRef(null)
  const refComposer = useRef(null)
  const { openDialog } = useContext(ScreenContext)

  const setComposerSize = (size: number) => setState({ composerSize: size })

  const onDrop = (e: React.DragEvent<any>) => {
    const files = (e.target as any).files || e.dataTransfer.files
    e.preventDefault()
    e.stopPropagation()
    const tx = window.translate

    // TODO maybe add a clause here for windows because that uses backslash instead of slash
    const forbiddenPathRegEx = /DeltaChat\/.+?\.sqlite-blobs\//gi
    for (let i = 0; i < files.length; i++) {
      const { path, name } = files[i]
      if (!forbiddenPathRegEx.test(path.replace('\\', '/'))) {
        openDialog('ConfirmationDialog', {
          message: tx('ask_send_file_desktop', [name, chat.name]),
          confirmLabel: tx('menu_send'),
          cb: (yes: boolean) => {
            if (!yes) {
              return
            }
            callDcMethod('messageList.sendMessage', [chat.id, null, path])
          },
        })
      } else {
        log.warn('Prevented a file from being send again while dragging it out')
      }
    }
  }

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const [disabled, disabledReason] = (({
    id,
    isGroup,
    selfInGroup,
  }): [boolean, string] => {
    if (id === DC_CHAT_ID_DEADDROP) {
      return [true, 'messaging_disabled_deaddrop']
    } else if (chat.isDeviceChat === true) {
      return [true, 'messaging_disabled_device_chat']
    } else if (id === DC_CHAT_ID_STARRED) {
      return [true, '']
    } else if (isGroup && !selfInGroup) {
      return [true, 'messaging_disabled_not_in_group']
    } else {
      return [false, '']
    }
  })(chat)

  const settings = useContext(SettingsContext)
  const style: React.CSSProperties = {
    backgroundSize: 'cover',
    gridTemplateRows: `auto ${state.composerSize}px`,
  }
  if (settings['chatViewBgImg']) {
    if (
      settings['chatViewBgImg'] &&
      settings['chatViewBgImg'].indexOf('url') !== -1
    ) {
      style.backgroundImage = settings['chatViewBgImg']
    } else {
      style.backgroundColor = settings['chatViewBgImg']
      style.backgroundImage = 'none'
    }
  }

  return (
    <div
      className='message-list-and-composer'
      style={style}
      ref={conversationRef}
      onDrop={onDrop.bind({ props: { chat } })}
      onDragOver={onDragOver}
    >
      <div className='message-list-and-composer__message-list'>
        <MessageList
          chat={chat}
          refComposer={refComposer}
          locationStreamingEnabled={settings.enableOnDemandLocationStreaming}
        />
      </div>
      <Composer
        ref={refComposer}
        chatId={chat.id}
        draft={chat.draft}
        setComposerSize={setComposerSize.bind(this)}
        isDisabled={disabled}
        disabledReason={disabledReason}
      />
    </div>
  )
}
