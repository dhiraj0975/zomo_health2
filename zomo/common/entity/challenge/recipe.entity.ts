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
@Entity({ name: tableConstant.CHALLENGE.TBL_CH_RECIPE })
export class RecipeEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: true, default: null })
    schedule_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    user_id: number;
    @Column({ type: 'int', nullable: true, default: null })
    org_id: number;
    @Column({ type: 'text', nullable: false })
    recipe_name: string;
    @Column({ type: 'int', nullable: false })
    recipe_type: number;
    @Column({ type: 'text', nullable: false })
    recipe_ingredients: string;
    @Column({ type: 'text', nullable: false })
    recipe_direction: string;
    @Column({ type: 'text', nullable: true, default: null})
    recipe_additional_notes: string;
    @Column({ type: 'text', nullable: true, default: null})
    recipe_healthy: string;
    @Column({ type: 'text', nullable: false })
    recipe_image: string;
    @Column({ type: 'int', nullable: false, default: 1 })
    status: number;
    @Column({ type: 'int', nullable: false })
    added_source: number;
    @Column({ type: 'int', nullable: true, default: null })
    created_by: number;
    @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    created: Date;
    @UpdateDateColumn({ type: 'timestamp', nullable: true, default: null, onUpdate: 'CURRENT_TIMESTAMP' })
    updated: Date;
}
