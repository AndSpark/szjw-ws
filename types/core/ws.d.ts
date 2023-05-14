import { Subject } from 'rxjs';
import { EnumTopic, EnumPublishDestination } from './enum';
import { WebsocketConnectionState, TopicHandler } from './type';
import { WebscoketConfig } from './config';
export declare class WebSocketService {
    private rxStomp;
    private config;
    private topicHandlers;
    private topicSubscrition;
    private disconnect$;
    readonly connectionState$: Subject<WebsocketConnectionState>;
    init(config: Partial<WebscoketConfig>): void;
    connect(token: string): void;
    disconnect(): void;
    subscribe<T extends EnumTopic>(destination: T, handler: TopicHandler<T>): void;
    unsubscribe<T extends EnumTopic>(destination: T, handler: TopicHandler<T>): void;
    unsubscribeAll(): void;
    publish(destination: EnumPublishDestination, body: string): import("rxjs").Observable<import("@stomp/rx-stomp").IFrame>;
    private stateSubscribe;
    private configure;
    private heartbeatSubscribe;
}
