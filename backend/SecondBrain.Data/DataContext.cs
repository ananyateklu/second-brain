// SecondBrain.Data/DataContext.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using SecondBrain.Data.Entities;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration.Json;
using System.IO;

namespace SecondBrain.Data
{
    public class DataContext : DbContext
    {
        public DataContext(DbContextOptions<DataContext> options)
            : base(options) { }

        public DbSet<User> Users { get; set; } = null!;
        public DbSet<Note> Notes { get; set; } = null!;
        public DbSet<TaskItem> Tasks { get; set; } = null!;
        public DbSet<TaskLink> TaskLinks { get; set; } = null!;
        public DbSet<Reminder> Reminders { get; set; } = null!;
        public DbSet<RefreshToken> RefreshTokens { get; set; } = null!;
        public DbSet<TaskItemNote> TaskItemNotes { get; set; } = null!;
        public DbSet<Activity> Activities { get; set; } = null!;
        public DbSet<NoteLink> NoteLinks { get; set; } = null!;
        public DbSet<Idea> Ideas { get; set; } = null!;
        public DbSet<IdeaLink> IdeaLinks { get; set; } = null!;
        public DbSet<Achievement> Achievements { get; set; } = null!;
        public DbSet<UserAchievement> UserAchievements { get; set; } = null!;
        public DbSet<ReminderLink> ReminderLinks { get; set; } = null!;
        public DbSet<AgentChat> AgentChats { get; set; } = null!;
        public DbSet<AgentMessage> AgentMessages { get; set; } = null!;
        public DbSet<UserPreference> UserPreferences { get; set; } = null!;
        public DbSet<XPHistoryItem> XPHistory { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure User entity
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);

                // Configure Level with a default value of 1
                entity.Property(u => u.Level)
                    .HasDefaultValue(1)
                    .ValueGeneratedOnAddOrUpdate()
                    .Metadata.SetAfterSaveBehavior(PropertySaveBehavior.Ignore);

                entity.Property(u => u.ExperiencePoints)
                    .HasDefaultValue(0)
                    .IsConcurrencyToken();

                entity.Property(u => u.Avatar)
                    .HasMaxLength(1000)
                    .IsRequired(false);

                entity.HasIndex(u => u.Email)
                    .IsUnique();
            });

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

            // User-RefreshTokens (One-to-Many)
            modelBuilder.Entity<User>()
                .HasMany(u => u.RefreshTokens)
                .WithOne(rt => rt.User)
                .HasForeignKey(rt => rt.UserId);

            // Configure Task entity
            modelBuilder.Entity<TaskItem>(entity =>
            {
                entity.Property(e => e.Id)
                    .HasMaxLength(36);  // Ensure consistent length with foreign keys
            });

            // Configure TaskItemNote (Join Entity) Configuration
            modelBuilder.Entity<TaskItemNote>(entity =>
            {
                entity.HasKey(tn => new { tn.TaskItemId, tn.NoteId });

                entity.Property(e => e.TaskItemId)
                    .HasMaxLength(36);  // Match the Task.Id length

                entity.Property(e => e.NoteId)
                    .HasMaxLength(36);  // Match the Note.Id length

                entity.HasOne(tn => tn.TaskItem)
                    .WithMany(t => t.TaskItemNotes)
                    .HasForeignKey(tn => tn.TaskItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(tn => tn.Note)
                    .WithMany(n => n.TaskItemNotes)
                    .HasForeignKey(tn => tn.NoteId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure Note entity
            modelBuilder.Entity<Note>(entity =>
            {
                entity.Property(e => e.Id)
                    .HasMaxLength(36);  // Ensure consistent length
            });

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
            modelBuilder.Entity<Achievement>(entity =>
            {
                entity.HasKey(a => a.Id);

                entity.Property(a => a.Name)
                    .IsRequired()
                    .HasMaxLength(100);

                entity.Property(a => a.Description)
                    .HasMaxLength(500);

                entity.Property(a => a.Icon)
                    .HasMaxLength(255);

                entity.Property(a => a.Type)
                    .IsRequired()
                    .HasMaxLength(50);
            });

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

            // Configure UserPreference entity
            modelBuilder.Entity<UserPreference>(entity =>
            {
                entity.HasKey(up => up.Id);
                
                entity.Property(up => up.PreferenceType)
                    .IsRequired()
                    .HasMaxLength(50);
                
                entity.Property(up => up.Value)
                    .IsRequired();
                
                entity.HasOne(up => up.User)
                    .WithMany(u => u.UserPreferences)
                    .HasForeignKey(up => up.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                
                // Create a composite unique index on UserId and PreferenceType
                entity.HasIndex(up => new { up.UserId, up.PreferenceType })
                    .IsUnique();
            });

            // Configure TaskLink entity
            modelBuilder.Entity<TaskLink>(entity =>
            {
                // Configure composite key (removed IsDeleted from key)
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

                // Set default value for IsDeleted
                entity.Property(e => e.IsDeleted)
                    .HasDefaultValue(false);

                // Configure indexes
                entity.HasIndex(e => e.TaskId);
                entity.HasIndex(e => e.LinkedItemId);
                entity.HasIndex(e => e.CreatedBy);
                entity.HasIndex(e => e.IsDeleted);
            });

            // Configure NoteLink entity
            modelBuilder.Entity<NoteLink>(entity =>
            {
                // Configure composite key
                entity.HasKey(e => new { e.NoteId, e.LinkedNoteId });

                // Configure relationships
                entity.HasOne(e => e.Note)
                    .WithMany(n => n.NoteLinks)
                    .HasForeignKey(e => e.NoteId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.LinkedNote)
                    .WithMany()
                    .HasForeignKey(e => e.LinkedNoteId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Set default value for IsDeleted
                entity.Property(e => e.IsDeleted)
                    .HasDefaultValue(false);

                // Configure indexes
                entity.HasIndex(e => e.NoteId);
                entity.HasIndex(e => e.LinkedNoteId);
                entity.HasIndex(e => e.IsDeleted);
            });

            // Configure ReminderLink entity
            modelBuilder.Entity<ReminderLink>(entity =>
            {
                // Configure composite key (removed IsDeleted from key)
                entity.HasKey(e => new { e.ReminderId, e.LinkedItemId });

                entity.HasOne(e => e.Reminder)
                    .WithMany(r => r.ReminderLinks)
                    .HasForeignKey(e => e.ReminderId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.LinkedItem)
                    .WithMany()
                    .HasForeignKey(e => e.LinkedItemId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(e => e.Creator)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedBy)
                    .OnDelete(DeleteBehavior.Restrict);

                // Set default value for IsDeleted
                entity.Property(e => e.IsDeleted)
                    .HasDefaultValue(false);

                // Add indexes
                entity.HasIndex(e => e.LinkedItemId);
                entity.HasIndex(e => e.CreatedBy);
                entity.HasIndex(e => e.IsDeleted);
            });

            // Configure Reminder entity
            modelBuilder.Entity<Reminder>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Tags)
                    .HasMaxLength(255)
                    .IsRequired(false);

                entity.HasOne(e => e.User)
                    .WithMany(u => u.Reminders)
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Configure AgentChat entity
            modelBuilder.Entity<AgentChat>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasMany(e => e.Messages)
                    .WithOne(e => e.Chat)
                    .HasForeignKey(e => e.ChatId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Configure AgentMessage entity
            modelBuilder.Entity<AgentMessage>(entity =>
            {
                entity.HasKey(e => e.Id);

                entity.Property(e => e.Role)
                    .HasMaxLength(50);

                entity.Property(e => e.Status)
                    .HasMaxLength(50);
            });
        }
    }

    public class DataContextFactory : IDesignTimeDbContextFactory<DataContext>
    {
        public DataContext CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile("appsettings.Development.json", optional: true)
                .Build();

            var optionsBuilder = new DbContextOptionsBuilder<DataContext>();
            optionsBuilder.UseSqlServer(configuration.GetConnectionString("DefaultConnection"));
            return new DataContext(optionsBuilder.Options);
        }
    }
}
