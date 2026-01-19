import { Allow } from 'class-validator';
export class CreateQuickLinkClicksInput {
    @Allow() quicklink_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
}
