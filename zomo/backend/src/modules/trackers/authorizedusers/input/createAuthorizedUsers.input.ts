import { Allow } from 'class-validator';
export class CreateFtAuthorizedUsersInput {
    @Allow() code: string;
    @Allow() username: string;
}
