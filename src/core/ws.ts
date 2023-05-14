import { RxStomp } from '@stomp/rx-stomp'
import { from, interval, Subject, Subscription, timeout } from 'rxjs'
import { v4 } from 'uuid'
import { EnumTopic, EnumPublishDestination, InformWebsocketType, InformWebsocketText } from './enum'
import { TopicHandlers, WebsocketConnectionState, TopicHandler } from './type'
import { WebscoketConfig } from './config'

export class WebSocketService {
	private rxStomp: RxStomp = new RxStomp()
	private config = new WebscoketConfig()
	private topicHandlers: TopicHandlers = {}
	private topicSubscrition: Partial<Record<EnumTopic, Subscription>> = {}
	private disconnect$ = new Subject()
	public readonly connectionState$ = new Subject<WebsocketConnectionState>()

	init(config: Partial<WebscoketConfig>) {
		for (const key in config) {
			//@ts-ignore
			this.config[key] = config[key]
		}
	}

	connect(token: string) {
		this.configure(token)
		this.rxStomp.activate()
		this.heartbeatSubscribe()
		this.stateSubscribe()
	}

	disconnect() {
		this.rxStomp.deactivate()
		this.disconnect$.next(true)
		this.disconnect$.unsubscribe()
		this.unsubscribeAll()
	}

	subscribe<T extends EnumTopic>(destination: T, handler: TopicHandler<T>) {
		if (this.topicHandlers[destination]) {
			this.topicHandlers[destination]!.push(handler)
		} else {
			this.topicHandlers[destination] = [handler]
			this.topicSubscrition[destination] = this.rxStomp
				.watch({
					destination,
				})
				.subscribe(val => {
					this.topicHandlers[destination]!.forEach(res => res(JSON.parse(val.body)))
				})
		}
	}

	unsubscribe<T extends EnumTopic>(destination: T, handler: TopicHandler<T>) {
		const index = this.topicHandlers[destination]?.findIndex(v => v === handler)
		if (index !== undefined && index > -1) {
			this.topicHandlers[destination]?.splice(index, 1)
			if (this.topicHandlers[destination]!.length === 0) {
				this.topicSubscrition[destination]?.unsubscribe()
				this.topicSubscrition[destination] = undefined
			}
		}
	}

	unsubscribeAll() {
		for (const destination in this.topicSubscrition) {
			this.topicSubscrition[destination as EnumTopic]!.unsubscribe()
			this.topicSubscrition[destination as EnumTopic] = undefined
		}
	}

	publish(destination: EnumPublishDestination, body: string) {
		const receiptId = v4()
		this.rxStomp.publish({
			//@ts-ignore
			headers: {
				receipt: receiptId,
			},
			destination,
			body,
		})
		return from(this.rxStomp.asyncReceipt(receiptId)).pipe(
			timeout({
				first: this.config.timeout,
			})
		)
	}

	private stateSubscribe() {
		const stompErrorsSub = this.rxStomp.stompErrors$.subscribe(val => {
			this.connectionState$.next({
				type: InformWebsocketType['3'],
				message: InformWebsocketText['3'] + val.body,
			})
		})
		const webSocketErrorsSub = this.rxStomp.webSocketErrors$.subscribe(val => {
			this.connectionState$.next({
				type: InformWebsocketType['3'],
				message: InformWebsocketText['3'] + val.type,
			})
		})
		const connectionStateSub = this.rxStomp.connectionState$.subscribe(val => {
			this.connectionState$.next({
				type: InformWebsocketType[val],
				message: InformWebsocketText[val],
			})
			if (val !== 1) {
				this.rxStomp.activate()
			}
		})
		this.disconnect$.subscribe(val => {
			stompErrorsSub.unsubscribe()
			webSocketErrorsSub.unsubscribe()
			connectionStateSub.unsubscribe()
		})
	}

	private configure(token: string) {
		this.rxStomp.configure({
			brokerURL: this.config.baseUrl + this.config.url,
			connectHeaders: {
				Authorization: token,
			},
			reconnectDelay: this.config.reconnectDelay,
			heartbeatIncoming: 0, // server to client
			heartbeatOutgoing: this.config.timeout,
		})
	}

	private heartbeatSubscribe() {
		const heartbeatSubscrition = interval(this.config.heartbeatTime).subscribe(() =>
			this.publish(EnumPublishDestination.HEARTBEAT, Date.now().toString()).subscribe({
				complete: () => {},
				error: e => {
					this.rxStomp.deactivate({ force: true })
				},
			})
		)
		this.disconnect$.subscribe(val => {
			heartbeatSubscrition.unsubscribe()
		})
	}
}
