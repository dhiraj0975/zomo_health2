import { Allow } from 'class-validator';
export class findInput {
    @Allow() postcode: string;
    @Allow() country: string;
}
