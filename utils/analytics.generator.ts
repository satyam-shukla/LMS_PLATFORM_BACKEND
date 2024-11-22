import { Document, Model } from "mongoose";

interface monthData {
    month: string;
    count: number;
};


export async function generateLast12MonthData<T extends Document>(model: Model<T>): Promise<{ last12Months: monthData[] }> {
    const last12Months: monthData[] = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + 1);

    for (let i = 11; i >= 0; i--) {
        const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, currentDate.getDate() - i * 28)
        const startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - 28);

        const monthYear = endDate.toLocaleDateString('default', { day: "numeric", month: "short", year: "numeric" });
        const count = await model.countDocuments({
            createdAt: { $gte: startDate, $lt: endDate }
        });
        last12Months.push({ month: monthYear, count });
        console.log(last12Months)
    };
    return { last12Months }

}

