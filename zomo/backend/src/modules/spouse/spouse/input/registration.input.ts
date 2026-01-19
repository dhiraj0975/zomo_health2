import { Allow } from 'class-validator';
export class registerInput {
    @Allow() id: number;
    @Allow() role_id: number;
    @Allow() type: string;
    @Allow() invitedUserCode: string;
    @Allow() activationKey: string;
    @Allow() first_name: string;
    @Allow() last_name: string;
    @Allow() password: string;
    @Allow() confpassword: string;
    @Allow() email: string;
    @Allow() cphone: string | number;
    @Allow() dob: string;
    @Allow() gender: string ;
}
