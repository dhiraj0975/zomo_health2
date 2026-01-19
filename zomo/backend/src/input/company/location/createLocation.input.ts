import { Allow } from 'class-validator';
export class CreateLocationInput {
    @Allow() company_id: number;
    @Allow() location_name: string;
    @Allow() lname: string;
    @Allow() address1: string;
    @Allow() address2: string;
    @Allow() city: string;
    @Allow() state: string;
    @Allow() country: string;
    @Allow() zip: string;
    @Allow() is_default: number;
    @Allow() status: number;
}
