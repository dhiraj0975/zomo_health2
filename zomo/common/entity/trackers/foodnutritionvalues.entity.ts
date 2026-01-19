import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.TRACKERS.TBL_FT_FOOD_NUTRITION_VALUES })
export class FoodNutritionValueEntity extends BaseEntity {
    @PrimaryGeneratedColumn({ type: 'int' })
    id: number;
    @Column({ type: 'int' })
    user_id: number;
    @Column({ type: 'varchar', length: 250, })
    userName: string;
    @Column({ type: 'varchar', length: 20, })
    logType: string;
    @Column({ type: 'int' })
    logId: number;
    @Column({ type: 'varchar', length: 250, })
    appName: string;
    @Column({ type: 'varchar', length: 250, })
    foodUnit: string;
    @Column({ type: 'float', precision: 8, scale: 2 })
    amount: number;
    @Column({ type: 'varchar', length: 5, })
    NDB_No: string;
    @Column({ type: 'varchar', length: 250, })
    Long_Desc: string;
    @Column({ type: 'int' })
    Nutr_No: number;
    @Column({ type: 'varchar', length: 250, })
    NutrDesc: string;
    @Column({ type: 'float', precision: 8, scale: 2 })
    NutrVal: number;
    @Column({ type: 'date' })
    logDate: string;
    @Column({ type: 'date' })
    collectionDate: string;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    timestamp: Date;
    @Column({ type: 'int', default: 1 })
    status: number;
}
