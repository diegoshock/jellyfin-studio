using System;
using System.Linq;
using MediaBrowser.Common.Api;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller.Configuration;
using MediaBrowser.Model.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Api.Controllers;

/// <summary>
/// Manages persistent virtual channels built from the library catalog.
/// </summary>
[Authorize]
[Route("Studio/Channels")]
public class StudioChannelsController : BaseJellyfinApiController
{
    private readonly IServerConfigurationManager _configuration;

    /// <summary>
    /// Initializes a new instance of the <see cref="StudioChannelsController"/> class.
    /// </summary>
    /// <param name="configuration">The configuration manager.</param>
    public StudioChannelsController(IServerConfigurationManager configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Gets the shared channel lineup. Catalog and playback permissions are enforced by the Items APIs.
    /// </summary>
    /// <returns>The channel configuration.</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<StudioChannelsOptions> GetChannels()
    {
        return _configuration.GetConfiguration<StudioChannelsOptions>("studiochannels");
    }

    /// <summary>
    /// Saves the channel lineup. Requires administrator access.
    /// </summary>
    /// <param name="options">The channel configuration.</param>
    /// <returns>No content when saved.</returns>
    [HttpPost]
    [Authorize(Policy = Policies.RequiresElevation)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public IActionResult SaveChannels([FromBody] StudioChannelsOptions options)
    {
        if (options.GuideHours is < 1 or > 6 || options.Channels is null || options.Channels.Length > 100)
        {
            return new BadRequestObjectResult("La guía admite entre 1 y 6 horas y hasta 100 canales.");
        }

        if (options.Channels.Any(channel => channel is null || string.IsNullOrWhiteSpace(channel.Id) || channel.Id.Length > 100
            || string.IsNullOrWhiteSpace(channel.Name) || channel.Name.Length > 100 || string.IsNullOrWhiteSpace(channel.Value) || channel.Value.Length > 200
            || channel.Category is null || channel.Category.Length > 100 || channel.Number is < 1 or > 9999 || channel.Kind is not ("genre" or "series")
            || (channel.Kind == "series" && !Guid.TryParse(channel.Value, out _)) || (channel.LibraryId != string.Empty && !Guid.TryParse(channel.LibraryId, out _)))
            || options.Channels.Select(channel => channel.Id).Distinct(StringComparer.Ordinal).Count() != options.Channels.Length
            || options.Channels.Select(channel => channel.Number).Distinct().Count() != options.Channels.Length)
        {
            return new BadRequestObjectResult("Comprueba nombres, números únicos, tipo y origen de los canales.");
        }

        options.Configured = true;
        _configuration.SaveConfiguration("studiochannels", options);
        return NoContent();
    }
}
