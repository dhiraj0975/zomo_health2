import {
    BaseEntity,
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.COVID.COVID_VACCINATION_TYPE })
export class CovidVaccinationTypeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int' })
    org_id: number;
    @Column({ type: 'varchar', length: 255, nullable: true })
    title: string;
    @Column({ type: 'int', nullable: true })
    status: number;
    @Column({ type: 'int', nullable: true })
    created_by: number;
    @Column({ type: 'int', nullable: true })
    updated_by: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    update: Date;
}
