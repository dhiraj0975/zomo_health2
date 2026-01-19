import { Expose } from 'class-transformer';
export class QuizWebinarDto {
    @Expose() id?: number;
    @Expose() title?: string;
    @Expose() description?: string;
    @Expose() vimeo_shareable_link?: string;
    @Expose() embedded_link?: string;
    @Expose() webinar_date?: string;
    @Expose() status?: number;
    @Expose() is_default?: number;
    @Expose() duration?: number;
    @Expose() deleted?: number;
    @Expose() created_by?: number;
    @Expose() updated_by?: number;
    @Expose() created?: string;
    @Expose() updated?: string;
}
