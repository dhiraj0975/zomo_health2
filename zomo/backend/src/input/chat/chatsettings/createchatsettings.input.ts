import { Allow } from 'class-validator';
export class CreateChatSettingsInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() user_ids: any;
    @Allow() chat_with_dept: number;
    @Allow() chat_with_loc: number;
    @Allow() chat_with_users: number;
    @Allow() chat_with_team: number;
    @Allow() chat_own_team: number;
    @Allow() status: number;
    @Allow() chatSettings: any;
}
