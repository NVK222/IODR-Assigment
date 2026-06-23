import React, { useState, useEffect } from "react";
import type { Transaction, User, UserSummary, UserSummaryResponse } from "../schema";
import { v4 as uuid } from "uuid";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default function Dashboard() {
    const [userIdInput, setUserIdInput] = useState<string>("");
    const [amountInput, setAmountInput] = useState<string>("");
    const [searchUserId, setSearchUserId] = useState<string>("");
    const [rankings, setRankings] = useState<User[]>([]);
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [transactionMessage, setTransactionMessage] = useState<string>("");
    const [topLimit, setTopLimit] = useState<number>(5)

    const getRanking = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/ranking?top=${topLimit}`);
            if (response.ok) {
                const data: User[] = await response.json();
                setRankings(data);
            }
        } catch (error) {
            console.error("Error fetching rankings:", error);
        }
    };

    useEffect(() => {
        getRanking();
    }, [topLimit]);

    const handleTransactionSubmit = async (e: React.SubmitEvent): Promise<void> => {
        e.preventDefault();
        if (!userIdInput || !amountInput) return;

        setIsLoading(true);
        setTransactionMessage("");

        const idempotencyKey = uuid();

        try {
            const response = await fetch(
                `${API_BASE_URL}/transaction?key=${idempotencyKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_id: userIdInput,
                        amount: parseFloat(amountInput)
                    })
                }
            );

            const data = await response.json();

            if (response.ok) {
                const successTx = data as Transaction;
                setTransactionMessage(`Success! Transaction ID: ${successTx.transaction_id}`);
                setAmountInput("");
                getRanking();
                if (searchUserId === userIdInput) getSummary(userIdInput);
            } else {
                setTransactionMessage(`Error: ${data.detail || "Failed to process"}`);
            }
        } catch (error: unknown) {
            setTransactionMessage("Error :  " + error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSummarySearch = (e: React.SubmitEvent) => {
        e.preventDefault();
        if (searchUserId.trim() === "") return;
        getSummary(searchUserId);
    };

    const handleTopLimitChange = (e: React.ChangeEvent<HTMLInputElement, HTMLInputElement>) => {
        const val = Number(e.target.value)
        if (isNaN(val) || val < 0 || val > 50) return;
        setTopLimit(val)
    }

    const getSummary = async (userId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/summary/${userId}`);
            if (response.ok) {
                const data: UserSummaryResponse = await response.json();

                const [transactions, totalAmount, numTransactions] = data;

                setUserSummary({
                    user_id: userId,
                    transactions,
                    total_amount: totalAmount,
                    number_of_transactions: numTransactions
                });
            }
        } catch (error) {
            console.error("Error fetching summary:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <header className="max-w-6xl mx-auto mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Transaction Dashboard</h1>
            </header>

            <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <section className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">Create New Transaction</h2>
                        <form onSubmit={handleTransactionSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-600">User ID</label>
                                <input
                                    type="text"
                                    value={userIdInput}
                                    onChange={(e) => setUserIdInput(e.target.value)}
                                    placeholder="e.g., alice"
                                    className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-600">Amount</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={amountInput}
                                    onChange={(e) => setAmountInput(e.target.value)}
                                    placeholder="0.0"
                                    className="w-full p-2 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-bold p-2 rounded transition-colors disabled:bg-blue-300 ${isLoading ? "animate-bounce" : ""}`}
                            >
                                {isLoading ? "Processing..." : "Submit Transaction"}
                            </button>
                        </form>
                        {transactionMessage && (
                            <p className="mt-4 p-2 text-sm bg-gray-50 rounded border text-gray-700 font-medium">
                                {transactionMessage}
                            </p>
                        )}
                    </section>

                    <section className="bg-white p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4 text-gray-700">User Transactions</h2>
                        <form onSubmit={handleSummarySearch} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={searchUserId}
                                onChange={(e) => setSearchUserId(e.target.value)}
                                placeholder="Search User ID (e.g., bob)"
                                className="flex-1 p-2 border border-gray-300 rounded shadow-sm"
                                required
                            />
                            <button type="submit" className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded font-medium">
                                Search
                            </button>
                        </form>

                        {userSummary && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded border text-sm">
                                    <div>
                                        <span className="text-gray-500 block">Total Amount</span>
                                        <strong className="text-lg text-gray-800">${userSummary.total_amount.toFixed(2)}</strong>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block">Number of Transactions</span>
                                        <strong className="text-lg text-gray-800">{userSummary.number_of_transactions}</strong>
                                    </div>
                                </div>

                                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mt-4">Transaction Logs</h3>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {userSummary.transactions.length === 0 ? (
                                        <p className="text-sm text-gray-400 italic">No transactions recorded yet.</p>
                                    ) : (
                                        userSummary.transactions.map((tx) => (
                                            <div key={tx.transaction_id} className="text-xs bg-white p-2 border rounded shadow-sm flex justify-between items-center">
                                                <div>
                                                    <p className="font-mono text-gray-500">{tx.transaction_id.slice(0, 8)}...</p>
                                                    <p className="text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                                                </div>
                                                <span className="font-bold text-green-600 text-sm">${tx.amount.toFixed(2)}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <div>
                    <section className="bg-white p-6 rounded-lg shadow h-full">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex gap-4 items-center">
                                <h2 className="text-xl font-semibold text-gray-700">Ranking</h2>
                                <span className="text-[10px] text-center ml-4">Based on total amount spent and number of transactions made</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                    <label htmlFor="topLimitSelect" className="font-medium">Show top:</label>
                                    <input
                                        id="topLimitSelect"
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={topLimit}
                                        onChange={(e) => {
                                            handleTopLimitChange(e)
                                        }}
                                        className="w-14 p-1 text-center border border-gray-300 rounded shadow-sm font-bold text-gray-800 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                                <button
                                    onClick={() => getRanking()}
                                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 py-1.5 px-2.5 rounded border transition-colors duration-200"
                                >
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {rankings.map((user, index) => (
                                <div
                                    key={user.user_id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-all ${index === 0 ? "bg-amber-50 border-amber-200 ring-2 ring-amber-300" : "bg-gray-50 border-gray-200"
                                        }`}
                                >
                                    <div className="flex items-center space-x-3">
                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index === 0 ? "bg-amber-400 text-amber-900" :
                                            index === 1 ? "bg-slate-300 text-slate-800" :
                                                index === 2 ? "bg-orange-300 text-orange-900" : "bg-gray-200 text-gray-600"
                                            }`}>
                                            {index + 1}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-gray-800">{user.user_id}</h3>
                                            <p className="text-xs text-gray-500">{user.number_of_transactions} transactions</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-extrabold text-gray-900">${user.total_amount.toFixed(2)}</span>
                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Amount</p>
                                    </div>
                                </div>
                            ))}

                            {rankings.length === 0 && (
                                <p className="text-center text-gray-400 italic py-8">Leaderboard empty.</p>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
