// SecondBrain.Data/DataContext.cs
using Microsoft.EntityFrameworkCore;
using SecondBrain.Data.Entities;

namespace SecondBrain.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Note> Notes { get; set; }
        public DbSet<TaskItem> Tasks { get; set; }
        public DbSet<Reminder> Reminders { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<TaskItemNote> TaskItemNotes { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure User entity
            modelBuilder.Entity<User>()
                .HasKey(u => u.Id);

            modelBuilder.Entity<User>()
                .HasIndex(u => u.Email)
                .IsUnique();

            // User-Notes (One-to-Many)
            modelBuilder.Entity<User>()
                .HasMany(u => u.Notes)
                .WithOne(n => n.User)
                .HasForeignKey(n => n.UserId);

            // User-Tasks (One-to-Many)
            modelBuilder.Entity<User>()
                .HasMany(u => u.Tasks)
                .WithOne(t => t.User)
                .HasForeignKey(t => t.UserId);

            // User-Reminders (One-to-Many)
            modelBuilder.Entity<User>()
                .HasMany(u => u.Reminders)
                .WithOne(r => r.User)
                .HasForeignKey(r => r.UserId);

            // User-RefreshTokens (One-to-Many)
            modelBuilder.Entity<User>()
                .HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId);

            // TaskItemNote (Join Entity) Configuration
            modelBuilder.Entity<TaskItemNote>()
                .HasKey(tn => new { tn.TaskItemId, tn.NoteId });

            modelBuilder.Entity<TaskItemNote>()
                .HasOne(tn => tn.TaskItem)
                .WithMany(t => t.TaskItemNotes)
                .HasForeignKey(tn => tn.TaskItemId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<TaskItemNote>()
                .HasOne(tn => tn.Note)
                .WithMany(n => n.TaskItemNotes)
                .HasForeignKey(tn => tn.NoteId)
                .OnDelete(DeleteBehavior.Restrict);
        }
    }
}