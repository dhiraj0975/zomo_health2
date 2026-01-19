import { Allow } from 'class-validator';
export class CreateSpouseInput {
    @Allow() id: number;
    @Allow() firstname: string;
    @Allow() lastname: string;
    @Allow() email: string;
    @Allow() relationship_id: string;
    @Allow() activation_key: string;
    @Allow() status: number;
}
