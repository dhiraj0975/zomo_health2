import { Allow } from 'class-validator';
export class CreateChatInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() group_id: number;
    @Allow() schedule_id: number;
    @Allow() location_id: number;
    @Allow() department_id: number;
    @Allow() team_id: number;
    @Allow() event_id: number;
    @Allow() is_private: number;
    @Allow() sender_id: number;
    @Allow() send_to: number;
    @Allow() text: string;
    @Allow() read_by: string;
    @Allow() type: string;
    @Allow() reactions: any;
    @Allow() status: number;
    @Allow() align?: string;
}
