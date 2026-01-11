
export const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const numberToWords = (value: number) => {
    // A very simple implementation for demonstration. 
    // In a real app, you'd use a library like 'extenso' or a more robust logic.
    // For now, I'll provide a basic one or just leave it for the user to refine if needed, 
    // but let's try a decent version for common school values.

    const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
    const dezena_10 = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
    const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
    const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

    const formatPart = (n: number) => {
        if (n === 0) return "";
        if (n === 100) return "cem";

        let res = "";
        const c = Math.floor(n / 100);
        const d = Math.floor((n % 100) / 10);
        const u = n % 10;

        if (c > 0) res += centenas[c];
        if (d === 1) {
            if (res) res += " e ";
            res += dezena_10[u];
            return res;
        }

        if (d > 1) {
            if (res) res += " e ";
            res += dezenas[d];
        }

        if (u > 0) {
            if (res) res += " e ";
            res += unidades[u];
        }

        return res;
    };

    if (value === 0) return "zero reais";

    const integerPart = Math.floor(value);
    const decimalPart = Math.round((value - integerPart) * 100);

    let result = "";

    if (integerPart > 0) {
        if (integerPart >= 1000) {
            const mil = Math.floor(integerPart / 1000);
            const rest = integerPart % 1000;
            if (mil === 1) result += "mil";
            else result += formatPart(mil) + " mil";

            if (rest > 0) {
                if (rest < 100 || rest % 100 === 0) result += " e ";
                else result += ", ";
                result += formatPart(rest);
            }
        } else {
            result += formatPart(integerPart);
        }
        result += integerPart === 1 ? " real" : " reais";
    }

    if (decimalPart > 0) {
        if (result) result += " e ";
        result += formatPart(decimalPart);
        result += decimalPart === 1 ? " centavo" : " centavos";
    }

    return result;
};

export const printDocument = (html: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        // Wait for styles/scripts to load if necessary, though tailwind cdn might need a bit
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 500);
    }
};

const HOLIDAYS = [
    '01-01', '04-21', '05-01', '09-07', '10-12', '11-02', '11-15', '12-25'
];

export const subtractBusinessDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    let count = 0;
    while (count < days) {
        result.setDate(result.getDate() - 1);
        // 0 = Sun, 6 = Sat
        const dayOfWeek = result.getDay();

        // Format MM-DD to check fixed holidays
        const month = String(result.getMonth() + 1).padStart(2, '0');
        const day = String(result.getDate()).padStart(2, '0');
        const dateString = `${month}-${day}`;

        if (dayOfWeek !== 0 && dayOfWeek !== 6 && !HOLIDAYS.includes(dateString)) {
            count++;
        }
    }
    return result;
};

export const getSchoolDayBefore = (date: Date, daysToSubtract: number = 2): Date => {
    return subtractBusinessDays(date, daysToSubtract);
};
