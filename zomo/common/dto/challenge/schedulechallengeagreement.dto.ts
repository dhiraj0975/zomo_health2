import { Expose } from 'class-transformer';
import { ScheduleChallengeDto } from './schedulechallenge.dto';
export class ScheduleChallengeAgreementDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() challenge_id: number;
    @Expose() agreement_text: string;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
    @Expose()
    scheduleChallenge : ScheduleChallengeDto;
}
