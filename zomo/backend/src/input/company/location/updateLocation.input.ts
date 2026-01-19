import { Allow } from 'class-validator';
export class UpdateLocationInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() lname: string;
    @Allow() location_name: string;
    @Allow() address1: string;
    @Allow() address2: string;
    @Allow() city: string;
    @Allow() state: string;
    @Allow() country: string;
    @Allow() zip: string;
    @Allow() is_default: number;
    @Allow() status: number;
}
