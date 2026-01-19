import { Allow } from 'class-validator';
export class DeclineUserFormInput {
    @Allow() id: number;
    @Allow() note: string;
    @Allow() org_id: string;
    @Allow() user_id: string;
    @Allow() formName: string;
}
