import { Allow } from 'class-validator';
export class UpdateDataManagersInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: string;
}
