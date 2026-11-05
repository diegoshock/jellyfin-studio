#pragma warning disable CS1591
namespace MediaBrowser.Model.Configuration;

public class StudioChannelDefinition
{
    public string Id { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int Number { get; set; }

    public string Kind { get; set; } = "genre";

    public string Value { get; set; } = string.Empty;

    public string LibraryId { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;

    public bool Enabled { get; set; } = true;
}
