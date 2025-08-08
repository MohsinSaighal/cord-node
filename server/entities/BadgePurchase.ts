import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

export type BadgePurchaseStatus = 'pending' | 'completed' | 'failed';

@Entity("badge_purchases")
export class BadgePurchase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "text" })
  userId!: string;

  @Column({ type: "varchar", length: 64 })
  walletAddress!: string;

  @Column({ type: "varchar", length: 120, unique: true })
  transactionHash!: string;

  @Column({ type: "decimal", precision: 10, scale: 6, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  amountSol!: number;

  @Column({ type: "decimal", precision: 10, scale: 2, transformer: {
    to: (value: number) => value,
    from: (value: string) => parseFloat(value)
  }})
  amountUsd!: number;

  @CreateDateColumn()
  purchaseDate!: Date;

  @Column({ 
    type: "varchar", 
    length: 20, 
    default: 'pending',
    enum: ['pending', 'completed', 'failed']
  })
  status!: BadgePurchaseStatus;

  // Relations
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}