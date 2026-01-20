import { Allow } from 'class-validator';
export class getEmailCountInput{
    @Allow() coach_id: number;
    @Allow() type: string;
}
