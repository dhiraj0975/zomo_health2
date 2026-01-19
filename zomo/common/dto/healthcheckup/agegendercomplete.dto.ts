import { Expose } from 'class-transformer';
export class AgeGenderCompleteDto {
    @Expose() id: number;
    @Expose() age_activity_id: number;
    @Expose() date: string;
    @Expose() reference_id: number;
    @Expose() user_id: number; 
    @Expose() physician_name: string;
    @Expose() physician_signature: string;
    @Expose() status: number;
    @Expose() inserted: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() updated: string;
}
