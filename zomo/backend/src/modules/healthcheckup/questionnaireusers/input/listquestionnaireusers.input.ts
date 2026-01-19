import { Allow } from 'class-validator';
export class ListQuestionnaireUsersInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() type: string;
}
