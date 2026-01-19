import { Allow, IsNotEmpty, IsString, Matches } from 'class-validator';

export class GetDailyStepsInput {
    @IsNotEmpty({ message: 'Date is required!' })
    @IsString({ message: 'Date must be a string!' })
    @Matches(/^\d{4}-\d{2}-\d{2}$/, {
        message: 'Date must be in YYYY-MM-DD format!',
    })
    date: string;
    @Allow() user_id: string;
}
