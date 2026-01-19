import { Allow } from 'class-validator';
export class GetOneQuizClicksInput {
    @Allow() id: number;
    @Allow() qz_assign_id: number;
}
