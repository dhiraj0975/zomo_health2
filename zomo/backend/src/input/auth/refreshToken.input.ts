import { Allow } from 'class-validator';
export class RefreshTokenInput {
    @Allow() accessToken: string;
    @Allow() refreshToken: string;
}
