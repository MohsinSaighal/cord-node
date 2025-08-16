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

@Entity("mining_sessions")
@Index(["userId", "startTime"])
export class MiningSession {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "uuid" })
  userId!: string;

  @Column({ name: "start_time", type: "timestamp" })
  startTime!: Date;

  @Column({ name: "end_time", type: "timestamp", nullable: true })
  endTime!: Date | null;

  @Column({ 
    name: "earnings",
    type: "decimal", 
    precision: 15, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  earnings!: number;

  @Column({ 
    name: "hash_rate",
    type: "decimal", 
    precision: 10, 
    scale: 2, 
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  hashRate!: number;

  @Column({ 
    name: "efficiency",
    type: "decimal", 
    precision: 5, 
    scale: 2, 
    default: 85,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => parseFloat(value)
    }
  })
  efficiency!: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.miningSessions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;
}