import { Allow } from 'class-validator';
export class physicianDiseasesStepsInput {
    @Allow() getType?: number;
    @Allow() first_step?: string;
    @Allow() standard_dates?: string;
    @Allow() not_recommended?: string;
}
