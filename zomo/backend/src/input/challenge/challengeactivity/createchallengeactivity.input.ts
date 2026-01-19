import { Allow } from 'class-validator';
export class CreateChallengeActivityInput {
    @Allow() activity_name: string;
    @Allow() activity_desc: string;
    @Allow() colorcode: string;
    @Allow() status: number;
}
