import { Expose } from 'class-transformer';
export class ChallengeExternalLinkUserDto {
    @Expose() id: number;
    @Expose() schedule_id: number;
    @Expose() user_id: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
