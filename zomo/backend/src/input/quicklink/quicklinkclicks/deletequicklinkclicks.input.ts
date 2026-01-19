import { Allow } from 'class-validator';
export class DeleteQuickLinkClicksInput {
    @Allow() id: number;
    @Allow() quicklink_id: number;
}
