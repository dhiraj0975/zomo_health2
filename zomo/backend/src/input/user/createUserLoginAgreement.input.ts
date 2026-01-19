import { Allow } from 'class-validator';
export class CreateUserLoginAgreementInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() user_id: number;
    @Allow() user_sign: string;
    @Allow() user_sign_image: string;
    @Allow() status: number;
    @Allow() login_source: number;
}
