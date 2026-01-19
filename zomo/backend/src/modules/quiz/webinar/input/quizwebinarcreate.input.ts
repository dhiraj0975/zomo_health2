import { Allow } from 'class-validator';
export class QuizWebinarCreateInput {
    @Allow() id?: number;
    @Allow() title?: string;
    @Allow() description?: string;
    @Allow() vimeo_shareable_link?: string;
    @Allow() duration?: string | number;
    @Allow() embedded_link?: string;
    @Allow() webinar_date?: string;
    @Allow() status?: number;
    @Allow() is_default?: number;
}
