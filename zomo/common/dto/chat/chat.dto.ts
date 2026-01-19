import { Expose } from 'class-transformer';
export class ChatDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() group_id: number;
    @Expose() schedule_id: number;
    @Expose() location_id: number;
    @Expose() department_id: number;
    @Expose() team_id: number;
    @Expose() event_id: number;
    @Expose() is_private: number;
    @Expose() sender_id: number;
    @Expose() text: string;
    @Expose() read_by: string;
    @Expose() reactions: any;
    @Expose() added_date: string;
    @Expose() datetime: string;
    @Expose() status: number;
}
