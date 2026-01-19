import { Allow } from 'class-validator';
export class CreateCommitmentLevelsInput {
    @Allow() challenge_id: number;
    @Allow() schedule_id: number;
    @Allow() level_value: number;
    @Allow() level_type: string;
    @Allow() status: number;
}
