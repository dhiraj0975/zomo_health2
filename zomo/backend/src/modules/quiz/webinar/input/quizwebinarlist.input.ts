import { Allow } from 'class-validator';
export class QuizWebinarListInput {
    @Allow() id?: number;
    @Allow() organization_id?: number;
    @Allow() title?: string;
    @Allow() embedded_link?: string;
    @Allow() order?: string;
    @Allow() order_by?: string;
    @Allow() type?: string;

}
