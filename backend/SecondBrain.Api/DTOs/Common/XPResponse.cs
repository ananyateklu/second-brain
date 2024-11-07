namespace SecondBrain.Api.DTOs.Common
{
    public class XPResponse
    {
        public int XPAwarded { get; set; }
        public int NewTotalXP { get; set; }
        public bool LeveledUp { get; set; }
        public int NewLevel { get; set; }
    }
} 