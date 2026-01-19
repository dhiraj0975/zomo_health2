import { Transform, Type, Expose } from 'class-transformer';
export class PhysicianTempsDto {
    @Expose() id: number;
    @Expose() user_id: number;
    @Expose() first_name: string;
    @Expose() last_name: string;
    @Expose() physiciantype_id: number;
    @Expose() pname: string;
    @Expose() email: string;
    @Expose() wphone: string;
    @Expose() signature: string;
    @Expose() create_account: number;
    @Expose() status: number;
    @Expose()
    physician_date: string;
    @Expose()
    created: string;
}
