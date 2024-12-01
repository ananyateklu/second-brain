// SecondBrain.Data/DataContext.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using SecondBrain.Data.Entities;

namespace SecondBrain.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; }
        public DbSet<Note> Notes { get; set; } = null!;
        public DbSet<TaskItem> Tasks { get; set; } = null!;
        public DbSet<TaskLink> TaskLinks { get; set; } = null!;
        public DbSet<Reminder> Reminders { get; set; }
        public DbSet<RefreshToken> RefreshTokens { get; set; }
        public DbSet<TaskItemNote> TaskItemNotes { get; set; }
        public DbSet<Activity> Activities { get; set; }
        public DbSet<NoteLink> NoteLinks { get; set; } = null!;
        public DbSet<Idea> Ideas { get; set; }
        public DbSet<IdeaLink> IdeaLinks { get; set; }
        public DbSet<Achievement> Achievements { get; set; }
        public DbSet<UserAchievement> UserAchievements { get; set; }
        public DbSet<NexusStorage> NexusStorage { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                // Configure ExperiencePoints for concurrency checking
                entity.Property(u => u.ExperiencePoints)
                    .IsConcurrencyToken();

                // Configure Level as computed by the database
                entity.Property(u => u.Level)
                    .ValueGeneratedOnAddOrUpdate()
                    .Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);
            });

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

            // Configure composite key
            modelBuilder.Entity<NoteLink>()
                .HasKey(nl => new { nl.NoteId, nl.LinkedNoteId });

            // Configure relationship for NoteId
            modelBuilder.Entity<NoteLink>()
                .HasOne(nl => nl.Note)
                .WithMany(n => n.NoteLinks)
                .HasForeignKey(nl => nl.NoteId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure relationship for LinkedNoteId
            modelBuilder.Entity<NoteLink>()
                .HasOne(nl => nl.LinkedNote)
                .WithMany()
                .HasForeignKey(nl => nl.LinkedNoteId)
                .OnDelete(DeleteBehavior.Restrict);

            // Set default value for IsDeleted
            modelBuilder.Entity<NoteLink>()
                .Property(nl => nl.IsDeleted)
                .HasDefaultValue(false);

            modelBuilder.Entity<IdeaLink>()
                .HasKey(il => new { il.IdeaId, il.LinkedItemId });

            modelBuilder.Entity<IdeaLink>()
                .HasOne(il => il.Idea)
                .WithMany(i => i.IdeaLinks)
                .HasForeignKey(il => il.IdeaId)
                .OnDelete(DeleteBehavior.Restrict);

            // Configure Achievement entity
            modelBuilder.Entity<Achievement>()
                .HasKey(a => a.Id);

            modelBuilder.Entity<Achievement>()
                .Property(a => a.Name)
                .IsRequired()
                .HasMaxLength(100);

            modelBuilder.Entity<Achievement>()
                .Property(a => a.Description)
                .HasMaxLength(500);

            modelBuilder.Entity<Achievement>()
                .Property(a => a.Icon)
                .HasMaxLength(255);

            modelBuilder.Entity<Achievement>()
                .Property(a => a.Type)
                .IsRequired()
                .HasMaxLength(50);

            // Configure UserAchievement composite key
            modelBuilder.Entity<UserAchievement>()
                .HasKey(ua => new { ua.UserId, ua.AchievementId });

            // Configure UserAchievement relationships
            modelBuilder.Entity<UserAchievement>()
                .HasOne(ua => ua.User)
                .WithMany(u => u.UserAchievements)
                .HasForeignKey(ua => ua.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<UserAchievement>()
                .HasOne(ua => ua.Achievement)
                .WithMany(a => a.UserAchievements)
                .HasForeignKey(ua => ua.AchievementId)
                .OnDelete(DeleteBehavior.Cascade);

            // Configure DateAchieved to use UTC time
            modelBuilder.Entity<UserAchievement>()
                .Property(ua => ua.DateAchieved)
                .HasDefaultValueSql("GETUTCDATE()");

            // Configure User gamification properties
            modelBuilder.Entity<User>()
                .Property(u => u.ExperiencePoints)
                .HasDefaultValue(0)
                .IsConcurrencyToken();

            modelBuilder.Entity<User>()
                .Property(u => u.Avatar)
                .HasMaxLength(1000); // Adjust max length based on your needs

            // Configure TaskLink entity
            modelBuilder.Entity<TaskLink>(entity =>
            {
                // Configure composite key
                entity.HasKey(e => new { e.TaskId, e.LinkedItemId });

                // Configure relationships
                entity.HasOne(e => e.Task)
                    .WithMany(t => t.TaskLinks)
                    .HasForeignKey(e => e.TaskId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.LinkedItem)
                    .WithMany(n => n.TaskLinks)
                    .HasForeignKey(e => e.LinkedItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
