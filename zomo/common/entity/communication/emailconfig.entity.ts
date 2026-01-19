import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
@Entity({ name: tableConstant.COMMUNICATION.TBL_COM_EMAIL_CONFIGS })
export class EmailConfigEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar', { length: 512, nullable: true })
    first_name: string;
    @Column('varchar', { length: 512, nullable: true })
    last_name: string;
    @Column('text', { nullable: true })
    email: string;
    @Column('integer', { nullable: false, default: 0 })
    source: number;
    @Column('integer', { nullable: true, default: 1 })
    status: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @Column('integer', { nullable: true, default: null })
    created_by: number;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
    @Column('integer', { nullable: true, default: null })
    updated_by: number;
}
