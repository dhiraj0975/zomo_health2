import { Allow } from 'class-validator';
export class CreateScheduleChallengeAgreementInput {
    @Allow() schedule_id: number;
    @Allow() challenge_id: number;
    @Allow() agreement_text: string;
    @Allow() status: number;
}
