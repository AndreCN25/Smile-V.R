namespace DentalClinic.Infrastructure.Persistence
{
    using System;
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using Microsoft.EntityFrameworkCore;
    using DentalClinic.Domain.Entities;
    using DentalClinic.Domain.Interfaces;

    public class Repository<T> : IRepository<T> where T : BaseEntity
    {
        protected readonly DentalClinicDbContext _context;
        public Repository(DentalClinicDbContext context) { _context = context; }

        public async Task<T?> GetByIdAsync(Guid id) => await _context.Set<T>().FindAsync(id);
        
        public async Task<IEnumerable<T>> GetAllAsync() => await _context.Set<T>().ToListAsync();

        public async Task<T> AddAsync(T entity) {
            await _context.Set<T>().AddAsync(entity);
            return entity;
        }

        public Task UpdateAsync(T entity) {
            _context.Set<T>().Update(entity);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(T entity) {
            _context.Set<T>().Remove(entity);
            return Task.CompletedTask;
        }
    }

    // HEAP vs STACK comment: UnitOfWork maneja el ciclo de vida del DbContext que esta en el HEAP (Memoria administrada por GC).
    public class UnitOfWork : IUnitOfWork
    {
        private readonly DentalClinicDbContext _context;
        
        public IRepository<Patient> Patients { get; }
        public IRepository<Doctor> Doctors { get; }
        public IRepository<Appointment> Appointments { get; }
        public IRepository<Treatment> Treatments { get; }
        public IRepository<Promotion> Promotions { get; }
        public IRepository<ClinicSettings> ClinicSettings { get; }

        public UnitOfWork(DentalClinicDbContext context)
        {
            _context = context;
            Patients = new Repository<Patient>(_context);
            Doctors = new Repository<Doctor>(_context);
            Appointments = new Repository<Appointment>(_context);
            Treatments = new Repository<Treatment>(_context);
            Promotions = new Repository<Promotion>(_context);
            ClinicSettings = new Repository<ClinicSettings>(_context);
        }

        public async Task<int> CompleteAsync() => await _context.SaveChangesAsync();

        public void Dispose() => _context.Dispose();
    }
}
