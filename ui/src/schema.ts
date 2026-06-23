export interface Transaction {
    transaction_id: string;
    user_id: string;
    amount: number;
    created_at: string;
}

export interface User {
    user_id: string;
    transactions: Transaction[];
    total_amount: number;
    number_of_transactions: number;
}

export interface UserSummary extends User { }

export type UserSummaryResponse = [Transaction[], number, number];
