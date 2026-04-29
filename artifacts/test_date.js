
const d1 = new Date(2025, 0, 1); // Local 1 Jan 00:00
const d2 = new Date('2025-01-01'); // UTC 1 Jan 00:00 (Local 07:00)
const d3 = new Date('2025-01-01T00:00:00'); // Local 1 Jan 00:00

console.log('d1 (Local 1 Jan):', d1.toISOString());
console.log('d2 (ISO String):', d2.toISOString());
console.log('d3 (Local ISO-like):', d3.toISOString());

console.log('d1 >= d2?', d1 >= d2);
console.log('d1 >= d3?', d1 >= d3);
