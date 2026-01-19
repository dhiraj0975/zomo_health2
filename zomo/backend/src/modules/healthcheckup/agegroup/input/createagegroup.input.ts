import { Allow } from 'class-validator';
export class CreateAgeGroupInput {
    @Allow() id: number;
    @Allow() group_name: string;
    @Allow() gender: string;
    @Allow() group_min_age: number;
    @Allow() group_max_age: number;
    @Allow() created_by: number;
    @Allow() status: number;
}
