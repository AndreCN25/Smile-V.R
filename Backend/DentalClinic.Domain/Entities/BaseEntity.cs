namespace DentalClinic.Domain.Entities
{
    // SOLID: Open/Closed Principle - BaseEntity está abierto para extensión por otras entidades, cerrado para modificación.
    public abstract class BaseEntity
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public Guid? CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public Guid? UpdatedBy { get; set; }
        public bool IsDeleted { get; set; } = false;
    }
}
