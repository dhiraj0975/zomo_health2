import { Allow, IsNumber, IsOptional } from 'class-validator';
export class SpouseLinkUnlinkInput {
    @IsNumber()
    @IsOptional()
    @Allow() id?: number;
    @IsNumber()
    @IsOptional()
    @Allow() status?: number;

}