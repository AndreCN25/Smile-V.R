namespace DentalClinic.Infrastructure.Persistence
{
    using Microsoft.EntityFrameworkCore;
    using DentalClinic.Domain.Entities;

    // SOLID: Liskov Substitution Principle - DentalClinicDbContext es sustituible por su clase base DbContext.
    public class DentalClinicDbContext : DbContext
    {
        public DentalClinicDbContext(DbContextOptions<DentalClinicDbContext> options) : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Patient> Patients { get; set; }
        public DbSet<Doctor> Doctors { get; set; }
        public DbSet<Appointment> Appointments { get; set; }
        public DbSet<Treatment> Treatments { get; set; }
        public DbSet<Promotion> Promotions { get; set; }
        public DbSet<ClinicSettings> ClinicSettings { get; set; }
        public DbSet<Payment> Payments { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            modelBuilder.Entity<User>().ToTable("app_users");
            modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
            modelBuilder.Entity<User>().Property(u => u.PasswordHash).HasColumnName("password_hash");
            modelBuilder.Entity<User>().Property(u => u.FailedLoginAttempts).HasColumnName("failed_login_attempts");
            modelBuilder.Entity<User>().Property(u => u.LockoutEnd).HasColumnName("lockout_end");
            
            modelBuilder.Entity<Patient>().ToTable("patients");
            modelBuilder.Entity<Doctor>().ToTable("doctors");
            modelBuilder.Entity<Appointment>().ToTable("appointments");
            modelBuilder.Entity<Treatment>().ToTable("treatments");
            modelBuilder.Entity<Promotion>().ToTable("promotions");
            modelBuilder.Entity<ClinicSettings>().ToTable("clinic_settings");
            
            // Map exact Supabase names to keep schema compatible if they exist
            modelBuilder.Entity<Patient>().Property(p => p.BloodType).HasColumnName("blood_type");
            modelBuilder.Entity<Patient>().Property(p => p.MedicalConditions).HasColumnName("medical_conditions");
            modelBuilder.Entity<Patient>().Property(p => p.EmergencyContact).HasColumnName("emergency_contact");
            modelBuilder.Entity<Patient>().Property(p => p.EmergencyPhone).HasColumnName("emergency_phone");
            modelBuilder.Entity<Patient>().Property(p => p.LastVisit).HasColumnName("last_visit");
            modelBuilder.Entity<Patient>().Property(p => p.TotalVisits).HasColumnName("total_visits");
            
            modelBuilder.Entity<Appointment>().Property(a => a.PatientId).HasColumnName("patient_id");
            modelBuilder.Entity<Appointment>().Property(a => a.DoctorId).HasColumnName("doctor_id");
        }
    }
}
