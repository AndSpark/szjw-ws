import { EnumTopic } from './enum';
import { Hanlder } from 'vue3-oop';
export declare const WsSubscribe: WsSubscribeDecorator;
export interface WsSubscribeDecorator {
    (enumTopic: EnumTopic): PropertyDecorator;
    MetadataKey: symbol | string;
}
export declare const WsSubscribeHandler: Hanlder;
