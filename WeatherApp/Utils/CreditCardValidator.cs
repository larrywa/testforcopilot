using System;
using System.Linq;

namespace WeatherApp.Utils
{
    public static class CreditCardValidator
    {
        public static bool IsValid(string cardNumber)
        {
            if (string.IsNullOrWhiteSpace(cardNumber))
            {
                return false;
            }

            int[] digits = cardNumber.Where(char.IsDigit).Select(c => c - '0').ToArray();

            if (digits.Length < 13 || digits.Length > 19)
            {
                return false;
            }

            int sum = 0;
            bool alternate = false;
            for (int i = digits.Length - 1; i >= 0; i--)
            {
                int digit = digits[i];
                if (alternate)
                {
                    digit *= 2;
                    if (digit > 9)
                    {
                        digit -= 9;
                    }
                }
                sum += digit;
                alternate = !alternate;
            }

            return sum % 10 == 0;
        }
    }
}
