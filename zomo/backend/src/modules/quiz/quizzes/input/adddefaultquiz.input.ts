import { Allow } from 'class-validator';
export class addDefaultQuizInput {
    @Allow() role_id: number;
    @Allow() webinar_id: number;
    @Allow() type: string;
    @Allow() title: string;
    @Allow() embedded_link: string;
}
