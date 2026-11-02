using System;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Api.Controllers;

/// <summary>
/// Provides administrator-only Studio runtime measurements.
/// </summary>
[Authorize(Policy = Policies.RequiresElevation)]
[Route("Studio")]
public class StudioController : BaseJellyfinApiController
{
    /// <summary>
    /// Samples the server process, with a container-aware memory limit.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <returns>Current process measurements; these are not host-wide metrics.</returns>
    [HttpGet("Health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetHealth(CancellationToken cancellationToken)
    {
        using var process = Process.GetCurrentProcess();
        var before = process.TotalProcessorTime;
        var timer = Stopwatch.StartNew();
        await Task.Delay(250, cancellationToken).ConfigureAwait(false);
        process.Refresh();
        var cpu = Math.Clamp((process.TotalProcessorTime - before).TotalMilliseconds / timer.Elapsed.TotalMilliseconds / Environment.ProcessorCount * 100, 0, 100);
        return new OkObjectResult(new
        {
            CpuPercent = Math.Round(cpu, 1),
            MemoryUsedBytes = process.WorkingSet64,
            MemoryLimitBytes = GC.GetGCMemoryInfo().TotalAvailableMemoryBytes,
            ProcessorCount = Environment.ProcessorCount,
            Scope = "JellyfinProcess",
            SampledAt = DateTimeOffset.UtcNow
        });
    }
}
