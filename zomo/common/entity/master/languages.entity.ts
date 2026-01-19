import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity(tableConstant.TBL_LANGUAGES)
export class LanguagesEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('varchar',{ length: 255, nullable: false })
    title: string;
    @Column('varchar', {  length: 255, nullable: false })
    native: string;
    @Column('varchar', {  length: 255, nullable: false })
    alias: string;
    @Column('integer', { default: 1 })
    status: number;
    @Column('integer', { nullable: true })
    weight: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
