import { Allow } from 'class-validator';
export class UpdateChallengeActivityInput {
    @Allow() id: number;
    @Allow() activity_name: string;
    @Allow() activity_desc: string;
    @Allow() colorcode: string;
    @Allow() status: number;
}
