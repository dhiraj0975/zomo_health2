import { Expose } from 'class-transformer';
export class RegistrationDto {
    @Expose() id: number;
    @Expose() first_name: string;
    @Expose() last_name: string;
    @Expose() email: string;
    @Expose() password: string;
    @Expose() status: number;
}
