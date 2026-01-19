import { Allow } from 'class-validator';
export class CreateFitnessActivityInput {
    @Allow() challenge_id: number;
    @Allow() alphabet: string;
    @Allow() activity_name: string;
    @Allow() suggestion: string;
    @Allow() status: number;
}
