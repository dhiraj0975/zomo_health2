import { Allow } from 'class-validator';
export class CreateFileOrganizationsInput {
    @Allow() id?: number;
    @Allow() file_id?: number;
    @Allow() organization_id?: number;
    @Allow() status?: number;
}
