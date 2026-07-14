namespace DentalClinic.Domain.Entities
{
    using System;
    using System.Collections.Generic;

    public class User : BaseEntity {
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public Guid RoleId { get; set; }
        public Role? Role { get; set; }
    }

    public class Role : BaseEntity {
        public string Name { get; set; } = string.Empty;
        public ICollection<User> Users { get; set; } = new List<User>();
    }

    public class Patient : BaseEntity {
        public string Name { get; set; } = string.Empty;
        public DateTime? Dob { get; set; }
        public string? Gender { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? BloodType { get; set; }
        public string? Allergies { get; set; }
        public string? MedicalConditions { get; set; }
        public string? EmergencyContact { get; set; }
        public string? EmergencyPhone { get; set; }
        public DateTime? LastVisit { get; set; }
        public int TotalVisits { get; set; } = 0;
        public decimal Balance { get; set; } = 0;
        public string? Notes { get; set; }
        public bool Active { get; set; } = true;
        
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }

    public class Doctor : BaseEntity {
        public string Name { get; set; } = string.Empty;
        public string? Specialty { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public bool Active { get; set; } = true;
        
        public ICollection<Appointment> Appointments { get; set; } = new List<Appointment>();
    }

    public class Treatment : BaseEntity {
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal Price { get; set; }
        public int Duration { get; set; }
        public bool Active { get; set; } = true;
    }

    public class Appointment : BaseEntity {
        public Guid PatientId { get; set; }
        public Patient? Patient { get; set; }
        public Guid DoctorId { get; set; }
        public Doctor? Doctor { get; set; }
        
        public string? Procedure { get; set; }
        public string Date { get; set; } = string.Empty;
        public string Time { get; set; } = string.Empty;
        public string Status { get; set; } = "programada";
        public string? Notes { get; set; }
        public decimal Cost { get; set; } = 0;
    }

    public class Promotion : BaseEntity {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? Discount { get; set; }
        public string? ValidUntil { get; set; }
        public bool Active { get; set; } = true;
    }

    public class ClinicSettings : BaseEntity {
        public string Name { get; set; } = string.Empty;
        public string? Rfc { get; set; }
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? Phone { get; set; }
        public string? Whatsapp { get; set; }
        public string? Email { get; set; }
        public string? Website { get; set; }
        public string? Hours { get; set; }
        public string? LogoUrl { get; set; }
        public string? Slogan { get; set; }
    }

    public class Payment : BaseEntity {
        public Guid PatientId { get; set; }
        public Patient? Patient { get; set; }
        public decimal Amount { get; set; }
        public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
        public string? Method { get; set; }
        public string? Concept { get; set; }
    }
}
