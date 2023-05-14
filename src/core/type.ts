import { EnumTopic } from './enum'

export type TopicHandlers = {
	[x in EnumTopic]?: ((response: TopicResponses[x]) => any)[]
}

export type TopicHandler<T extends EnumTopic> = (response: TopicResponse<T>) => any

export type TopicResponse<T extends EnumTopic> = TopicResponses[T]

export type TopicResponses = {
	[EnumTopic.BPMN]: BpmnTopicResponse
	[EnumTopic.EVIDENCE]: any
	[x: string]: any
}

export type BpmnTopicResponse = {
	action: string
	data: any
}

export type WebsocketConnectionState = {
	type: string
	message: string
	code?: string
}
