export const ignoreAlreadyVerifiedError = (err: any): void => {
  if (err.message.includes('Reason: Already Verified')) {
    console.log('Contract is already verified');
  } else {
    console.error(err);
    throw err;
  }
};
