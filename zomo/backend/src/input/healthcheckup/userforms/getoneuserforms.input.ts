import { Allow } from 'class-validator';
export class GetOneUserFormInput {
    @Allow() id: number;
    @Allow() org_id: number;
}
