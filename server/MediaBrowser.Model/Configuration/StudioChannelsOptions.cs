#pragma warning disable CS1591
using System;

namespace MediaBrowser.Model.Configuration;

public class StudioChannelsOptions
{
    public bool Configured { get; set; }

    public bool Enabled { get; set; } = true;

    public int GuideHours { get; set; } = 3;

    public StudioChannelDefinition[] Channels { get; set; } = Array.Empty<StudioChannelDefinition>();
}
