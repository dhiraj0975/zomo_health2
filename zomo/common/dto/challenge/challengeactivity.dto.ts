import { Expose } from 'class-transformer';
export class ChallengeActivityDto {
    @Expose() id: number;
    @Expose() activity_name: string;
    @Expose() activity_desc: string;
    @Expose() colorcode: string;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() modified: string;
}
