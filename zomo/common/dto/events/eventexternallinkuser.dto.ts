import {Expose, Transform, Type} from 'class-transformer';
export class EventExternalLinkUserDto {
    @Expose() id: number;
    @Expose() event_id: number;
    @Expose() user_id: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
