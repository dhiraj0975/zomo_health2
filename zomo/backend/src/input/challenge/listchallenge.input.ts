import { Allow } from 'class-validator';
export class ListChallengeInput {
    @Allow() org_id: number;
    @Allow() order: string;
    @Allow() order_by: string;
}
