using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using Jellyfin.Data.Enums;
using MediaBrowser.Common.Api;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Model.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;

namespace Jellyfin.Api.Controllers;

/// <summary>
/// Provides library summaries from the indexed catalog, without walking the filesystem.
/// </summary>
[Authorize(Policy = Policies.RequiresElevation)]
[Route("Studio/Libraries")]
public class StudioLibrariesController : BaseJellyfinApiController
{
    private readonly ILibraryManager _libraryManager;
    private readonly IMemoryCache _cache;

    /// <summary>
    /// Initializes a new instance of the <see cref="StudioLibrariesController"/> class.
    /// </summary>
    /// <param name="libraryManager">The library manager.</param>
    /// <param name="cache">The summary cache.</param>
    public StudioLibrariesController(ILibraryManager libraryManager, IMemoryCache cache)
    {
        _libraryManager = libraryManager;
        _cache = cache;
    }

    /// <summary>
    /// Gets per-library title, episode, indexed size and external identification totals.
    /// </summary>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <returns>Summaries cached for up to one minute.</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult GetLibraries(CancellationToken cancellationToken)
    {
        var folders = _libraryManager.GetVirtualFolders();
        var cacheKey = "StudioLibrarySummary:" + string.Join('|', folders.Select(folder => folder.ItemId + ":" + folder.Name + ":" + string.Join(';', folder.Locations)));
        var result = _cache.GetOrCreate(cacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(1);
            var now = DateTime.UtcNow;
            var summaries = new List<object>();
            foreach (var folder in folders)
            {
                cancellationToken.ThrowIfCancellationRequested();
                if (!Guid.TryParse(folder.ItemId, out var id))
                {
                    continue;
                }

                var items = _libraryManager.GetItemList(new InternalItemsQuery
                {
                    AncestorIds = [id],
                    Recursive = true,
                    IncludeItemTypes = [BaseItemKind.Movie, BaseItemKind.Series, BaseItemKind.Episode, BaseItemKind.Audio, BaseItemKind.AudioBook, BaseItemKind.MusicVideo, BaseItemKind.Video, BaseItemKind.Book, BaseItemKind.Photo]
                });
                var titles = items.Where(item => item.GetBaseItemKind() != BaseItemKind.Episode).ToArray();
                // A file shared by multiple catalog entries must only contribute once per library.
                var files = items.Where(item => !item.IsFolder && item.LocationType == LocationType.FileSystem)
                    .DistinctBy(item => string.IsNullOrEmpty(item.Path) ? item.Id.ToString() : item.Path).ToArray();
                summaries.Add(new
                {
                    folder.ItemId,
                    TitleCount = titles.Length,
                    MovieCount = titles.Count(item => item.GetBaseItemKind() == BaseItemKind.Movie),
                    SeriesCount = titles.Count(item => item.GetBaseItemKind() == BaseItemKind.Series),
                    EpisodeCount = items.Count(item => item.GetBaseItemKind() == BaseItemKind.Episode),
                    IndexedBytes = files.Sum(item => Math.Max(0, item.Size ?? 0)),
                    UnknownSizeCount = files.Count(item => item.Size is null or < 0),
                    AddedWeek = titles.Count(item => item.DateCreated >= now.AddDays(-7)),
                    AddedToday = titles.Count(item => item.DateCreated >= now.Date),
                    AddedDaily = Enumerable.Range(0, 7).Select(day => titles.Count(item => item.DateCreated >= now.Date.AddDays(day - 6) && item.DateCreated < now.Date.AddDays(day - 5))).ToArray(),
                    IdentifiedCount = titles.Count(item => item.ProviderIds.Any(provider => !string.IsNullOrWhiteSpace(provider.Value)))
                });
            }

            return new { SampledAt = now, Libraries = summaries };
        });
        return new OkObjectResult(result);
    }
}
