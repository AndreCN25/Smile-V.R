using System;
using System.Diagnostics;
using System.Threading.Tasks;

class Program
{
    static void Main(string[] args)
    {
        Console.WriteLine("====================================================");
        Console.WriteLine(" Iniciando Clínica Dental (Frontend + Backend)...");
        Console.WriteLine("====================================================");

        var frontendStartInfo = new ProcessStartInfo
        {
            FileName = "cmd.exe",
            Arguments = "/c npm run dev",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        var backendStartInfo = new ProcessStartInfo
        {
            FileName = "dotnet",
            Arguments = "run --project Backend/DentalClinic.Api/DentalClinic.Api.csproj",
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var frontendProcess = new Process { StartInfo = frontendStartInfo };
        using var backendProcess = new Process { StartInfo = backendStartInfo };

        frontendProcess.OutputDataReceived += (s, e) => {
            if (!string.IsNullOrEmpty(e.Data)) Console.WriteLine($"[Frontend] {e.Data}");
        };
        frontendProcess.ErrorDataReceived += (s, e) => {
            if (!string.IsNullOrEmpty(e.Data))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Frontend-Error] {e.Data}");
                Console.ResetColor();
            }
        };

        backendProcess.OutputDataReceived += (s, e) => {
            if (!string.IsNullOrEmpty(e.Data)) Console.WriteLine($"[Backend] {e.Data}");
        };
        backendProcess.ErrorDataReceived += (s, e) => {
            if (!string.IsNullOrEmpty(e.Data))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"[Backend-Error] {e.Data}");
                Console.ResetColor();
            }
        };

        // Terminar procesos al salir
        AppDomain.CurrentDomain.ProcessExit += (sender, eventArgs) => KillProcesses(frontendProcess, backendProcess);
        Console.CancelKeyPress += (sender, eventArgs) => {
            Console.WriteLine("\nDeteniendo servidores de Clínica Dental...");
            KillProcesses(frontendProcess, backendProcess);
        };

        try
        {
            Console.WriteLine("-> Iniciando servidor Frontend (Vite)...");
            frontendProcess.Start();
            frontendProcess.BeginOutputReadLine();
            frontendProcess.BeginErrorReadLine();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al iniciar Frontend: {ex.Message}");
        }

        try
        {
            Console.WriteLine("-> Iniciando servidor Backend (ASP.NET Core Web API)...");
            backendProcess.Start();
            backendProcess.BeginOutputReadLine();
            backendProcess.BeginErrorReadLine();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error al iniciar Backend: {ex.Message}");
        }

        Console.WriteLine("\nAmbos servidores están corriendo.");
        Console.WriteLine("Presiona Ctrl+C en cualquier momento para detenerlos.");
        Console.WriteLine("====================================================\n");

        var t1 = Task.Run(() => {
            try { frontendProcess.WaitForExit(); } catch {}
        });
        var t2 = Task.Run(() => {
            try { backendProcess.WaitForExit(); } catch {}
        });
        Task.WaitAll(t1, t2);
    }

    static void KillProcesses(Process p1, Process p2)
    {
        try { if (!p1.HasExited) p1.Kill(true); } catch {}
        try { if (!p2.HasExited) p2.Kill(true); } catch {}
    }
}
