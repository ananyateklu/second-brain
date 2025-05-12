namespace SecondBrain.Api.Enums
{
    public enum ActivityActionType
    {
        CREATE,
        UPDATE,
        DELETE,
        ARCHIVE,
        UNARCHIVE,
        LINK,
        UNLINK,
        SEARCH,
        PIN,
        UNPIN,
        FAVORITE,
        UNFAVORITE,
        AI_CHAT_CREATE,
        AI_MESSAGE_SEND,
        AI_MESSAGE_RECEIVE,
        AI_CHAT_DELETE,
        AI_MESSAGE_REACT,
        CONNECT,
        DISCONNECT,
        SYNC,
        COMPLETE,
        RESTORE,
        PERMANENT_DELETE
    }

    public enum ActivityItemType
    {
        NOTE,
        IDEA,
        NOTELINK,
        AI_CHAT,
        AI_MESSAGE,
        INTEGRATION,
        TICKTICK_TASK,
        TICKTICK_INTEGRATION,
        TASK,
        REMINDER
    }
}