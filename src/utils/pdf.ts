
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPdf = (title: string, head: string[][], body: any[][], fileName:string) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    autoTable(doc, {
        head: head,
        body: body,
        startY: 30,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
    });
    doc.save(`${fileName}_${new Date().toISOString().split('T')[0]}.pdf`);
};


/**
 * Escapes a value for CSV format. If the value contains a comma, double quote, or newline,
 * it will be wrapped in double quotes. Existing double quotes will be escaped by doubling them.
 * @param value The value to escape.
 * @returns The escaped string.
 */
const escapeCsvValue = (value: any): string => {
    const stringValue = String(value == null ? '' : value);
    if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
};

/**
 * Converts an array of objects or arrays into a CSV string and triggers a download.
 * @param headers An array of strings for the CSV header row.
 * @param data An array of arrays representing the rows.
 * @param fileName The name of the file to be downloaded (without extension).
 */
export const exportToCsv = (headers: string[], data: any[][], fileName: string) => {
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            row.map(escapeCsvValue).join(',')
        )
    ];
    
    const csvString = csvRows.join('\n');
    
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    if (link.download !== undefined) { // feature detection
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${fileName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
