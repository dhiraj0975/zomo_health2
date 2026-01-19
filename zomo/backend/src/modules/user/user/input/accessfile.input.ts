import { Allow } from 'class-validator';
export class AccessFileInput {
    @Allow() type: any;
    @Allow() file: string;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() role_id: number;
    @Allow() item_id: number;
    @Allow() schedule_id: number;
}
