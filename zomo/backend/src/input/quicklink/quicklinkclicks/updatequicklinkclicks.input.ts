import { Allow } from 'class-validator';
export class UpdateQuickLinkClicksInput {
    @Allow() id: number;
    @Allow() quicklink_id: number;
    @Allow() user_id: string;
    @Allow() activity_id: number;
    @Allow() status: number;
}
