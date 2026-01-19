import {
    BaseEntity,
    BeforeInsert,
    BeforeUpdate,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    Unique,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
const argon2 = require('argon2');
@Entity({ name: tableConstant.TBL_ONBOARDING })
@Unique(['id'])
export class OnboardingEntity extends  BaseEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 100 })
    first_name: string;

    @Column({ type: 'varchar', length: 100 })
    last_name: string;

    @Column({ type: 'varchar', length: 150 })
    email: string;

    @Column({ type: 'varchar', length: 255 })
    password: string;

    @Column({ type: 'varchar', length: 100 })
    current_step: string;

    @Column({ type: 'json', nullable: true })
    steps_data: Record<string, any> | null;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    @Column({ type: 'varchar', length: 10, nullable: true })
    otp_code: string;

    @Column({ type: 'timestamp', nullable: true })
    otp_expires_at: Date;

    @Column({ type: 'tinyint', width: 1, default: 0 })
    otp_verified: number; // 0 = not verified, 1 = verified

    @Column({ type: 'varchar', length: 50, default: 'pending' })
    status: string; // pending, active, completed, etc.

    @Column({ type: 'varchar', length: 255 })
    company_name: string;

    @Column('integer', { nullable: true })
    org_id: number;

    @Column('integer', { nullable: true })
    user_id: number;

    @Column('integer', { nullable: true })
    loc_id: number;

    @Column('integer', { nullable: true })
    dept_id: number;

    @Column('integer', { nullable: true })
    camp_id: number;

    @Column({ type: 'varchar', length: 21, nullable: true })
    org_code: string;
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword() {
        if (this.password && this.password !== '') {
            this.password = Buffer.from(await argon2.hash(this.password)).toString('base64');
        } else {
            delete this.password;
        }
    }
}