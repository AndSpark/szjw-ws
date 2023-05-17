import { EnumTopic } from './enum'

export type TopicHandlers = {
	[x in EnumTopic]?: ((response: TopicResponses[x]) => any)[]
}

export type TopicHandler<T extends EnumTopic> = (response: TopicResponse<T>) => any

export type TopicResponse<T extends EnumTopic> = TopicResponses[T]

export type TopicResponses = {
	[EnumTopic.BPMN]: BpmnMessage
	[EnumTopic.EVIDENCE]: any
	[x: string]: any
}

export enum EnumBpmnTaskAction {
	TASK_CREATED = 'task-created',
	TASK_ASSIGNED = 'task-assigned',
	TASK_COMPLETED = 'task-complete',
	TASK_CANCELLD = 'task-cancelled',
}

export enum EnumBpmnProcessAction {
	PROCESS_STARTED = 'process-started',
	PROCESS_UPDATED = 'process-updated',
	PROCESS_COMPLETED = 'process-completed',
	PROCESS_CANCELLED = 'process-cancelled',
	PROCESS_VARIABLE_UPDATED = 'process-variable-updated',
}
export interface BpmnTaskMessage {
	action: EnumBpmnTaskAction
	data: {
		assignee?: string
		businessKey: string
		candidateUsers: string[]
		candidateGroupUsers: string[]
		name: string
		processDefinitionId: string
		processDefinitionKey: string
		processInstanceId: string
		startBy: string
		taskId: string
		taskKey: string
		uid: string
	}
}
export interface BpmnProcessMessage {
	action: EnumBpmnProcessAction
	data: {
		id: string
		businessKey: string
		processDefinitionId: string
		processDefinitionKey: string
		processInstanceId: string
		uid: string
		variables?: Record<string, any>
	}
}

export type BpmnMessage = BpmnTaskMessage | BpmnProcessMessage

export type WebsocketConnectionState = {
	type: string
	message: string
	code?: string
}
