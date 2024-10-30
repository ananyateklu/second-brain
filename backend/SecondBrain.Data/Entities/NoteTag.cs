using System.ComponentModel.DataAnnotations;
using SecondBrain.Data.Entities;

namespace SecondBrain.Data.Entities
{
    public class NoteTag
    {
        public string NoteId { get; set; }
        public Note Note { get; set; }

        public string TagId { get; set; }
        public Tag Tag { get; set; }
    }
}
