namespace DentalClinic.Domain.Interfaces
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using DentalClinic.Domain.Entities;

    // SOLID: Interface Segregation Principle - IRepository expone solo lo necesario para el acceso a datos base.
    public interface IRepository<T> where T : BaseEntity
    {
        Task<T?> GetByIdAsync(Guid id);
        Task<IEnumerable<T>> GetAllAsync();
        Task<T> AddAsync(T entity);
        Task UpdateAsync(T entity);
        Task DeleteAsync(T entity);
    }

    public interface IUserRepository : IRepository<User>
    {
        Task<User?> GetByEmailAsync(string email);
        Task<bool> ExistsByRoleAsync(string role);
    }

    public interface IUnitOfWork : IDisposable
    {
        IUserRepository Users { get; }
        IRepository<Patient> Patients { get; }
        IRepository<Doctor> Doctors { get; }
        IRepository<Appointment> Appointments { get; }
        IRepository<Treatment> Treatments { get; }
        IRepository<Promotion> Promotions { get; }
        IRepository<ClinicSettings> ClinicSettings { get; }
        Task<int> CompleteAsync();
    }
}
