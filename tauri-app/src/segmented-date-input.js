export const parseCompactDateDigits = (value) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    if (digits.length !== 8) return null;

    const month = Number.parseInt(digits.slice(0, 2), 10);
    const day = Number.parseInt(digits.slice(2, 4), 10);
    const year = Number.parseInt(digits.slice(4, 8), 10);
    if (year < 1 || month < 1 || month > 12) return null;

    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
    if (day < 1 || day > daysInMonth) return null;

    const monthText = String(month).padStart(2, '0');
    const dayText = String(day).padStart(2, '0');
    const yearText = String(year).padStart(4, '0');
    return {
        month: monthText,
        day: dayText,
        year: yearText,
        isoDate: `${yearText}-${monthText}-${dayText}`
    };
};
