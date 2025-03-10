export function assertTextDataFromHTML(text: string): string {
    return text.replace(/(\\n|r\\)/g, "").trim();
}

export function assertPriceData(text: string): number {
    return Number(assertTextDataFromHTML(text).replace(/[^,.\d]/g, '').replace(',', '.'));
}
