import { Allow } from 'class-validator';
export class UpdateFitnessActivityInput {
    @Allow() id: number;
    @Allow() challenge_id: number;
    @Allow() alphabet: string;
    @Allow() activity_name: string;
    @Allow() suggestion: string;
    @Allow() status: number;
}
