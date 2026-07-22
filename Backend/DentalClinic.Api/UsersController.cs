namespace DentalClinic.Api.Controllers
{
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.Authorization;
    using DentalClinic.Domain.Interfaces;
    using DentalClinic.Domain.Entities;

    // ── DTOs ────────────────────────────────────────────────────
    public record CreateUserRequest(string Name, string Email, string Password, string Role);
    public record UpdateUserRequest(string Name, string Email, string Role);
    public record ResetPasswordRequest(string NewPassword);

    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Developer")]
    public class UsersController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;

        public UsersController(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var users = await _unitOfWork.Users.GetAllAsync();
            var dtos = users.Select(u => new UserDto(u.Id, u.Email, u.Name, u.Role, u.Active));
            return Ok(dtos);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
                return BadRequest(new { error = "Nombre, correo y contraseña son requeridos." });

            if (request.Password.Length < 6)
                return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres." });

            // Cannot create Developer users
            if (request.Role == "Developer")
                return BadRequest(new { error = "No se puede crear un usuario con rol Developer." });

            // Validate role
            if (request.Role != "Administrador")
                return BadRequest(new { error = "El rol debe ser 'Administrador'." });

            // Check email uniqueness
            var existing = await _unitOfWork.Users.GetByEmailAsync(request.Email.Trim().ToLower());
            if (existing != null)
                return BadRequest(new { error = "Ya existe un usuario con este correo electrónico." });

            var user = new User
            {
                Name = request.Name.Trim(),
                Email = request.Email.Trim().ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role = "Administrador",
                Active = true
            };

            await _unitOfWork.Users.AddAsync(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new UserDto(user.Id, user.Email, user.Name, user.Role, user.Active));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado." });

            // Cannot modify Developer's role
            if (user.Role == "Developer" && request.Role != "Developer")
                return BadRequest(new { error = "No se puede cambiar el rol del Developer." });

            // Cannot set role to Developer
            if (request.Role == "Developer" && user.Role != "Developer")
                return BadRequest(new { error = "No se puede asignar el rol Developer." });

            // Validate role
            if (request.Role != "Administrador" && request.Role != "Developer")
                return BadRequest(new { error = "Rol inválido." });

            // Check email uniqueness if changed
            if (request.Email.Trim().ToLower() != user.Email)
            {
                var existing = await _unitOfWork.Users.GetByEmailAsync(request.Email.Trim().ToLower());
                if (existing != null)
                    return BadRequest(new { error = "Ya existe un usuario con este correo electrónico." });
            }

            user.Name = request.Name.Trim();
            user.Email = request.Email.Trim().ToLower();
            user.Role = request.Role;
            user.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new UserDto(user.Id, user.Email, user.Name, user.Role, user.Active));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado." });

            if (user.Role == "Developer")
                return BadRequest(new { error = "No se puede eliminar al usuario Developer." });

            await _unitOfWork.Users.DeleteAsync(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { message = "Usuario eliminado correctamente." });
        }

        [HttpPut("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(Guid id)
        {
            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado." });

            if (user.Role == "Developer")
                return BadRequest(new { error = "No se puede desactivar al usuario Developer." });

            user.Active = !user.Active;
            user.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new UserDto(user.Id, user.Email, user.Name, user.Role, user.Active));
        }

        [HttpPut("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
                return BadRequest(new { error = "La contraseña debe tener al menos 6 caracteres." });

            var user = await _unitOfWork.Users.GetByIdAsync(id);
            if (user == null)
                return NotFound(new { error = "Usuario no encontrado." });

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.FailedLoginAttempts = 0;
            user.LockoutEnd = null;
            user.UpdatedAt = DateTime.UtcNow;

            await _unitOfWork.Users.UpdateAsync(user);
            await _unitOfWork.CompleteAsync();

            return Ok(new { message = "Contraseña restablecida correctamente." });
        }
    }
}
