import {
    BaseEntity,
    Column,
    Entity,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { tableConstant } from '../../constant';
;
;
@Entity({ name: tableConstant.TRACKERS.TBL_FT_FOOD_FEEDS })
export class FoodFeedsEntity extends BaseEntity {
    @PrimaryGeneratedColumn('increment', { type: 'int' })
    id: number;
    @Column({ type: 'int', nullable: false })
    user_id: number;
    @Column({ type: 'varchar', length: 250, nullable: false })
    userName: string;
    @Column({ type: 'varchar', length: 100, nullable: false })
    appId: string;
    @Column({ type: 'varchar', length: 20, nullable: false })
    logType: string;
    @Column({ type: 'varchar', length: 250, nullable: false })
    appName: string;
    @Column({ type: 'int', nullable: false })
    logId: number;
    @Column({ type: 'int', nullable: false })
    foodId: number;
    @Column({ type: 'varchar', length: 50, nullable: false })
    locale: string;
    @Column({ type: 'int', nullable: false })
    mealTypeId: number;
    @Column({ type: 'varchar', length: 250, nullable: false })
    name: string;
    @Column({ type: 'float', nullable: false })
    calories: number;
    @Column({ type: 'float', nullable: false })
    carbs: number;
    @Column({ type: 'float', nullable: false })
    fat: number;
    @Column({ type: 'float', nullable: false })
    fiber: number;
    @Column({ type: 'float', nullable: false })
    protein: number;
    @Column({ type: 'float', nullable: false })
    sodium: number;
    @Column({ type: 'float', nullable: false })
    water: number;
    @Column({ type: 'date', nullable: false })
    logDate: string;
    @Column({ type: 'varchar', length: 20, nullable: false })
    isFavorite: string;
    @Column({ type: 'varchar', length: 50, nullable: false })
    accessLevel: string;
    @Column({ type: 'int', nullable: false })
    amount: number;
    @Column({ type: 'varchar', length: 50, nullable: false })
    foodUnit: string;
    @Column({ type: 'date', nullable: false })
    collectionDate: string;
    @Column({ type: 'int', nullable: false })
    activityTypeId: number;
    @Column({ type: 'varchar', length: 250, nullable: false })
    activityType: string;
    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    timestamp: Date;
    @Column({ type: 'int', default: 1 })
    status: number;
}
