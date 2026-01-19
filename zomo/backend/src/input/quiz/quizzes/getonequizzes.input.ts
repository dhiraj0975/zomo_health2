import { Allow } from 'class-validator';
export class GetOneQuizzesInput {
    @Allow() id: number;
    @Allow() cat_id: number;
    @Allow() selected_org: number;
}
