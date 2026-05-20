/**
 * Validates a credit card number using the Luhn algorithm.
 *
 * @param {string} cardNumber - The credit card number to validate.
 * @returns {boolean} - True if the card number is valid, false otherwise.
 */
export function validateCreditCard(cardNumber: string): boolean {
  if (!cardNumber || cardNumber.trim() === '') {
    return false;
  }

  const digitsOnly = cardNumber.replace(/\D/g, '');

  if (digitsOnly.length < 13 || digitsOnly.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;
  for (let i = digitsOnly.length - 1; i >= 0; i--) {
    let digit = parseInt(digitsOnly.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}
