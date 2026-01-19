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
@Entity({ name: tableConstant.HEALTH_CHECKUP.TBL_HC_FORM_INSTRUCTIONS_TEMPLATE_TEXTS })
export class ForminstructionsTemplateTextsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column('integer', { nullable: false })
    org_id: number;
    @Column('integer', { nullable: false })
    form_type: number;
    @Column('integer', { nullable: false })
    main_option: number;
    @Column('integer', { nullable: false })
    type: number;
    @Column('text',{ nullable: false })
    text: string;
    @Column({ type: 'int', nullable: false })
    status: number;
    @Column({ type: 'int', nullable: false, default: 0 })
    order: number;
    @CreateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ nullable: true, default: () => 'CURRENT_TIMESTAMP' })
    updated: Date;
}
