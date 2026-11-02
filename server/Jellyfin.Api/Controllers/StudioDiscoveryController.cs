using System;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Api.Extensions;
using Jellyfin.Data;
using Jellyfin.Data.Enums;
using Jellyfin.Database.Implementations.Entities;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Library;
using MediaBrowser.Providers.Plugins.Tmdb;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Api.Controllers;

/// <summary>
/// Editorial metadata for the Studio discovery view. Does not acquire media.
/// </summary>
[Authorize]
[Route("Studio/Discover")]
public class StudioDiscoveryController : BaseJellyfinApiController
{
    private readonly TmdbClientManager _tmdb;
    private readonly IUserManager _users;
    private readonly ILibraryManager _library;
    private readonly ILogger<StudioDiscoveryController> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="StudioDiscoveryController"/> class.
    /// </summary>
    /// <param name="tmdb">Configured TMDb provider.</param>
    /// <param name="users">User manager.</param>
    /// <param name="logger">Logger.</param>
    /// <param name="library">Permission-aware library manager.</param>
    public StudioDiscoveryController(TmdbClientManager tmdb, IUserManager users, ILogger<StudioDiscoveryController> logger, ILibraryManager library)
    {
        _tmdb = tmdb;
        _users = users;
        _library = library;
        _logger = logger;
    }

    /// <summary>
    /// Gets one editorial page. Restricted profiles use their local library instead.
    /// </summary>
    /// <param name="category">Now playing, upcoming, popular or top.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <returns>Editorial movie metadata.</returns>
    [HttpGet]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> GetDiscovery([FromQuery] string category = "now", CancellationToken cancellationToken = default)
    {
        var user = _users.GetUserById(User.GetUserId());
        if (user is null || user.HasContentRestrictions())
        {
            return Forbid();
        }

        if (category is not ("now" or "upcoming" or "popular" or "top"))
        {
            return BadRequest("Unknown discovery category.");
        }

        try
        {
            var movies = await _tmdb.GetStudioMoviesAsync(category, "es-ES", cancellationToken).ConfigureAwait(false);
            return new OkObjectResult(movies.Select(movie => new
            {
                TmdbId = movie.Id,
                Name = movie.Title,
                Overview = movie.Overview,
                ReleaseDate = movie.ReleaseDate,
                Rating = movie.VoteAverage,
                PosterUrl = string.IsNullOrEmpty(movie.PosterPath) ? null : "https://image.tmdb.org/t/p/w500" + movie.PosterPath,
                BackdropUrl = string.IsNullOrEmpty(movie.BackdropPath) ? null : "https://image.tmdb.org/t/p/w1280" + movie.BackdropPath,
                Url = "https://www.themoviedb.org/movie/" + movie.Id.ToString(CultureInfo.InvariantCulture)
            }));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Studio discovery provider unavailable");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "TMDb is temporarily unavailable.");
        }
    }

    /// <summary>
    /// Gets metadata and the release order for a movie's TMDb collection.
    /// </summary>
    /// <param name="id">Positive TMDb movie identifier.</param>
    /// <param name="cancellationToken">Request cancellation.</param>
    /// <returns>Movie metadata and its collection, when available.</returns>
    [HttpGet("{id:int:min(1)}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMovie([FromRoute] int id, CancellationToken cancellationToken)
    {
        var user = _users.GetUserById(User.GetUserId());
        if (user is null || user.HasContentRestrictions())
        {
            return Forbid();
        }

        try
        {
            var movie = await _tmdb.GetMovieAsync(id, "es", "es,en", "ES", cancellationToken).ConfigureAwait(false);
            if (movie is null || movie.Adult)
            {
                return NotFound();
            }

            var collection = movie.BelongsToCollection is null ? null : await _tmdb.GetCollectionAsync(movie.BelongsToCollection.Id, "es", "es,en", "ES", cancellationToken).ConfigureAwait(false);
            return new OkObjectResult(new
            {
                movie.Title,
                movie.Overview,
                LibraryItemId = FindLibraryMovie(user, id),
                ImdbUrl = string.IsNullOrEmpty(movie.ImdbId) ? null : "https://www.imdb.com/title/" + movie.ImdbId,
                Collection = collection is null ? null : new
                {
                    collection.Name,
                    Parts = (collection.Parts ?? []).Where(part => !part.Adult).OrderBy(part => part.ReleaseDate ?? DateTime.MaxValue).Select(part => new
                    {
                        TmdbId = part.Id,
                        Name = part.Title,
                        LibraryItemId = FindLibraryMovie(user, part.Id),
                        ReleaseDate = part.ReleaseDate,
                        PosterUrl = string.IsNullOrEmpty(part.PosterPath) ? null : "https://image.tmdb.org/t/p/w500" + part.PosterPath
                    })
                }
            });
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            _logger.LogWarning(exception, "Studio movie metadata unavailable");
            return StatusCode(StatusCodes.Status503ServiceUnavailable);
        }
    }

    private Guid? FindLibraryMovie(User user, int tmdbId)
    {
        return _library.GetItemList(new InternalItemsQuery(user)
        {
            Recursive = true,
            IncludeItemTypes = [BaseItemKind.Movie],
            HasAnyProviderId = new() { ["Tmdb"] = tmdbId.ToString(CultureInfo.InvariantCulture) },
            Limit = 1
        }).FirstOrDefault()?.Id;
    }
}
