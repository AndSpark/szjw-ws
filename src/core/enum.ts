import { RxStompState } from '@stomp/rx-stomp'

export enum EnumTopic {
	BPMN = '/user/topic/bpmn',
	EVIDENCE = 'evidence',
	USER_LOCATION = '/topic/user-location',
	COMMON_BROADCAST = '/topic/common-broadcast',
}

export enum EnumPublishDestination {
	HEARTBEAT = 'hearbeat',
}

export const InformWebsocketText = {
	[RxStompState.CONNECTING]: '与服务器断开连接，正在连接中',
	[RxStompState.CLOSED]: '与服务器断开连接',
	[RxStompState.OPEN]: '已经连接到服务器',
	[RxStompState.CLOSING]: '与服务器断开连接',
}
export const InformWebsocketType = {
	[RxStompState.CONNECTING]: 'error',
	[RxStompState.CLOSED]: 'error',
	[RxStompState.OPEN]: 'success',
	[RxStompState.CLOSING]: 'error',
}
