import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Epoch } from "./Epoch";

@Entity("user_epoch_stats")
@Index(["userId", "epochId"], { unique: true })
@Index(["epochId", "userEarnings"])
export class UserEpochStats {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "decimal", precision: 15, scale: 8, default: 0 })
  userEarnings!: number;

  @Column({ type: "integer", default: 0 })
  userTasksCompleted!: number;

  @Column({ type: "bigint", default: 0 })
  userMiningTime!: number;

  @Column({ type: "integer", default: 0 })
  userRank!: number;

  @Column({ type: "timestamp" })
  joinedAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Relations
  @Column({ type: "uuid" })
  userId!: string;

  @Column({ type: "uuid" })
  epochId!: string;

  @ManyToOne(() => User, (user) => user.epochStats, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;

  @ManyToOne(() => Epoch, (epoch) => epoch.userStats, { onDelete: "CASCADE" })
  @JoinColumn({ name: "epochId" })
  epoch!: Epoch;
}
