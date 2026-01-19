import { Allow } from 'class-validator';
export class GetOneQuickLinkClicksInput {
    @Allow() id: number;
    @Allow() quicklink_id: number;
}
