namespace DentalClinic.Api.Controllers
{
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.Authorization;
    using System.Threading.Tasks;
    using System;
    using DentalClinic.Domain.Entities;
    using DentalClinic.Domain.Interfaces;

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PatientsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public PatientsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.Patients.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Patient patient) {
            await _unitOfWork.Patients.AddAsync(patient);
            await _unitOfWork.CompleteAsync();
            return Ok(patient);
        }
        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Patient patient) {
            patient.Id = id;
            await _unitOfWork.Patients.UpdateAsync(patient);
            await _unitOfWork.CompleteAsync();
            return Ok(patient);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id) {
            var patient = await _unitOfWork.Patients.GetByIdAsync(id);
            if(patient != null) {
                await _unitOfWork.Patients.DeleteAsync(patient);
                await _unitOfWork.CompleteAsync();
            }
            return Ok();
        }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class DoctorsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public DoctorsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.Doctors.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Doctor doctor) {
            await _unitOfWork.Doctors.AddAsync(doctor);
            await _unitOfWork.CompleteAsync();
            return Ok(doctor);
        }
        
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Doctor doctor) {
            doctor.Id = id;
            await _unitOfWork.Doctors.UpdateAsync(doctor);
            await _unitOfWork.CompleteAsync();
            return Ok(doctor);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id) {
            var doctor = await _unitOfWork.Doctors.GetByIdAsync(id);
            if(doctor != null) {
                await _unitOfWork.Doctors.DeleteAsync(doctor);
                await _unitOfWork.CompleteAsync();
            }
            return Ok();
        }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class AppointmentsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public AppointmentsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.Appointments.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Appointment appt) {
            await _unitOfWork.Appointments.AddAsync(appt);
            await _unitOfWork.CompleteAsync();
            return Ok(appt);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Appointment appt) {
            appt.Id = id;
            await _unitOfWork.Appointments.UpdateAsync(appt);
            await _unitOfWork.CompleteAsync();
            return Ok(appt);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id) {
            var appt = await _unitOfWork.Appointments.GetByIdAsync(id);
            if(appt != null) {
                await _unitOfWork.Appointments.DeleteAsync(appt);
                await _unitOfWork.CompleteAsync();
            }
            return Ok();
        }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class TreatmentsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public TreatmentsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.Treatments.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Treatment entity) {
            await _unitOfWork.Treatments.AddAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Treatment entity) {
            entity.Id = id;
            await _unitOfWork.Treatments.UpdateAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id) {
            var entity = await _unitOfWork.Treatments.GetByIdAsync(id);
            if(entity != null) {
                await _unitOfWork.Treatments.DeleteAsync(entity);
                await _unitOfWork.CompleteAsync();
            }
            return Ok();
        }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class PromotionsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public PromotionsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.Promotions.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Promotion entity) {
            await _unitOfWork.Promotions.AddAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] Promotion entity) {
            entity.Id = id;
            await _unitOfWork.Promotions.UpdateAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id) {
            var entity = await _unitOfWork.Promotions.GetByIdAsync(id);
            if(entity != null) {
                await _unitOfWork.Promotions.DeleteAsync(entity);
                await _unitOfWork.CompleteAsync();
            }
            return Ok();
        }
    }

    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class ClinicSettingsController : ControllerBase
    {
        private readonly IUnitOfWork _unitOfWork;
        public ClinicSettingsController(IUnitOfWork unitOfWork) { _unitOfWork = unitOfWork; }

        [HttpGet]
        public async Task<IActionResult> Get() => Ok(await _unitOfWork.ClinicSettings.GetAllAsync());

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ClinicSettings entity) {
            await _unitOfWork.ClinicSettings.AddAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] ClinicSettings entity) {
            entity.Id = id;
            await _unitOfWork.ClinicSettings.UpdateAsync(entity);
            await _unitOfWork.CompleteAsync();
            return Ok(entity);
        }
    }
}
