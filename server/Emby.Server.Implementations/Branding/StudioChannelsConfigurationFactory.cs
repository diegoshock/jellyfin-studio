using System.Collections.Generic;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Model.Configuration;

namespace Emby.Server.Implementations.Branding;

/// <summary>
/// Registers persistent library-channel configuration.
/// </summary>
public class StudioChannelsConfigurationFactory : IConfigurationFactory
{
    /// <inheritdoc />
    public IEnumerable<ConfigurationStore> GetConfigurations()
    {
        return [new ConfigurationStore { Key = "studiochannels", ConfigurationType = typeof(StudioChannelsOptions) }];
    }
}
