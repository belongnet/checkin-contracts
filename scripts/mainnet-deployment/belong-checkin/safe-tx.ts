export function logSafeTransaction(to: string, data: string) {
  console.log('Safe custom transaction payload:');
  console.log(`to=${to}`);
  console.log('value=0');
  console.log(`data=${data}`);
  console.log(JSON.stringify({ to, value: '0', data }, null, 2));
}
