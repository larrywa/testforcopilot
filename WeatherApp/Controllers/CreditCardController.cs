using Microsoft.AspNetCore.Mvc;
using WeatherApp.Utils;

namespace WeatherApp.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class CreditCardController : ControllerBase
    {
        [HttpPost("validate")]
        public IActionResult ValidateCreditCard([FromBody] CreditCardValidationRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.CardNumber))
            {
                return BadRequest("Card number is required.");
            }

            bool isValid = CreditCardValidator.IsValid(request.CardNumber);

            return Ok(new { IsValid = isValid });
        }
    }

    public class CreditCardValidationRequest
    {
        public string CardNumber { get; set; }
    }
}
