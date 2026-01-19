import { IsNotEmpty, IsNumber } from 'class-validator';

export class BiometricResultReportInput {
    @IsNumber()
    @IsNotEmpty()
    org_id: number;

    @IsNumber()
    @IsNotEmpty()
    year: number;
}
